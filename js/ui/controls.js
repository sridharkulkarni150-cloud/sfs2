'use strict';

/**
 * Binds flight/build controls.
 */
export function bindControls(elements, callbacks) {
  elements.launchBtn.addEventListener('click', callbacks.onLaunch);
  elements.resetBtn.addEventListener('click', callbacks.onReset);
  elements.saveBtn.addEventListener('click', callbacks.onSave);
  elements.loadBtn.addEventListener('click', callbacks.onLoad);
  elements.stageBtn.addEventListener('click', callbacks.onStage);
  elements.throttle.addEventListener('input', () => callbacks.onThrottle(Number(elements.throttle.value) / 100));

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); callbacks.onStage(); }
    if (e.code === 'ArrowUp') callbacks.onThrottleDelta(5);
    if (e.code === 'ArrowDown') callbacks.onThrottleDelta(-5);
    if (e.code === 'KeyC') callbacks.onCenter();
  });
}
