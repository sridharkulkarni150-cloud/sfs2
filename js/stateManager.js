'use strict';

import { emit } from './events.js';

/** @readonly */
export const GameState = Object.freeze({
  BUILD_MODE: 'BUILD_MODE',
  FLIGHT_MODE: 'FLIGHT_MODE',
  PAUSED: 'PAUSED',
  CRASHED: 'CRASHED',
  ORBIT: 'ORBIT'
});

/**
 * Singleton for lifecycle mode transitions.
 */
export class StateManager {
  static #instance;

  static instance() {
    if (!StateManager.#instance) {
      StateManager.#instance = new StateManager();
    }
    return StateManager.#instance;
  }

  constructor() {
    this.state = GameState.BUILD_MODE;
  }

  /**
   * Transition to next state with cleanup callback support.
   * @param {string} next
   * @param {{cleanup?: ()=>void}} opts
   */
  setState(next, opts = {}) {
    if (this.state === next) {
      return;
    }
    if (typeof opts.cleanup === 'function') {
      opts.cleanup();
    }
    const prev = this.state;
    this.state = next;
    emit('state-changed', { prev, next });
  }
}
