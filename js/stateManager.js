'use strict';

/** @readonly */
export const GameState = Object.freeze({
  BUILD_MODE: 'BUILD_MODE',
  FLIGHT_MODE: 'FLIGHT_MODE',
  PAUSED: 'PAUSED',
  CRASHED: 'CRASHED',
  ORBIT: 'ORBIT'
});

/**
 * Tracks and mutates game state.
 */
export class StateManager {
  constructor() {
    this.state = GameState.BUILD_MODE;
  }

  /** @param {string} next */
  set(next) {
    this.state = next;
  }
}
