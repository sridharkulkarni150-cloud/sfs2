'use strict';

import { PART_CATALOG } from './parts.js';
import { GameState } from './stateManager.js';

/**
 * Canvas renderer with layered drawing.
 */
export class Renderer {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = Array.from({ length: 500 }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '#fff', size: 2 }));
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(this.canvas.clientWidth * dpr);
    this.canvas.height = Math.floor(this.canvas.clientHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  emitParticles(x, y, count, color, speed = 60) {
    for (let i = 0; i < count; i++) {
      const p = this.particles.find((particle) => !particle.active);
      if (!p) return;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.5 + Math.random());
      Object.assign(p, { active: true, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.8 + Math.random(), color, size: 1 + Math.random() * 3 });
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 12 * dt;
    }
  }

  drawPartSprite(ctx, part) {
    const d = PART_CATALOG[part.type];
    ctx.save();
    ctx.translate(part.x, part.y);
    ctx.rotate(part.rotation || 0);
    ctx.fillStyle = d.color;
    ctx.strokeStyle = '#0d1222';
    ctx.lineWidth = 1;
    if (part.type === 'nose_cone') {
      ctx.beginPath();
      ctx.moveTo(0, -d.height / 2);
      ctx.lineTo(-d.width / 2, d.height / 2);
      ctx.lineTo(d.width / 2, d.height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(-d.width / 2, -d.height / 2, d.width, d.height);
      ctx.strokeRect(-d.width / 2, -d.height / 2, d.width, d.height);
    }
    ctx.restore();
  }

  drawGrid(ctx, camera) {
    const gs = 10;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const startX = -camera.panX / camera.zoom;
    const startY = -camera.panY / camera.zoom;
    const endX = startX + w / camera.zoom;
    const endY = startY + h / camera.zoom;
    ctx.strokeStyle = 'rgba(80,120,200,0.15)';
    ctx.lineWidth = 1 / camera.zoom;
    ctx.beginPath();
    for (let x = Math.floor(startX / gs) * gs; x <= endX; x += gs) { ctx.moveTo(x, startY); ctx.lineTo(x, endY); }
    for (let y = Math.floor(startY / gs) * gs; y <= endY; y += gs) { ctx.moveTo(startX, y); ctx.lineTo(endX, y); }
    ctx.stroke();
  }

  drawTrajectory(ctx, sim) {
    ctx.save();
    ctx.strokeStyle = 'rgba(90,220,255,0.8)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    let x = sim.state.x;
    let y = sim.state.y;
    let vx = sim.state.vx;
    let vy = sim.state.vy;
    const dt = 1;
    for (let i = 0; i < 120; i++) {
      vy -= sim.planet.surfaceGravity * dt;
      x += vx * dt;
      y += vy * dt;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      if (y < sim.groundHeightAt(x)) break;
    }
    ctx.stroke();
    ctx.restore();
  }

  render({ camera, rocketParts, sim, gameState, ghostPart, com, cot, mode }) {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // background
    ctx.fillStyle = '#050814';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#cfe5ff';
    for (let i = 0; i < 80; i++) {
      ctx.fillRect((i * 83) % w, (i * 47) % h, 1, 1);
    }

    ctx.save();
    ctx.translate(camera.panX, camera.panY);
    ctx.scale(camera.zoom, camera.zoom);

    if (mode === GameState.BUILD_MODE) {
      this.drawGrid(ctx, camera);
    }

    // terrain
    ctx.fillStyle = '#385036';
    ctx.beginPath();
    const startX = (-camera.panX / camera.zoom) - 300;
    const endX = startX + w / camera.zoom + 600;
    ctx.moveTo(startX, sim.groundHeightAt(startX));
    for (let x = startX; x <= endX; x += 40) {
      ctx.lineTo(x, sim.groundHeightAt(x));
    }
    ctx.lineTo(endX, -2000);
    ctx.lineTo(startX, -2000);
    ctx.closePath();
    ctx.fill();

    if (mode !== GameState.BUILD_MODE) {
      this.drawTrajectory(ctx, sim);
    }

    rocketParts
      .filter((p) => p.active && !p.separated)
      .sort((a, b) => a.stage - b.stage)
      .forEach((part) => this.drawPartSprite(ctx, part));

    if (ghostPart) {
      ctx.globalAlpha = 0.5;
      this.drawPartSprite(ctx, ghostPart);
      ctx.globalAlpha = 1;
    }

    if (com) {
      ctx.fillStyle = '#ff5b5b';
      ctx.beginPath(); ctx.arc(com.x, com.y, 6, 0, Math.PI * 2); ctx.fill();
    }
    if (cot) {
      ctx.fillStyle = '#5bff9d';
      ctx.beginPath(); ctx.arc(cot.x, cot.y, 6, 0, Math.PI * 2); ctx.fill();
    }

    for (const p of this.particles) {
      if (!p.active) continue;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    ctx.restore();
  }
}
