/**
 * Camera rig. The camera always faces the doors from a seat across the aisle; there is no
 * orbit. Framing adapts to the aspect ratio (on a phone the doors fill the frame). Motion is
 * layered on top: ride vibration and lurch derived from the timeline (distance, speed,
 * acceleration — so a given scroll position always shakes the same way), a faint idle hum,
 * and optional pointer parallax on fine pointers.
 */
import * as THREE from 'three';
import { CAR, WORLD } from './config.js';

function smooth(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

/** Smooth 1D value noise in -1..1, fixed hash so it never changes between loads. */
function noise(x) {
  var i = Math.floor(x), f = x - i;
  function h(n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; }
  var u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}

/** Double clack of a bogie's two axles crossing a rail joint. */
function jointBump(distance) {
  var j = ((distance % WORLD.railJoint) + WORLD.railJoint) % WORLD.railJoint;
  return Math.exp(-j * 9) + 0.8 * Math.exp(-Math.abs(j - 2.2) * 9);
}

export function createCameraRig(camera, options) {
  var reduceMotion = options.reduceMotion;
  var pointerEnabled = options.pointerParallax && !reduceMotion;

  var base = new THREE.Vector3();
  var target = new THREE.Vector3();
  var pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  var time = 0;

  /** Framing for the current aspect: wide = composition A, tall = doors fill the frame. */
  function frame(aspect) {
    var tall = 1 - smooth((aspect - 0.62) / (1.25 - 0.62));
    var doorX = CAR.doorCenterX;
    base.set(THREE.MathUtils.lerp(0.3, doorX + 0.3, tall), 1.2, 2.72);
    target.set(THREE.MathUtils.lerp(-0.1, doorX + 0.08, tall), 1.1, 0);
    var fov = 58;
    if (aspect < 1.25) {
      // Fit about 2 m of wall (doors plus frames) across the width.
      var dist = base.z - target.z;
      var halfW = THREE.MathUtils.lerp(1.6, 1.02, tall);
      var hfov = 2 * Math.atan(halfW / dist);
      fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / aspect)), 58, 76);
    }
    camera.fov = fov;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    return base;
  }

  function onPointer(e) {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }
  if (pointerEnabled) window.addEventListener('pointermove', onPointer, { passive: true });

  var look = new THREE.Vector3();

  function update(state, distance, dt) {
    time += dt;
    var pos = camera.position.copy(base);
    look.copy(target);

    if (!reduceMotion) {
      var v = state.speed;
      // Ride: low wobble, finer buzz, joint clacks; all scale with speed.
      var bounce = v * (0.0055 * noise(distance * 0.55) + 0.0022 * noise(distance * 2.7 + 17)) +
        v * 0.0042 * jointBump(distance);
      var sway = v * 0.008 * noise(distance * 0.21 + 41);
      var roll = v * 0.0035 * noise(distance * 0.3 + 5);
      // Lurch: pulling away leaves you behind (-x), braking throws you forward (+x).
      var lurch = -state.accel * 0.045;
      // Idle hum from the motors when standing.
      var hum = (1 - v) * 0.0004 * Math.sin(time * 31);
      pos.x += lurch + sway * 0.4;
      pos.y += bounce + hum;
      pos.z += sway * 0.25;
      look.x += lurch * 0.7;
      look.y += bounce * 0.6;
      camera.up.set(Math.sin(roll), Math.cos(roll), 0);

      if (pointerEnabled) {
        var k = 1 - Math.exp(-dt * 3);
        pointer.sx += (pointer.x - pointer.sx) * k;
        pointer.sy += (pointer.y - pointer.sy) * k;
        pos.x += pointer.sx * 0.07;
        pos.y -= pointer.sy * 0.035;
      }
    } else {
      camera.up.set(0, 1, 0);
    }
    camera.lookAt(look);
  }

  function dispose() {
    if (pointerEnabled) window.removeEventListener('pointermove', onPointer);
  }

  return { frame: frame, update: update, dispose: dispose };
}
