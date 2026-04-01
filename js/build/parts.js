'use strict';

export const PART_CATALOG = Object.freeze({
  command_pod: { name: 'Command Pod', mass: 800, fuelCapacity: 0, thrust: 0, isp: 0, width: 40, height: 40, color: '#b4bbc9', cd: 0.3, area: 1.2 },
  fuel_tank_small: { name: 'Fuel Tank Small', mass: 220, fuelCapacity: 200, thrust: 0, isp: 0, width: 40, height: 60, color: '#deaa65', cd: 0.35, area: 1.4 },
  fuel_tank_medium: { name: 'Fuel Tank Medium', mass: 380, fuelCapacity: 450, thrust: 0, isp: 0, width: 50, height: 90, color: '#ce9440', cd: 0.36, area: 2.2 },
  engine_titan: { name: 'Engine Titan', mass: 320, fuelCapacity: 0, thrust: 180000, isp: 300, width: 44, height: 36, color: '#7ea8ff', cd: 0.5, area: 1.1 },
  engine_hawk: { name: 'Engine Hawk', mass: 190, fuelCapacity: 0, thrust: 95000, isp: 340, width: 38, height: 28, color: '#78c6ff', cd: 0.45, area: 0.8 },
  separator: { name: 'Separator', mass: 90, fuelCapacity: 0, thrust: 0, isp: 0, width: 50, height: 14, color: '#f1e061', cd: 0.2, area: 0.8 },
  nose_cone: { name: 'Nose Cone', mass: 70, fuelCapacity: 0, thrust: 0, isp: 0, width: 40, height: 30, color: '#f8f9fc', cd: 0.12, area: 0.7 },
  landing_leg: { name: 'Landing Leg', mass: 40, fuelCapacity: 0, thrust: 0, isp: 0, width: 20, height: 35, color: '#8fc790', cd: 0.25, area: 0.3 }
});

let nextPartId = 1;

/** @param {string} type @param {number} x @param {number} y @param {number} stage */
export function createPart(type, x, y, stage = 0) {
  const d = PART_CATALOG[type];
  return { id: `p_${nextPartId++}`, type, x, y, rotation: 0, stage, mass: d.mass, fuel: d.fuelCapacity, connections: [], active: true, separated: false };
}

/** @param {any} part */
export function getAABB(part) {
  const d = PART_CATALOG[part.type];
  return { left: part.x - d.width / 2, right: part.x + d.width / 2, top: part.y - d.height / 2, bottom: part.y + d.height / 2 };
}
