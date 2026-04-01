'use strict';

/**
 * Camera controls (zoom, pan, follow, auto-center).
 */
export class CameraController {
  constructor() {
    this.zoom = 1;
    this.panX = 500;
    this.panY = 500;
    this.follow = false;
    this._dragging = false;
    this._last = { x: 0, y: 0 };
  }

  bind(canvas) {
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom *= e.deltaY < 0 ? 1.1 : 0.9;
      this.zoom = Math.min(3, Math.max(0.2, this.zoom));
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        this._dragging = true;
        this._last = { x: e.clientX, y: e.clientY };
      }
    });
    window.addEventListener('mouseup', () => { this._dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!this._dragging) return;
      this.panX += e.clientX - this._last.x;
      this.panY += e.clientY - this._last.y;
      this._last = { x: e.clientX, y: e.clientY };
    });
  }

  autoCenter(canvas, x, y) {
    this.panX = canvas.clientWidth / 2 - x * this.zoom;
    this.panY = canvas.clientHeight * 0.7 - y * this.zoom;
  }

  tickFollow(canvas, x, y) {
    if (this.follow) {
      this.autoCenter(canvas, x, y);
    }
  }
}
