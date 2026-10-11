/**
 * Native document scroll → journey progress, on an endless loop. The spacer holds three laps
 * of the line; the page starts in the middle one, and whenever the scroll drifts into the
 * outer half-laps it jumps one lap back toward the middle. The timeline is identical a lap
 * apart, so the jump can't be seen, and the ride runs forever in both directions.
 *
 * The visual progress follows the scroll position on a damped spring, so it always settles
 * exactly on the progress the scroll position maps to. If scrolling stops while the doors are
 * half-way, it eases to the nearest stable state via resting(progress).
 *
 * While a timed ride (journey.js) or the gallery has the scene, lock(true) takes the page out
 * of the visitor's hands; park(p) then puts the scroll exactly where that ride ended.
 */
import { SCROLL_SCREENS_PER_LEG } from './config.js';

var FOLLOW = 5.5;
var REST_MS = 520;
var LAPS = 3;
/** Keys that scroll the page; swallowed while locked. */
var SCROLL_KEYS = { ' ': 1, PageUp: 1, PageDown: 1, Home: 1, End: 1, ArrowUp: 1, ArrowDown: 1 };

export function createScroll(options) {
  var period = options.period;
  var spacer = options.spacer;
  var reduceMotion = options.reduceMotion;
  var resting = options.resting;
  var legs = period * LAPS;

  spacer.style.height = 'calc(' + (legs * SCROLL_SCREENS_PER_LEG * 100).toFixed(1) + 'svh + 100svh)';
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  function legPx() {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight) / legs;
  }
  function targetProgress() {
    return window.scrollY / legPx();
  }
  function scrollToProgress(p, smooth) {
    window.scrollTo({ top: p * legPx(), behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
  }

  var current = period + options.start;
  scrollToProgress(current, false);

  var restTimer = null;
  var programmatic = false;
  var locked = false;

  function jump(top) {
    programmatic = true;
    window.scrollTo({ top: top, behavior: 'auto' });
    requestAnimationFrame(function () { programmatic = false; });
  }

  /** Keep the scroll inside the middle lap, jumping a whole lap (invisible) when it strays. */
  function recentre() {
    var p = targetProgress();
    var shift = p < period * 0.5 ? period : p > period * 2.5 ? -period : 0;
    if (!shift) return;
    jump(window.scrollY + shift * legPx());
    current += shift;
  }

  function onScroll() {
    recentre();
    clearTimeout(restTimer);
    if (programmatic || locked) return;
    restTimer = setTimeout(function () {
      var to = resting(targetProgress());
      if (to == null) return;
      programmatic = true;
      scrollToProgress(to, true);
      setTimeout(function () { programmatic = false; }, 900);
    }, REST_MS);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /**
   * The progress a ride starts from, folded into the first half of the middle lap so wherever
   * the ride ends is still on the page.
   */
  function rideStart() {
    clearTimeout(restTimer);
    if (current > period * 1.5) current -= period;
    return current;
  }

  /** Park the page on progress p (the end of a ride), without any visible motion. */
  function park(p) {
    current = p;
    jump(p * legPx());
  }

  // Locked: wheel, touch and keys can't move the train (overflow alone doesn't hold on iOS).
  // Anything inside [data-own-scroll] (the gallery) still scrolls itself.
  function ownScroll(e) { return e.target && e.target.closest && e.target.closest('[data-own-scroll]'); }
  function onBlock(e) {
    if (locked && !ownScroll(e)) e.preventDefault();
  }
  function onKey(e) {
    if (locked && SCROLL_KEYS[e.key] && !ownScroll(e)) e.preventDefault();
  }
  window.addEventListener('wheel', onBlock, { passive: false });
  window.addEventListener('touchmove', onBlock, { passive: false });
  window.addEventListener('keydown', onKey);

  function lock(on) {
    locked = on;
    clearTimeout(restTimer);
    document.documentElement.classList.toggle('is-locked', on);
  }

  function sample(dt) {
    var target = targetProgress();
    if (reduceMotion) current = target;
    else current += (target - current) * (1 - Math.exp(-dt * FOLLOW));
    if (Math.abs(target - current) < 1e-5) current = target;
    return current;
  }

  function dispose() {
    clearTimeout(restTimer);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('wheel', onBlock);
    window.removeEventListener('touchmove', onBlock);
    window.removeEventListener('keydown', onKey);
  }

  return {
    sample: sample,
    rideStart: rideStart,
    park: park,
    lock: lock,
    /** Where the visual progress currently is. */
    progress: function () { return current; },
    dispose: dispose
  };
}
