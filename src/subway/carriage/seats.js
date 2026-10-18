/**
 * Molded bucket benches, alternating orange and amber like the reference car. Seat pans and
 * backs are instanced, so a bench of any length costs two draw calls plus its plinth.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CAR, PALETTE } from '../config.js';
import { tracker } from '../geo.js';

/** runs: [{ x0, count, dir }] — dir +1 lays seats toward +x from x0, -1 toward -x. */
export function createSeats(mats, registry, runs) {
  var keep = tracker(registry);
  var group = new THREE.Group();
  group.name = 'seats';
  var s = CAR.seat;
  var total = runs.reduce(function (n, r) { return n + r.count; }, 0);

  var panGeo = keep(new RoundedBoxGeometry(s.width - 0.03, 0.07, s.depth, 3, 0.03));
  var backGeo = keep(new RoundedBoxGeometry(s.width - 0.03, 0.5, 0.06, 3, 0.03));
  var pans = new THREE.InstancedMesh(panGeo, mats.seat, total);
  var backs = new THREE.InstancedMesh(backGeo, mats.seat, total);

  var m = new THREE.Matrix4();
  var q = new THREE.Quaternion();
  var pos = new THREE.Vector3();
  var one = new THREE.Vector3(1, 1, 1);
  var colors = [new THREE.Color(PALETTE.seatOrange), new THREE.Color(PALETTE.seatAmber)];
  var backTilt = new THREE.Euler(-0.16, 0, 0);
  // Pans dip slightly toward the back so each seat reads as a scoop.
  var panTilt = new THREE.Euler(0.05, 0, 0);

  var k = 0;
  runs.forEach(function (run) {
    var x0 = run.x0;
    var x1 = run.x0 + run.dir * run.count * s.width;
    for (var i = 0; i < run.count; i++) {
      var cx = x0 + run.dir * (i + 0.5) * s.width;
      pos.set(cx, s.height, s.depth / 2 + 0.06);
      m.compose(pos, q.setFromEuler(panTilt), one);
      pans.setMatrixAt(k, m);
      pos.set(cx, s.height + 0.3, 0.1);
      m.compose(pos, q.setFromEuler(backTilt), one);
      backs.setMatrixAt(k, m);
      var c = colors[(i + (run.dir < 0 ? 1 : 0)) % 2];
      pans.setColorAt(k, c);
      backs.setColorAt(k, c);
      k++;
    }

    // Beige plinth under the bench and a trim strip behind the backs.
    var len = Math.abs(x1 - x0);
    var mid = (x0 + x1) / 2;
    var plinth = new THREE.Mesh(keep(new THREE.BoxGeometry(len, s.height - 0.04, s.depth - 0.08)), mats.seatFrame);
    plinth.position.set(mid, (s.height - 0.04) / 2, (s.depth - 0.08) / 2 + 0.03);
    group.add(plinth);
    var trim = new THREE.Mesh(keep(new THREE.BoxGeometry(len, 0.05, 0.05)), mats.seatFrame);
    trim.position.set(mid, s.height + 0.6, 0.04);
    group.add(trim);
  });

  group.add(pans, backs);
  return { group: group };
}
