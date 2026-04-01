'use strict';

import { createPart, getAABB, PART_CATALOG } from './parts.js';
import { emit } from './events.js';

export class BuildSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.gridSize = 10;
    this.dragType = null;
    this.ghost = null;
  }

  snap(v) {
    return Math.round(v / this.gridSize) * this.gridSize;
  }

  worldFromEvent(e, camera) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left - camera.panX) / camera.zoom,
      y: (e.clientY - r.top - camera.panY) / camera.zoom
    };
  }

  createDragGhost(partType, x, y, snapped) {
    if (!PART_CATALOG[partType]) return null;
    return {
      id: 'ghost',
      type: partType,
      x,
      y,
      rotation: 0,
      stage: 0,
      mass: 0,
      fuel: 0,
      connections: [],
      ghostOpacity: snapped ? 0.5 : 0.85
    };
  }

  hasOverlap(parts, candidate) {
    const c = getAABB(candidate);
    return parts.some((part) => {
      if (!part.active || part.separated) return false;
      const b = getAABB(part);
      return !(c.right <= b.left || c.left >= b.right || c.bottom <= b.top || c.top >= b.bottom);
    });
  }

  linkConnections(parts, part) {
    const t = 10;
    for (const other of parts) {
      if (!other.active || other.id === part.id) continue;
      const dx = Math.abs(other.x - part.x);
      const dy = Math.abs(other.y - part.y);
      if ((dx <= t && dy <= 80) || (dy <= t && dx <= 80)) {
        if (!part.connections.includes(other.id)) part.connections.push(other.id);
        if (!other.connections.includes(part.id)) other.connections.push(part.id);
      }
    }
  }

  placePart(parts, type, x, y) {
    if (!PART_CATALOG[type]) return { ok: false, reason: 'invalid-type' };
    const part = createPart(type, this.snap(x), this.snap(y), 0);
    if (this.hasOverlap(parts, part)) return { ok: false, reason: 'overlap' };
    this.linkConnections(parts, part);
    parts.push(part);
    emit('part-added', { part });
    return { ok: true, part };
  }

  validateConnectivity(parts) {
    const pod = parts.find((p) => p.type === 'command_pod' && p.active);
    if (!pod) return false;
    const seen = new Set([pod.id]);
    const q = [pod.id];
    while (q.length) {
      const id = q.shift();
      const n = parts.find((p) => p.id === id && p.active);
      if (!n) continue;
      for (const c of n.connections) {
        if (!seen.has(c)) {
          seen.add(c);
          q.push(c);
        }
      }
    }
    return parts.filter((p) => p.active).every((p) => seen.has(p.id));
  }
}
