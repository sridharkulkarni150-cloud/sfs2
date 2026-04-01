'use strict';

import { createPart, PART_CATALOG } from './parts.js';
import { hasOverlap, snapToGrid } from './grid.js';

export class Assembly {
  constructor() {
    this.parts = [createPart('command_pod', 0, 900, 2)];
    this.rootId = this.parts[0].id;
  }

  reset() {
    this.parts = [createPart('command_pod', 0, 900, 2)];
    this.rootId = this.parts[0].id;
  }

  serialize() { return JSON.stringify(this.parts); }
  deserialize(raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) this.parts = parsed; }

  place(type, x, y) {
    const p = createPart(type, snapToGrid(x), snapToGrid(y), 0);
    if (hasOverlap(this.parts, p)) return false;
    this.parts.push(p);
    this.rebuildConnections();
    return true;
  }

  rebuildConnections() {
    this.parts.forEach((p) => { p.connections = []; });
    const TOLERANCE = 10;
    for (let i = 0; i < this.parts.length; i++) {
      for (let j = i + 1; j < this.parts.length; j++) {
        const a = this.parts[i];
        const b = this.parts[j];
        if (!a.active || !b.active) continue;
        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);
        if ((dx <= TOLERANCE && dy <= 90) || (dy <= TOLERANCE && dx <= 90)) {
          a.connections.push(b.id);
          b.connections.push(a.id);
        }
      }
    }
  }

  validateConnectivity() {
    const root = this.parts.find((p) => p.type === 'command_pod' && p.active);
    if (!root) return false;
    const seen = new Set([root.id]);
    const q = [root.id];
    while (q.length) {
      const id = q.shift();
      const n = this.parts.find((p) => p.id === id && p.active);
      if (!n) continue;
      n.connections.forEach((c) => { if (!seen.has(c)) { seen.add(c); q.push(c); } });
    }
    return this.parts.filter((p) => p.active).every((p) => seen.has(p.id));
  }

  setupRigidOffsets() {
    const root = this.parts.find((p) => p.id === this.rootId) || this.parts[0];
    this.rootId = root.id;
    for (const part of this.parts) {
      part.localX = part.x - root.x;
      part.localY = part.y - root.y;
      part.engineActive = PART_CATALOG[part.type].thrust > 0 ? part.stage === 0 : false;
      part.vx = part.vx || 0;
      part.vy = part.vy || 0;
      part.separated = Boolean(part.separated);
      part.active = part.active !== false;
    }
    return { x: root.x, y: root.y };
  }

  /** @param {number} rootX @param {number} rootY @param {number} angle */
  applyTransform(rootX, rootY, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (const p of this.parts.filter((part) => part.active && !part.separated)) {
      const rx = p.localX * cos - p.localY * sin;
      const ry = p.localX * sin + p.localY * cos;
      p.x = rootX + rx;
      p.y = rootY + ry;
      p.rotation = angle;
    }
  }
}
