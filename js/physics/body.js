'use strict';

/**
 * Basic rigid body in SI units.
 */
export class RigidBody {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.ax = 0;
    this.ay = 0;
    this.angle = 0;
    this.mass = 1;
    this.fx = 0;
    this.fy = 0;
  }

  clearForces() {
    this.fx = 0;
    this.fy = 0;
  }

  addForce(fx, fy) {
    this.fx += fx;
    this.fy += fy;
  }

  /** @param {number} dt */
  integrate(dt) {
    this.ax = this.fx / Math.max(1, this.mass);
    this.ay = this.fy / Math.max(1, this.mass);
    this.vx += this.ax * dt;
    this.vy += this.ay * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}
