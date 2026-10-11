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
 * rideTo(p) is the express run used by the line map: the page jumps straight to p and the
 * visual progress tweens there on its own clock; express() reports the run so the scene can
 * render it as one non-stop ride. Any scroll from the visitor cancels it.
 */
import { SCROLL_SCREENS_PER_LEG } from './config.js';

var FOLLOW = 5.5;
var REST_MS = 520;
var LAPS = 3;
/** Express run length: a base plus a bit per leg covered, seconds. */
var EXPRESS_BASE = 1.1;
var EXPRESS_PER_LEG = 0.45;

function easeInOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

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
  var express = null;

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
    if (express) { express.p0 += shift; express.p1 += shift; }
  }

  function onScroll() {
    recentre();
    clearTimeout(restTimer);
    if (programmatic) return;
    express = null;
    restTimer = setTimeout(function () {
      var to = resting(targetProgress());
      if (to == null) return;
      programmatic = true;
      scrollToProgress(to, true);
      setTimeout(function () { programmatic = false; }, 900);
    }, REST_MS);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /** Express run to progress p (the visitor picked a stop on the line map). */
  function rideTo(p) {
    clearTimeout(restTimer);
    // Bring the start into the first half of the middle lap so the destination stays on the page.
    if (current > period * 1.5) { current -= period; p -= period; }
    var from = current;
    jump(p * legPx());
    current = p;
    if (reduceMotion) return;
    // On the wall clock, not frame time, so a slow device still arrives on time.
    express = { p0: from, p1: p, start: performance.now(), dur: EXPRESS_BASE + EXPRESS_PER_LEG * Math.abs(p - from), f: 0 };
  }

  function sample(dt) {
    if (express) {
      express.f = easeInOut(Math.min(1, (performance.now() - express.start) / 1000 / express.dur));
      if (express.f >= 1) { express = null; return current; }
      return express.p0 + (express.p1 - express.p0) * express.f;
    }
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
    rideTo: rideTo,
    /** The express run in progress ({ p0, p1, f }), or null. */
    express: function () { return express; },
    /** Where the visual progress currently is. */
    progress: function () { return current; },
    dispose: dispose
  };
}
