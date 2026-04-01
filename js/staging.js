'use strict';

import { PART_CATALOG } from './parts.js';
import { emit } from './events.js';

/**
 * Handles stage firing and separation logic.
 */
export class StageController {
  constructor() {
    this.currentStage = 0;
  }

  reset() {
    this.currentStage = 0;
  }

  /**
   * @param {Array<any>} parts
   */
  fire(parts) {
    const stageParts = parts.filter((p) => p.active && p.stage === this.currentStage);
    if (!stageParts.length) {
      this.currentStage += 1;
      return;
    }
    for (const p of stageParts) {
      const def = PART_CATALOG[p.type];
      if (p.type === 'separator') {
        p.separated = true;
        p.active = false;
      }
      if (def.thrust > 0) {
        p.engineActive = false;
      }
    }
    const next = this.currentStage + 1;
    parts.filter((p) => p.active && p.stage === next).forEach((p) => {
      const d = PART_CATALOG[p.type];
      if (d.thrust > 0) p.engineActive = true;
    });
    emit('stage-fired', { stage: this.currentStage });
    this.currentStage = next;
  }
}
