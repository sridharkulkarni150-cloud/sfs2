'use strict';

import { GRID_SIZE, PART_DEFINITIONS } from './parts.js';

export class Renderer {
  constructor(canvas, hudTelemetryEl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hudTelemetryEl = hudTelemetryEl;
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.particles = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(this.canvas.clientWidth * dpr);
    this.canvas.height = Math.floor(this.canvas.clientHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  drawPart(part, ghost = false) {
    const ctx = this.ctx;
    const def = PART_DEFINITIONS[part.type];
    ctx.save();
    ctx.translate(part.x, part.y);
    ctx.rotate(part.rotation || 0);
    ctx.fillStyle = ghost ? (part.ghostValid ? '#58ff8a' : '#ff5c5c') : def.color;
    if (part.type === 'nose') {
      ctx.beginPath();
      ctx.moveTo(0, -def.height / 2);
      ctx.lineTo(-def.width / 2, def.height / 2);
      ctx.lineTo(def.width / 2, def.height / 2);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(-def.width / 2, -def.height / 2, def.width, def.height);
    }
    ctx.restore();
  }

  renderBuildMode(rocketParts, dragGhost) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    ctx.fillStyle = '#070d1a';
    ctx.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    ctx.save();
    ctx.translate(this.camera.x, this.camera.y);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.strokeStyle = 'rgba(120,160,230,0.2)';
    ctx.lineWidth = 1 / this.camera.zoom;
    ctx.beginPath();
    const sx = -this.camera.x / this.camera.zoom;
    const sy = -this.camera.y / this.camera.zoom;
    const ex = sx + this.canvas.clientWidth / this.camera.zoom;
    const ey = sy + this.canvas.clientHeight / this.camera.zoom;
    for (let x = Math.floor(sx / GRID_SIZE) * GRID_SIZE; x <= ex; x += GRID_SIZE) { ctx.moveTo(x, sy); ctx.lineTo(x, ey); }
    for (let y = Math.floor(sy / GRID_SIZE) * GRID_SIZE; y <= ey; y += GRID_SIZE) { ctx.moveTo(sx, y); ctx.lineTo(ex, y); }
    ctx.stroke();
    rocketParts.filter((p) => !p.removed).forEach((p) => this.drawPart(p));
    if (dragGhost) {
      ctx.globalAlpha = 0.5;
      this.drawPart(dragGhost, true);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  renderFlightMode(rocketParts, camera, particles, flash) {
    this.camera = camera;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    ctx.fillStyle = '#040816';
    ctx.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    ctx.fillStyle = '#cde0ff';
    for (let i = 0; i < 80; i++) ctx.fillRect((i * 83 - camera.x * 0.05) % this.canvas.clientWidth, (i * 41 - camera.y * 0.05) % this.canvas.clientHeight, 1, 1);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    ctx.fillStyle = '#36573b';
    ctx.fillRect(-10000, 1000, 20000, 3000);

    rocketParts.filter((p) => !p.removed).forEach((p) => this.drawPart(p));

    particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 2, 2);
    });

    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, flash * 5)})`;
      ctx.fillRect(-10000, -10000, 20000, 20000);
    }
    ctx.restore();
  }

  renderUI(t) {
    this.hudTelemetryEl.innerHTML = `Altitude: ${t.altitude.toFixed(1)} m<br>Velocity: H ${t.velocity.x.toFixed(1)} | V ${t.velocity.y.toFixed(1)} m/s<br>Acceleration: ${t.acceleration.toFixed(2)} m/s²<br>Mass: ${t.mass.toFixed(1)} kg<br>Fuel: ${t.fuel.toFixed(1)} L<br>TWR: ${t.twr.toFixed(2)}<br>Δv: ${t.deltaV.toFixed(0)} m/s<br>Apoapsis: ${(t.apoapsis || 0).toFixed(1)} m<br>Periapsis: ${(t.periapsis || 0).toFixed(1)} m`;
  }
}
