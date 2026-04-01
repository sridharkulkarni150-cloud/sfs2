'use strict';

import { createRocketPart, GRID_SIZE, PART_DEFINITIONS, getAABB } from './parts.js';

export class BuildSystem {
  constructor(rocketParts) {
    this.rocketParts = rocketParts;
    this.selectedType = null;
    this.dragGhost = null;
  }

  snap(v) {
    return Math.round(v / GRID_SIZE) * GRID_SIZE;
  }

  validatePlacement(candidate) {
    const a = getAABB(candidate);
    return !this.rocketParts.some((p) => {
      if (p.removed) return false;
      const b = getAABB(p);
      return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
    });
  }

  updateGhost(type, x, y) {
    if (!type) {
      this.dragGhost = null;
      return;
    }
    const sx = this.snap(x);
    const sy = this.snap(y);
    const d = PART_DEFINITIONS[type];
    const ghost = {
      id: 'ghost',
      type,
      x: sx,
      y: sy,
      width: d.width,
      height: d.height,
      mass: 0,
      fuel: 0,
      maxFuel: d.maxFuel,
      thrust: d.thrust,
      isp: d.isp,
      stage: 0,
      active: false,
      ghostValid: false,
      ghostAlpha: 0.5
    };
    ghost.ghostValid = this.validatePlacement(ghost);
    this.dragGhost = ghost;
  }

  placeGhost(stage = 0) {
    if (!this.dragGhost || !this.dragGhost.ghostValid) return false;
    const p = createRocketPart(this.dragGhost.type, this.dragGhost.x, this.dragGhost.y, stage);
    this.rocketParts.push(p);
    this.rebuildConnections();
    return true;
  }

  rebuildConnections() {
    this.rocketParts.forEach((p) => { p.connections = []; });
    for (let i = 0; i < this.rocketParts.length; i++) {
      for (let j = i + 1; j < this.rocketParts.length; j++) {
        const a = this.rocketParts[i];
        const b = this.rocketParts[j];
        if (a.removed || b.removed) continue;
        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);
        const touchingVertically = dx < (a.width + b.width) * 0.5 && Math.abs(dy - (a.height + b.height) * 0.5) <= GRID_SIZE;
        const touchingHorizontally = dy < (a.height + b.height) * 0.5 && Math.abs(dx - (a.width + b.width) * 0.5) <= GRID_SIZE;
        if (touchingVertically || touchingHorizontally) {
          a.connections.push(b.id);
          b.connections.push(a.id);
        }
      }
    }
  }

  validateAssembly() {
    const pod = this.rocketParts.find((p) => p.type === 'pod' && !p.removed);
    if (!pod) return false;
    const seen = new Set([pod.id]);
    const q = [pod.id];
    while (q.length) {
      const id = q.shift();
      const part = this.rocketParts.find((p) => p.id === id && !p.removed);
      if (!part) continue;
      part.connections.forEach((c) => {
        if (!seen.has(c)) {
          seen.add(c);
          q.push(c);
        }
      });
    }
    return this.rocketParts.filter((p) => !p.removed).every((p) => seen.has(p.id));
  }

  serializeRocket() {
    return this.rocketParts.filter((p) => !p.removed).map((p) => ({ ...p }));
  }

  loadRocket(parts) {
    this.rocketParts.length = 0;
    parts.forEach((p) => this.rocketParts.push({ ...p }));
    this.rebuildConnections();
  }
}
