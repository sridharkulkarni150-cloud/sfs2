'use strict';

import { BuildSystem } from './buildSystem.js';
import { CameraController } from './camera.js';
import { emit, on } from './events.js';
import { PART_CATALOG } from './parts.js';
import { PhysicsEngine } from './physicsEngine.js';
import { Renderer } from './renderer.js';
import { Rocket } from './rocket.js';
import { StageController } from './staging.js';
import { GameState, StateManager } from './stateManager.js';
import { UI } from './ui.js';

const canvas = document.getElementById('gameCanvas');
const renderer = new Renderer(canvas);
const ui = new UI();
const physics = new PhysicsEngine();
const rocket = new Rocket();
const build = new BuildSystem(canvas);
const camera = new CameraController();
const stages = new StageController();
const stateManager = StateManager.instance();

camera.bind(canvas);
let ghostPart = null;
let lastFrame = performance.now();

function calculateCOT(parts) {
  let tx = 0, ty = 0, tt = 0;
  for (const p of parts) {
    const d = PART_CATALOG[p.type];
    if (d.thrust > 0 && p.engineActive) {
      tx += p.x * d.thrust;
      ty += p.y * d.thrust;
      tt += d.thrust;
    }
  }
  return tt > 0 ? { x: tx / tt, y: ty / tt } : null;
}

function saveRocket() {
  localStorage.setItem('rocket-save', rocket.serialize());
}

function loadRocket() {
  const raw = localStorage.getItem('rocket-save');
  if (!raw) return;
  rocket.deserialize(raw);
}

function launch() {
  const parts = rocket.getParts();
  if (!build.validateConnectivity(parts)) {
    alert('All parts must connect to command pod before launch.');
    return;
  }
  const start = rocket.initializeFlight();
  if (!start) return;
  physics.state.x = start.x;
  physics.state.y = start.y;
  physics.state.vx = 0;
  physics.state.vy = 0;
  stateManager.setState(GameState.FLIGHT_MODE);
  camera.follow = true;
}

ui.initPalette((type) => { build.dragType = type; });
ui.bindShortcuts(() => stages.fire(rocket.getParts()), () => camera.autoCenter(canvas, physics.state.x, physics.state.y), (delta) => {
  const value = Math.max(0, Math.min(100, Number(ui.throttle.value) + delta));
  ui.throttle.value = String(value);
  physics.state.throttle = value / 100;
});

canvas.addEventListener('mousemove', (e) => {
  if (!build.dragType || stateManager.state !== GameState.BUILD_MODE) {
    ghostPart = null;
    return;
  }
  const w = build.worldFromEvent(e, camera);
  const sx = build.snap(w.x);
  const sy = build.snap(w.y);
  const snapped = Math.abs(sx - w.x) < 5 && Math.abs(sy - w.y) < 5;
  ghostPart = build.createDragGhost(build.dragType, sx, sy, snapped);
});

canvas.addEventListener('click', (e) => {
  if (!build.dragType || stateManager.state !== GameState.BUILD_MODE) return;
  const w = build.worldFromEvent(e, camera);
  const result = build.placePart(rocket.getParts(), build.dragType, w.x, w.y);
  if (result.ok) {
    ghostPart = null;
  }
});

ui.launchBtn.addEventListener('click', launch);
ui.resetBtn.addEventListener('click', () => {
  rocket.reset();
  stages.reset();
  physics.state = { x: 0, y: 120, vx: 0, vy: 0, ax: 0, ay: 0, angle: 0, throttle: 0, gForce: 1, apoapsis: 0, periapsis: 0 };
  stateManager.setState(GameState.BUILD_MODE);
  camera.follow = false;
});
ui.saveBtn.addEventListener('click', saveRocket);
ui.loadBtn.addEventListener('click', loadRocket);
ui.stageBtn.addEventListener('click', () => stages.fire(rocket.getParts()));
ui.throttle.addEventListener('input', () => { physics.state.throttle = Number(ui.throttle.value) / 100; });

on('state-changed', (evt) => ui.setMode(evt.detail.next));
on('stage-fired', () => {
  rocket.getParts().filter((p) => PART_CATALOG[p.type].thrust > 0).forEach((p) => renderer.emitParticles(p.x, p.y + 20, 20, '#ff9955', 100));
});

function tick(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;

  if (stateManager.state === GameState.FLIGHT_MODE || stateManager.state === GameState.ORBIT) {
    physics.update(now, rocket, (s) => stateManager.setState(s), (impact) => {
      renderer.emitParticles(physics.state.x, physics.state.y, Math.min(220, Math.round(impact * 8)), '#ff663a', 180);
    });
    rocket.getParts().filter((p) => PART_CATALOG[p.type].thrust > 0 && p.engineActive && physics.state.throttle > 0 && !p.separated)
      .forEach((p) => renderer.emitParticles(p.x, p.y + 18, 2, '#ffd37a', 45));
  }

  camera.tickFollow(canvas, physics.state.x, physics.state.y);
  renderer.updateParticles(dt);
  const assembly = rocket.getConnectedAssembly();
  const metrics = physics.computeMetrics(assembly);
  ui.updateMetrics(metrics);
  ui.updateTelemetry({
    state: physics.state,
    groundHeightAt: physics.groundHeightAt.bind(physics)
  });
  renderer.render({
    camera,
    rocketParts: rocket.getParts(),
    sim: { state: physics.state, planet: { surfaceGravity: physics.planet.gravity }, groundHeightAt: physics.groundHeightAt.bind(physics) },
    ghostPart,
    com: rocket.computeCOM(assembly),
    cot: calculateCOT(assembly),
    mode: stateManager.state
  });
  requestAnimationFrame(tick);
}

emit('state-changed', { prev: null, next: GameState.BUILD_MODE });
requestAnimationFrame(tick);
