/**
 * Subway V1 — wiring. Builds the independent parts and runs one render loop:
 *
 *   scroll → progress → timeline.at() → state → doors / exterior / lighting / rig / signage / ui / audio
 *
 * A ride from the line map (journey.js) takes the scroll's place as the source of state until
 * the doors are open at the new stop. GET OFF at a station with a takeover pushes the camera
 * toward the hero piece and opens the gallery over the paused scene; RETURN TO TRAIN hands back.
 *
 * No part talks to another; they all read the same state object.
 */
import * as THREE from 'three';
import { CAR, LEG, CRUISE_SPEED, START, GET_OFF } from './config.js';
import { stations, mapStops, adArt, easterEgg, aragua } from './stations.js';
import { createTimeline } from './timeline.js';
import { createScroll } from './scroll.js';
import { createJourney } from './journey.js';
import { stationContent } from './content.js';
import { createGallery } from './gallery.js';
import { createMaterials } from './materials.js';
import { createDoors } from './carriage/doors.js';
import { createShell } from './carriage/shell.js';
import { createSeats } from './carriage/seats.js';
import { createSignage } from './carriage/signage.js';
import { createLighting } from './carriage/lighting.js';
import { createLineMap } from './carriage/line-map.js';
import { createAdStrip, createPanelAd } from './carriage/ad-strip.js';
import { createTunnel } from './exterior/tunnel.js';
import { buildStation } from './exterior/station.js';
import { createCameraRig } from './camera-rig.js';
import { createAudio } from './audio.js';
import { createUI } from './ui.js';
import { createSpray } from './spray.js';

var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
var params = new URLSearchParams(window.location.search);

var root = document.querySelector('.subway');
var canvas = document.getElementById('subwayCanvas');

function start() {
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  var registry = { geometries: [], materials: [], textures: [] };
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030303);
  scene.fog = new THREE.Fog(0x050506, 14, 60);
  var camera = new THREE.PerspectiveCamera(56, 1, 0.05, 120);

  var mats = createMaterials(renderer, registry);
  var timeline = createTimeline({ legs: LEG, stationCount: stations.length, cruiseSpeed: CRUISE_SPEED });

  // Carriage.
  var shell = createShell(mats, registry);
  var doors = createDoors(mats, registry);
  var seats = createSeats(mats, registry, [
    { x0: CAR.seat.x0, count: CAR.seat.count, dir: 1 },
    { x0: CAR.doorCenterX - CAR.doorWidth / 2 - CAR.doorTravel - 0.18, count: 6, dir: -1 }
  ]);
  var signage = createSignage(mats, registry, shell, stations);
  var lineMap = createLineMap(mats, registry, mapStops);
  var adStrip = createAdStrip(mats, registry, shell, adArt);
  // The eye of Charles, as an ad card on the steel panel under the line map. Click it: see below.
  var eyeAd = createPanelAd(registry, {
    src: '/images/wall/eye-tag.jpg', width: 0.5, height: 0.46, seed: 112,
    position: [CAR.doorCenterX + CAR.doorWidth / 2 + (CAR.doorTravel + 0.05) / 2, 0.33, 0.018]
  });
  scene.add(eyeAd.group);
  scene.add(shell.group, doors.group, seats.group, signage.group, lineMap.group, adStrip.group);
  var lighting = createLighting(scene);

  // Outside.
  var loader = new THREE.TextureLoader();
  var tunnel = createTunnel(mats, registry);
  var contents = stations.map(stationContent);
  var stationViews = stations.map(function (s, i) {
    return buildStation(s, mats, registry, loader, timeline.gap, contents[i], { coarse: !finePointer });
  });
  scene.add(tunnel.group);
  stationViews.forEach(function (v) { scene.add(v.group); });
  // Secret stops stand in for a real one while a secret ride is on (see tick).
  var secretViews = {};
  [easterEgg, aragua].forEach(function (s) {
    var v = buildStation(s, mats, registry, loader, timeline.gap);
    v.group.visible = false;
    scene.add(v.group);
    secretViews[s.id] = v;
  });
  function insideStation(a, margin) {
    for (var i = 0; i < stationViews.length; i++) if (stationViews[i].contains(a, margin)) return true;
    return false;
  }

  var rig = createCameraRig(camera, { reduceMotion: reduceMotion });
  var audio = createAudio();
  var journey = createJourney(timeline, { reduceMotion: reduceMotion });
  /**
   * What has the scene besides the scroll: null, 'ride' (a journey is running) or 'off' (GET OFF:
   * the push and the gallery). Anything that would start another is ignored until it's done.
   */
  var busy = null;
  var run = null;
  // A stop on the line map rides the train there; GET OFF then opens that stop's gallery.
  var detachMap = lineMap.attach(camera, canvas, function (href) {
    rideToStation(stations.findIndex(function (s) { return s.href === href; }));
  });

  /** Ride to station i (doors shut, depart, tunnel, arrive, doors open). False if nothing ran. */
  function rideToStation(i) {
    if (busy || frozen != null || i < 0) return false;
    run = journey.plan(scroll.rideStart(), i);
    if (!run) return false;
    setBusy('ride');
    return true;
  }
  function setBusy(v) {
    busy = v;
    scroll.lock(!!v);
    ui.setBusy(!!v);
  }
  /**
   * Secret doors: the eye of Charles (to Easter Egg) and the word "Criterio" on the motto sign
   * over the window (to Aragua). A click rides the train to the next station, which is dressed
   * as the secret stop until the train has pulled away from it again.
   */
  var secret = null;
  var eye = { hover: false };
  var detachEye = (function () {
    var ray = new THREE.Raycaster();
    var ndc = new THREE.Vector2();
    var doors = [
      { stop: easterEgg, mesh: eyeAd.print, hits: function () { return true; } },
      { stop: aragua, mesh: signage.motto.mesh, hits: function (hit) { return signage.motto.onCriterio(hit.uv); } }
    ];
    function over(e) {
      var rect = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      for (var i = 0; i < doors.length; i++) {
        var hit = ray.intersectObject(doors[i].mesh, false)[0];
        if (hit && doors[i].hits(hit)) return doors[i].stop;
      }
      return null;
    }
    var pressed = null;
    function onMove(e) {
      var on = !!over(e);
      if (on === eye.hover) return;
      eye.hover = on;
      if (!lineMap.pointer().onMap) canvas.style.cursor = on ? 'pointer' : '';
    }
    function onDown(e) { onMove(e); pressed = over(e); }
    function onClick(e) {
      var stop = over(e);
      if (!stop || stop !== pressed || busy) return;
      var leg = Math.floor(scroll.progress()) + 1;
      var index = ((leg % stations.length) + stations.length) % stations.length;
      if (rideToStation(index)) {
        if (secret) secret.view.group.visible = false;
        secret = { stop: stop, view: secretViews[stop.id], index: index, arrived: false };
      }
    }
    function onLeave() { eye.hover = false; }
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('click', onClick);
    return function () {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('click', onClick);
    };
  })();

  /**
   * The open doorway as a click target: an invisible plane filling the door opening, plus the
   * hero piece behind it. Live only while the train stands with both leaves fully open and
   * nothing else is running; hovering lifts the hero and points at GET OFF.
   */
  var lastState = null;
  var doorway = (function () {
    var mat = new THREE.MeshBasicMaterial({ visible: false });
    registry.materials.push(mat);
    var geo = new THREE.PlaneGeometry(CAR.doorWidth, CAR.doorHeight);
    registry.geometries.push(geo);
    var hit = new THREE.Mesh(geo, mat);
    hit.position.set(CAR.doorCenterX, CAR.doorHeight / 2, -0.04);
    scene.add(hit);
    var ray = new THREE.Raycaster();
    var ndc = new THREE.Vector2();
    var self = { hover: false, lift: 0 };

    function station() { return lastState && (lastState.station || stations[lastState.stationIndex]); }
    self.ready = function () {
      var s = lastState;
      return !!s && !busy && s.phase === 'dwell' && s.doors.left > 0.999 && s.doors.right > 0.999 && !station().secret;
    };
    function over(e) {
      if (!self.ready()) return false;
      var rect = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      var targets = [hit];
      var i = stations.indexOf(station());
      if (i >= 0) targets.push(stationViews[i].hero);
      return ray.intersectObjects(targets, false).length > 0;
    }
    self.set = function (on) {
      if (on === self.hover) return;
      self.hover = on;
      ui.hintGetOff(on);
      if (on) canvas.style.cursor = 'pointer';
      else if (!eye.hover && lineMap.pointer().stop < 0) canvas.style.cursor = '';
    };
    var pressed = false;
    function onMove(e) { self.set(over(e)); }
    function onDown(e) { onMove(e); pressed = self.hover; }
    function onClick(e) {
      if (pressed && over(e)) getOff(station());
      pressed = false;
    }
    function onLeave() { self.set(false); }
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('click', onClick);
    self.dispose = function () {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('click', onClick);
    };
    return self;
  })();

  var spray = createSpray({
    root: root,
    canvas: canvas,
    camera: camera,
    registry: registry,
    leaves: doors.leaves,
    leafFront: doors.leafFront,
    // Everything in the car takes paint except the floor; the signs and ads just catch it.
    surfaces: [shell.group, seats.group, doors.group],
    unpaintable: [mats.floor],
    noPaint: [lineMap.group, signage.group, adStrip.group],
    // The can steps aside over the line map and the secret doors, so they can be clicked.
    selecting: function () {
      var p = lineMap.pointer();
      return eye.hover || doorway.hover ? { onMap: true, stop: 0 } : p;
    },
    finePointer: finePointer,
    onHiss: audio.spray
  });
  scene.add(spray.group);
  var ui = createUI(root, stations, mapStops, {
    toggleSound: function () { return audio.setEnabled(!audio.isEnabled()); },
    ride: rideToStation,
    getOff: getOff
  });

  /**
   * GET OFF (the button, the open doorway or the hero): the gallery where the stop has one,
   * otherwise the section's page as before.
   */
  var leaving = null;
  var heroAt = new THREE.Vector3();
  function getOff(station) {
    if (busy) return;
    var i = stations.indexOf(station);
    if (i < 0 || !contents[i]) { window.location.href = station.href; return; }
    var view = stationViews[i];
    view.hero.getWorldPosition(heroAt);
    rig.aimAt(heroAt, view.heroSize.width, view.heroSize.height);
    doorway.set(false);
    setBusy('off');
    leaving = { index: i, start: performance.now(), shown: false };
  }
  var gallery = createGallery(root, {
    reduceMotion: reduceMotion,
    fadeMs: GET_OFF.fade * 1000,
    focusAfter: function () { ui.focusGetOff(); },
    // Back on the train: seated again behind the fading gallery, the scene running as it was.
    onClosed: function () {
      leaving = null;
      rig.setPush(0);
      setBusy(null);
      if (raf == null && !document.hidden) { clock.getDelta(); tick(); }
    }
  });
  var scroll = createScroll({
    period: timeline.period,
    start: START,
    spacer: document.querySelector('[data-scroll-spacer]'),
    reduceMotion: reduceMotion,
    resting: timeline.restingTarget
  });
  // ?p=0.76 freezes the journey at that progress (stills, design review).
  var frozen = params.has('p') ? parseFloat(params.get('p')) || 0 : null;

  var debug = params.has('debug') ? document.querySelector('[data-debug]') : null;
  if (debug) debug.hidden = false;

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    var coarse = !finePointer || w < 768;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
    renderer.setSize(w, h, false);
    var seat = rig.frame(w / h);
    stationViews.forEach(function (v) { v.setViewpoint(seat.x, seat.z); });
  }
  resize();
  window.addEventListener('resize', resize);

  var clock = new THREE.Clock();
  var raf = null;

  function tick() {
    raf = requestAnimationFrame(tick);
    var dt = Math.min(clock.getDelta(), 0.05);
    var now = performance.now();
    var state;
    if (run) {
      state = run.state(now);
      // Arrived, doors open: park the scroll on the same frame and give it back.
      if (run.done) {
        scroll.park(run.p1);
        run = null;
        setBusy(null);
      }
    } else {
      state = timeline.at(frozen != null ? frozen : scroll.sample(dt));
    }
    var dip = reduceMotion ? state.dip : 0;
    if (leaving) {
      var f = Math.min(1, (now - leaving.start) / 1000 / (reduceMotion ? GET_OFF.fade : GET_OFF.push));
      rig.setPush(reduceMotion ? 0 : f);
      dip = Math.max(dip, reduceMotion ? f : 0);
      if (f > (reduceMotion ? 0.6 : 0.82) && !leaving.shown) {
        leaving.shown = true;
        gallery.show(stations[leaving.index], contents[leaving.index], leaving.index, stations.length);
      }
      // Under the gallery there's nothing to draw: hold the last frame until it closes.
      if (f >= 1 && now - leaving.start > (GET_OFF.push + GET_OFF.fade) * 1000 + 100) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    }
    var distance = reduceMotion ? state.reducedDistance : state.distance;

    var presence = timeline.presenceAt(distance);

    doors.set(state.doors.left, state.doors.right);
    stationViews.forEach(function (v, i) { v.place(timeline.stationDistances[i], distance, presence); });
    if (secret) {
      secret.view.place(timeline.stationDistances[secret.index], distance, presence);
      stationViews[secret.index].group.visible = false;
      if (state.stationIndex === secret.index) state.station = secret.stop;
      // Once the ride is over, the stop goes back to normal as soon as it's out of sight.
      if (!run) secret.arrived = true;
      if (secret.arrived && !secret.view.group.visible) {
        secret = null;
        stationViews.forEach(function (v, i) { v.place(timeline.stationDistances[i], distance, presence); });
      }
    }
    tunnel.update(distance, insideStation, reduceMotion ? 0 : state.speed);
    lighting.update(state, distance, presence, insideStation, reduceMotion);
    // In the tunnel the windows go dark and mirror-like; at a station you see straight through.
    mats.glass.opacity = 0.42 - 0.3 * presence;
    rig.update(state, distance, dt);
    spray.update(dt);
    adStrip.update(camera.position.x);
    signage.update(state);
    lastState = state;
    // The doorway goes dead the moment the doors start to move or something else takes over.
    if (doorway.hover && !doorway.ready()) doorway.set(false);
    doorway.lift += ((doorway.hover ? 1 : 0) - doorway.lift) * (reduceMotion ? 1 : 1 - Math.exp(-dt * 10));
    stationViews.forEach(function (v, i) { v.setHover(i === state.stationIndex ? doorway.lift : 0); });
    ui.update(state);
    ui.setDip(dip);
    audio.update(state, distance);
    renderer.render(scene, camera);

    if (debug) debug.textContent = state.progress.toFixed(3) + ' · ' + state.phase + ' · v ' + state.speed.toFixed(2) + ' · ' + distance.toFixed(1) + ' m';
  }

  function onVisibility() {
    if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
    else if (raf == null && !(leaving && gallery.isOpen())) { clock.getDelta(); tick(); }
  }
  document.addEventListener('visibilitychange', onVisibility);
  tick();
  root.classList.add('is-ready');

  return function dispose() {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVisibility);
    scroll.dispose();
    detachMap();
    detachEye();
    doorway.dispose();
    gallery.dispose();
    spray.dispose();
    audio.dispose();
    registry.geometries.forEach(function (g) { g.dispose(); });
    registry.materials.forEach(function (m) { m.dispose(); });
    registry.textures.forEach(function (t) { t.dispose(); });
    renderer.dispose();
  };
}

try {
  start();
} catch (error) {
  console.warn('Subway: WebGL unavailable, showing the static station.', error);
  root.classList.add('no-webgl');
}
