/**
 * Lights. Interior fluorescents, a warm tunnel bulb that rides along with whichever bulb is
 * passing the windows, and the station's wash. Everything is driven from timeline state, so
 * the light for a given scroll position is always the same. No shadows.
 */
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { CAR, WORLD, PALETTE } from '../config.js';

/** Dead sections of third rail: the car lights blink out briefly, as on the real thing. */
var GAP_EVERY = 143;
var GAP_LENGTH = 2.6;

function smooth(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

export function createLighting(scene) {
  var hemi = new THREE.HemisphereLight(0xdfe6ee, 0x2b2621, 0.7);
  scene.add(hemi);

  // The fluorescent run is a long strip, so its highlights on steel and seats stretch like the real thing.
  RectAreaLightUniformsLib.init();
  var tubes = [];
  var strip = new THREE.RectAreaLight(PALETTE.fluorescent, 9, CAR.wallX1 - CAR.wallX0, 0.16);
  strip.position.set((CAR.wallX0 + CAR.wallX1) / 2, CAR.ceilingY - 0.06, 0.56);
  strip.lookAt(strip.position.x, 0, 0.9);
  scene.add(strip);
  tubes.push(strip);
  // Fill from the passenger side of the car (the fixture behind the camera).
  var fill = new THREE.PointLight(0xf2f4ff, 0.8, 0, 1.6);
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
  var windowMid = (CAR.window.x0 + CAR.window.x1) / 2;
  var windowHalf = (CAR.window.x1 - CAR.window.x0) / 2;

  var tubeBase = tubes.map(function (l) { return l.intensity; });
  var fillBase = fill.intensity;

  /**
   * presence: 0 in open tunnel .. 1 at a platform. hide(a) is true when track position a is
   * inside a station (no tunnel bulb there).
   */
  function update(state, distance, presence, hide, reduceMotion) {
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

    // Darker between stops, so the streak lamps and the next platform carry the frame.
    hemi.intensity = 0.42 + 0.53 * presence;
    return power;
  }

  return { update: update };
}
