'use strict';

import { getAABB, PART_CATALOG } from '../build/parts.js';
import { RigidBody } from './body.js';
import { FIXED_DT, MAX_FRAME_DT, GRAVITY, airDensity, altitude, groundY } from './world.js';

const FUEL_DENSITY = 0.8;
const CRASH_SPEED = 15;

export class RocketPhysics {
  constructor() {
    this.accumulator = 0;
    this.lastTime = 0;
    this.body = new RigidBody(0, 900);
    this.throttle = 0;
    this.gForce = 1;
    this.apoapsis = 0;
    this.periapsis = 0;
  }

  /** @param {Array<any>} parts */
  computeMass(parts) {
    return parts.reduce((sum, p) => sum + p.mass + p.fuel * FUEL_DENSITY, 0);
  }

  /** @param {Array<any>} parts */
  computeCOM(parts) {
    let mx = 0; let my = 0; let m = 0;
    for (const p of parts) {
      const pm = p.mass + p.fuel * FUEL_DENSITY;
      mx += p.x * pm;
      my += p.y * pm;
      m += pm;
    }
    return m > 0 ? { x: mx / m, y: my / m } : { x: this.body.x, y: this.body.y };
  }

  /** @param {Array<any>} parts */
  computeCOT(parts) {
    let tx = 0; let ty = 0; let t = 0;
    for (const p of parts) {
      const d = PART_CATALOG[p.type];
      if (d.thrust > 0 && p.engineActive) {
        tx += p.x * d.thrust;
        ty += p.y * d.thrust;
        t += d.thrust;
      }
    }
    return t > 0 ? { x: tx / t, y: ty / t } : null;
  }

  /** @param {Array<any>} parts */
  computeMetrics(parts) {
    const mass = this.computeMass(parts);
    let thrust = 0; let ispWeighted = 0; let fuelMass = 0; let fuelL = 0;
    for (const p of parts) {
      const d = PART_CATALOG[p.type];
      fuelMass += p.fuel * FUEL_DENSITY;
      fuelL += p.fuel;
      if (d.thrust > 0 && p.engineActive) {
        const t = d.thrust * this.throttle;
        thrust += t;
        ispWeighted += t * d.isp;
      }
    }
    const isp = thrust > 0 ? ispWeighted / thrust : 0;
    const twr = mass > 0 ? thrust / (mass * GRAVITY) : 0;
    const dv = isp > 0 ? isp * GRAVITY * Math.log(mass / Math.max(1, mass - fuelMass)) : 0;
    return { totalMass: mass, thrust, twr, deltaV: dv, totalFuel: fuelL };
  }

  consumeFuel(parts, dt) {
    for (const p of parts) {
      const d = PART_CATALOG[p.type];
      if (!(d.thrust > 0 && p.engineActive && this.throttle > 0)) continue;
      const dm = (d.thrust * this.throttle) / (Math.max(d.isp, 1) * GRAVITY);
      const liters = (dm / FUEL_DENSITY) * dt;
      let need = liters;
      const visited = new Set([p.id]);
      const queue = [...p.connections];
      while (queue.length && need > 0) {
        const id = queue.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        const n = parts.find((part) => part.id === id);
        if (!n) continue;
        if (n.fuel > 0) {
          const take = Math.min(need, n.fuel);
          n.fuel -= take;
          need -= take;
        }
        n.connections.forEach((c) => queue.push(c));
      }
      if (need > 0.0001) p.engineActive = false;
    }
  }

  /** @param {Array<any>} parts */
  assemblyBounds(parts) {
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (const p of parts) {
      const b = getAABB(p);
      left = Math.min(left, b.left); right = Math.max(right, b.right);
      top = Math.min(top, b.top); bottom = Math.max(bottom, b.bottom);
    }
    return { left, right, top, bottom };
  }

  update(now, assembly, detached, onCrash) {
    if (!this.lastTime) this.lastTime = now;
    this.accumulator += Math.min(MAX_FRAME_DT, (now - this.lastTime) / 1000);
    this.lastTime = now;
    while (this.accumulator >= FIXED_DT) {
      this.step(FIXED_DT, assembly, detached, onCrash);
      this.accumulator -= FIXED_DT;
    }
  }

  step(dt, assembly, detached, onCrash) {
    this.consumeFuel(assembly, dt);
    const metrics = this.computeMetrics(assembly);
    this.body.mass = Math.max(1, metrics.totalMass);
    this.body.clearForces();

    const speed = Math.hypot(this.body.vx, this.body.vy);
    const rho = airDensity(altitude(this.body.x, this.body.y));
    const cdA = assembly.reduce((s, p) => s + PART_CATALOG[p.type].cd * PART_CATALOG[p.type].area, 0.1);
    const dragMag = 0.5 * rho * speed * speed * cdA;
    const dragX = speed > 0 ? -dragMag * (this.body.vx / speed) : 0;
    const dragY = speed > 0 ? -dragMag * (this.body.vy / speed) : 0;

    const thrust = metrics.thrust;
    const thrustX = Math.sin(this.body.angle) * thrust;
    const thrustY = -Math.cos(this.body.angle) * thrust;

    this.body.addForce(0, this.body.mass * GRAVITY);
    this.body.addForce(thrustX + dragX, thrustY + dragY);
    this.body.integrate(dt);

    this.gForce = Math.hypot(this.body.ax, this.body.ay - GRAVITY) / GRAVITY;
    const alt = altitude(this.body.x, this.body.y);
    this.apoapsis = Math.max(this.apoapsis, alt);
    this.periapsis = this.periapsis === 0 ? alt : Math.min(this.periapsis, alt);

    const bounds = this.assemblyBounds(assembly);
    const floor = groundY((bounds.left + bounds.right) * 0.5);
    if (bounds.bottom >= floor) {
      const impact = Math.hypot(this.body.vx, this.body.vy);
      if (impact > CRASH_SPEED) onCrash();
      this.body.vx = 0;
      this.body.vy = 0;
      this.body.y -= (bounds.bottom - floor);
    }

    for (const p of detached) {
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const b = getAABB(p);
      if (b.bottom >= groundY(p.x)) {
        p.y -= (b.bottom - groundY(p.x));
        p.vy = 0;
      }
    }
  }
}
