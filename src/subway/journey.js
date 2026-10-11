/**
 * Station-to-station ride from the line map: one timed run on the wall clock, built entirely
 * from the timeline so doors, speed, lurch, lights, signs and audio behave exactly as they do
 * when scrolling. A run is a list of segments, each mapping its own 0..1 onto timeline state:
 *
 *   close   the doors shut (departure chime) and the train holds
 *   travel  pull away, past the platform, through the tunnel, brake along the next platform —
 *           one non-stop run, however many stations it passes
 *   chime   standing still at the stop: the arrival chime
 *   open    the doors open, ending on the dwell point where GET OFF shows
 *
 * The scroll is locked for the run; when it ends the page is parked on `p1`, the progress the
 * scroll would have to be at to show the same frame.
 */
import { LEG, TRAVEL } from './config.js';

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function mod(a, n) { return ((a % n) + n) % n; }

export function createJourney(timeline, options) {
  var n = timeline.period;
  var T = options.reduceMotion ? Object.assign({}, TRAVEL, TRAVEL.reduced) : TRAVEL;
  var dwell = timeline.dwellPoint;

  function stepper(p0, p1) {
    return function (f) { return timeline.at(p0 + (p1 - p0) * f); };
  }

  /** The travel segment: timeline speed profile of the arrival leg, stretched over d0 → d1. */
  function traveller(kT, d0, d1) {
    var base = timeline.distanceAt(kT);
    var legRun = timeline.distanceAt(kT + LEG.brake) - base;
    return function (f) {
      var ref = kT + f * LEG.brake;
      var state = timeline.at(ref);
      var frac = (timeline.distanceAt(ref) - base) / legRun;
      state.distance = timeline.wrap(d0 + (d1 - d0) * frac);
      // Reduced motion: hold the last platform, cut to the next one under the dip.
      state.reducedDistance = timeline.wrap(f < 0.5 ? d0 : d1);
      return state;
    };
  }

  /**
   * A run from progress `from` to station `target`, or null when the train is already standing
   * there with its doors open.
   */
  function plan(from, target) {
    var k = Math.floor(from);
    var u = from - k;
    var stopped = u >= LEG.brake;
    var segments = [];

    if (mod(k, n) === target && stopped) {
      if (u >= LEG.open && u <= LEG.dwell) return null;
      // Doors on their way shut (or already shut) at this very stop: open them again.
      segments.push({ dur: T.open, at: stepper(from, k + dwell) });
      return run(segments, k + dwell);
    }

    var kT;
    var d0;
    if (stopped) {
      segments.push({ dur: T.close * clamp01((k + 1 - from) / (1 - dwell)) + 0.15, at: stepper(from, k + 1) });
      d0 = timeline.distanceAt(k + 1);
      kT = k + 1;
    } else {
      d0 = timeline.distanceAt(from);
      kT = k;
    }
    while (mod(kT, n) !== target) kT++;
    var d1 = timeline.distanceAt(kT + LEG.brake);
    var legs = (d1 - d0) / timeline.lapLength * n;
    var travel = Math.min(T.maxTravel, T.travel + Math.max(0, Math.round(legs) - 1) * T.perExtraStop);
    // Starting part-way along a leg: a shorter ride, but never a lurch.
    if (legs < 1) travel *= Math.max(0.45, legs);
    segments.push({ dur: travel, at: traveller(kT, d0, d1) });
    segments.push({ dur: T.chime, at: stepper(kT + LEG.brake, kT + LEG.settle) });
    segments.push({ dur: T.open, at: stepper(kT + LEG.settle, kT + LEG.open) });
    segments.push({ dur: 0.3, at: stepper(kT + LEG.open, kT + dwell) });
    return run(segments, kT + dwell);
  }

  function run(segments, p1) {
    var start = performance.now();
    var total = segments.reduce(function (a, s) { return a + s.dur; }, 0);
    var self = {
      p1: p1,
      done: false,
      duration: total,
      state: function (now) {
        var t = (now - start) / 1000;
        if (t >= total) self.done = true;
        for (var i = 0; i < segments.length; i++) {
          var s = segments[i];
          if (t < s.dur || i === segments.length - 1) return s.at(clamp01(t / s.dur));
          t -= s.dur;
        }
      }
    };
    return self;
  }

  return { plan: plan };
}
