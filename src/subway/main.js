/**
 * Subway V1 — wiring. Builds the independent parts and runs one render loop:
 *
 *   ride (journey.js) or resting progress → timeline state → doors / exterior / lighting / rig / signage / ui / audio
 *
 * The train stands at a stop with its doors open until something asks for a ride: a scroll
 * step (scroll.js: one gesture, one station, either way round the loop), a stop on the line
 * map, or a secret door. The ride is the source of state until the doors are open at the new
 * stop; then the train rests there. With the doors open you can step out onto the platform,
 * and the station's sign on the wall takes you to its section's page.
 *
 * No part talks to another; they all read the same state object.
 */
import * as THREE from 'three';
import { CAR, WORLD, LEG, CRUISE_SPEED, START, START_CLOSED, DOOR_WALK } from './config.js';
import { stations, mapStops, adArt, easterEgg, aragua } from './stations.js';
import { createTimeline } from './timeline.js';
import { createScroll } from './scroll.js';
import { createJourney } from './journey.js';
import { stationContent } from './content.js';
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
import { web } from './web.js';

var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
/** A touch device: its own framing (camera-rig.js) and gestures (swipes, taps; see onSwipe). */
var phone = !finePointer;
var params = new URLSearchParams(window.location.search);

var root = document.querySelector('.subway');
var canvas = document.getElementById('subwayCanvas');

/**
 * The loader: the tag flashing in a ring that fills with real progress, the percentage under
 * it. Progress is the scripts running, the images and textures being fetched (everything that
 * goes through three's loading manager, the wall art included: takeover.js), the shaders
 * compiling, and the page finishing. It stays up until all of that is done, reads 100%, then
 * fades: never shorter than LOADER.min, never longer than LOADER.max (ms).
 */
var LOADER = { min: 900, max: 12000, hold: 250 };
// Every texture three.js loads comes from its light web copy (web.js).
THREE.DefaultLoadingManager.setURLModifier(web);
var loaderFrom = performance.now();
var assets = { started: 0, done: 0 };
(function countAssets(manager) {
  var start = manager.itemStart, end = manager.itemEnd, error = manager.itemError;
  manager.itemStart = function (url) { assets.started++; start.call(manager, url); };
  manager.itemEnd = function (url) { assets.done++; end.call(manager, url); };
  manager.itemError = function (url) { assets.done++; error.call(manager, url); };
})(THREE.DefaultLoadingManager);
var shadersWarm = false;
var loaderShown = 0;
var loaderFull = null;
var loaderRun = document.querySelector('[data-loader-run]');
var loaderPct = document.querySelector('[data-loader-pct]');
function revealWhenLoaded() {
  var t = performance.now() - loaderFrom;
  var pending = assets.started - assets.done;
  var built = root.classList.contains('is-ready');
  var complete = document.readyState === 'complete';
  // Weighted: scripts 10, assets 60, shaders 20, page 10.
  var target = 10 + 60 * (assets.started ? assets.done / assets.started : 0) + (shadersWarm ? 20 : 0) + (complete ? 10 : 0);
  var ready = built && shadersWarm && !pending && complete;
  if (!ready) target = Math.min(target, 99);
  if (t >= LOADER.max) target = 100;
  // Never runs backwards (more images can start loading as it goes), eases toward the target.
  loaderShown = Math.max(loaderShown, loaderShown + (target - loaderShown) * 0.18);
  if (target >= 100 && loaderShown > 99.5) loaderShown = 100;
  var pct = Math.floor(loaderShown);
  if (loaderRun) loaderRun.style.strokeDasharray = (loaderShown * 3.6).toFixed(1) + ' 360';
  if (loaderPct) loaderPct.textContent = pct + '%';
  if (pct >= 100 && loaderFull == null) loaderFull = performance.now();
  if (loaderFull != null && performance.now() - loaderFull >= LOADER.hold && t >= LOADER.min) root.classList.add('is-loaded');
  else requestAnimationFrame(revealWhenLoaded);
}

function start() {
  // On a dense phone screen MSAA costs a lot for little: the pixels are already small.
  var renderer = new THREE.WebGLRenderer({
    canvas: canvas, antialias: finePointer || (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance'
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  var registry = { geometries: [], materials: [], textures: [] };
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030303);
  // A faint warm-dark murk: the platform's far ends sink into it, the art wall (about 9 m out) stays clear.
  scene.fog = new THREE.Fog(0x0b0908, 12, 54);
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
    var v = buildStation(s, mats, registry, loader, timeline.gap, stationContent(s), { coarse: !finePointer });
    v.group.visible = false;
    scene.add(v.group);
    secretViews[s.id] = v;
  });
  /** The nearest platform in view (car x of its origin), for the station light rig; null if none. */
  function nearestStationX() {
    var best = null;
    function consider(v) {
      if (v.group.visible && (best == null || Math.abs(v.group.position.x) < Math.abs(best))) best = v.group.position.x;
    }
    stationViews.forEach(consider);
    Object.keys(secretViews).forEach(function (id) { consider(secretViews[id]); });
    return best;
  }
  function insideStation(a, margin) {
    for (var i = 0; i < stationViews.length; i++) if (stationViews[i].contains(a, margin)) return true;
    return false;
  }

  var rig = createCameraRig(camera, { reduceMotion: reduceMotion });
  var audio = createAudio();
  var journey = createJourney(timeline, { reduceMotion: reduceMotion });
  /** 'ride' while a journey is running (anything that would start another waits), else null. */
  var busy = null;
  var run = null;
  // A stop on the line map rides the train there.
  var detachMap = lineMap.attach(camera, canvas, function (href) {
    rideToStation(stations.findIndex(function (s) { return s.href === href; }));
  });

  /** Ride to station i (doors shut, depart, tunnel, arrive, doors open); dir -1 rides backward. False if nothing ran. */
  function rideToStation(i, dir) {
    if (busy || frozen != null || i < 0) return false;
    run = journey.plan(scroll.progress(), i, dir || 1);
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
    // The secret doors take paint too: a press that moves is a spray stroke, only a still
    // click (or tap) opens the door.
    var downAt = null;
    function onDown(e) { onMove(e); pressed = over(e); downAt = { x: e.clientX, y: e.clientY }; }
    function onClick(e) {
      var stop = over(e);
      var still = downAt && Math.abs(e.clientX - downAt.x) + Math.abs(e.clientY - downAt.y) < 8;
      if (!stop || stop !== pressed || !still || busy) return;
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
   * nothing else is running; hovering lifts the hero. A click there, or the flashing "Step out"
   * arrow in the doorway, walks you out through the doors onto the platform (atDoor). Out there
   * the scroll doesn't ride; "Back to train" (or Esc) walks you back to the seat.
   */
  var lastState = null;
  var atDoor = { to: 0, f: 0 };
  var stepAt = new THREE.Vector3();

  /**
   * Out on the platform: drag (mouse or finger) to look left and right along the platform. The
   * turn stops just before the edge of the frame would reach the train behind you (it's only
   * built from the inside), so the range follows the screen's width. The head eases after the
   * pointer; back on the train it eases straight again.
   */
  var LOOK = { margin: 0.08, perPx: 0.0042 };
  function maxYaw() {
    var halfH = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
    return Math.max(0, Math.PI / 2 - halfH - LOOK.margin);
  }
  var look = { yaw: 0, toYaw: 0, vel: 0, drag: null, touch: false };
  var detachLook = (function () {
    function out() { return atDoor.to && atDoor.f === 1 && !busy; }
    function onDown(e) {
      // A finger looks round the same way, except while painting or up close to the art.
      if (!out() || e.button > 0) return;
      if (e.pointerType === 'touch' && (walk.inspectTo || spray.touchArmed())) return;
      look.drag = { x: e.clientX, yaw: look.toYaw, touch: e.pointerType === 'touch', lastX: e.clientX, lastT: e.timeStamp, lastMove: 0 };
      look.vel = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
    }
    function onMove(e) {
      if (!look.drag) return;
      var k = LOOK.perPx * 900 / Math.max(500, window.innerHeight);
      // A finger: the view sticks to it (a screen's width turns the head one frame's width).
      if (look.drag.touch) {
        k = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect) / window.innerWidth;
        if (Math.abs(e.clientX - look.drag.x) > 40) ui.usedHint('platform');
        // As seated: stuck to the finger, stretching past the ends, its speed kept for the flick.
        var d = look.drag, dts = (e.timeStamp - d.lastT) / 1000;
        look.toYaw = rubber(d.yaw + (e.clientX - d.x) * k, -maxYaw(), maxYaw());
        if (dts > 0) look.vel = look.vel * 0.6 + (e.clientX - d.lastX) * k / dts * 0.4;
        d.lastX = e.clientX;
        d.lastT = e.timeStamp;
        d.lastMove = e.timeStamp;
        return;
      }
      // Grab the view: drag right and the station slides right (you turn left).
      var m = maxYaw();
      look.toYaw = Math.max(-m, Math.min(m, look.drag.yaw + (e.clientX - look.drag.x) * k));
    }
    function onUp(e) {
      // Held still before lifting: no flick. A mouse never flicks.
      if (look.drag && (!look.drag.touch || e.timeStamp - look.drag.lastMove > 80)) look.vel = 0;
      look.drag = null;
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    return function () {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  })();
  /**
   * Seated on a phone: the frame is cut tight to the doors, and a finger drag turns the head
   * along the car (the window, the line map, the seats). It handles like a native scroll: the
   * view sticks to the finger, a flick carries on and slows, and past either end it stretches a
   * little and springs back. A while after you let go it drifts home to the doors.
   *
   * Turning the phone pans too, softly: the gyroscope's turn rate about the phone's upright axis,
   * smoothed and scaled down so it reads as parallax, easing back to centre over time so it never
   * gets stuck sideways, and ignored while a finger is down. (iOS asks permission once, on the
   * first touch.) Everything goes straight while riding or stepping out.
   */
  var SEAT_LOOK = {
    left: 0.42, right: -0.62,
    /** How far past an end the view stretches (radians, at most), and how stiff that feels. */
    stretch: 0.1, resist: 0.35,
    /** Flick glide: velocity falls by e every 1/friction s; spring back from an overshoot. */
    friction: 3.2, spring: 11,
    returnMs: 3500,
    /** Phone turn → view turn, how fast the tilt settles back to centre (1/s), its smoothing. */
    tilt: 0.6, tiltHome: 0.25, tiltSmooth: 7
  };
  var seatLook = { yaw: 0, drag: 0, vel: 0, gyro: 0, tiltDeg: 0, touch: null, released: 0, lastMove: 0 };
  /** Has the visitor looked around yet? The first hint teaches it, before opening the doors. */
  var looked = false;
  /** Past an end, the finger's travel counts less and less (rubber band). */
  function stretched(raw) { return rubber(raw, SEAT_LOOK.right, SEAT_LOOK.left); }
  /** raw, but past lo or hi the travel counts less and less (at most SEAT_LOOK.stretch past). */
  function rubber(raw, lo, hi) {
    var S = SEAT_LOOK.stretch;
    if (raw > hi) return hi + S * (1 - 1 / ((raw - hi) * SEAT_LOOK.resist / S + 1));
    if (raw < lo) return lo - S * (1 - 1 / ((lo - raw) * SEAT_LOOK.resist / S + 1));
    return raw;
  }
  /**
   * After a finger lets go of a look: glide on, slowing (friction), and spring back inside
   * [lo, hi] if past an end. o: { to, vel }. The same feel as the seated pan.
   */
  function glide(o, lo, hi, dt) {
    o.vel = reduceMotion ? 0 : o.vel * Math.exp(-dt * SEAT_LOOK.friction);
    o.to += o.vel * dt;
    if (o.to > hi || o.to < lo) {
      var edge = o.to > hi ? hi : lo;
      o.vel *= Math.exp(-dt * SEAT_LOOK.spring * 1.5);
      o.to += (edge - o.to) * (1 - Math.exp(-dt * SEAT_LOOK.spring));
      o.to = Math.max(lo - SEAT_LOOK.stretch, Math.min(hi + SEAT_LOOK.stretch, o.to));
    }
    if (Math.abs(o.vel) < 0.005) o.vel = 0;
  }
  function seatedHere() { return phone && !atDoor.to && !atDoor.f && !busy; }
  var detachSeatLook = (function () {
    if (!phone) return function () {};
    function onStart(e) {
      // A finger down catches the view where it is: any glide stops.
      seatLook.touch = e.touches.length === 1 && seatedHere() && !spray.touchArmed()
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY, raw: seatLook.drag, lastX: e.touches[0].clientX, lastT: e.timeStamp, axis: null } : null;
      if (seatLook.touch) seatLook.vel = 0;
    }
    function onMove(e) {
      var t = seatLook.touch;
      if (!t || !seatedHere()) return;
      // The view sticks to the finger: drag right and the car slides right (you turn left).
      var hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
      var x = e.touches[0].clientX;
      // Axis lock: the first 10 px decide. A mostly vertical swipe (a ride) never pans; a
      // sideways one pans from where the finger is then, so the lock itself doesn't jump.
      if (!t.axis) {
        var ax = Math.abs(x - t.x), ay = Math.abs(e.touches[0].clientY - t.y);
        if (Math.max(ax, ay) < 10) return;
        t.axis = ax > ay ? 'x' : 'y';
        if (t.axis === 'x') { t.x = x; t.lastX = x; t.lastT = e.timeStamp; }
      }
      if (t.axis !== 'x') return;
      var perPx = hfov / window.innerWidth;
      seatLook.drag = stretched(t.raw + (x - t.x) * perPx);
      if (Math.abs(x - t.x) > 40) looked = true;
      // Finger speed (rad/s), smoothed over the last few moves, for the flick.
      var dts = (e.timeStamp - t.lastT) / 1000;
      if (dts > 0) {
        var v = (x - t.lastX) * perPx / dts;
        seatLook.vel = seatLook.vel * 0.6 + v * 0.4;
      }
      t.lastX = x;
      t.lastT = e.timeStamp;
      seatLook.lastMove = e.timeStamp;
    }
    var asked = false;
    function onEnd(e) {
      if (seatLook.touch) {
        seatLook.released = performance.now();
        // Held still before lifting: no flick.
        if (e.timeStamp - seatLook.lastMove > 80) seatLook.vel = 0;
      }
      seatLook.touch = null;
      // Turn to look: iOS only hands out motion after a tap asks for it.
      if (asked || typeof DeviceMotionEvent === 'undefined') return;
      asked = true;
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission().then(function (r) {
          if (r === 'granted') window.addEventListener('devicemotion', onTurn);
        }).catch(function () { /* declined: drag only */ });
      } else window.addEventListener('devicemotion', onTurn);
    }
    var lastTurn = 0;
    function onTurn(e) {
      // The gyroscope's rate about the phone's own upright axis (gamma, deg/s; + = turning left),
      // summed into a heading. Unlike the compass heading it doesn't lurch when the phone tips.
      var r = e.rotationRate;
      var dts = lastTurn ? Math.min(0.1, (e.timeStamp - lastTurn) / 1000) : 0;
      lastTurn = e.timeStamp;
      if (!r || r.gamma == null || !seatedHere() || window.innerWidth > window.innerHeight) { seatLook.tiltDeg = 0; return; }
      // A finger down owns the view; small tremors don't count.
      if (seatLook.touch || Math.abs(r.gamma) < 1.5) return;
      seatLook.tiltDeg = Math.max(-60, Math.min(60, seatLook.tiltDeg + r.gamma * dts));
      if (Math.abs(seatLook.tiltDeg) > 12) looked = true;
    }
    canvas.addEventListener('touchstart', onStart, { passive: true });
    canvas.addEventListener('touchmove', onMove, { passive: true });
    canvas.addEventListener('touchend', onEnd);
    canvas.addEventListener('touchcancel', onEnd);
    return function () {
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onEnd);
      canvas.removeEventListener('touchcancel', onEnd);
      window.removeEventListener('devicemotion', onTurn);
    };
  })();

  /** Back on the train from the platform at least once: only then does the phone teach the ride. */
  var beenOut = false;
  function toDoor(on) {
    if (!on && atDoor.to) beenOut = true;
    atDoor.to = on ? 1 : 0;
  }
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
      return !!s && !busy && s.phase === 'dwell' && s.doors.left > 0.999 && s.doors.right > 0.999;
    };
    function over(e) {
      if (!self.ready() || atDoor.to) return false;
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
      if (on) canvas.style.cursor = 'pointer';
      else if (!eye.hover && lineMap.pointer().stop < 0) canvas.style.cursor = '';
    };
    var pressed = false;
    function onMove(e) { self.set(over(e)); }
    function onDown(e) { onMove(e); pressed = self.hover; }
    function onClick(e) {
      // Seen through the doorway, the visit sign takes the click.
      if (pressed && !busy && !visit.hover && over(e)) { toDoor(true); self.set(false); }
      pressed = false;
    }
    function onKey(e) { if (e.key === 'Escape' && atDoor.to && !busy) toDoor(false); }
    window.addEventListener('keydown', onKey);
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
      window.removeEventListener('keydown', onKey);
    };
    return self;
  })();

  /**
   * The visit sign on the platform wall: while the doors stand open at a real stop (seated or
   * out on the platform), hovering lights it up and a click goes to the station's page.
   */
  var visit = (function () {
    var ray = new THREE.Raycaster();
    var ndc = new THREE.Vector2();
    var self = { hover: false };
    /** The stop whose sign is live, or null. */
    self.live = function () {
      var s = lastState;
      if (!s || s.station || !doorway.ready()) return null;
      return stationViews[s.stationIndex].sign ? stations[s.stationIndex] : null;
    };
    function over(e) {
      var stop = self.live();
      if (!stop) return false;
      var rect = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.intersectObject(stationViews[stations.indexOf(stop)].sign, true).length > 0;
    }
    self.over = over;
    self.set = function (on) {
      if (on === self.hover) return;
      self.hover = on;
      if (on) canvas.style.cursor = 'pointer';
    };
    // A press on the sign that turns into a look-round drag isn't a click.
    var pressed = null;
    function onMove(e) { if (!look.drag) self.set(over(e)); }
    function onDown(e) { onMove(e); pressed = self.hover ? { x: e.clientX, y: e.clientY } : null; }
    function onClick(e) {
      var stop = self.live();
      var still = pressed && Math.abs(e.clientX - pressed.x) + Math.abs(e.clientY - pressed.y) < 8;
      if (still && stop && over(e)) window.location.href = stop.href;
      pressed = null;
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
    // Fair game all the same: the 601 tag, the motto sign over the window, the eye of Charles.
    paintable: signage.tags.concat([signage.motto.mesh, eyeAd.print]),
    // The can steps aside over the line map, the doorway and the visit sign, so they can be
    // clicked; over the secret doors it stays (they take paint, and open on a still click).
    selecting: function () {
      var p = lineMap.pointer();
      if (visit.hover) return { onMap: true, stop: 0 };
      if (atDoor.to) return { onMap: true, stop: -1, cursor: look.drag ? 'grabbing' : 'grab' };
      return doorway.hover ? { onMap: true, stop: 0 } : p;
    },
    finePointer: finePointer,
    onHiss: audio.spray
  });
  scene.add(spray.group);
  var ui = createUI(root, stations, mapStops, {
    phone: phone,
    toggleSound: function () { return audio.setEnabled(!audio.isEnabled()); },
    ride: rideToStation,
    stepOut: function () { if (doorway.ready()) toDoor(true); },
    stepIn: function () { if (!busy) toDoor(false); }
  });

  /**
   * The phone's platform: three set viewpoints along the wall (the bays either side of the doors'
   * own, between the columns), walked between by swipes with an eased glide, and a tap on the art
   * that walks you up to it (tap again, or swipe down, to step back). Cinematic moves only.
   */
  var SPOTS = [-WORLD.station.columnStep, 0, WORLD.station.columnStep];
  var walk = { spot: 1, x: 0, inspect: 0, inspectTo: 0, at: new THREE.Vector3() };
  function currentView() {
    var s = lastState;
    if (!s) return null;
    return s.station && secret ? secret.view : stationViews[s.stationIndex];
  }
  var detachInspect = (function () {
    var ray = new THREE.Raycaster();
    var ndc = new THREE.Vector2();
    function onClick(e) {
      if (!phone || !atDoor.to || atDoor.f < 1 || busy || visit.over(e)) return;
      if (walk.inspectTo) { walk.inspectTo = 0; return; }
      var view = currentView();
      if (!view) return;
      var rect = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      // Only the wall and what's on it: the art.
      var hit = ray.intersectObject(view.group, true).filter(function (h) { return h.point.z < WORLD.station.wallZ + 0.4; })[0];
      if (!hit) return;
      walk.at.copy(hit.point);
      walk.inspectTo = 1;
      // A sharp print of the sheet being looked at, for the length of the look.
      view.sharpen(hit.point);
      walk.sharpView = view;
      ui.usedHint('platform');
    }
    canvas.addEventListener('click', onClick);
    return function () { canvas.removeEventListener('click', onClick); };
  })();

  /** One station along the loop, either way (a scroll step, a key, a phone swipe). */
  /**
   * Standing at a stop with the doors still shut (a phone's first load): open them, a short timed
   * run through the timeline's own opening, hiss and all. False when there's nothing to open.
   */
  var DOORS_OPEN_MS = 2000;
  function openDoors() {
    if (busy || frozen != null) return false;
    var p0 = scroll.progress();
    var k = Math.floor(p0);
    if (p0 - k >= LEG.settle) return false;
    var p1 = k + START;
    var t0 = performance.now();
    run = {
      p1: p1,
      done: false,
      state: function (now) {
        var f = Math.min(1, (now - t0) / DOORS_OPEN_MS);
        if (f === 1) this.done = true;
        return timeline.at(p0 + (p1 - p0) * f);
      }
    };
    setBusy('ride');
    return true;
  }

  function rideStep(dir) {
    // Out at the station nothing rides: only from the train.
    if (atDoor.to || atDoor.f) return;
    if (openDoors()) return;
    var n = stations.length;
    var here = ((Math.floor(scroll.progress()) % n) + n) % n;
    rideToStation((here + dir + n) % n, dir);
  }

  /**
   * The phone's gestures, by where you are. Seated: up opens the doors (first load) or rides on
   * to the next stop, down rides back to the previous one, a sideways drag looks round the car
   * (seatLook), and a tap on the open doors steps out. On the platform: a drag looks left and
   * right (detachLook, as on a desktop), down steps back (out of a close look first, then onto
   * the train).
   */
  function onSwipe(dir) {
    if (busy) return;
    if (!atDoor.to) {
      if (atDoor.f) return;
      // Seated, a sideways drag looks round the car (seatLook), so only up and down count:
      // up opens shut doors or rides on, down rides back. A tap on the open doors steps out.
      if (dir !== 'up' && dir !== 'down') return;
      if (openDoors()) return;
      if (beenOut) ui.usedHint('seat');
      rideStep(dir === 'up' ? 1 : -1);
      return;
    }
    if (atDoor.f < 1) return;
    if (dir === 'down') {
      if (walk.inspectTo) walk.inspectTo = 0;
      else toDoor(false);
      ui.usedHint('inspect');
    }
    // Left and right: the drag itself turns the head (detachLook), as on a desktop.
  }

  var scroll = createScroll({
    start: START_CLOSED,
    // One step, one station, round the loop either way.
    onStep: rideStep,
    onSwipe: phone ? onSwipe : null,
    touchPaints: spray.touchArmed
  });
  // ?p=0.76 freezes the journey at that progress (stills, design review).
  var frozen = params.has('p') ? parseFloat(params.get('p')) || 0 : null;
  // ?yaw=0.4 holds a phone's seated head turn there (radians, + = left), for stills.
  var stillYaw = params.has('yaw') ? parseFloat(params.get('yaw')) || 0 : null;

  var debug = params.has('debug') ? document.querySelector('[data-debug]') : null;
  if (debug) debug.hidden = false;

  /**
   * Render resolution: capped lower on touch and small screens, and on a phone stepped down a
   * notch at a time (to no less than 1) while frames run long, so a slow GPU keeps its frame rate.
   */
  var quality = { scale: 1, frames: 0, time: 0 };
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    var coarse = !finePointer || w < 768;
    var cap = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
    renderer.setPixelRatio(Math.max(Math.min(1, cap), cap * quality.scale));
    renderer.setSize(w, h, false);
    var seat = rig.frame(w / h);
    stationViews.forEach(function (v) { v.setViewpoint(seat.x, seat.z); });
  }
  resize();
  window.addEventListener('resize', resize);
  // iOS: the toolbar sliding in and out changes the visible height without always firing resize.
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);

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
      state = timeline.at(frozen != null ? frozen : scroll.progress());
    }
    var dip = reduceMotion ? state.dip : 0;
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
    lighting.update(state, distance, presence, insideStation, reduceMotion, nearestStationX(),
      Math.max(state.doors.left, state.doors.right));
    // In the tunnel the windows go dark and mirror-like; at a station the tint eases off but
    // the pane still reads (its surface stays: glassSurface).
    mats.glass.opacity = 0.45 - 0.2 * presence;
    // At the doors: walk there or back on the clock; back to the seat as soon as the train moves.
    if (atDoor.to && !doorway.ready()) toDoor(false);
    atDoor.f = reduceMotion ? atDoor.to : Math.max(0, Math.min(1, atDoor.f + (atDoor.to ? 1 : -1) * dt / DOOR_WALK));
    rig.setDoor(atDoor.f);
    // Looking round out there; straight again on the way back in.
    if (!atDoor.to) { look.toYaw = 0; look.drag = null; look.vel = 0; }
    else {
      var lim = maxYaw();
      // A finger's flick glides on and springs back from the ends; a mouse stays within them.
      if (!look.drag) {
        var g = { to: look.toYaw, vel: look.vel };
        glide(g, -lim, lim, dt);
        look.toYaw = g.to;
        look.vel = g.vel;
      } else if (!look.drag.touch) look.toYaw = Math.max(-lim, Math.min(lim, look.toYaw));
    }
    // A finger drag out there turns the head, not the page.
    if (!!atDoor.to !== look.touch) {
      look.touch = !!atDoor.to;
      canvas.style.touchAction = look.touch || spray.touchArmed() ? 'none' : '';
    }
    var ease = reduceMotion ? 1 : 1 - Math.exp(-dt * 8);
    // A finger (and its glide) moves the view directly, already smooth; a mouse eases after.
    if ((look.drag && look.drag.touch) || look.vel) look.yaw = look.toYaw;
    else look.yaw += (look.toYaw - look.yaw) * ease;
    rig.setLook(look.yaw);
    // Seated on a phone: the drag with its glide and rubber band, plus the softened phone turn.
    var seated = seatedHere();
    if (!seated) { seatLook.drag = 0; seatLook.vel = 0; seatLook.touch = null; seatLook.tiltDeg = 0; }
    else if (!seatLook.touch) {
      var L = SEAT_LOOK.left, R = SEAT_LOOK.right;
      // Glide on from a flick, slowing; reduced motion skips the glide.
      seatLook.vel = reduceMotion ? 0 : seatLook.vel * Math.exp(-dt * SEAT_LOOK.friction);
      seatLook.drag += seatLook.vel * dt;
      if (seatLook.drag > L || seatLook.drag < R) {
        // Past an end: the glide dies fast and the view springs back inside.
        var edge = seatLook.drag > L ? L : R;
        seatLook.vel *= Math.exp(-dt * SEAT_LOOK.spring * 1.5);
        seatLook.drag += (edge - seatLook.drag) * (1 - Math.exp(-dt * SEAT_LOOK.spring));
        seatLook.drag = Math.max(R - SEAT_LOOK.stretch, Math.min(L + SEAT_LOOK.stretch, seatLook.drag));
      } else if (Math.abs(seatLook.vel) < 0.02 && performance.now() - seatLook.released > SEAT_LOOK.returnMs) {
        // Left alone: drift home to the doors.
        seatLook.drag *= reduceMotion ? 0 : Math.exp(-dt * 2.5);
      }
    }
    // The phone's turn settles back to centre over time, and reaches the view smoothed and scaled.
    seatLook.tiltDeg *= Math.exp(-dt * SEAT_LOOK.tiltHome);
    var tiltTo = reduceMotion ? 0 : THREE.MathUtils.degToRad(seatLook.tiltDeg) * SEAT_LOOK.tilt;
    seatLook.gyro += (tiltTo - seatLook.gyro) * (1 - Math.exp(-dt * SEAT_LOOK.tiltSmooth));
    var seatTo = seatLook.drag + seatLook.gyro;
    seatTo = Math.max(SEAT_LOOK.right - SEAT_LOOK.stretch, Math.min(SEAT_LOOK.left + SEAT_LOOK.stretch, seatTo));
    if (stillYaw != null && seatedHere()) seatTo = stillYaw;
    // Seated, straight onto the target (the drag and the glide are already smooth); once a ride
    // or the walk out takes over, ease back to the doors instead of snapping there.
    seatLook.yaw = seated ? seatTo : seatLook.yaw + (seatTo - seatLook.yaw) * (reduceMotion ? 1 : 1 - Math.exp(-dt * 5));
    rig.setSeatLook(seatLook.yaw);
    // The phone's viewpoints and close looks; back to the doors' own spot once off the platform.
    if (!atDoor.to) { walk.spot = 1; walk.inspectTo = 0; }
    // Stepped back from the close look: the everyday print again.
    if (!walk.inspectTo && walk.inspect === 0 && walk.sharpView) { walk.sharpView.sharpen(null); walk.sharpView = null; }
    var glide = reduceMotion ? 1 : 1 - Math.exp(-dt * 3.2);
    walk.x += (SPOTS[walk.spot] - walk.x) * glide;
    walk.inspect = reduceMotion ? walk.inspectTo : Math.max(0, Math.min(1, walk.inspect + (walk.inspectTo ? 1 : -1) * dt / 1.1));
    rig.setSpot(walk.x);
    rig.setInspect(walk.at, walk.inspect);
    rig.update(state, distance, dt);
    if (phone) {
      // Standing at the first stop with the doors still shut (openDoors): first teach looking
      // round (a drag or a turn of the phone counts), then the swipe up that opens them.
      var closed = state.phase === 'settle' && state.doors.left === 0;
      ui.setHint(busy ? null
        : atDoor.to ? (atDoor.f === 1 ? (walk.inspectTo ? 'inspect' : 'platform') : null)
        : closed ? (looked ? 'closed' : 'look')
        : atDoor.f === 0 && beenOut && doorway.ready() ? 'seat' : null);
      // Frames running long (under ~40 fps over two seconds): one notch down in resolution.
      quality.time += dt;
      quality.frames++;
      if (quality.time > 2) {
        if (quality.time / quality.frames > 0.025 && quality.scale > 0.67) { quality.scale -= 0.17; resize(); }
        quality.time = 0;
        quality.frames = 0;
      }
    }
    // The arrows: "Step out" sits low in the open doorway, at the step, while seated; "Back to
    // train" once out there.
    var seated = !atDoor.to && atDoor.f === 0;
    var stepOut = null;
    if (seated && doorway.ready()) {
      stepAt.set(CAR.doorCenterX, 0.3, -0.05).project(camera);
      stepOut = { x: (stepAt.x + 1) / 2 * window.innerWidth, y: (1 - stepAt.y) / 2 * window.innerHeight };
    }
    ui.setStep(stepOut, !!atDoor.to && atDoor.f === 1);
    spray.update(dt);
    adStrip.update(camera.position.x);
    signage.update(state);
    lastState = state;
    // The doorway goes dead the moment the doors start to move or something else takes over.
    if (doorway.hover && !doorway.ready()) doorway.set(false);
    doorway.lift += ((doorway.hover ? 1 : 0) - doorway.lift) * (reduceMotion ? 1 : 1 - Math.exp(-dt * 10));
    stationViews.forEach(function (v, i) { v.setHover(i === state.stationIndex ? doorway.lift : 0); });
    // The visit sign lights up under the pointer while it's live; it goes dead with the doors.
    var live = visit.live();
    if (visit.hover && !live) visit.set(false);
    stationViews.forEach(function (v, i) { v.setSign(visit.hover && live === stations[i], dt); });
    ui.update(state);
    ui.setDip(dip);
    audio.update(state, distance);
    renderer.render(scene, camera);

    if (debug) debug.textContent = state.progress.toFixed(3) + ' · ' + state.phase + ' · v ' + state.speed.toFixed(2) + ' · ' + distance.toFixed(1) + ' m';
  }

  function onVisibility() {
    if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
    else if (raf == null) { clock.getDelta(); tick(); }
  }
  document.addEventListener('visibilitychange', onVisibility);
  // Compile every station's shaders first, behind the loader (in parallel where the GPU allows),
  // and only then draw the first frame: drawing first would compile everything in view at once,
  // synchronously, and stations further on would still hitch the first time they came by.
  // compile() collects what's visible when it's called, so the hidden stations are shown for
  // that call only; the first tick places them again.
  var shown = [];
  scene.traverse(function (o) { if (o.isGroup && !o.visible) { o.visible = true; shown.push(o); } });
  var warm = renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera));
  shown.forEach(function (o) { o.visible = false; });
  warm.catch(function () {}).then(function () {
    shadersWarm = true;
    if (raf == null && !document.hidden) tick();
    root.classList.add('is-ready');
  });

  return function dispose() {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', resize);
    detachInspect();
    document.removeEventListener('visibilitychange', onVisibility);
    scroll.dispose();
    detachMap();
    detachEye();
    detachLook();
    detachSeatLook();
    doorway.dispose();
    visit.dispose();
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
  revealWhenLoaded();
} catch (error) {
  console.warn('Subway: WebGL unavailable, showing the static station.', error);
  root.classList.add('no-webgl', 'is-loaded');
}
