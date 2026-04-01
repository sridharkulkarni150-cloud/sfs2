'use strict';

import { getAABB } from './parts.js';

export const GRID_SIZE = 10;

/** @param {number} value */
export function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

/** @param {Array<any>} parts @param {any} candidate */
export function hasOverlap(parts, candidate) {
  const c = getAABB(candidate);
  return parts.some((part) => {
    if (!part.active || part.separated) return false;
    const b = getAABB(part);
    return !(c.right <= b.left || c.left >= b.right || c.bottom <= b.top || c.top >= b.bottom);
  });
}

/** @param {number} x @param {number} y @param {object} camera @param {HTMLCanvasElement} canvas */
export function screenToWorld(x, y, camera, canvas) {
  const rect = canvas.getBoundingClientRect();
  return { x: (x - rect.left - camera.x) / camera.zoom, y: (y - rect.top - camera.y) / camera.zoom };
}
