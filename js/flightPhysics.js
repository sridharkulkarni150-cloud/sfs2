'use strict';

import { PART_CATALOG } from './parts.js';
import { GameState } from './stateManager.js';

export const PLANETS = {
  earthLike: { name: 'Earth-like', surfaceGravity: 9.81, radius: 6371000, atmosphereDensity: 1.225 }
};

/**
 * Computes total rocket metrics.
 * @param {Array<any>} parts
 * @param {number} throttle
 * @param {number} g0
 */
export function computeMassAndEngine(parts, throttle, g0 = 9.81) {
  let totalMass = 0;
  let thrust = 0;
  let weightedIsp = 0;
  let fuelMass = 0;
  let totalFuel = 0;
  for (const p of parts) {
    if (!p.active || p.separated) continue;
    const d = PART_CATALOG[p.type];
    const fuelM = p.fuel * 0.8;
    const m = p.mass + fuelM;
    totalMass += m;
    fuelMass += fuelM;
    totalFuel += p.fuel;
    if (d.thrust > 0 && p.engineActive !== false) {
      const t = d.thrust * throttle;
      thrust += t;
      weightedIsp += t * d.isp;
    }
  }
  const avgIsp = thrust > 0 ? weightedIsp / thrust : 0;
  const twr = totalMass > 0 ? thrust / (totalMass * g0) : 0;
  const m0 = totalMass;
  const mf = Math.max(1, totalMass - fuelMass);
  const deltaV = avgIsp > 0 ? avgIsp * g0 * Math.log(m0 / mf) : 0;
  return { totalMass, thrust, avgIsp, twr, deltaV, totalFuel };
}

/**
 * Flight simulation with fixed-step accumulator.
 */
export class FlightSimulator {
  constructor() {
    this.planet = PLANETS.earthLike;
    this.acc = 0;
    this.fixedDt = 1 / 60;
    this.last = 0;
    this.state = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      angle: 0,
      angVel: 0,
      throttle: 0,
      gForce: 1,
      apoapsis: 0,
      periapsis: 0
    };
  }

  groundHeightAt(x) {
    return -(x * x) / (2 * this.planet.radius);
  }

  airDensity(altitude) {
    const scale = 8500;
    return this.planet.atmosphereDensity * Math.exp(-Math.max(0, altitude) / scale);
  }

  /**
   * Engine fuel draw via connectivity traversal.
   */
  consumeFuel(parts, dt) {
    const tanks = parts.filter((p) => p.active && p.fuel > 0);
    const byId = new Map(parts.map((p) => [p.id, p]));
    for (const p of parts) {
      const def = PART_CATALOG[p.type];
      if (!p.active || p.separated || def.thrust <= 0 || p.engineActive === false || this.state.throttle <= 0) continue;
      const flow = (def.thrust * this.state.throttle) / (def.isp * 9.81) / 0.8;
      let need = flow * dt;
      const visited = new Set([p.id]);
      const q = [...p.connections];
      while (q.length && need > 0) {
        const id = q.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        const node = byId.get(id);
        if (!node || !node.active || node.separated) continue;
        if (node.fuel > 0) {
          const take = Math.min(node.fuel, need);
          node.fuel -= take;
          need -= take;
        }
        node.connections.forEach((n) => q.push(n));
      }
      if (need > 0.0001) {
        p.engineActive = false;
      }
    }
    return tanks.some((t) => t.fuel > 0);
  }

  /**
   * @param {number} now
   * @param {Array<any>} parts
   * @param {(s:string)=>void} onState
   * @param {(impact:number)=>void} onCrash
   */
  update(now, parts, onState, onCrash) {
    if (!this.last) this.last = now;
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.1) dt = 0.1;
    this.acc += dt;
    while (this.acc >= this.fixedDt) {
      this.step(this.fixedDt, parts, onState, onCrash);
      this.acc -= this.fixedDt;
    }
  }

  step(dt, parts, onState, onCrash) {
    try {
      const active = parts.filter((p) => p.active && !p.separated);
      const metrics = computeMassAndEngine(active, this.state.throttle, this.planet.surfaceGravity);
      this.consumeFuel(active, dt);
      const altitude = this.state.y - this.groundHeightAt(this.state.x);
      const rho = this.airDensity(altitude);
      const speed = Math.hypot(this.state.vx, this.state.vy);
      const totalCdA = active.reduce((acc, p) => {
        const d = PART_CATALOG[p.type];
        return acc + d.cd * d.area;
      }, 0.1);
      const dragMag = 0.5 * rho * speed * speed * totalCdA;
      const dragX = speed > 0 ? -dragMag * (this.state.vx / speed) : 0;
      const dragY = speed > 0 ? -dragMag * (this.state.vy / speed) : 0;
      const thrustX = Math.sin(this.state.angle) * metrics.thrust;
      const thrustY = Math.cos(this.state.angle) * metrics.thrust;
      const gravity = metrics.totalMass * this.planet.surfaceGravity;
      this.state.ax = (thrustX + dragX) / Math.max(metrics.totalMass, 1);
      this.state.ay = (thrustY + dragY - gravity) / Math.max(metrics.totalMass, 1);
      this.state.vx += this.state.ax * dt;
      this.state.vy += this.state.ay * dt;
      this.state.x += this.state.vx * dt;
      this.state.y += this.state.vy * dt;
      this.state.gForce = Math.hypot(this.state.ax, this.state.ay + this.planet.surfaceGravity) / this.planet.surfaceGravity;
      this.state.apoapsis = Math.max(this.state.apoapsis, altitude);
      if (this.state.periapsis === 0 || altitude < this.state.periapsis) this.state.periapsis = altitude;

      const ground = this.groundHeightAt(this.state.x);
      if (this.state.y <= ground) {
        const impact = Math.hypot(this.state.vx, this.state.vy);
        this.state.y = ground;
        if (impact > 15) {
          onState(GameState.CRASHED);
          onCrash(impact);
        } else {
          this.state.vx = 0;
          this.state.vy = 0;
        }
      }
      if (altitude > 100000 && Math.abs(this.state.ay) < 0.5) {
        onState(GameState.ORBIT);
      }
    } catch (error) {
      console.error('Physics step failed', error);
    }
  }
}
