'use strict';

import { BuildSystem } from './buildSystem.js';
import { InputHandler } from './input.js';
import { createRocketPart, PART_DEFINITIONS } from './parts.js';
import { PhysicsEngine } from './physicsEngine.js';
import { Renderer } from './renderer.js';
import { Rocket } from './rocket.js';
import { GameState, StateManager } from './stateManager.js';

const rocketParts = [createRocketPart('pod', 0, 900, 2)];
const state = new StateManager();
const buildSystem = new BuildSystem(rocketParts);
const physics = new PhysicsEngine();
const rocket = new Rocket(rocketParts);

const canvas = document.getElementById('gameCanvas');
const telemetryEl = document.getElementById('telemetry');
const modeEl = document.getElementById('modeIndicator');
const renderer = new Renderer(canvas, telemetryEl);
const controls = {
  launch: document.getElementById('launchBtn'),
  reset: document.getElementById('resetBtn'),
  save: document.getElementById('saveBtn'),
  load: document.getElementById('loadBtn'),
  stage: document.getElementById('stageBtn'),
  throttle: document.getElementById('throttle')
};

const input = new InputHandler(canvas, buildSystem, state);
input.bind(renderer.camera, controls);

Object.entries(PART_DEFINITIONS).forEach(([type, d]) => {
  const card = document.createElement('div');
  card.className = 'part-card';
  card.innerHTML = `<strong>${d.name}</strong><div>${d.width}x${d.height}</div>`;
  card.addEventListener('click', () => { buildSystem.selectedType = type; });
  document.getElementById('palette').appendChild(card);
});

let currentStage = 0;
let last = performance.now();

function updateModeLabel() {
  modeEl.textContent = state.mode.replace('_MODE', '');
  modeEl.className = `mode-${state.mode}`;
}

controls.launch.addEventListener('click', () => {
  buildSystem.rebuildConnections();
  if (!buildSystem.validateAssembly()) {
    alert('Rocket parts must be connected to the command pod.');
    return;
  }
  physics.initRocket(buildSystem.serializeRocket());
  rocketParts.length = 0;
  physics.rocketParts.forEach((p) => rocketParts.push(p));
  state.transitionTo(GameState.FLIGHT_MODE);
  updateModeLabel();
});

controls.reset.addEventListener('click', () => {
  rocketParts.length = 0;
  rocketParts.push(createRocketPart('pod', 0, 900, 2));
  buildSystem.rebuildConnections();
  currentStage = 0;
  input.throttle = 0;
  controls.throttle.value = '0';
  state.transitionTo(GameState.BUILD_MODE);
  updateModeLabel();
});

controls.save.addEventListener('click', () => {
  localStorage.setItem('rocket-save', JSON.stringify(buildSystem.serializeRocket()));
});

controls.load.addEventListener('click', () => {
  const raw = localStorage.getItem('rocket-save');
  if (!raw) return;
  buildSystem.loadRocket(JSON.parse(raw));
});

controls.stage.addEventListener('click', () => {
  if (state.mode === GameState.FLIGHT_MODE) {
    physics.separateStage(currentStage);
    currentStage += 1;
  }
});

state.on('stage', () => {
  if (state.mode === GameState.FLIGHT_MODE) {
    physics.separateStage(currentStage);
    currentStage += 1;
  }
});

state.on('delete-part', () => {
  if (state.mode !== GameState.BUILD_MODE) return;
  const lastPart = rocketParts[rocketParts.length - 1];
  if (lastPart && lastPart.type !== 'pod') rocketParts.pop();
});

function emitEngineParticles() {
  const attachedEngines = rocketParts.filter((p) => p.attached && p.active && p.thrust > 0 && input.throttle > 0);
  attachedEngines.forEach((e) => {
    renderer.particles.push({ x: e.x, y: e.y + e.height / 2, vx: (Math.random() - 0.5) * 20, vy: 80 + Math.random() * 80, life: 0.4, color: Math.random() > 0.5 ? '#ffbf66' : '#ff7f50' });
  });
}

function updateParticles(dt) {
  renderer.particles.forEach((p) => {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  });
  renderer.particles = renderer.particles.filter((p) => p.life > 0);
}

function tick(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  if (state.mode === GameState.FLIGHT_MODE) {
    physics.body.angle += input.rotationInput * 0.8 * dt;
    physics.update(dt, input.throttle, null);
    const t = physics.getTelemetry();
    renderer.camera.zoom = Math.min(3, Math.max(0.5, 1.2 - t.altitude / 8000));
    const com = rocket.computeCOM(rocket.attachedParts());
    renderer.camera.x += ((canvas.clientWidth * 0.5 - com.x * renderer.camera.zoom) - renderer.camera.x) * 0.1;
    renderer.camera.y += ((canvas.clientHeight * 0.6 - com.y * renderer.camera.zoom) - renderer.camera.y) * 0.1;
    emitEngineParticles();
    if (t.crashed) {
      for (let i = 0; i < 140; i++) {
        renderer.particles.push({ x: physics.body.x, y: physics.body.y, vx: (Math.random() - 0.5) * 250, vy: (Math.random() - 0.5) * 250, life: 1.2, color: '#ff5533' });
      }
      state.transitionTo(GameState.CRASHED);
      updateModeLabel();
    }
  }

  updateParticles(dt);

  if (state.mode === GameState.BUILD_MODE) {
    renderer.renderBuildMode(rocketParts, buildSystem.dragGhost);
  } else {
    renderer.renderFlightMode(rocketParts, renderer.camera, renderer.particles, physics.flashTimer);
  }
  renderer.renderUI(physics.getTelemetry());
  requestAnimationFrame(tick);
}

updateModeLabel();
requestAnimationFrame(tick);
