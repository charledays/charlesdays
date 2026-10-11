/**
 * Step input: one gesture, one station. A wheel gesture (mouse notch or trackpad flick), a
 * swipe, or a key press asks for the next stop (down / swipe up / ArrowDown, PageDown, Space,
 * ArrowRight) or the previous one (up / swipe down / ArrowUp, PageUp, ArrowLeft) through
 * onStep(+1 | -1). The page itself never scrolls.
 *
 * A trackpad keeps sending wheel events long after the finger lifts (momentum), so a gesture
 * only counts once the wheel has been quiet for a moment since the last one. Input while
 * locked (a ride, GET OFF, the gallery) is dropped, not queued.
 *
 * The scene's resting progress lives here too: progress() is where the train stands between
 * rides, park(p) moves it there when a ride ends.
 */

/** Wheel travel (px) that makes a gesture, and the quiet gap (ms) that ends one. */
var WHEEL_STEP = 30;
var WHEEL_QUIET = 220;
/** Minimum swipe (px), and it must be mostly vertical. */
var SWIPE = 40;
var NEXT_KEYS = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowRight: 1 };
var PREV_KEYS = { ArrowUp: 1, PageUp: 1, ArrowLeft: 1 };

export function createScroll(options) {
  var onStep = options.onStep;
  /** True when a touch on the scene should paint, not ride (spray armed on touch). */
  var touchPaints = options.touchPaints || function () { return false; };
  var current = options.start;
  var locked = false;

  document.documentElement.classList.add('is-stepped');

  // Anything inside [data-own-scroll] (the gallery) scrolls itself and never steps the train.
  function ownScroll(e) { return e.target && e.target.closest && e.target.closest('[data-own-scroll]'); }

  function step(dir) {
    if (!locked) onStep(dir);
  }

  // Wheel: accumulate within a gesture, fire once, then wait for the wheel to go quiet.
  var wheelSum = 0;
  var wheelFired = false;
  var wheelTimer = null;
  function onWheel(e) {
    if (ownScroll(e)) return;
    e.preventDefault();
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(function () { wheelSum = 0; wheelFired = false; }, WHEEL_QUIET);
    if (wheelFired) return;
    // Lines / pages to pixels, roughly.
    var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
    wheelSum += dy;
    if (Math.abs(wheelSum) < WHEEL_STEP) return;
    wheelFired = true;
    step(wheelSum > 0 ? 1 : -1);
  }

  var touch = null;
  function onTouchStart(e) {
    touch = e.touches.length === 1 && !ownScroll(e) && !touchPaints() ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }
  function onTouchMove(e) {
    if (!ownScroll(e)) e.preventDefault();
  }
  function onTouchEnd(e) {
    if (!touch) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touch.x, dy = t.clientY - touch.y;
    touch = null;
    if (Math.abs(dy) >= SWIPE && Math.abs(dy) > Math.abs(dx) * 1.2) step(dy < 0 ? 1 : -1);
  }

  function onKey(e) {
    if (ownScroll(e) || e.altKey || e.ctrlKey || e.metaKey) return;
    var tag = e.target && e.target.tagName;
    // Space and arrows on a control belong to the control.
    if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    var dir = NEXT_KEYS[e.key] ? 1 : PREV_KEYS[e.key] ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    if (!e.repeat) step(dir);
  }

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd);
  window.addEventListener('keydown', onKey);

  function lock(on) {
    locked = on;
    document.documentElement.classList.toggle('is-locked', on);
  }

  function dispose() {
    clearTimeout(wheelTimer);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('keydown', onKey);
    document.documentElement.classList.remove('is-stepped', 'is-locked');
  }

  return {
    /** Where the train stands between rides. */
    progress: function () { return current; },
    /** A ride ended at progress p. */
    park: function (p) { current = p; },
    lock: lock,
    dispose: dispose
  };
}
