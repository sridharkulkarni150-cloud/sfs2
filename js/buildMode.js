'use strict';

import { createPart, getAABB, PART_CATALOG } from './parts.js';
import { emit } from './events.js';

/**
 * Build-mode interactions (drag/drop, snapping, no-overlap checks).
 */
export class BuildController {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.gridSize = 10;
    this.dragType = null;
    this.ghost = null;
  }

  /** @param {number} v */
  snap(v) { return Math.round(v / this.gridSize) * this.gridSize; }

  /**
   * @param {MouseEvent} e
   * @param {{x:number,y:number,zoom:number,panX:number,panY:number}} camera
   */
  worldFromEvent(e, camera) {
    const r = this.canvas.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    return {
      x: (sx - camera.panX) / camera.zoom,
      y: (sy - camera.panY) / camera.zoom
    };
  }

  /**
   * @param {Array<any>} rocketParts
   * @param {any} candidate
   */
  hasOverlap(rocketParts, candidate) {
    const c = getAABB(candidate);
    return rocketParts.some((part) => {
      if (!part.active) return false;
      const p = getAABB(part);
      return !(c.right <= p.left || c.left >= p.right || c.bottom <= p.top || c.top >= p.bottom);
    });
  }

  /**
   * @param {Array<any>} rocketParts
   * @param {any} part
   */
  linkConnections(rocketParts, part) {
    const tolerance = 10;
    rocketParts.forEach((other) => {
      if (!other.active || other.id === part.id) return;
      const dx = Math.abs(other.x - part.x);
      const dy = Math.abs(other.y - part.y);
      if ((dx <= tolerance && dy <= 70) || (dy <= tolerance && dx <= 70)) {
        if (!part.connections.includes(other.id)) part.connections.push(other.id);
        if (!other.connections.includes(part.id)) other.connections.push(part.id);
      }
    });
  }

  /**
   * @param {Array<any>} rocketParts
   * @param {string} type
   * @param {number} x
   * @param {number} y
   */
  placePart(rocketParts, type, x, y) {
    if (!PART_CATALOG[type]) {
      return { ok: false, reason: 'invalid-type' };
    }
    const part = createPart(type, this.snap(x), this.snap(y));
    if (this.hasOverlap(rocketParts, part)) {
      return { ok: false, reason: 'overlap' };
    }
    this.linkConnections(rocketParts, part);
    rocketParts.push(part);
    emit('part-added', { part });
    return { ok: true, part };
  }

  /**
   * Validate all parts connected to command pod.
   * @param {Array<any>} rocketParts
   */
  validateConnectivity(rocketParts) {
    const pod = rocketParts.find((p) => p.type === 'command_pod' && p.active);
    if (!pod) return false;
    const seen = new Set([pod.id]);
    const q = [pod.id];
    while (q.length) {
      const id = q.shift();
      const node = rocketParts.find((p) => p.id === id && p.active);
      if (!node) continue;
      node.connections.forEach((n) => {
        if (!seen.has(n)) {
          seen.add(n);
          q.push(n);
        }
      });
    }
    return rocketParts.filter((p) => p.active).every((p) => seen.has(p.id));
  }
}
