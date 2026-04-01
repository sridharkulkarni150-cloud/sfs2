'use strict';

import { PART_CATALOG } from './parts.js';
import { GameState } from './stateManager.js';

/**
 * UI bindings and DOM updates.
 */
export class UI {
  constructor() {
    this.palette = document.getElementById('palette');
    this.modeIndicator = document.getElementById('modeIndicator');
    this.metrics = document.getElementById('metrics');
    this.telemetry = document.getElementById('telemetry');
    this.launchBtn = document.getElementById('launchBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.saveBtn = document.getElementById('saveBtn');
    this.loadBtn = document.getElementById('loadBtn');
    this.stageBtn = document.getElementById('stageBtn');
    this.throttle = document.getElementById('throttle');
    this.rcsToggle = document.getElementById('rcsToggle');
  }

  initPalette(onStartDrag) {
    this.palette.innerHTML = '<h3>Part Catalog</h3>';
    Object.entries(PART_CATALOG).forEach(([type, d]) => {
      const el = document.createElement('div');
      el.className = 'part-item';
      el.draggable = true;
      el.dataset.type = type;
      el.title = `Mass ${d.mass} kg | Fuel ${d.fuelCapacity} L | Thrust ${d.thrust} N | ISP ${d.isp} s | ${d.width}x${d.height}`;
      el.innerHTML = `<strong>${d.name}</strong><div>${d.width}x${d.height}</div>`;
      el.addEventListener('dragstart', () => onStartDrag(type));
      this.palette.appendChild(el);
    });
  }

  setMode(mode) {
    this.modeIndicator.textContent = mode.replace('_MODE', '').replace('_', ' ');
    this.modeIndicator.className = `mode-${mode.toLowerCase().replace('_mode', '')}`;
  }

  updateMetrics(m) {
    this.metrics.innerHTML = `Mass: ${m.totalMass.toFixed(1)} kg<br>Δv: ${m.deltaV.toFixed(0)} m/s<br>TWR: ${m.twr.toFixed(2)}<br>Fuel: ${m.totalFuel.toFixed(1)} L`;
  }

  updateTelemetry(sim) {
    const alt = sim.state.y - sim.groundHeightAt(sim.state.x);
    this.telemetry.innerHTML = `Altitude: ${alt.toFixed(1)} m<br>Velocity: H ${sim.state.vx.toFixed(1)} | V ${sim.state.vy.toFixed(1)} m/s<br>Accel: ${Math.hypot(sim.state.ax, sim.state.ay).toFixed(2)} m/s²<br>G-force: ${sim.state.gForce.toFixed(2)} g<br>Apoapsis: ${sim.state.apoapsis.toFixed(0)} m | Periapsis: ${sim.state.periapsis.toFixed(0)} m`;
  }

  bindShortcuts(onStage, onAutoCenter, onThrottleDelta) {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        onStage();
      } else if (e.code === 'KeyC') {
        onAutoCenter();
      } else if (e.code === 'ArrowUp') {
        onThrottleDelta(5);
      } else if (e.code === 'ArrowDown') {
        onThrottleDelta(-5);
      } else if (e.code === 'KeyP') {
        // pause toggle left to state manager caller
      }
    });
  }

  setBuildControlEnabled(enabled) {
    this.launchBtn.disabled = !enabled;
  }
}
