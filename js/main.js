'use strict';

import { BuildController } from './buildMode.js';
import { CameraController } from './camera.js';
import { emit, on } from './events.js';
import { computeMassAndEngine, FlightSimulator } from './flightPhysics.js';
import { PART_CATALOG, createPart } from './parts.js';
import { Renderer } from './renderer.js';
import { StageController } from './staging.js';
import { GameState, StateManager } from './stateManager.js';
import { UI } from './ui.js';

const canvas = document.getElementById('gameCanvas');
const renderer = new Renderer(canvas);
const ui = new UI();
const sim = new FlightSimulator();
const build = new BuildController(canvas);
const camera = new CameraController();
const stages = new StageController();
const stateManager = StateManager.instance();

camera.bind(canvas);

/** @type {Array<any>} */
let rocketParts = [createPart('command_pod', 0, 120, 2)];
let dragType = null;
let ghostPart = null;
let lastFrame = performance.now();

function recalcConnections() {
  const ids = new Map(rocketParts.map((p) => [p.id, p]));
  rocketParts.forEach((p) => { p.connections = p.connections.filter((id) => ids.has(id)); });
}

function calcCOM() {
  let mx = 0; let my = 0; let tm = 0;
  rocketParts.filter((p) => p.active && !p.separated).forEach((p) => {
    const d = PART_CATALOG[p.type];
    const m = p.mass + p.fuel * 0.8;
    mx += p.x * m;
    my += p.y * m;
    tm += m;
  });
  return tm > 0 ? { x: mx / tm, y: my / tm } : null;
}

function calcCOT() {
  let tx = 0; let ty = 0; let tt = 0;
  rocketParts.filter((p) => p.active).forEach((p) => {
    const d = PART_CATALOG[p.type];
    if (d.thrust <= 0 || p.engineActive === false) return;
    tx += p.x * d.thrust;
    ty += p.y * d.thrust;
    tt += d.thrust;
  });
  return tt > 0 ? { x: tx / tt, y: ty / tt } : null;
}

function resetRocket() {
  rocketParts = [createPart('command_pod', 0, 120, 2)];
  sim.state = { x: 0, y: 120, vx: 0, vy: 0, ax: 0, ay: 0, angle: 0, angVel: 0, throttle: 0, gForce: 1, apoapsis: 0, periapsis: 0 };
  stateManager.setState(GameState.BUILD_MODE);
  stages.reset();
}

function saveRocket() {
  localStorage.setItem('rocket-save', JSON.stringify(rocketParts));
}

function loadRocket() {
  const raw = localStorage.getItem('rocket-save');
  if (!raw) return;
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return;
  rocketParts = parsed;
  recalcConnections();
}

function launch() {
  if (!build.validateConnectivity(rocketParts)) {
    alert('All parts must connect to the command pod before launch.');
    return;
  }
  stateManager.setState(GameState.FLIGHT_MODE);
  camera.follow = true;
  const pod = rocketParts.find((p) => p.type === 'command_pod' && p.active);
  if (pod) {
    sim.state.x = pod.x;
    sim.state.y = pod.y;
  }
  rocketParts.forEach((p) => {
    const d = PART_CATALOG[p.type];
    p.engineActive = d.thrust > 0 ? p.stage === 0 : undefined;
  });
}

ui.initPalette((type) => { dragType = type; });
ui.bindShortcuts(() => stages.fire(rocketParts), () => camera.autoCenter(canvas, sim.state.x, sim.state.y), (delta) => {
  const value = Math.max(0, Math.min(100, Number(ui.throttle.value) + delta));
  ui.throttle.value = String(value);
  sim.state.throttle = value / 100;
});

canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', (e) => {
  if (stateManager.state !== GameState.BUILD_MODE || !dragType) return;
  const w = build.worldFromEvent(e, camera);
  build.placePart(rocketParts, dragType, w.x, w.y);
  dragType = null;
  ghostPart = null;
});
canvas.addEventListener('mousemove', (e) => {
  if (!dragType || stateManager.state !== GameState.BUILD_MODE) {
    ghostPart = null;
    return;
  }
  const w = build.worldFromEvent(e, camera);
  ghostPart = createPart(dragType, build.snap(w.x), build.snap(w.y), 0);
});

ui.launchBtn.addEventListener('click', launch);
ui.resetBtn.addEventListener('click', resetRocket);
ui.saveBtn.addEventListener('click', saveRocket);
ui.loadBtn.addEventListener('click', loadRocket);
ui.stageBtn.addEventListener('click', () => stages.fire(rocketParts));
ui.throttle.addEventListener('input', () => { sim.state.throttle = Number(ui.throttle.value) / 100; });
ui.rcsToggle.addEventListener('change', () => {});

on('state-changed', (evt) => ui.setMode(evt.detail.next));
on('stage-fired', () => {
  const engines = rocketParts.filter((p) => PART_CATALOG[p.type].thrust > 0 && p.engineActive);
  engines.forEach((p) => renderer.emitParticles(p.x, p.y - 15, 30, '#ffa75e', 80));
});

function tick(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;

  if (stateManager.state === GameState.FLIGHT_MODE || stateManager.state === GameState.ORBIT) {
    sim.update(now, rocketParts, (s) => stateManager.setState(s), (impact) => {
      renderer.emitParticles(sim.state.x, sim.state.y, Math.min(220, Math.round(impact * 8)), '#ff663a', 170);
    });
    rocketParts.filter((p) => p.active && PART_CATALOG[p.type].thrust > 0 && p.engineActive && sim.state.throttle > 0).forEach((p) => {
      renderer.emitParticles(p.x, p.y - 18, 2, '#ffd37a', 45);
    });
    const pod = rocketParts.find((p) => p.type === 'command_pod' && p.active);
    if (pod) {
      pod.x = sim.state.x;
      pod.y = sim.state.y;
    }
  }

  camera.tickFollow(canvas, sim.state.x, sim.state.y);
  renderer.updateParticles(dt);
  const metrics = computeMassAndEngine(rocketParts.filter((p) => p.active && !p.separated), sim.state.throttle);
  ui.updateMetrics(metrics);
  ui.updateTelemetry(sim);
  renderer.render({
    camera,
    rocketParts,
    sim,
    gameState: stateManager.state,
    ghostPart,
    com: calcCOM(),
    cot: calcCOT(),
    mode: stateManager.state
  });
  requestAnimationFrame(tick);
}

emit('state-changed', { prev: null, next: GameState.BUILD_MODE });
requestAnimationFrame(tick);
