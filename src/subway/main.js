/**
 * Subway V1 — wiring. Builds the independent parts and runs one render loop:
 *
 *   scroll → progress → timeline.at() → state → doors / exterior / lighting / rig / signage / ui / audio
 *
 * No part talks to another; they all read the same state object.
 */
import * as THREE from 'three';
import { CAR, LEG, CRUISE_SPEED, TAIL_LEGS } from './config.js';
import { stations, mapStops, adArt } from './stations.js';
import { createTimeline } from './timeline.js';
import { createScroll } from './scroll.js';
import { createMaterials } from './materials.js';
import { createDoors } from './carriage/doors.js';
import { createShell } from './carriage/shell.js';
import { createSeats } from './carriage/seats.js';
import { createSignage } from './carriage/signage.js';
import { createLighting } from './carriage/lighting.js';
import { createLineMap } from './carriage/line-map.js';
import { createAdStrip } from './carriage/ad-strip.js';
import { createTunnel } from './exterior/tunnel.js';
import { buildStation } from './exterior/station.js';
import { createCameraRig } from './camera-rig.js';
import { createAudio } from './audio.js';
import { createUI } from './ui.js';

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
  var timeline = createTimeline({ legs: LEG, stationCount: stations.length, cruiseSpeed: CRUISE_SPEED, tail: TAIL_LEGS });

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
  scene.add(shell.group, doors.group, seats.group, signage.group, lineMap.group, adStrip.group);
  var lighting = createLighting(scene);

  // Outside.
  var loader = new THREE.TextureLoader();
  var tunnel = createTunnel(mats, registry);
  var stationViews = stations.map(function (s) { return buildStation(s, mats, registry, loader); });
  scene.add(tunnel.group);
  stationViews.forEach(function (v) { scene.add(v.group); });
  function insideStation(a, margin) {
    for (var i = 0; i < stationViews.length; i++) if (stationViews[i].contains(a, margin)) return true;
    return false;
  }

  var rig = createCameraRig(camera, { reduceMotion: reduceMotion });
  var audio = createAudio();
  var detachMap = lineMap.attach(camera, canvas, function (href) { window.location.href = href; });
  var ui = createUI(root, stations, mapStops, { toggleSound: function () { return audio.setEnabled(!audio.isEnabled()); } });
  var scroll = createScroll({
    total: timeline.total,
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
    var state = timeline.at(frozen != null ? frozen : scroll.sample(dt));
    var distance = reduceMotion ? state.reducedDistance : state.distance;

    var presence = timeline.presenceAt(distance);

    doors.set(state.doors.left, state.doors.right);
    stationViews.forEach(function (v, i) { v.place(timeline.stationDistances[i], distance, presence); });
    tunnel.update(distance, insideStation);
    lighting.update(state, distance, presence, insideStation, reduceMotion);
    // In the tunnel the windows go dark and mirror-like; at a station you see straight through.
    mats.glass.opacity = 0.42 - 0.3 * presence;
    rig.update(state, distance, dt);
    adStrip.update(camera.position.x);
    signage.update(state);
    ui.update(state);
    ui.setDip(reduceMotion ? state.dip : 0);
    audio.update(state, distance);
    renderer.render(scene, camera);

    if (debug) debug.textContent = state.progress.toFixed(3) + ' · ' + state.phase + ' · v ' + state.speed.toFixed(2) + ' · ' + distance.toFixed(1) + ' m';
  }

  function onVisibility() {
    if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
    else if (raf == null) { clock.getDelta(); tick(); }
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
