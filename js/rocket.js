'use strict';

import { PART_CATALOG, createPart, getAABB } from './parts.js';

/**
 * Manages rocket assembly and flight part transforms.
 */
export class Rocket {
  constructor() {
    this.rocketParts = [createPart('command_pod', 0, 120, 2)];
    this.rootId = null;
  }

  getParts() {
    return this.rocketParts;
  }

  setParts(parts) {
    this.rocketParts = Array.isArray(parts) ? parts : [];
  }

  reset() {
    this.rocketParts = [createPart('command_pod', 0, 120, 2)];
    this.rootId = null;
  }

  serialize() {
    return JSON.stringify(this.rocketParts);
  }

  deserialize(raw) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return false;
    this.rocketParts = parsed;
    return true;
  }

  initializeFlight() {
    const pod = this.rocketParts.find((p) => p.type === 'command_pod' && p.active !== false);
    if (!pod) return null;
    this.rootId = pod.id;
    this.rocketParts.forEach((p) => {
      p.active = p.active !== false;
      p.separated = Boolean(p.separated);
      p.engineActive = PART_CATALOG[p.type].thrust > 0 ? p.stage === 0 : false;
      p.localOffsetX = p.x - pod.x;
      p.localOffsetY = p.y - pod.y;
      p.vx = p.vx || 0;
      p.vy = p.vy || 0;
    });
    return { x: pod.x, y: pod.y };
  }

  getConnectedAssembly() {
    return this.rocketParts.filter((p) => p.active && !p.separated);
  }

  getDetachedParts() {
    return this.rocketParts.filter((p) => p.active && p.separated);
  }

  computeCOM(parts = this.getConnectedAssembly()) {
    let mx = 0;
    let my = 0;
    let tm = 0;
    for (const p of parts) {
      const m = p.mass + p.fuel * 0.8;
      mx += p.x * m;
      my += p.y * m;
      tm += m;
    }
    return tm > 0 ? { x: mx / tm, y: my / tm, mass: tm } : { x: 0, y: 0, mass: 0 };
  }

  getAssemblyAABB(parts = this.getConnectedAssembly()) {
    if (!parts.length) return null;
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (const p of parts) {
      const b = getAABB(p);
      left = Math.min(left, b.left);
      right = Math.max(right, b.right);
      top = Math.min(top, b.top);
      bottom = Math.max(bottom, b.bottom);
    }
    return { left, right, top, bottom };
  }

  applyAssemblyTransform(rootX, rootY) {
    const parts = this.getConnectedAssembly();
    for (const p of parts) {
      p.x = rootX + (p.localOffsetX || 0);
      p.y = rootY + (p.localOffsetY || 0);
    }
  }
}
