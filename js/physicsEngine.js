'use strict';

import { PART_CATALOG, getAABB } from './parts.js';
import { GameState } from './stateManager.js';

export class PhysicsEngine {
  constructor() {
    this.planet = { gravity: 9.81, radius: 6371000, rho0: 1.225 };
    this.fixedDt = 1 / 60;
    this.acc = 0;
    this.last = 0;
    this.state = { x: 0, y: 120, vx: 0, vy: 0, ax: 0, ay: 0, angle: 0, throttle: 0, gForce: 1, apoapsis: 0, periapsis: 0 };
  }

  groundHeightAt(x) {
    return 560 + (x * x) / (2 * this.planet.radius);
  }

  altitudeAt(x, y) {
    return this.groundHeightAt(x) - y;
  }

  airDensity(altitude) {
    return this.planet.rho0 * Math.exp(-Math.max(0, altitude) / 8500);
  }

  computeMetrics(parts) {
    let mass = 0, thrust = 0, weightedIsp = 0, fuelMass = 0, totalFuel = 0;
    for (const p of parts) {
      const d = PART_CATALOG[p.type];
      const fm = p.fuel * 0.8;
      mass += p.mass + fm;
      fuelMass += fm;
      totalFuel += p.fuel;
      if (d.thrust > 0 && p.engineActive) {
        const t = d.thrust * this.state.throttle;
        thrust += t;
        weightedIsp += t * d.isp;
      }
    }
    const avgIsp = thrust > 0 ? weightedIsp / thrust : 0;
    const twr = mass > 0 ? thrust / (mass * this.planet.gravity) : 0;
    const deltaV = avgIsp > 0 && mass > 1 ? avgIsp * this.planet.gravity * Math.log(mass / Math.max(1, mass - fuelMass)) : 0;
    return { totalMass: mass, thrust, avgIsp, twr, deltaV, totalFuel };
  }

  consumeFuel(parts, dt) {
    const byId = new Map(parts.map((p) => [p.id, p]));
    for (const p of parts) {
      const d = PART_CATALOG[p.type];
      if (!(d.thrust > 0 && p.engineActive && this.state.throttle > 0)) continue;
      let need = ((d.thrust * this.state.throttle) / (Math.max(1, d.isp) * 9.81) / 0.8) * dt;
      const visited = new Set([p.id]);
      const q = [...p.connections];
      while (q.length && need > 0) {
        const id = q.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        const n = byId.get(id);
        if (!n || !n.active || n.separated) continue;
        if (n.fuel > 0) {
          const take = Math.min(need, n.fuel);
          n.fuel -= take;
          need -= take;
        }
        n.connections.forEach((c) => q.push(c));
      }
      if (need > 1e-4) p.engineActive = false;
    }
  }

  update(now, rocket, onState, onCrash) {
    if (!this.last) this.last = now;
    let dt = (now - this.last) / 1000;
    this.last = now;
    dt = Math.min(0.1, dt);
    this.acc += dt;
    while (this.acc >= this.fixedDt) {
      this.step(this.fixedDt, rocket, onState, onCrash);
      this.acc -= this.fixedDt;
    }
  }

  step(dt, rocket, onState, onCrash) {
    try {
      const assembly = rocket.getConnectedAssembly();
      const detached = rocket.getDetachedParts();
      if (assembly.length) {
        this.consumeFuel(assembly, dt);
        const metrics = this.computeMetrics(assembly);
        const speed = Math.hypot(this.state.vx, this.state.vy);
        const rho = this.airDensity(this.altitudeAt(this.state.x, this.state.y));
        const cdA = assembly.reduce((sum, p) => {
          const d = PART_CATALOG[p.type];
          return sum + d.cd * d.area;
        }, 0.1);
        const drag = 0.5 * rho * speed * speed * cdA;
        const dragX = speed > 0 ? -drag * (this.state.vx / speed) : 0;
        const dragY = speed > 0 ? -drag * (this.state.vy / speed) : 0;
        const thrustX = Math.sin(this.state.angle) * metrics.thrust;
        const thrustY = -Math.cos(this.state.angle) * metrics.thrust;
        this.state.ax = (thrustX + dragX) / Math.max(1, metrics.totalMass);
        this.state.ay = (thrustY + dragY + metrics.totalMass * this.planet.gravity) / Math.max(1, metrics.totalMass);
        this.state.vx += this.state.ax * dt;
        this.state.vy += this.state.ay * dt;
        this.state.x += this.state.vx * dt;
        this.state.y += this.state.vy * dt;
        rocket.applyAssemblyTransform(this.state.x, this.state.y);

        const aabb = rocket.getAssemblyAABB(assembly);
        const groundCenter = this.groundHeightAt((aabb.left + aabb.right) * 0.5);
        const altitude = this.altitudeAt(this.state.x, aabb.bottom);
        this.state.apoapsis = Math.max(this.state.apoapsis, altitude);
        this.state.periapsis = this.state.periapsis === 0 ? altitude : Math.min(this.state.periapsis, altitude);
        this.state.gForce = Math.hypot(this.state.ax, this.state.ay - this.planet.gravity) / this.planet.gravity;

        if (aabb.bottom >= groundCenter) {
          const impact = Math.hypot(this.state.vx, this.state.vy);
          if (impact > 15) {
            onState(GameState.CRASHED);
            onCrash(impact);
          }
          this.state.vx = 0;
          this.state.vy = 0;
          const dy = aabb.bottom - groundCenter;
          this.state.y -= dy;
          rocket.applyAssemblyTransform(this.state.x, this.state.y);
        }
      }

      for (const p of detached) {
        p.vy += this.planet.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const b = getAABB(p);
        const ground = this.groundHeightAt(p.x);
        if (b.bottom >= ground) {
          p.y -= (b.bottom - ground);
          p.vx *= 0.2;
          p.vy = 0;
        }
      }
    } catch (err) {
      console.error('physics update failed', err);
    }
  }
}
