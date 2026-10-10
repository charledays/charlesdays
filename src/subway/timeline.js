/**
 * Deterministic journey timeline. Pure: progress in, state out. No three.js, no DOM, no clock.
 *
 * Progress runs 0 → total, one unit per leg. Leg i carries the train from rest (the start, or
 * station i-1) into station i, opens the doors, dwells and closes them. A short tail leg after
 * the last station rides off into the tunnel. Distance is the integral of a fixed speed profile,
 * precomputed into a table, so any progress value always maps to the same position and the
 * station stops land exactly where braking ends.
 */

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function smooth(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
function span(u, a, b) { return clamp01((u - a) / (b - a)); }
/** Door leaves: quick break-away, cushioned finish. */
function doorEase(x) { x = clamp01(x); return 1 - Math.pow(1 - smooth(x), 1.6); }

var SAMPLES_PER_LEG = 2048;

export function createTimeline(options) {
  var legs = options.legs;
  var stationCount = options.stationCount;
  var cruiseSpeed = options.cruiseSpeed;
  var tail = options.tail;
  var total = stationCount + tail;

  /** Normalized speed (0..1) at leg-local u. The tail leg only accelerates and cruises. */
  function speedAt(legIndex, u) {
    if (u < legs.accel) return smooth(u / legs.accel);
    if (legIndex >= stationCount || u < legs.cruise) return 1;
    if (u < legs.brake) return 1 - smooth(span(u, legs.cruise, legs.brake));
    return 0;
  }

  // Distance table: trapezoid integration of speed over progress.
  var n = Math.ceil(total * SAMPLES_PER_LEG);
  var step = total / n;
  var table = new Float64Array(n + 1);
  var prev = speedAt(0, 0);
  for (var i = 1; i <= n; i++) {
    var p = i * step;
    var leg = Math.min(Math.floor(p - 1e-9), stationCount);
    var v = speedAt(leg, p - leg);
    table[i] = table[i - 1] + (prev + v) * 0.5 * step * cruiseSpeed;
    prev = v;
  }

  function distanceAt(p) {
    var f = Math.min(Math.max(p, 0), total) / step;
    var i0 = Math.min(Math.floor(f), n - 1);
    return table[i0] + (table[i0 + 1] - table[i0]) * (f - i0);
  }

  var stationDistances = [];
  for (var s = 0; s < stationCount; s++) stationDistances.push(distanceAt(s + legs.brake));

  /** Where the train stands still before leg i starts (0 = the start in the tunnel). */
  function restDistanceBefore(legIndex) {
    return legIndex === 0 ? 0 : stationDistances[legIndex - 1];
  }

  function phaseOf(legIndex, u) {
    if (legIndex >= stationCount) return u < legs.accel ? 'accel' : 'cruise';
    if (u <= 0) return 'idle';
    if (u < legs.accel) return 'accel';
    if (u < legs.cruise) return 'cruise';
    if (u < legs.brake) return 'brake';
    if (u < legs.settle) return 'settle';
    if (u < legs.open) return 'opening';
    if (u < legs.dwell) return 'dwell';
    if (u < legs.close) return 'closing';
    return 'hold';
  }

  /** Both leaves; the right one trails slightly so the motion reads mechanical, not digital. */
  function doorsAt(legIndex, u) {
    if (legIndex >= stationCount) return { left: 0, right: 0 };
    var opening = span(u, legs.settle, legs.open);
    var closing = span(u, legs.dwell, legs.close);
    var lag = 0.07;
    return {
      left: doorEase(opening) * (1 - doorEase(closing)),
      right: doorEase((opening - lag) / (1 - lag)) * (1 - doorEase((closing - lag) / (1 - lag)))
    };
  }

  /** Signed acceleration, about -1 (hard braking) to +1 (pulling away). */
  function accelAt(legIndex, u) {
    var h = 0.002;
    var dv = speedAt(legIndex, Math.min(u + h, 1)) - speedAt(legIndex, Math.max(u - h, 0));
    return Math.max(-1, Math.min(1, dv / (2 * h) / 10));
  }

  /** Black dip that replaces travel under reduced motion: peaks mid-journey. */
  function dipAt(legIndex, u) {
    var end = legIndex >= stationCount ? 1 : legs.brake;
    var t = span(u, 0, end);
    return Math.sin(Math.PI * t);
  }

  function at(progress) {
    var p = Math.min(Math.max(progress, 0), total);
    var legIndex = Math.min(Math.floor(p), stationCount);
    var u = p - legIndex;
    if (legIndex === stationCount && stationCount > 0 && u === 0) { legIndex = stationCount - 1; u = 1; }
    var inTail = legIndex >= stationCount;
    var distance = distanceAt(p);

    var phase = phaseOf(legIndex, u);
    var dip = dipAt(legIndex, inTail ? u / tail : u);
    // Reduced motion: no travel, just a cut hidden at the bottom of the dip.
    var arrived = span(u, 0, inTail ? tail : legs.brake) >= 0.5;
    var reducedDistance = !arrived
      ? restDistanceBefore(legIndex)
      : (inTail ? restDistanceBefore(legIndex) + 400 : stationDistances[legIndex]);

    return {
      progress: p,
      total: total,
      legIndex: legIndex,
      legT: u,
      phase: phase,
      speed: speedAt(legIndex, u),
      accel: accelAt(legIndex, u),
      distance: distance,
      reducedDistance: reducedDistance,
      dip: dip,
      doors: doorsAt(legIndex, u),
      /** Station the train is heading to or standing at; -1 past the last one. */
      stationIndex: inTail ? -1 : legIndex,
      canGetOff: phase === 'dwell',
      atEnd: inTail && u >= tail * 0.85
    };
  }

  /**
   * How much a station surrounds the train at a given track distance: 0 in open tunnel,
   * 1 alongside a platform. Lights, glass and exposure all key off this.
   */
  function presenceAt(distance) {
    var best = 0;
    for (var s = 0; s < stationDistances.length; s++) {
      best = Math.max(best, 1 - smooth((Math.abs(distance - stationDistances[s]) - 22) / 70));
    }
    return best;
  }

  /**
   * When scrolling rests mid door-motion, the progress worth settling on (fully open or
   * fully closed). Null when the resting point is already a stable state.
   */
  function restingTarget(progress) {
    var p = Math.min(Math.max(progress, 0), total);
    var legIndex = Math.floor(p);
    if (legIndex >= stationCount) return null;
    var u = p - legIndex;
    var dwellMid = (legs.open + legs.dwell) / 2;
    if (u > legs.settle && u < legs.open) {
      return legIndex + (span(u, legs.settle, legs.open) > 0.35 ? dwellMid : legs.settle);
    }
    if (u > legs.dwell && u < legs.close) {
      return legIndex + (span(u, legs.dwell, legs.close) > 0.35 ? legs.close + 0.01 : dwellMid);
    }
    return null;
  }

  return {
    total: total,
    stationCount: stationCount,
    stationDistances: stationDistances,
    distanceAt: distanceAt,
    presenceAt: presenceAt,
    at: at,
    restingTarget: restingTarget
  };
}
