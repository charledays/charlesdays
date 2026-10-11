/**
 * Deterministic journey timeline on a circle line. Pure: progress in, state out. No three.js,
 * no DOM, no clock.
 *
 * Progress runs one unit per leg and never ends. Leg k carries the train from the previous
 * station into station k mod N, opens the doors, dwells and closes them; after the last station
 * the next leg arrives back at the first. Every leg has the same speed profile, so one lap is
 * always the same length, and the track position wraps once per lap at the first station (where
 * the train is standing still). The state at p and p ± N is therefore identical, which is what
 * lets the scroll jump a lap without anything on screen changing.
 */

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function smooth(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
function span(u, a, b) { return clamp01((u - a) / (b - a)); }
/** Door leaves: quick break-away, cushioned finish. */
function doorEase(x) { x = clamp01(x); return 1 - Math.pow(1 - smooth(x), 1.6); }
function mod(a, n) { return ((a % n) + n) % n; }

var SAMPLES_PER_LEG = 2048;

export function createTimeline(options) {
  var legs = options.legs;
  var stationCount = options.stationCount;
  var cruiseSpeed = options.cruiseSpeed;

  /** Normalized speed (0..1) at leg-local u. */
  function speedAt(u) {
    if (u < legs.accel) return smooth(u / legs.accel);
    if (u < legs.cruise) return 1;
    if (u < legs.brake) return 1 - smooth(span(u, legs.cruise, legs.brake));
    return 0;
  }

  // Distance along one leg: trapezoid integration of the speed profile.
  var n = SAMPLES_PER_LEG;
  var table = new Float64Array(n + 1);
  var prev = speedAt(0);
  for (var i = 1; i <= n; i++) {
    var v = speedAt(i / n);
    table[i] = table[i - 1] + (prev + v) * 0.5 * (1 / n) * cruiseSpeed;
    prev = v;
  }
  function legDistance(u) {
    var f = clamp01(u) * n;
    var i0 = Math.min(Math.floor(f), n - 1);
    return table[i0] + (table[i0 + 1] - table[i0]) * (f - i0);
  }

  var legLength = table[n];
  var lapLength = legLength * stationCount;
  var stopOffset = legDistance(legs.brake);
  var stationDistances = [];
  for (var s = 0; s < stationCount; s++) stationDistances.push(s * legLength + stopOffset);

  /** Unwrapped track distance at any progress (negative too). */
  function distanceAt(p) {
    var k = Math.floor(p);
    return k * legLength + legDistance(p - k);
  }

  /** Track distance folded onto one lap; the fold sits at the first station's stop. */
  function wrap(d) {
    var c = stationDistances[0];
    return mod(d - c, lapLength) + c;
  }

  /** Signed shortest gap from b to a around the lap. */
  function gap(a, b) {
    return mod(a - b + lapLength / 2, lapLength) - lapLength / 2;
  }

  function phaseOf(u) {
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
  function doorsAt(u) {
    var opening = span(u, legs.settle, legs.open);
    var closing = span(u, legs.dwell, legs.close);
    var lag = 0.07;
    return {
      left: doorEase(opening) * (1 - doorEase(closing)),
      right: doorEase((opening - lag) / (1 - lag)) * (1 - doorEase((closing - lag) / (1 - lag)))
    };
  }

  /** Signed acceleration, about -1 (hard braking) to +1 (pulling away). */
  function accelAt(u) {
    var h = 0.002;
    var dv = speedAt(Math.min(u + h, 1)) - speedAt(Math.max(u - h, 0));
    return Math.max(-1, Math.min(1, dv / (2 * h) / 10));
  }

  function at(progress) {
    var k = Math.floor(progress);
    var u = progress - k;
    var t = span(u, 0, legs.brake);
    // Reduced motion: no travel. The exterior holds at the last stop, then cuts to the next one
    // at the bottom of a short dip to black halfway through the leg.
    var dip = 1 - smooth(Math.abs(t - 0.5) / 0.22);
    var reduced = (t < 0.5 ? k - 1 : k) * legLength + stopOffset;

    var phase = phaseOf(u);
    return {
      progress: progress,
      legT: u,
      phase: phase,
      speed: speedAt(u),
      accel: accelAt(u),
      distance: wrap(distanceAt(progress)),
      reducedDistance: wrap(reduced),
      dip: dip,
      doors: doorsAt(u),
      /** Station the train is heading to or standing at. */
      stationIndex: mod(k, stationCount),
      canGetOff: phase === 'dwell'
    };
  }

  /**
   * How much a station surrounds the train at a (wrapped) track distance: 0 in open tunnel,
   * 1 alongside a platform. Lights, glass and exposure all key off this.
   */
  function presenceAt(distance) {
    var best = 0;
    for (var s = 0; s < stationDistances.length; s++) {
      best = Math.max(best, 1 - smooth((Math.abs(gap(distance, stationDistances[s])) - 22) / 70));
    }
    return best;
  }

  /**
   * When scrolling rests mid door-motion, the progress worth settling on (fully open or
   * fully closed). Null when the resting point is already a stable state.
   */
  function restingTarget(progress) {
    var k = Math.floor(progress);
    var u = progress - k;
    var dwellMid = (legs.open + legs.dwell) / 2;
    if (u > legs.settle && u < legs.open) {
      return k + (span(u, legs.settle, legs.open) > 0.35 ? dwellMid : legs.settle);
    }
    if (u > legs.dwell && u < legs.close) {
      return k + (span(u, legs.dwell, legs.close) > 0.35 ? legs.close + 0.01 : dwellMid);
    }
    return null;
  }

  return {
    /** Legs per lap: the scroll can jump by this much with no visible change. */
    period: stationCount,
    lapLength: lapLength,
    stationDistances: stationDistances,
    gap: gap,
    /** Unwrapped track distance at a progress, and the fold onto one lap (for express runs). */
    distanceAt: distanceAt,
    wrap: wrap,
    /** Progress within a leg where the doors stand fully open. */
    dwellPoint: (legs.open + legs.dwell) / 2,
    presenceAt: presenceAt,
    at: at,
    restingTarget: restingTarget
  };
}
