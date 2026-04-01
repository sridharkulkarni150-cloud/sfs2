'use strict';

export const GRID_SIZE = 10;

export const PART_DEFINITIONS = Object.freeze({
  pod: { name: 'Command Pod', width: 40, height: 40, mass: 800, maxFuel: 0, thrust: 0, isp: 0, color: '#b4bbc9', cd: 0.3, area: 1.2 },
  'tank-small': { name: 'Fuel Tank (Small)', width: 40, height: 60, mass: 220, maxFuel: 200, thrust: 0, isp: 0, color: '#deaa65', cd: 0.35, area: 1.4 },
  'tank-medium': { name: 'Fuel Tank (Medium)', width: 50, height: 90, mass: 380, maxFuel: 450, thrust: 0, isp: 0, color: '#ce9440', cd: 0.36, area: 2.2 },
  'engine-titan': { name: 'Engine Titan', width: 44, height: 36, mass: 320, maxFuel: 0, thrust: 180000, isp: 300, color: '#7ea8ff', cd: 0.5, area: 1.1 },
  'engine-hawk': { name: 'Engine Hawk', width: 38, height: 28, mass: 190, maxFuel: 0, thrust: 95000, isp: 340, color: '#78c6ff', cd: 0.45, area: 0.8 },
  separator: { name: 'Separator', width: 50, height: 14, mass: 90, maxFuel: 0, thrust: 0, isp: 0, color: '#f1e061', cd: 0.2, area: 0.8 },
  nose: { name: 'Nose Cone', width: 40, height: 30, mass: 70, maxFuel: 0, thrust: 0, isp: 0, color: '#f8f9fc', cd: 0.12, area: 0.7 },
  leg: { name: 'Landing Leg', width: 20, height: 35, mass: 40, maxFuel: 0, thrust: 0, isp: 0, color: '#8fc790', cd: 0.25, area: 0.3 }
});

let nextId = 1;

export function createRocketPart(type, x, y, stage = 0) {
  const d = PART_DEFINITIONS[type];
  return {
    id: `part_${nextId++}`,
    type,
    x,
    y,
    width: d.width,
    height: d.height,
    mass: d.mass,
    fuel: d.maxFuel,
    maxFuel: d.maxFuel,
    thrust: d.thrust,
    isp: d.isp,
    stage,
    active: d.thrust > 0 ? stage === 0 : false,
    rotation: 0,
    vx: 0,
    vy: 0,
    attached: true,
    removed: false,
    connections: []
  };
}

export function getAABB(part) {
  return {
    left: part.x - part.width / 2,
    right: part.x + part.width / 2,
    top: part.y - part.height / 2,
    bottom: part.y + part.height / 2
  };
}
