/**
 * DOM overlay: station card (kicker, name, GET OFF), route progress, scroll hint, end card,
 * and the reduced-motion dip. Reads timeline state; writes to the DOM only when values change.
 */
import { LINE } from './stations.js';

export function createUI(root, stations, handlers) {
  var el = {
    card: root.querySelector('[data-station-card]'),
    kicker: root.querySelector('[data-station-kicker]'),
    name: root.querySelector('[data-station-name]'),
    sub: root.querySelector('[data-station-sub]'),
    getOff: root.querySelector('[data-get-off]'),
    toast: root.querySelector('[data-toast]'),
    route: root.querySelector('[data-route]'),
    train: root.querySelector('[data-route-train]'),
    hint: root.querySelector('[data-scroll-hint]'),
    end: root.querySelector('[data-end-card]'),
    dip: root.querySelector('[data-dip]'),
    sound: root.querySelector('[data-sound]')
  };

  root.style.setProperty('--line', LINE.color);
  root.querySelectorAll('[data-line-bullet]').forEach(function (b) { b.textContent = LINE.bullet; });

  // Route: a stop dot per station, plus the "next" stub.
  var dots = stations.map(function (s, i) {
    var dot = document.createElement('li');
    dot.className = 'route__stop';
    dot.innerHTML = '<span class="route__dot"></span><span class="route__label"></span>';
    dot.querySelector('.route__label').textContent = s.name;
    el.route.insertBefore(dot, el.route.querySelector('.route__next'));
    return dot;
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
      el.card.classList.toggle('is-open', on);
      el.getOff.hidden = !on;
      if (station) el.getOff.textContent = station.getOff.label;
    });
    set('hint', state.progress < 0.015, function (on) { el.hint.classList.toggle('is-hidden', !on); });
    set('end', state.atEnd, function (on) { el.end.classList.toggle('is-visible', on); });

    // Route marker: the dots sit evenly at (k + 1) / (stops + 2); the train lands on a dot at its stop.
    var stops = stations.length;
    var pos = Math.min((state.progress + 0.3) / (stops + 2), 1);
    el.train.style.setProperty('--t', pos.toFixed(4));
    dots.forEach(function (d, k) { d.classList.toggle('is-current', k === i && stopped); d.classList.toggle('is-passed', state.progress > k + 1); });
  }

  function setDip(v) {
    el.dip.style.opacity = v.toFixed(3);
  }

  return { update: update, setDip: setDip };
}
