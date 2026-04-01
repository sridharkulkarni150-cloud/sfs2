'use strict';

export class Rocket {
  constructor(rocketParts) {
    this.parts = rocketParts;
    this.rootId = null;
  }

  setRootFromPod() {
    const pod = this.parts.find((p) => p.type === 'pod' && !p.removed);
    this.rootId = pod ? pod.id : null;
    return pod;
  }

  attachedParts() {
    return this.parts.filter((p) => !p.removed && p.attached);
  }

  detachedParts() {
    return this.parts.filter((p) => !p.removed && !p.attached);
  }

  computeCOM(parts = this.attachedParts()) {
    let mx = 0;
    let my = 0;
    let total = 0;
    for (const p of parts) {
      const m = p.mass + p.fuel * 0.8;
      mx += p.x * m;
      my += p.y * m;
      total += m;
    }
    return total > 0 ? { x: mx / total, y: my / total, mass: total } : { x: 0, y: 0, mass: 0 };
  }

  computeCOT(parts = this.attachedParts()) {
    let tx = 0;
    let ty = 0;
    let thrust = 0;
    for (const p of parts) {
      if (p.thrust > 0 && p.active) {
        tx += p.x * p.thrust;
        ty += p.y * p.thrust;
        thrust += p.thrust;
      }
    }
    return thrust > 0 ? { x: tx / thrust, y: ty / thrust } : null;
  }

  bounds(parts = this.attachedParts()) {
    if (!parts.length) return null;
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (const p of parts) {
      left = Math.min(left, p.x - p.width / 2);
      right = Math.max(right, p.x + p.width / 2);
      top = Math.min(top, p.y - p.height / 2);
      bottom = Math.max(bottom, p.y + p.height / 2);
    }
    return { left, right, top, bottom };
  }
}
