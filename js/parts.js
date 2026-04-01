'use strict';

/**
 * Catalog of available parts with physical parameters.
 */
export const PART_CATALOG = Object.freeze({
  command_pod: { name: 'Command Pod', mass: 800, fuelCapacity: 0, thrust: 0, isp: 0, width: 40, height: 40, cd: 0.3, area: 1.2, color: '#b2b9c9' },
  fuel_tank_small: { name: 'Fuel Tank (Small)', mass: 220, fuelCapacity: 200, thrust: 0, isp: 0, width: 40, height: 60, cd: 0.35, area: 1.4, color: '#e0b36f' },
  fuel_tank_medium: { name: 'Fuel Tank (Medium)', mass: 380, fuelCapacity: 450, thrust: 0, isp: 0, width: 50, height: 90, cd: 0.36, area: 2.2, color: '#d49f4c' },
  engine_titan: { name: 'Engine (Titan)', mass: 320, fuelCapacity: 0, thrust: 180000, isp: 300, width: 44, height: 36, cd: 0.5, area: 1.1, color: '#8db0ff' },
  engine_hawk: { name: 'Engine (Hawk)', mass: 190, fuelCapacity: 0, thrust: 95000, isp: 340, width: 38, height: 28, cd: 0.45, area: 0.8, color: '#79c9ff' },
  separator: { name: 'Separator', mass: 90, fuelCapacity: 0, thrust: 0, isp: 0, width: 50, height: 14, cd: 0.2, area: 0.8, color: '#f4e26f' },
  nose_cone: { name: 'Nose Cone', mass: 70, fuelCapacity: 0, thrust: 0, isp: 0, width: 40, height: 30, cd: 0.12, area: 0.7, color: '#f7f8fb' },
  landing_leg: { name: 'Landing Leg', mass: 40, fuelCapacity: 0, thrust: 0, isp: 0, width: 20, height: 35, cd: 0.25, area: 0.3, color: '#8ecb8f' }
});

let nextId = 1;

/** @returns {string} */
export function newPartId() {
  return `part_${nextId++}`;
}

/**
 * Build default part object for rocketParts array.
 * @param {string} type
 * @param {number} x
 * @param {number} y
 * @param {number} stage
 */
export function createPart(type, x, y, stage = 0) {
  const def = PART_CATALOG[type];
  const dryMass = def.mass;
  return {
    id: newPartId(),
    type,
    x,
    y,
    rotation: 0,
    stage,
    mass: dryMass,
    fuel: def.fuelCapacity,
    connections: [],
    active: true,
    separated: false
  };
}

/**
 * Computes AABB for a part.
 * @param {import('./types.js').RocketPart} p
 */
export function getAABB(p) {
  const def = PART_CATALOG[p.type];
  return {
    left: p.x - def.width / 2,
    right: p.x + def.width / 2,
    top: p.y - def.height / 2,
    bottom: p.y + def.height / 2
  };
}
