/**
 * The carriage around the doors: wall lining with the door notch and side window, stainless
 * pocket panels and door frame, ad cove, ceiling with light fixture, floor, grab rails, poles.
 * Only the wall the camera faces (and the strip of floor/ceiling in view) is built.
 */
import * as THREE from 'three';
import { CAR } from '../config.js';
import { roundedRect, frameGeometry, tracker } from '../geo.js';

export function createShell(mats, registry) {
  var keep = tracker(registry);
  var group = new THREE.Group();
  group.name = 'shell';

  var dL = CAR.doorCenterX - CAR.doorWidth / 2;
  var dR = CAR.doorCenterX + CAR.doorWidth / 2;
  var top = CAR.wallTop;
  var w = CAR.window;

  // Lining: one flat panel, notched for the door and holed for the window.
  var lining = new THREE.Shape();
  lining.moveTo(CAR.wallX0, 0);
  lining.lineTo(dL, 0);
  lining.lineTo(dL, CAR.doorHeight);
  lining.lineTo(dR, CAR.doorHeight);
  lining.lineTo(dR, 0);
  lining.lineTo(CAR.wallX1, 0);
  lining.lineTo(CAR.wallX1, top);
  lining.lineTo(CAR.wallX0, top);
  lining.lineTo(CAR.wallX0, 0);
  lining.holes.push(roundedRect(new THREE.Path(), w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0, w.radius));
  var liningGeo = keep(new THREE.ShapeGeometry(lining, 8));
  liningGeo.attributes.uv.array.forEach(function (_, i, a) { a[i] *= 0.5; });
  group.add(new THREE.Mesh(liningGeo, mats.panel));

  // Stainless pocket panels either side of the opening — the leaves slide in behind them.
  var pocketW = CAR.doorTravel + 0.05;
  [[dL - pocketW, dL], [dR, dR + pocketW]].forEach(function (span) {
    var panel = new THREE.Mesh(keep(new THREE.BoxGeometry(span[1] - span[0], top, 0.012)), mats.steel);
    panel.position.set((span[0] + span[1]) / 2, top / 2, 0.006);
    group.add(panel);
  });

  // Door surround: jambs and header show the depth of the car body.
  var jambDepth = 0.13;
  [dL, dR].forEach(function (x, i) {
    var jamb = new THREE.Mesh(keep(new THREE.BoxGeometry(0.035, CAR.doorHeight, jambDepth)), mats.steelDark);
    jamb.position.set(x + (i ? 0.0175 : -0.0175), CAR.doorHeight / 2, -jambDepth / 2 + 0.02);
    group.add(jamb);
    var trim = new THREE.Mesh(keep(new THREE.BoxGeometry(0.05, CAR.doorHeight + 0.05, 0.03)), mats.chrome);
    trim.position.set(x + (i ? 0.025 : -0.025), (CAR.doorHeight + 0.05) / 2, 0.02);
    group.add(trim);
  });
  var header = new THREE.Mesh(keep(new THREE.BoxGeometry(CAR.doorWidth + 0.1, 0.05, 0.03)), mats.chrome);
  header.position.set(CAR.doorCenterX, CAR.doorHeight + 0.025, 0.02);
  group.add(header);
  var headerSoffit = new THREE.Mesh(keep(new THREE.BoxGeometry(CAR.doorWidth, 0.02, jambDepth)), mats.steelDark);
  headerSoffit.position.set(CAR.doorCenterX, CAR.doorHeight, -jambDepth / 2 + 0.02);
  group.add(headerSoffit);

  // Side window: gasketed frame + glass set back into the body.
  var glassMeshes = [];
  [[w.x0, w.x1]].forEach(function (span) {
    var ww = span[1] - span[0];
    var wh = w.y1 - w.y0;
    var frame = new THREE.Mesh(keep(frameGeometry(ww, wh, 0.03, 0.025, w.radius)), mats.steelDark);
    frame.position.set((span[0] + span[1]) / 2, (w.y0 + w.y1) / 2, 0);
    group.add(frame);
    var reveal = new THREE.Mesh(keep(frameGeometry(ww - 0.002, wh - 0.002, 0.001, 0.07, w.radius)), mats.rubber);
    reveal.position.set(frame.position.x, frame.position.y, -0.07);
    group.add(reveal);
    var glass = new THREE.Mesh(keep(new THREE.PlaneGeometry(ww, wh)), mats.glass);
    glass.position.set(frame.position.x, frame.position.y, -0.06);
    glass.renderOrder = 2;
    group.add(glass);
    glassMeshes.push(glass);
  });

  // Cove: the angled strip between wall and ceiling that carries the ad cards.
  var coveRise = CAR.ceilingY - top;
  var coveRun = 0.42;
  var coveLen = Math.hypot(coveRise, coveRun);
  var cove = new THREE.Mesh(keep(new THREE.PlaneGeometry(CAR.wallX1 - CAR.wallX0, coveLen)), mats.panel);
  cove.position.set((CAR.wallX0 + CAR.wallX1) / 2, top + coveRise / 2, coveRun / 2);
  cove.rotation.x = Math.atan2(coveRun, coveRise);
  group.add(cove);
  var coveFrame = new THREE.Mesh(keep(new THREE.BoxGeometry(CAR.wallX1 - CAR.wallX0, 0.025, 0.03)), mats.steel);
  coveFrame.position.set(cove.position.x, top, 0.012);
  group.add(coveFrame);

  // Ceiling and the fluorescent run along the cove edge.
  var ceilingDepth = CAR.aisleDepth - coveRun;
  // Ceilings glow off the tubes; a little self-light keeps them from going muddy.
  var ceilingMat = new THREE.MeshStandardMaterial({ color: 0xd9d3c7, emissive: 0x4a4740, roughness: 0.7 });
  registry.materials.push(ceilingMat);
  var ceiling = new THREE.Mesh(keep(new THREE.PlaneGeometry(CAR.wallX1 - CAR.wallX0, ceilingDepth)), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(cove.position.x, CAR.ceilingY, coveRun + ceilingDepth / 2);
  group.add(ceiling);
  var fixture = new THREE.Mesh(keep(new THREE.BoxGeometry(CAR.wallX1 - CAR.wallX0, 0.05, 0.2)), mats.steel);
  fixture.position.set(cove.position.x, CAR.ceilingY - 0.025, coveRun + 0.14);
  group.add(fixture);
  var lens = new THREE.Mesh(keep(new THREE.PlaneGeometry(CAR.wallX1 - CAR.wallX0, 0.15)), mats.fluorescent);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(cove.position.x, CAR.ceilingY - 0.052, coveRun + 0.14);
  group.add(lens);

  // Floor runs a little past the door line so it meets the threshold.
  var floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(CAR.wallX1 - CAR.wallX0, CAR.aisleDepth + 0.12)), mats.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cove.position.x, 0, (CAR.aisleDepth - 0.12) / 2);
  group.add(floor);
  // Black cove base where floor meets wall.
  var base = new THREE.Mesh(keep(new THREE.BoxGeometry(CAR.wallX1 - CAR.wallX0, 0.08, 0.02)), mats.rubber);
  base.position.set(cove.position.x, 0.04, 0.01);
  group.add(base);

  // Grab rail, drops to the ceiling, and stanchions at the seat ends.
  var railZ = 0.6;
  var railY = 1.9;
  var railR = 0.017;
  var rail = new THREE.Mesh(keep(new THREE.CylinderGeometry(railR, railR, CAR.wallX1 - CAR.wallX0, 12)), mats.chrome);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(cove.position.x, railY, railZ);
  group.add(rail);
  var dropGeo = keep(new THREE.CylinderGeometry(0.012, 0.012, CAR.ceilingY - railY, 8));
  for (var x = CAR.wallX0 + 0.5; x < CAR.wallX1; x += 1.45) {
    var drop = new THREE.Mesh(dropGeo, mats.chrome);
    drop.position.set(x, (railY + CAR.ceilingY) / 2, railZ);
    group.add(drop);
  }

  var poleGeo = keep(new THREE.CylinderGeometry(0.019, 0.019, railY, 14));
  var seatEnds = [CAR.seat.x0 - 0.06, dL - pocketW - 0.08];
  seatEnds.forEach(function (px, i) {
    var pole = new THREE.Mesh(poleGeo, mats.chrome);
    pole.position.set(px, railY / 2, railZ);
    group.add(pole);
    // Partition bar: from the pole, round and back into the wall at shoulder height.
    var dir = i ? -1 : 1;
    var curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(px, 0.62, railZ),
      new THREE.Vector3(px, 0.98, railZ - 0.06),
      new THREE.Vector3(px + dir * 0.02, 1.12, railZ - 0.3),
      new THREE.Vector3(px + dir * 0.02, 1.16, 0.02)
    ]);
    var bar = new THREE.Mesh(keep(new THREE.TubeGeometry(curve, 24, 0.016, 8, false)), mats.chrome);
    group.add(bar);
  });

  return {
    group: group,
    glass: glassMeshes,
    /** Where the cove sits, for signage placed on it. */
    cove: { y: top + coveRise / 2, z: coveRun / 2, tilt: cove.rotation.x, length: coveLen }
  };
}
