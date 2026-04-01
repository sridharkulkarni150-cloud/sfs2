'use strict';

/** @param {HTMLElement} target @param {object} data */
export function renderTelemetry(target, data) {
  target.innerHTML = [
    `Altitude: ${data.altitude.toFixed(1)} m`,
    `Velocity: H ${data.vx.toFixed(1)} | V ${data.vy.toFixed(1)} m/s`,
    `Acceleration: ${data.accel.toFixed(2)} m/s²`,
    `G-force: ${data.gForce.toFixed(2)} g`,
    `Mass: ${data.mass.toFixed(1)} kg`,
    `Δv: ${data.deltaV.toFixed(0)} m/s`,
    `TWR: ${data.twr.toFixed(2)}`,
    `Apoapsis: ${data.apo.toFixed(0)} m | Periapsis: ${data.peri.toFixed(0)} m`
  ].join('<br>');
}
