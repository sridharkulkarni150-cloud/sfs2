'use strict';

import { PART_CATALOG } from './parts.js';
import { emit } from './events.js';

export class StageController {
  constructor() {
    this.currentStage = 0;
  }

  reset() {
    this.currentStage = 0;
  }

  fire(parts) {
    const stageParts = parts.filter((p) => p.active && p.stage === this.currentStage);
    if (!stageParts.length) {
      this.currentStage += 1;
      return;
    }
    for (const p of stageParts) {
      const def = PART_CATALOG[p.type];
      p.separated = true;
      p.vx = p.vx || 0;
      p.vy = p.vy || 1;
      if (def.thrust > 0) p.engineActive = false;
    }
    const next = this.currentStage + 1;
    parts.filter((p) => p.active && !p.separated && p.stage === next).forEach((p) => {
      if (PART_CATALOG[p.type].thrust > 0) p.engineActive = true;
    });
    emit('stage-fired', { stage: this.currentStage });
    this.currentStage = next;
  }
}
