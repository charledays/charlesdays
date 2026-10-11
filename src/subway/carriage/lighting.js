/**
 * Lights. Interior fluorescents, a warm tunnel bulb that rides along with whichever bulb is
 * passing the windows, the station rig and the car's spill through the open doors. Everything is
 * driven from timeline state, so the light for a given scroll position is always the same.
 *
 * No shadow maps: the platform's shadows and fixture pools are baked into the station (see
 * exterior/station.js, bakedWallTexture). The light count never changes, so no shader recompiles
 * mid-ride: the station rig is one set of lights that rides with whichever platform is near.
 */
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { CAR, WORLD, PALETTE } from '../config.js';

/** Dead sections of third rail: the car lights blink out briefly, as on the real thing. */
var GAP_EVERY = 143;
var GAP_LENGTH = 2.6;

/** The doorway's light on the floor: bright at the sill, widening and fading out onto the platform. */
function doorPoolTexture() {
  var c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  var ctx = c.getContext('2d');
  // Canvas top is the far end (v = 1, toward the wall), bottom the sill.
  for (var y = 0; y < 128; y++) {
    var t = 1 - y / 127;
    var half = 64 * (0.42 + 0.5 * t);
    var a = Math.pow(1 - t, 1.6) * 0.95;
    var g = ctx.createLinearGradient(64 - half, 0, 64 + half, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.25, 'rgba(255,255,255,' + a.toFixed(3) + ')');
    g.addColorStop(0.75, 'rgba(255,255,255,' + a.toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(64 - half, y, half * 2, 1);
  }
  var tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function smooth(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

export function createLighting(scene) {
  // Slightly cool from above, warm bounce off the floor. Kept low: it's what flattens a scene.
  var hemi = new THREE.HemisphereLight(0xd6dde6, 0x3a2f24, 0.42);
  scene.add(hemi);

  // The fluorescent run is a long strip, so its highlights on steel and seats stretch like the real thing.
  RectAreaLightUniformsLib.init();
  var tubes = [];
  var strip = new THREE.RectAreaLight(PALETTE.fluorescent, 9, CAR.wallX1 - CAR.wallX0, 0.16);
  strip.position.set((CAR.wallX0 + CAR.wallX1) / 2, CAR.ceilingY - 0.06, 0.56);
  strip.lookAt(strip.position.x, 0, 0.9);
  scene.add(strip);
  tubes.push(strip);
  // Fill from the passenger side of the car (the fixture behind the camera). Short range: it
  // keeps the car bright with the ambient turned down, and dies out before the platform.
  var fill = new THREE.PointLight(0xf2f4ff, 2.2, 6, 1.6);
  fill.position.set(0.2, CAR.ceilingY - 0.1, 2.7);
  scene.add(fill);

  var bulb = new THREE.PointLight(PALETTE.tunnelBulb, 0, 4.6, 1.4);
  bulb.position.set(0, 2.2, WORLD.tunnelWallZ + 0.6);
  scene.add(bulb);

  // The car's own light thrown onto the tunnel through the windows: columns flick past in it.
  var spill = new THREE.PointLight(0xdfe8f2, 2.2, 3.2, 1.2);
  spill.position.set((CAR.window.x0 + CAR.window.x1) / 2 - 0.8, 1.35, -0.45);
  scene.add(spill);

  // Spill from a passing bulb through the side window onto the seats.
  var wash = new THREE.PointLight(PALETTE.tunnelBulb, 0, 2.8, 1.6);
  wash.position.set(0, 1.45, -0.3);
  scene.add(wash);
  // The station rig (station-local positions; x follows the platform as it slides past).
  //   key   warm-neutral spot on the stretch of wall framed by the doors: the art you face sits
  //         in a soft pool, the rest of the wall falls away from it
  //   ends  short-range neutral and cool lights further along, so the platform falls off unevenly
  var S = WORLD.station;
  var key = new THREE.SpotLight(0xffe2c4, 0, 13, 0.62, 0.85, 1.4);
  key.position.set(0.4, S.ceilingY - 0.45, -2.2);
  key.target.position.set(0, 1.7, S.wallZ);
  scene.add(key, key.target);
  var ends = [[-7.4, 0xf2efe8], [8.2, 0xdce6f6]].map(function (e) {
    var l = new THREE.PointLight(e[1], 0, 9, 1.7);
    l.position.set(e[0], S.ceilingY - 0.5, -4.4);
    l.userData.x = e[0];
    scene.add(l);
    return l;
  });

  // Warm interior light thrown out through the open doors onto the platform: a soft spot and a
  // pool on the floor shaped by the doorway.
  var doorSpill = new THREE.SpotLight(0xffe6c8, 0, 6, 0.7, 0.9, 1.5);
  doorSpill.position.set(CAR.doorCenterX, CAR.doorHeight - 0.1, 0.4);
  doorSpill.target.position.set(CAR.doorCenterX, 0, -2.6);
  scene.add(doorSpill, doorSpill.target);
  var spillPool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: doorPoolTexture(), color: 0xffd8a8, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false
  }));
  spillPool.rotation.x = -Math.PI / 2;
  spillPool.scale.set(2.6, 3.2, 1);
  spillPool.position.set(CAR.doorCenterX, 0.006, -0.13 - 1.6);
  // After the platform's baked shadow (renderOrder 1), so the spill lifts it.
  spillPool.renderOrder = 2;
  scene.add(spillPool);

  var windowMid = (CAR.window.x0 + CAR.window.x1) / 2;
  var windowHalf = (CAR.window.x1 - CAR.window.x0) / 2;

  var tubeBase = tubes.map(function (l) { return l.intensity; });
  var fillBase = fill.intensity;

  /**
   * presence: 0 in open tunnel .. 1 at a platform. hide(a) is true when track position a is
   * inside a station (no tunnel bulb there). stationX: the nearest platform's origin in car x
   * (null when none is near); doorOpen: how far the doors stand open, 0..1.
   */
  function update(state, distance, presence, hide, reduceMotion, stationX, doorOpen) {
    // Power gaps only while moving; skipped under reduced motion (no blinking).
    var power = 1;
    if (!reduceMotion && state.speed > 0.05) {
      var g = ((distance % GAP_EVERY) + GAP_EVERY) % GAP_EVERY;
      if (g < GAP_LENGTH) power = 0.22 + 0.78 * smooth(Math.abs(g - GAP_LENGTH / 2) / (GAP_LENGTH / 2));
    }
    tubes.forEach(function (l, i) { l.intensity = tubeBase[i] * power; });
    fill.intensity = fillBase * power;
    spill.intensity = 2.2 * power * (1 - presence);

    // The tunnel bulb nearest the windows.
    var step = WORLD.tunnelLightStep;
    var k = Math.round(distance / step);
    var trackX = k * step;
    var x = trackX - distance;
    bulb.position.x = x;
    var lit = hide(trackX) ? 0 : 1 - presence;
    bulb.intensity = 8 * lit;
    var across = (x - windowMid) / (windowHalf + 0.6);
    wash.position.x = Math.max(CAR.window.x0, Math.min(CAR.window.x1, x));
    wash.intensity = 2.4 * lit * Math.exp(-across * across * 2);

    // Darker between stops, so the streak lamps and the next platform carry the frame; at a stop
    // the rig does the work, not the fill.
    hemi.intensity = 0.4 + 0.12 * presence;

    var near = stationX != null;
    var sx = near ? stationX : 0;
    key.position.x = sx + 0.4;
    key.target.position.x = sx;
    key.intensity = near ? 110 * presence : 0;
    ends.forEach(function (l) {
      l.position.x = sx + l.userData.x;
      l.intensity = near ? 9 * presence : 0;
    });
    var open = smooth(doorOpen || 0);
    doorSpill.intensity = 7 * open * power;
    spillPool.material.opacity = 0.22 * open * power;
    return power;
  }

  return { update: update };
}
