/**
 * DOM overlay: GET OFF (only while the doors are open and no ride or GET OFF is running), a
 * screen-reader station announcement, the line map's links (visually hidden; the map in the
 * scene is the visible version, and both ride the train there), the scroll hint, the dip, and the Easter Egg card (shown in place of GET OFF while
 * the doors stand open at the secret stop). Reads timeline state; writes to the DOM only when
 * values change.
 */
import { LINE } from './stations.js';

export function createUI(root, stations, links, handlers) {
  var el = {
    kicker: root.querySelector('[data-station-kicker]'),
    name: root.querySelector('[data-station-name]'),
    sub: root.querySelector('[data-station-sub]'),
    getOff: root.querySelector('[data-get-off]'),
    hint: root.querySelector('[data-scroll-hint]'),
    dip: root.querySelector('[data-dip]'),
    sound: root.querySelector('[data-sound]'),
    egg: root.querySelector('[data-egg]')
  };

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

  var current = null;
  var busy = false;
  el.getOff.addEventListener('click', function () {
    if (current && !busy) handlers.getOff(current);
  });

  // "Keep riding" puts the card away until the next visit to the stop.
  var eggDismissed = false;
  root.querySelector('[data-egg-close]').addEventListener('click', function () {
    eggDismissed = true;
    el.egg.hidden = true;
  });

  el.sound.addEventListener('click', function () {
    var on = handlers.toggleSound();
    el.sound.setAttribute('aria-pressed', on ? 'true' : 'false');
    el.sound.textContent = on ? 'Sound on' : 'Sound off';
  });

  var startProgress = null;

  function update(state) {
    var station = state.station || stations[state.stationIndex];
    current = station;
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
    set('getOff', state.canGetOff && !station.secret && !busy, function (on) { el.getOff.hidden = !on; });
    var egg = state.canGetOff && !!station.reward;
    set('egg', egg, function (on) {
      if (!on) eggDismissed = false;
      el.egg.hidden = !on || eggDismissed;
    });
    // The hint goes once the ride has started.
    set('hint', Math.abs(state.progress - startProgress) < 0.015, function (on) { el.hint.classList.toggle('is-hidden', !on); });
  }

  function setDip(v) {
    el.dip.style.opacity = v.toFixed(3);
  }

  return {
    update: update,
    setDip: setDip,
    /** While a ride or GET OFF is running, GET OFF stays put away. */
    setBusy: function (on) { busy = on; },
    focusGetOff: function () { if (!el.getOff.hidden) el.getOff.focus({ preventScroll: true }); },
    /** The pointer is over the open doorway: GET OFF answers, since a click there does the same. */
    hintGetOff: function (on) { el.getOff.classList.toggle('is-hinted', on); }
  };
}
