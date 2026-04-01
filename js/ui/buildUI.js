'use strict';

import { PART_CATALOG } from '../build/parts.js';
import { snapToGrid } from '../build/grid.js';

export class BuildUI {
  constructor(paletteEl) {
    this.paletteEl = paletteEl;
    this.selectedType = null;
    this.ghost = null;
  }

  initPalette() {
    this.paletteEl.innerHTML = '<h3>Part Catalog</h3>';
    for (const [type, d] of Object.entries(PART_CATALOG)) {
      const card = document.createElement('div');
      card.className = 'part-card';
      card.innerHTML = `<strong>${d.name}</strong><div>${d.width}x${d.height}px</div>`;
      card.title = `Mass ${d.mass}kg, Fuel ${d.fuelCapacity}L, Thrust ${d.thrust}N, ISP ${d.isp}s`;
      card.addEventListener('click', () => { this.selectedType = type; });
      this.paletteEl.appendChild(card);
    }
  }

  updateGhost(worldX, worldY, valid) {
    if (!this.selectedType) {
      this.ghost = null;
      return;
    }
    this.ghost = { type: this.selectedType, x: snapToGrid(worldX), y: snapToGrid(worldY), rotation: 0, stage: 0, ghostColor: valid ? '#58ff8a' : '#ff5c5c' };
  }
}
