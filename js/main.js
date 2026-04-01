'use strict';

import { Assembly } from './build/assembly.js';
import { PART_CATALOG } from './build/parts.js';
import { screenToWorld } from './build/grid.js';
import { RocketPhysics } from './physics/rocketPhysics.js';
import { altitude, groundY } from './physics/world.js';
import { Camera } from './render/camera.js';
import { setupCanvas } from './render/canvas.js';
import { drawPart } from './render/parts.js';
import { GameState, StateManager } from './stateManager.js';
import { BuildUI } from './ui/buildUI.js';
import { bindControls } from './ui/controls.js';
import { renderTelemetry } from './ui/telemetry.js';

const canvas = document.getElementById('gameCanvas');
const { ctx } = setupCanvas(canvas);
const state = new StateManager();
const assembly = new Assembly();
const physics = new RocketPhysics();
const camera = new Camera();
const buildUI = new BuildUI(document.getElementById('palette'));
const telemetryEl = document.getElementById('telemetry');
const modeEl = document.getElementById('modeIndicator');
const particles = [];
let currentStage = 0;

camera.bind(canvas);
buildUI.initPalette();

function setMode(next) {
  state.set(next);
  modeEl.textContent = next.replace('_MODE', '');
  modeEl.className = `mode-${next}`;
}

function launch() {
  if (!assembly.validateConnectivity()) {
    alert('Rocket must be connected to command pod.');
    return;
  }
  const root = assembly.setupRigidOffsets();
  physics.body.x = root.x;
  physics.body.y = root.y;
  physics.body.vx = 0;
  physics.body.vy = 0;
  camera.follow = true;
  currentStage = 0;
  setMode(GameState.FLIGHT_MODE);
}

function stage() {
  const staged = assembly.parts.filter((p) => p.active && !p.separated && p.stage === currentStage);
  staged.forEach((p) => {
    p.separated = true;
    p.vx = physics.body.vx;
    p.vy = physics.body.vy + 3;
    p.engineActive = false;
  });
  currentStage += 1;
  assembly.parts.filter((p) => p.active && !p.separated && p.stage === currentStage).forEach((p) => {
    if (PART_CATALOG[p.type].thrust > 0) p.engineActive = true;
  });
}

bindControls({
  launchBtn: document.getElementById('launchBtn'),
  resetBtn: document.getElementById('resetBtn'),
  saveBtn: document.getElementById('saveBtn'),
  loadBtn: document.getElementById('loadBtn'),
  stageBtn: document.getElementById('stageBtn'),
  throttle: document.getElementById('throttle')
}, {
  onLaunch: launch,
  onReset: () => { assembly.reset(); setMode(GameState.BUILD_MODE); physics.throttle = 0; camera.follow = false; },
  onSave: () => localStorage.setItem('rocket-save', assembly.serialize()),
  onLoad: () => { const raw = localStorage.getItem('rocket-save'); if (raw) assembly.deserialize(raw); },
  onStage: stage,
  onThrottle: (v) => { physics.throttle = v; },
  onThrottleDelta: (delta) => {
    const input = document.getElementById('throttle');
    const value = Math.max(0, Math.min(100, Number(input.value) + delta));
    input.value = String(value);
    physics.throttle = value / 100;
  },
  onCenter: () => { camera.x = -physics.body.x * camera.zoom + canvas.clientWidth * 0.5; camera.y = -physics.body.y * camera.zoom + canvas.clientHeight * 0.6; }
});

canvas.addEventListener('mousemove', (e) => {
  if (state.state !== GameState.BUILD_MODE) return;
  const w = screenToWorld(e.clientX, e.clientY, camera, canvas);
  const preview = { ...w, type: buildUI.selectedType, rotation: 0, stage: 0 };
  let valid = Boolean(buildUI.selectedType);
  if (buildUI.selectedType) {
    const d = PART_CATALOG[buildUI.selectedType];
    const candidate = { ...preview, x: Math.round(w.x / 10) * 10, y: Math.round(w.y / 10) * 10, mass: d.mass, fuel: d.fuelCapacity, connections: [], active: true, separated: false };
    valid = !assembly.parts.some((p) => {
      const a = { left: p.x - PART_CATALOG[p.type].width / 2, right: p.x + PART_CATALOG[p.type].width / 2, top: p.y - PART_CATALOG[p.type].height / 2, bottom: p.y + PART_CATALOG[p.type].height / 2 };
      const b = { left: candidate.x - d.width / 2, right: candidate.x + d.width / 2, top: candidate.y - d.height / 2, bottom: candidate.y + d.height / 2 };
      return !(b.right <= a.left || b.left >= a.right || b.bottom <= a.top || b.top >= a.bottom);
    });
  }
  buildUI.updateGhost(w.x, w.y, valid);
});

canvas.addEventListener('click', (e) => {
  if (state.state !== GameState.BUILD_MODE || !buildUI.selectedType) return;
  const w = screenToWorld(e.clientX, e.clientY, camera, canvas);
  if (assembly.place(buildUI.selectedType, w.x, w.y)) {
    buildUI.selectedType = null;
    buildUI.ghost = null;
  }
});

function emitExplosion(x, y) {
  for (let i = 0; i < 120; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 50 + Math.random() * 220;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1.4, color: '#ff7448' });
  }
}

function renderBackground() {
  ctx.fillStyle = '#060b18';
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  ctx.fillStyle = '#d7e7ff';
  for (let i = 0; i < 90; i++) ctx.fillRect(((i * 97) % canvas.clientWidth) - camera.x * 0.05, ((i * 53) % canvas.clientHeight) - camera.y * 0.05, 1, 1);
}

function renderGrid() {
  if (state.state !== GameState.BUILD_MODE) return;
  ctx.strokeStyle = 'rgba(120,160,230,0.18)';
  ctx.lineWidth = 1 / camera.zoom;
  ctx.beginPath();
  const sx = -camera.x / camera.zoom;
  const sy = -camera.y / camera.zoom;
  const ex = sx + canvas.clientWidth / camera.zoom;
  const ey = sy + canvas.clientHeight / camera.zoom;
  for (let x = Math.floor(sx / 10) * 10; x <= ex; x += 10) { ctx.moveTo(x, sy); ctx.lineTo(x, ey); }
  for (let y = Math.floor(sy / 10) * 10; y <= ey; y += 10) { ctx.moveTo(sx, y); ctx.lineTo(ex, y); }
  ctx.stroke();
}

function renderWorld() {
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);
  renderGrid();
  ctx.fillStyle = '#35553a';
  ctx.beginPath();
  const left = -camera.x / camera.zoom - 100;
  const right = left + canvas.clientWidth / camera.zoom + 200;
  ctx.moveTo(left, groundY(left));
  for (let x = left; x <= right; x += 25) ctx.lineTo(x, groundY(x));
  ctx.lineTo(right, 2500);
  ctx.lineTo(left, 2500);
  ctx.closePath();
  ctx.fill();

  assembly.parts.filter((p) => p.active).forEach((p) => drawPart(ctx, p));
  if (buildUI.ghost) {
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = buildUI.ghost.ghostColor;
    drawPart(ctx, buildUI.ghost);
    ctx.globalAlpha = 1;
  }

  particles.forEach((p) => {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 2, 2);
  });
  ctx.restore();
}

function tick(now) {
  const attached = assembly.parts.filter((p) => p.active && !p.separated);
  const detached = assembly.parts.filter((p) => p.active && p.separated);

  if (state.state === GameState.FLIGHT_MODE || state.state === GameState.ORBIT) {
    physics.update(now, attached, detached, () => {
      emitExplosion(physics.body.x, physics.body.y);
      setMode(GameState.CRASHED);
    });
    assembly.applyTransform(physics.body.x, physics.body.y, physics.body.angle);
    const alt = altitude(physics.body.x, physics.body.y);
    if (alt > 100000) setMode(GameState.ORBIT);
    camera.updateZoomByAltitude(alt);
  }

  camera.updateFollow(physics.body.x, physics.body.y, canvas.clientHeight);
  particles.forEach((p) => { p.life -= 1 / 60; p.x += p.vx / 60; p.y += p.vy / 60; p.vy += 20 / 60; });
  while (particles.length && particles[0].life <= 0) particles.shift();

  renderBackground();
  renderWorld();

  const metrics = physics.computeMetrics(attached);
  renderTelemetry(telemetryEl, {
    altitude: altitude(physics.body.x, physics.body.y),
    vx: physics.body.vx,
    vy: physics.body.vy,
    accel: Math.hypot(physics.body.ax, physics.body.ay),
    gForce: physics.gForce,
    mass: metrics.totalMass,
    deltaV: metrics.deltaV,
    twr: metrics.twr,
    apo: physics.apoapsis,
    peri: physics.periapsis
  });

  requestAnimationFrame(tick);
}

setMode(GameState.BUILD_MODE);
requestAnimationFrame(tick);
