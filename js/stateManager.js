'use strict';

export const GameState = Object.freeze({
  BUILD_MODE: 'BUILD_MODE',
  FLIGHT_MODE: 'FLIGHT_MODE',
  PAUSED: 'PAUSED',
  CRASHED: 'CRASHED'
});

export class StateManager {
  constructor() {
    this.mode = GameState.BUILD_MODE;
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
  }

  emit(event, payload) {
    (this.listeners.get(event) || []).forEach((cb) => cb(payload));
  }

  transitionTo(mode) {
    this.mode = mode;
    this.emit('state-changed', { mode });
  }
}
