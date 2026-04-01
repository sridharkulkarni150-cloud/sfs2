'use strict';

import { GRID_SIZE } from './parts.js';

export class InputHandler {
  constructor(canvas, buildSystem, stateManager) {
    this.canvas = canvas;
    this.buildSystem = buildSystem;
    this.stateManager = stateManager;
    this.throttle = 0;
    this.pendingStage = false;
    this.rotationInput = 0;
    this.pan = { dragging: false, lastX: 0, lastY: 0 };
  }

  bind(camera, controls) {
    controls.throttle.addEventListener('input', () => { this.throttle = Number(controls.throttle.value) / 100; });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') { e.preventDefault(); this.pendingStage = true; this.stateManager.emit('stage'); }
      if (e.code === 'ArrowUp') { controls.throttle.value = String(Math.min(100, Number(controls.throttle.value) + 5)); this.throttle = Number(controls.throttle.value) / 100; }
      if (e.code === 'ArrowDown') { controls.throttle.value = String(Math.max(0, Number(controls.throttle.value) - 5)); this.throttle = Number(controls.throttle.value) / 100; }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.rotationInput = -1;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.rotationInput = 1;
      if (e.code === 'Delete') this.stateManager.emit('delete-part');
    });
    window.addEventListener('keyup', (e) => {
      if (['KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight'].includes(e.code)) this.rotationInput = 0;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      camera.zoom = Math.min(3, Math.max(0.5, camera.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        this.pan.dragging = true;
        this.pan.lastX = e.clientX;
        this.pan.lastY = e.clientY;
      }
    });
    window.addEventListener('mouseup', () => { this.pan.dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (this.pan.dragging) {
        camera.x += e.clientX - this.pan.lastX;
        camera.y += e.clientY - this.pan.lastY;
        this.pan.lastX = e.clientX;
        this.pan.lastY = e.clientY;
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - camera.x) / camera.zoom;
      const y = (e.clientY - rect.top - camera.y) / camera.zoom;
      this.buildSystem.updateGhost(this.buildSystem.selectedType, Math.round(x / GRID_SIZE) * GRID_SIZE, Math.round(y / GRID_SIZE) * GRID_SIZE);
    });

    this.canvas.addEventListener('click', () => {
      if (this.buildSystem.selectedType) this.buildSystem.placeGhost();
    });
  }
}
