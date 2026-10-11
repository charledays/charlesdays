/**
 * Camera rig. The camera always faces the doors from a seat across the aisle; there is no
 * orbit. Framing adapts to the aspect ratio (on a phone the doors fill the frame). Motion is
 * layered on top: a slow ride float on the clock, scaled by speed (rides are short and fast, so
 * anything keyed to track distance would flicker frame to frame), a lurch that eases after the
 * timeline's acceleration, and a faint idle hum.
 * The doorway: setDoor(f) walks from the seat out through the open doors onto the platform
 * (0 = seated, 1 = standing on the platform facing the wall); out there,
 * setLook(yaw) turns the head left or right along the platform (radians, 0 = facing the wall).
 * On a phone the platform is explored instead: setSpot(x) glides you sideways along it (metres
 * from the doors), and setInspect(point, f) walks you up to a spot on the art (f 0..1).
 *
 * Portrait screens get their own composition, not a shrunk desktop one: seated, the frame is
 * cut tight to the doors from a step further back (a longer, flatter lens), so there's little
 * ceiling or floor, and setSeatLook(yaw) turns the head along the car to see the rest (the
 * window, the line map, the seats; radians, + = left); on the platform you stand back behind
 * the column line, so the wall fills the frame.
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

export function createCameraRig(camera, options) {
  var reduceMotion = options.reduceMotion;

  var base = new THREE.Vector3();
  var target = new THREE.Vector3();
  var time = 0;
  /** Eased lurch and speed, so the car settles into motion instead of snapping. */
  var lurch = 0;
  var ride = 0;
  var door = 0;
  /** Standing on the platform, past the doors; the threshold the walk passes through; the wall. */
  var doorPos = new THREE.Vector3(CAR.doorCenterX, 1.6, -1.6);
  var doorVia = new THREE.Vector3(CAR.doorCenterX, 1.58, 0.55);
  var doorLook = new THREE.Vector3(CAR.doorCenterX, 1.6, WORLD.station.wallZ);
  var from = new THREE.Vector3();
  var fromLook = new THREE.Vector3();
  var spot = 0;
  var inspectNear = new THREE.Vector3();
  var inspect = 0;
  var inspectAt = new THREE.Vector3();
  function setSpot(x) { spot = x; }
  function setInspect(point, f) { if (point) inspectAt.copy(point); inspect = f; }

  function setDoor(f) { door = f; }
  var yaw = 0;
  var turned = new THREE.Vector3();
  function setLook(y) { yaw = y; }
  var seatYaw = 0;
  var seatLook = new THREE.Vector3();
  function setSeatLook(y) { seatYaw = y; }

  /** Framing for the current aspect: wide = composition A, tall = doors fill the frame. */
  function frame(aspect) {
    var tall = 1 - smooth((aspect - 0.62) / (1.25 - 0.62));
    // On tall screens, frame just the doors: every metre of width costs two of ceiling and floor
    // in portrait. The rest of the car is a turn of the head away (setSeatLook).
    // A little room either side of the frames, so the car reads around the doors.
    var tallX0 = CAR.doorCenterX - CAR.doorWidth / 2 - 0.14;
    var tallX1 = CAR.doorCenterX + CAR.doorWidth / 2 + 0.14;
    // Look straight ahead (no yaw, no pitch); framing comes from where the seat is, not the angle.
    // In portrait the seat sits further back (a flatter lens) and the eye a little higher.
    base.set(THREE.MathUtils.lerp(0, (tallX0 + tallX1) / 2, tall), THREE.MathUtils.lerp(1.04, 1.12, tall), THREE.MathUtils.lerp(2.72, 3.3, tall));
    target.set(base.x, base.y, 0);
    // Out on the platform: in portrait, back behind the column line so the wall fills the frame.
    doorPos.set(CAR.doorCenterX, THREE.MathUtils.lerp(1.6, 1.7, tall), THREE.MathUtils.lerp(-1.6, -3.0, tall));
    doorLook.set(CAR.doorCenterX, THREE.MathUtils.lerp(1.6, 1.85, tall), WORLD.station.wallZ);
    // Tight lens: the frame tops out at the ad cards, no ceiling.
    var fov = 52;
    if (aspect < 1.25) {
      // Fit the doors (and in portrait the map's names) across the width.
      var dist = base.z - target.z;
      var halfW = THREE.MathUtils.lerp(1.6, (tallX1 - tallX0) / 2, tall);
      var hfov = 2 * Math.atan(halfW / dist);
      fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / aspect)), THREE.MathUtils.lerp(52, 38, tall), 80);
    }
    seatFov = fov;
    // Out on the platform the lens opens up again: in portrait about 2.8 m of wall across the
    // width, so the art has room round it instead of filling the frame.
    outFov = fov;
    if (aspect < 1.25) {
      var wallDist = doorPos.z - WORLD.station.wallZ;
      var outH = 2 * Math.atan(1.4 / wallDist);
      var wide = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(outH / 2) / aspect)), 52, 78);
      outFov = THREE.MathUtils.lerp(fov, Math.max(fov, wide), tall);
    }
    camera.aspect = aspect;
    setFov(THREE.MathUtils.lerp(seatFov, outFov, smooth(door)));
    return base;
  }
  var seatFov = 52, outFov = 52;
  function setFov(f) {
    if (Math.abs(camera.fov - f) < 0.01 && camera.aspect === lastAspect) return;
    camera.fov = f;
    lastAspect = camera.aspect;
    camera.updateProjectionMatrix();
  }
  var lastAspect = 0;

  var look = new THREE.Vector3();

  function update(state, distance, dt) {
    time += dt;
    // Seated, or on the walk out: up out of the seat early, then a curve that lines up with the
    // doors and carries straight through them onto the platform.
    var d = smooth(door);
    // The lens widens as you walk out onto the platform, and closes again on the way back in.
    setFov(THREE.MathUtils.lerp(seatFov, outFov, d));
    var a0 = (1 - d) * (1 - d), a1 = 2 * (1 - d) * d, a2 = d * d;
    from.set(
      a0 * base.x + a1 * doorVia.x + a2 * doorPos.x,
      0,
      a0 * base.z + a1 * doorVia.z + a2 * doorPos.z
    );
    from.y = base.y + (doorPos.y - base.y) * smooth(door / 0.45);
    // Seated, the head turns about the eye: the look point swings round, level, on the same distance.
    var seatDist = base.z - target.z;
    seatLook.set(base.x - Math.sin(seatYaw) * seatDist, target.y, base.z - Math.cos(seatYaw) * seatDist);
    fromLook.copy(seatLook).lerp(doorLook, smooth(door / 0.7));
    if (door > 0 && yaw) {
      // Turn the head about the eye: the look point swings round, level, on the same distance.
      var dist = doorPos.z - doorLook.z;
      turned.set(-Math.sin(yaw) * dist, doorLook.y - doorPos.y, -Math.cos(yaw) * dist).add(doorPos);
      fromLook.lerp(turned, d);
    }
    // Along the platform (phone viewpoints), then up close to the art.
    from.x += spot * d;
    fromLook.x += spot * d;
    if (inspect > 0) {
      var e = smooth(inspect);
      from.lerp(inspectNear.set(inspectAt.x, THREE.MathUtils.clamp(inspectAt.y, 1.2, 2.6), WORLD.station.wallZ + 1.35), e);
      fromLook.lerp(inspectAt, e);
    }
    var pos = camera.position.copy(from);
    look.copy(fromLook);

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

  return { frame: frame, update: update, setDoor: setDoor, setLook: setLook, setSeatLook: setSeatLook, setSpot: setSpot, setInspect: setInspect };
}
