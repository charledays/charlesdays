/**
 * DOM overlay: GET OFF (only while the doors are open), a screen-reader station announcement,
 * the line map's links (visually hidden; the map in the scene is the visible version), the
 * scroll hint, and the reduced-motion dip. Reads timeline state; writes to the DOM only when
 * values change.
 */
import { LINE } from './stations.js';

export function createUI(root, stations, links, handlers) {
  var el = {
    kicker: root.querySelector('[data-station-kicker]'),
    name: root.querySelector('[data-station-name]'),
    sub: root.querySelector('[data-station-sub]'),
    getOff: root.querySelector('[data-get-off]'),
    toast: root.querySelector('[data-toast]'),
    hint: root.querySelector('[data-scroll-hint]'),
    dip: root.querySelector('[data-dip]'),
    sound: root.querySelector('[data-sound]')
  };

  root.style.setProperty('--line', LINE.color);

  // The line map's stops as real links, for keyboards and screen readers.
  var list = root.querySelector('[data-line-links]');
  links.forEach(function (stop) {
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = stop.href;
    a.textContent = stop.name;
    li.appendChild(a);
    list.appendChild(li);
  });

  var last = {};
  function set(key, value, apply) {
    if (last[key] === value) return;
    last[key] = value;
    apply(value);
  }

  var toastTimer = null;
  el.getOff.addEventListener('click', function () {
    var station = stations[last.station];
    if (!station) return;
    if (station.getOff.href) { window.location.href = station.getOff.href; return; }
    el.toast.textContent = station.name + ' — gallery coming soon.';
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.hidden = true; }, 2600);
  });

  el.sound.addEventListener('click', function () {
    var on = handlers.toggleSound();
    el.sound.setAttribute('aria-pressed', on ? 'true' : 'false');
    el.sound.textContent = on ? 'Sound on' : 'Sound off';
  });

  function update(state) {
    var i = state.stationIndex;
    var station = i >= 0 ? stations[i] : null;
    var stopped = /settle|opening|dwell|closing|hold/.test(state.phase);
    var arriving = state.phase === 'brake';

    set('station', i, function () {
      el.name.textContent = station ? station.name : 'Next stop';
      el.sub.textContent = station ? station.subtitle : 'More stations coming soon';
    });
    set('kicker', station ? (stopped ? 'This is' : arriving ? 'Now arriving' : 'Next stop') : 'Next stop', function (v) {
      el.kicker.textContent = v;
    });
    set('getOff', state.canGetOff, function (on) {
      el.getOff.hidden = !on;
      if (station) el.getOff.textContent = station.getOff.label;
    });
    set('hint', state.progress < 0.015, function (on) { el.hint.classList.toggle('is-hidden', !on); });
  }

  function setDip(v) {
    el.dip.style.opacity = v.toFixed(3);
  }

  return { update: update, setDip: setDip };
}
