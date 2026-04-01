'use strict';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

export class Camera {
  constructor() {
    this.x = 500;
    this.y = 200;
    this.zoom = 1;
    this.follow = false;
    this.dragging = false;
    this.lastX = 0;
    this.lastY = 0;
  }

  bind(canvas) {
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        this.dragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    });
    window.addEventListener('mouseup', () => { this.dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!this.dragging) return;
      this.x += e.clientX - this.lastX;
      this.y += e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
  }

  updateFollow(targetX, targetY, canvasHeight) {
    if (!this.follow) return;
    const targetScreenX = -targetX * this.zoom + window.innerWidth * 0.45;
    const targetScreenY = -targetY * this.zoom + canvasHeight * 0.6;
    this.x += (targetScreenX - this.x) * 0.1;
    this.y += (targetScreenY - this.y) * 0.1;
  }

  updateZoomByAltitude(altitudeMeters) {
    const z = 1.2 - altitudeMeters / 8000;
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  }
}
