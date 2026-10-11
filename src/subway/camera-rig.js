/**
 * Camera rig. The camera always faces the doors from a seat across the aisle; there is no
 * orbit. Framing adapts to the aspect ratio (on a phone the doors fill the frame). Motion is
 * layered on top: a slow ride float on the clock, scaled by speed (rides are short and fast, so
 * anything keyed to track distance would flicker frame to frame), a lurch that eases after the
 * timeline's acceleration, and a faint idle hum.
 * GET OFF: aimAt(hero, w, h) sets the hero piece the push ends on, setPush(f) moves along it:
 * 0 = seated, 1 = square in front of the hero, close enough that it fills the frame. The path
 * curves through the middle of the doorway (a quadratic through a point on the seat's sight
 * line past the doors), and the gaze swings from straight ahead onto the hero early on.
 */
import * as THREE from 'three';
import { CAR } from './config.js';

function smooth(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

/** Smooth 1D value noise in -1..1, fixed hash so it never changes between loads. */
function noise(x) {
  var i = Math.floor(x), f = x - i;
  function h(n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; }
  var u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}


export function createCameraRig(camera, options) {
  var reduceMotion = options.reduceMotion;

  var base = new THREE.Vector3();
  var target = new THREE.Vector3();
  var time = 0;
  /** Eased lurch and speed, so the car settles into motion instead of snapping. */
  var lurch = 0;
  var ride = 0;
  var push = 0;
  var hero = new THREE.Vector3();
  var heroSize = { w: 3.4, h: 2.3 };
  var via = new THREE.Vector3();
  var pushTo = new THREE.Vector3();

  function setPush(f) { push = f; }

  /** The hero (world centre, size in metres): fixes the path's bend and its end. */
  function aimAt(center, w, h) {
    hero.copy(center);
    heroSize.w = w;
    heroSize.h = h;
    // Through the doors: on the line from the seat to the door centre, 1.5 m past the threshold.
    var t = (base.z + 1.5) / base.z;
    via.set(base.x + (CAR.doorCenterX - base.x) * t, 1.25, -1.5);
    // The end: distance at which the hero covers the frame both ways.
    var vf = THREE.MathUtils.degToRad(camera.fov) / 2;
    var hf = Math.atan(Math.tan(vf) * camera.aspect);
    var d = Math.min((h / 2) / Math.tan(vf), (w / 2) / Math.tan(hf)) * 0.97;
    pushTo.set(center.x, center.y, center.z + d);
  }

  /** Framing for the current aspect: wide = composition A, tall = doors fill the frame. */
  function frame(aspect) {
    var tall = 1 - smooth((aspect - 0.62) / (1.25 - 0.62));
    // On tall screens, frame the doors plus the line map beside them (out to the pocket panel's edge).
    var tallX0 = CAR.doorCenterX - CAR.doorWidth / 2 - 0.08;
    var tallX1 = CAR.doorCenterX + CAR.doorWidth / 2 + CAR.doorTravel + 0.07;
    // Look straight ahead (no yaw, no pitch); framing comes from where the seat is, not the angle.
    base.set(THREE.MathUtils.lerp(0, (tallX0 + tallX1) / 2, tall), 1.04, 2.72);
    target.set(base.x, base.y, 0);
    // Tight lens: the frame tops out at the ad cards, no ceiling.
    var fov = 52;
    if (aspect < 1.25) {
      // Fit about 2 m of wall (doors plus frames) across the width.
      var dist = base.z - target.z;
      var halfW = THREE.MathUtils.lerp(1.6, (tallX1 - tallX0) / 2 + 0.04, tall);
      var hfov = 2 * Math.atan(halfW / dist);
      fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / aspect)), 52, 76);
    }
    camera.fov = fov;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    return base;
  }

  var look = new THREE.Vector3();

  function update(state, distance, dt) {
    time += dt;
    var pos = camera.position.copy(base);
    look.copy(target);
    if (push > 0) {
      // Ease in and out along the curve; the gaze settles on the hero in the first half.
      var e = push * push * (3 - 2 * push);
      var a = (1 - e) * (1 - e), b = 2 * (1 - e) * e, c = e * e;
      pos.set(
        a * base.x + b * via.x + c * pushTo.x,
        a * base.y + b * via.y + c * pushTo.y,
        a * base.z + b * via.z + c * pushTo.z
      );
      look.lerp(hero, smooth(push / 0.5));
    }

    if (!reduceMotion) {
      ride += (state.speed - ride) * (1 - Math.exp(-dt * 3));
      var v = ride;
      // Ride: a slow float and a gentle sway, a few cycles a second at most.
      var bounce = v * (0.0035 * noise(time * 1.6) + 0.0012 * noise(time * 3.4 + 17));
      var sway = v * 0.006 * noise(time * 0.55 + 41);
      var roll = v * 0.002 * noise(time * 0.7 + 5);
      // Lurch: pulling away leaves you behind (-x), braking throws you forward (+x). Eased.
      lurch += (-state.accel * 0.035 - lurch) * (1 - Math.exp(-dt * 4));
      // Idle hum from the motors when standing.
      var hum = (1 - v) * 0.0004 * Math.sin(time * 31);
      pos.x += lurch + sway * 0.4;
      pos.y += bounce + hum;
      pos.z += sway * 0.25;
      look.x += lurch * 0.7;
      look.y += bounce * 0.6;
      camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    } else {
      camera.up.set(0, 1, 0);
    }
    camera.lookAt(look);
  }

  return { frame: frame, update: update, setPush: setPush, aimAt: aimAt };
}
