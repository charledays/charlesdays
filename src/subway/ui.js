/**
 * DOM overlay: a screen-reader station announcement, the line map's links (visually hidden;
 * the map in the scene is the visible version, and both ride the train there), a focusable
 * link to the stop's page (the sign on the platform wall is the visible one), the Step out /
 * Step in footprints, the scroll hint and the dip. Reads timeline state; writes to the DOM only
 * when values change.
 */
import { LINE } from './stations.js';

export function createUI(root, stations, links, handlers) {
  var el = {
    kicker: root.querySelector('[data-station-kicker]'),
    name: root.querySelector('[data-station-name]'),
    sub: root.querySelector('[data-station-sub]'),
    visit: root.querySelector('[data-visit]'),
    hint: root.querySelector('[data-scroll-hint]'),
    hintText: root.querySelector('[data-scroll-text]'),
    dip: root.querySelector('[data-dip]'),
    sound: root.querySelector('[data-sound]'),
    tips: root.querySelector('[data-tips]'),
    stepOut: root.querySelector('[data-step-out]'),
    stepIn: root.querySelector('[data-step-in]'),
    swipe: root.querySelector('[data-swipe-hint]'),
    swipeMain: root.querySelector('[data-swipe-main]')
  };

  // The flashing arrows: out through the open doors, and back to the train.
  el.stepOut.addEventListener('click', function () { handlers.stepOut(); });
  el.stepIn.addEventListener('click', function () { handlers.stepIn(); });

  root.style.setProperty('--line', LINE.color);

  // The line map's stops as real links, for keyboards and screen readers.
  var list = root.querySelector('[data-line-links]');
  links.forEach(function (stop) {
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = stop.href;
    a.textContent = stop.name;
    a.addEventListener('click', function (e) {
      e.preventDefault();
      handlers.ride(stations.indexOf(stop));
    });
    li.appendChild(a);
    list.appendChild(li);
  });

  var last = {};
  function set(key, value, apply) {
    if (last[key] === value) return;
    last[key] = value;
    apply(value);
  }

  var busy = false;

  el.sound.addEventListener('click', function () {
    var on = handlers.toggleSound();
    el.sound.setAttribute('aria-pressed', on ? 'true' : 'false');
    // The speaker icon follows aria-pressed (index.html); the label says it in words.
    el.sound.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
  });

  /**
   * The tutorial (the scroll hint, the phone's gesture pills), remembered across visits: each
   * hint, once used, stays gone next time too, and the tips chip turns them all off (or back on,
   * from the start). Storage can be missing or throw (private windows); then it's per visit.
   */
  var TIPS_KEY = 'charlesdays.subway.tips';
  var SEEN_KEY = 'charlesdays.subway.seenHints';
  function load(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function save(key, value) {
    try {
      if (value == null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch (e) { /* not remembered */ }
  }
  var usedHints = {};
  try { (JSON.parse(load(SEEN_KEY)) || []).forEach(function (k) { usedHints[k] = true; }); } catch (e) { /* none */ }
  var tipsOn = load(TIPS_KEY) !== 'off';
  function showTips() {
    root.classList.toggle('tips-off', !tipsOn);
    el.tips.setAttribute('aria-pressed', tipsOn ? 'true' : 'false');
    el.tips.setAttribute('aria-label', tipsOn ? 'Tips on' : 'Tips off');
  }
  showTips();
  el.tips.addEventListener('click', function () {
    tipsOn = !tipsOn;
    save(TIPS_KEY, tipsOn ? null : 'off');
    // Back on: the whole tutorial again, from wherever you are.
    if (tipsOn) {
      usedHints = {};
      save(SEEN_KEY, null);
      last.swipe = undefined;
    }
    showTips();
  });

  var startProgress = null;

  function update(state) {
    var station = state.station || stations[state.stationIndex];
    var stopped = /settle|opening|dwell|closing|hold/.test(state.phase);
    var arriving = state.phase === 'brake';
    if (startProgress == null) startProgress = state.progress;

    set('station', station.id, function () {
      el.name.textContent = station.name;
      el.sub.textContent = station.note;
    });
    set('kicker', stopped ? 'This is' : arriving ? 'Now arriving' : 'Next stop', function (v) {
      el.kicker.textContent = v;
    });
    // The stop's page, for keyboards and screen readers (the sign on the wall is the visible way).
    set('visit', state.canGetOff && !station.secret && !busy ? station.id : null, function (id) {
      el.visit.hidden = !id;
      if (!id) return;
      el.visit.href = station.href;
      el.visit.textContent = 'Visit ' + station.name + ' →';
    });
    // The hint goes once the ride has started.
    // At the first stop: "open the doors" while they're shut, then "ride" until the train moves.
    // It goes during any ride and for good once the train has left that first leg.
    var shut = state.phase === 'settle' && state.doors.left === 0;
    set('hintText', shut ? 'Scroll to open the doors' : 'Scroll to ride', function (t) { el.hintText.textContent = t; });
    var first = Math.floor(state.progress) === Math.floor(startProgress);
    if (!first) used('scroll');
    set('hint', !busy && first && !usedHints.scroll, function (on) { el.hint.classList.toggle('is-hidden', !on); });
  }

  /**
   * The arrows. out: screen point (px) in the open doorway to show "Step out" at, or null;
   * back: show "Step in" (standing on the platform, the scroll hint goes too).
   */
  var stepAt = { x: -1e4, y: -1e4 };
  function setStep(out, back) {
    set('stepOut', !!out, function (on) { el.stepOut.hidden = !on; });
    // Only follow the doorway when it really moves on screen (looking round, a resize): sub-pixel
    // drift from the camera would set the button twitching.
    if (out && Math.abs(out.x - stepAt.x) + Math.abs(out.y - stepAt.y) >= 1.5) {
      stepAt.x = out.x;
      stepAt.y = out.y;
      el.stepOut.style.left = Math.round(out.x) + 'px';
      el.stepOut.style.top = Math.round(out.y) + 'px';
    }
    set('stepIn', back, function (on) { el.stepIn.hidden = !on; });
  }

  /**
   * The tips, one per place: shown there until that place's gesture has been used once
   * (used(key)), then gone for good (see the tips chip above). Phone keys: 'look' | 'closed' |
   * 'seat' | 'platform' | 'art' | 'inspect'; desktop ones start 'd-'. Each is [words, gesture]:
   * the gesture animates a hand ('x' sideways, 'up', 'down', 'tap') or a mouse ('wheel', 'drag',
   * 'click') in the pill (index.html), so the tip reads without the words.
   */
  var HINTS = {
    // No "turn your phone" here: iOS only grants motion after the first touch.
    look: ['Drag to look', 'x'],
    closed: ['Tap to open', 'tap'],
    // Stepping out has its own arrow in the doorway; the hint only teaches the ride.
    seat: ['Next stop', 'up'],
    platform: ['Drag to look', 'x'],
    // Once looking round is learned: the art up close.
    art: ['Tap the art', 'tap'],
    inspect: ['Tap to step back', 'down'],
    'd-open': ['Scroll to open the doors', 'wheel'],
    'd-ride': ['Scroll for the next stop', 'wheel'],
    'd-out': ['Click the doors to step out', 'click'],
    'd-pan': ['Drag to look around', 'drag'],
    'd-art': ['Click the art to look closer', 'click'],
    'd-back': ['Click or Esc to step back', 'click']
  };
  // The tips pill replaces the old scroll hint everywhere.
  el.hint.hidden = true;
  el.swipe.hidden = false;
  /**
   * Smooth in and out: the pill fades and lifts in, and a new tip waits for the old one to fade
   * before it takes the words (SWAP_MS, the CSS transition).
   */
  var SWAP_MS = 280;
  var shown = null;
  var swapTimer = 0;
  function setHint(key) {
    var want = key && !usedHints[key] ? key : null;
    set('swipe', want, function (k) {
      clearTimeout(swapTimer);
      function fill() {
        shown = k;
        el.swipeMain.textContent = HINTS[k][0];
        el.swipe.dataset.gesture = HINTS[k][1];
        // Next frame, so the fade in runs from the hidden state.
        requestAnimationFrame(function () { if (shown === k) el.swipe.classList.add('is-on'); });
      }
      if (!k) { shown = null; el.swipe.classList.remove('is-on'); return; }
      if (shown && el.swipe.classList.contains('is-on')) {
        el.swipe.classList.remove('is-on');
        shown = null;
        swapTimer = setTimeout(fill, SWAP_MS);
      } else fill();
    });
  }
  function used(key) {
    if (usedHints[key]) return;
    usedHints[key] = true;
    save(SEEN_KEY, JSON.stringify(Object.keys(usedHints)));
  }

  function setDip(v) {
    el.dip.style.opacity = v.toFixed(3);
  }

  return {
    update: update,
    setDip: setDip,
    setStep: setStep,
    setHint: setHint,
    usedHint: used,
    /** Used already, this visit or an earlier one. */
    seenHint: function (key) { return !!usedHints[key]; },
    /** While a ride is running, the visit link stays put away. */
    setBusy: function (on) { busy = on; }
  };
}
