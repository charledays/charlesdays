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
    stepOut: root.querySelector('[data-step-out]'),
    stepIn: root.querySelector('[data-step-in]'),
    swipe: root.querySelector('[data-swipe-hint]'),
    swipeMain: root.querySelector('[data-swipe-main]'),
    swipeSub: root.querySelector('[data-swipe-sub]')
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
    set('hint', !busy && Math.floor(state.progress) === Math.floor(startProgress), function (on) { el.hint.classList.toggle('is-hidden', !on); });
  }

  /**
   * The arrows. out: screen point (px) in the open doorway to show "Step out" at, or null;
   * back: show "Step in" (standing on the platform, the scroll hint goes too).
   */
  function setStep(out, back) {
    set('stepOut', !!out, function (on) { el.stepOut.hidden = !on; });
    if (out) {
      el.stepOut.style.left = Math.round(out.x) + 'px';
      el.stepOut.style.top = Math.round(out.y) + 'px';
    }
    set('stepIn', back, function (on) {
      el.stepIn.hidden = !on;
      el.hint.hidden = on || !!handlers.phone;
    });
  }

  /**
   * Phone gestures, one hint per place: shown there until that place's gesture has been used
   * once (used(key)), then gone for the visit. key: 'look' | 'closed' | 'seat' | 'platform' | 'inspect' | null.
   * Each is [words, sub-line, gesture]: the gesture ('x' sideways, 'up', 'down') animates a hand
   * in the pill (index.html), so the hint reads without the words.
   */
  var HINTS = {
    // No "turn your phone" here: iOS only grants motion after the first touch.
    look: ['Drag left or right to look around', '', 'x'],
    closed: ['Swipe up to open the doors', '', 'up'],
    // Stepping out has its own arrow in the doorway; the hint only teaches the ride.
    seat: ['Swipe up for the next stop', '', 'up'],
    platform: ['Drag left or right to look around', 'Tap the art to look closer \u00b7 swipe down for the train', 'x'],
    inspect: ['Tap or swipe down to step back', '', 'down']
  };
  var usedHints = {};
  // On a phone the pill is the hint; the desktop's scroll hint stays away.
  if (handlers.phone) el.hint.hidden = true;
  function setHint(key) {
    var show = key && !usedHints[key] ? key : null;
    set('swipe', show, function (k) {
      el.swipe.hidden = !k;
      if (!k) return;
      el.swipeMain.textContent = HINTS[k][0];
      el.swipeSub.textContent = HINTS[k][1];
      el.swipeSub.hidden = !HINTS[k][1];
      el.swipe.dataset.gesture = HINTS[k][2];
      el.hint.hidden = true;
    });
  }
  function used(key) { usedHints[key] = true; }

  function setDip(v) {
    el.dip.style.opacity = v.toFixed(3);
  }

  return {
    update: update,
    setDip: setDip,
    setStep: setStep,
    setHint: setHint,
    usedHint: used,
    /** While a ride is running, the visit link stays put away. */
    setBusy: function (on) { busy = on; }
  };
}
