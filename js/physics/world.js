'use strict';

export const GRAVITY = 9.81;
export const FIXED_DT = 1 / 60;
export const MAX_FRAME_DT = 0.1;
export const GROUND_Y = 1000;
export const PLANET_RADIUS = 6_371_000;
export const SEA_LEVEL_DENSITY = 1.225;
export const SCALE_HEIGHT = 8500;

/** @param {number} x */
export function groundY(x) {
  return GROUND_Y + (x * x) / (2 * PLANET_RADIUS);
}

/** @param {number} x @param {number} y */
export function altitude(x, y) {
  return groundY(x) - y;
}

/** @param {number} alt */
export function airDensity(alt) {
  return SEA_LEVEL_DENSITY * Math.exp(-Math.max(0, alt) / SCALE_HEIGHT);
}
