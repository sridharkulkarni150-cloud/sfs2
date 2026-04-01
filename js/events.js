'use strict';

/**
 * Lightweight event bus using EventTarget.
 */
export const eventBus = new EventTarget();

/**
 * Emits a custom event with detail payload.
 * @param {string} name
 * @param {any} detail
 */
export function emit(name, detail = {}) {
  eventBus.dispatchEvent(new CustomEvent(name, { detail }));
}

/**
 * Adds event listener to bus.
 * @param {string} name
 * @param {(evt: CustomEvent)=>void} handler
 * @returns {() => void}
 */
export function on(name, handler) {
  eventBus.addEventListener(name, handler);
  return () => eventBus.removeEventListener(name, handler);
}
