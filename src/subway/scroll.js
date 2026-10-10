/**
 * Native document scroll → journey progress. A tall spacer gives the page its length; the
 * scene reads scrollY. The visual progress follows the scroll position on a damped spring, so
 * it always settles exactly on the progress the scroll position maps to.
 *
 * If scrolling stops while the doors are half-way, it eases to the nearest stable state
 * (fully open or fully closed) via resting(progress).
 */
import { SCROLL_SCREENS_PER_LEG } from './config.js';

var FOLLOW = 5.5;
var REST_MS = 520;

export function createScroll(options) {
  var total = options.total;
  var spacer = options.spacer;
  var reduceMotion = options.reduceMotion;
  var resting = options.resting;

  spacer.style.height = 'calc(' + (total * SCROLL_SCREENS_PER_LEG * 100).toFixed(1) + 'svh + 100svh)';

  function maxScroll() {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }
  function targetProgress() {
    return Math.min(1, Math.max(0, window.scrollY / maxScroll())) * total;
  }
  function scrollToProgress(p, smooth) {
    window.scrollTo({ top: (p / total) * maxScroll(), behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
  }

  var current = targetProgress();
  var restTimer = null;
  var programmatic = false;

  function onScroll() {
    clearTimeout(restTimer);
    if (programmatic) return;
    restTimer = setTimeout(function () {
      var to = resting(targetProgress());
      if (to == null) return;
      programmatic = true;
      scrollToProgress(to, true);
      setTimeout(function () { programmatic = false; }, 900);
    }, REST_MS);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

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
  }

  return {
    sample: sample,
    dispose: dispose
  };
}
