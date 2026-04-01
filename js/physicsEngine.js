'use strict';

import { Rocket } from './rocket.js';
import { PART_DEFINITIONS } from './parts.js';

const GRAVITY = 9.81;
const FIXED_DT = 1 / 60;
const MAX_DT = 0.1;
const GROUND_Y = 1000;
const FUEL_DENSITY = 0.8;
const PLANET_RADIUS = 6_371_000;

export class PhysicsEngine {
  constructor() {
    this.rocketParts = [];
    this.rocket = new Rocket(this.rocketParts);
    this.accumulator = 0;
    this.lastTime = 0;
    this.body = { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, angle: 0 };
    this.telemetry = { altitude: 0, velocity: { x: 0, y: 0 }, acceleration: 0, twr: 0, deltaV: 0, apoapsis: 0, periapsis: 0, fuel: 0, mass: 0 };
    this.flashTimer = 0;
  }

  groundYAt(x) {
    return GROUND_Y + (x * x) / (2 * PLANET_RADIUS);
  }

  airDensity(alt) {
    return 1.225 * Math.exp(-Math.max(0, alt) / 8500);
  }

  initRocket(parts) {
    this.rocketParts.length = 0;
    parts.forEach((p) => this.rocketParts.push({ ...p, attached: true, removed: false, vx: 0, vy: 0 }));
    this.rocket = new Rocket(this.rocketParts);
    const pod = this.rocket.setRootFromPod();
    this.body.x = pod ? pod.x : 0;
    this.body.y = pod ? pod.y : 0;
    this.body.vx = 0;
    this.body.vy = 0;
    this.rocketParts.forEach((p) => {
      p.localX = p.x - this.body.x;
      p.localY = p.y - this.body.y;
      p.active = p.thrust > 0 ? p.stage === 0 : false;
    });
  }

  consumeFuel(part, dt) {
    const dm = (part.thrust) / (Math.max(part.isp, 1) * GRAVITY);
    let liters = (dm / FUEL_DENSITY) * dt;
    const candidates = this.rocket.attachedParts();
    const visited = new Set([part.id]);
    const q = [...part.connections];
    while (q.length && liters > 0) {
      const id = q.shift();
      if (visited.has(id)) continue;
      visited.add(id);
      const tank = candidates.find((p) => p.id === id);
      if (!tank) continue;
      if (tank.maxFuel > 0 && tank.fuel > 0) {
        const take = Math.min(tank.fuel, liters);
        tank.fuel -= take;
        liters -= take;
      }
      tank.connections.forEach((c) => q.push(c));
    }
    if (liters > 0.0001) part.active = false;
  }

  separateStage(stageNum) {
    const separating = this.rocket.attachedParts().filter((p) => p.stage === stageNum);
    separating.forEach((p) => {
      p.attached = false;
      p.active = false;
      p.vx = this.body.vx;
      p.vy = this.body.vy + 5;
    });
    this.rocket.attachedParts().forEach((p) => {
      if (p.stage === stageNum + 1 && p.thrust > 0) p.active = true;
    });
    this.flashTimer = 0.12;
  }

  update(dt, throttle, stageTriggered = null) {
    if (stageTriggered !== null) this.separateStage(stageTriggered);
    this.accumulator += Math.min(MAX_DT, dt);
    while (this.accumulator >= FIXED_DT) {
      this.step(FIXED_DT, throttle);
      this.accumulator -= FIXED_DT;
    }
  }

  step(dt, throttle) {
    const attached = this.rocket.attachedParts();
    const detached = this.rocket.detachedParts();
    const com = this.rocket.computeCOM(attached);
    this.body.x = com.x;
    this.body.y = com.y;

    let mass = 0;
    let thrustForce = 0;
    let weightedIsp = 0;
    let fuelMass = 0;
    let totalFuel = 0;
    let cdA = 0.1;

    for (const p of attached) {
      mass += p.mass + p.fuel * FUEL_DENSITY;
      fuelMass += p.fuel * FUEL_DENSITY;
      totalFuel += p.fuel;
      const def = PART_DEFINITIONS[p.type];
      cdA += def.cd * def.area;
      if (p.thrust > 0 && p.active && throttle > 0) {
        thrustForce += p.thrust * throttle;
        weightedIsp += p.isp * p.thrust * throttle;
        this.consumeFuel(p, dt * throttle);
      }
    }

    const speed = Math.hypot(this.body.vx, this.body.vy);
    const altitude = this.groundYAt(this.body.x) - this.body.y;
    const rho = this.airDensity(altitude);
    const dragMag = 0.5 * rho * speed * speed * cdA;
    const dragX = speed > 0 ? -dragMag * this.body.vx / speed : 0;
    const dragY = speed > 0 ? -dragMag * this.body.vy / speed : 0;

    const gravityY = mass * GRAVITY;
    const thrustX = Math.sin(this.body.angle) * thrustForce;
    const thrustY = -Math.cos(this.body.angle) * thrustForce;

    this.body.ax = (thrustX + dragX) / Math.max(1, mass);
    this.body.ay = (gravityY + thrustY + dragY) / Math.max(1, mass);
    this.body.vx += this.body.ax * dt;
    this.body.vy += this.body.ay * dt;
    const dx = this.body.vx * dt;
    const dy = this.body.vy * dt;

    attached.forEach((p) => {
      p.x += dx;
      p.y += dy;
      p.rotation = this.body.angle;
    });

    for (const p of detached) {
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const gy = this.groundYAt(p.x);
      if (p.y + p.height / 2 >= gy) {
        p.y = gy - p.height / 2;
        p.vy = 0;
      }
    }

    const bounds = this.rocket.bounds(attached);
    if (bounds) {
      const gy = this.groundYAt((bounds.left + bounds.right) / 2);
      if (bounds.bottom >= gy) {
        const impact = Math.hypot(this.body.vx, this.body.vy);
        if (impact > 15) this.telemetry.crashed = true;
        const correction = bounds.bottom - gy;
        attached.forEach((p) => { p.y -= correction; });
        this.body.vx = 0;
        this.body.vy = 0;
      }
    }

    const isp = thrustForce > 0 ? weightedIsp / thrustForce : 0;
    this.telemetry.altitude = this.groundYAt(this.body.x) - this.body.y;
    this.telemetry.velocity = { x: this.body.vx, y: this.body.vy };
    this.telemetry.acceleration = Math.hypot(this.body.ax, this.body.ay);
    this.telemetry.mass = mass;
    this.telemetry.twr = mass > 0 ? thrustForce / (mass * GRAVITY) : 0;
    this.telemetry.deltaV = isp > 0 ? isp * GRAVITY * Math.log(Math.max(1.01, mass / Math.max(1, mass - fuelMass))) : 0;
    this.telemetry.apoapsis = Math.max(this.telemetry.apoapsis || 0, this.telemetry.altitude);
    this.telemetry.periapsis = this.telemetry.periapsis === 0 || this.telemetry.periapsis === undefined ? this.telemetry.altitude : Math.min(this.telemetry.periapsis, this.telemetry.altitude);
    this.telemetry.fuel = totalFuel;
    if (this.flashTimer > 0) this.flashTimer -= dt;
  }

  getTelemetry() {
    return this.telemetry;
  }
}
