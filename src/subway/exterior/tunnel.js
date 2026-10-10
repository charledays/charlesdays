/**
 * The tunnel outside the windows. The train never moves: every repeating element is an
 * instanced layer laid out by track position, and update(distance) places the instances that
 * fall within view. Anything inside a station's span is hidden so the platform can take over.
 *
 * Track position a appears at world x = a - distance.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WORLD } from '../config.js';
import { tracker, textCanvas, canvasTexture } from '../geo.js';

function glowTexture(registry, inner, outer) {
  var c = textCanvas(128, 128, function (ctx) {
    var g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, inner);
    g.addColorStop(0.18, inner);
    g.addColorStop(0.4, outer);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
  return canvasTexture(c, registry);
}

export function createTunnel(mats, registry) {
  var keep = tracker(registry);
  var group = new THREE.Group();
  group.name = 'tunnel';
  var span = WORLD.tunnelSpan;
  var layers = [];
  var m = new THREE.Matrix4();
  var hiddenScale = new THREE.Matrix4().makeScale(0, 0, 0);

  /** A repeating element: one instance every `period` meters of track. */
  function layer(geometry, material, period, y, z, opts) {
    var count = Math.ceil(span / period) + 1;
    var mesh = new THREE.InstancedMesh(keep(geometry), material, count);
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
    layers.push({ mesh: mesh, period: period, count: count, y: y, z: z, margin: (opts && opts.margin) || 0 });
    return mesh;
  }

  var top = 3.6;
  var bottom = WORLD.railY - 0.2;
  var colH = top - bottom;

  // Steel I-beam columns between the tracks.
  var web = new THREE.BoxGeometry(0.03, colH, 0.2);
  var flangeA = new THREE.BoxGeometry(0.2, colH, 0.025);
  flangeA.translate(0, 0, 0.1);
  var flangeB = flangeA.clone();
  flangeB.translate(0, 0, -0.2);
  var column = mergeGeometries([web, flangeA, flangeB]);
  [web, flangeA, flangeB].forEach(function (g) { g.dispose(); });
  layer(column, mats.ironwork, WORLD.tunnelColumnStep, bottom + colH / 2, WORLD.tunnelColumnZ, { margin: 0.4 });

  // Far wall, in panels so it can be cut away at stations.
  var wallPanel = new THREE.PlaneGeometry(3.1, 5.2);
  layer(wallPanel, mats.concrete, 3.1, bottom + 2.4, WORLD.tunnelWallZ, { margin: 1.6 });

  // Cable runs on the far wall.
  var cables = [];
  [1.2, 1.32, 1.44, 2.7].forEach(function (y, i) {
    var cyl = new THREE.CylinderGeometry(0.03 + i * 0.006, 0.03 + i * 0.006, 6.2, 6);
    cyl.rotateZ(Math.PI / 2);
    cyl.translate(0, y, 0);
    cables.push(cyl);
  });
  var cableGeo = mergeGeometries(cables);
  cables.forEach(function (g) { g.dispose(); });
  layer(cableGeo, mats.rubber, 6.2, 0, WORLD.tunnelWallZ + 0.1, { margin: 3.1 });

  // Adjacent track: ties every 0.62 m, rails as one long static pair.
  layer(new THREE.BoxGeometry(0.24, 0.14, 2.4), mats.ironwork, 0.62, WORLD.railY - 0.08, -3.3);
  [-2.6, -4.0, -0.75].forEach(function (z) {
    var rail = new THREE.Mesh(keep(new THREE.BoxGeometry(span * 2, 0.16, 0.08)), mats.rail);
    rail.position.set(0, WORLD.railY + 0.02, z);
    group.add(rail);
  });
  var bed = new THREE.Mesh(keep(new THREE.PlaneGeometry(span * 2, 5)), mats.concrete);
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(0, WORLD.railY - 0.15, -2.5);
  group.add(bed);

  // Work lights: a warm caged bulb every 12.4 m, a blue emergency light once per span.
  var bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff1d6, toneMapped: false });
  var glowMat = new THREE.MeshBasicMaterial({
    map: glowTexture(registry, 'rgba(255,214,150,1)', 'rgba(255,170,90,0.25)'),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
  });
  var blueMat = new THREE.MeshBasicMaterial({
    map: glowTexture(registry, 'rgba(150,190,255,1)', 'rgba(40,90,255,0.35)'),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
  });
  registry.materials.push(bulbMat, glowMat, blueMat);
  var bulbY = 2.3;
  layer(new THREE.SphereGeometry(0.06, 10, 8), bulbMat, WORLD.tunnelLightStep, bulbY, WORLD.tunnelWallZ + 0.2);
  layer(new THREE.PlaneGeometry(1.6, 1.6), glowMat, WORLD.tunnelLightStep, bulbY, WORLD.tunnelWallZ + 0.3);
  layer(new THREE.PlaneGeometry(1.1, 1.1), blueMat, span, 1.5, WORLD.tunnelWallZ + 0.3);

  /**
   * distance: train position on the track. hide(a, margin): true when track position a is
   * inside a station.
   */
  function update(distance, hide) {
    for (var l = 0; l < layers.length; l++) {
      var L = layers[l];
      var first = Math.floor((distance - span / 2) / L.period);
      for (var i = 0; i < L.count; i++) {
        var a = (first + i) * L.period;
        if (hide(a, L.margin)) {
          L.mesh.setMatrixAt(i, hiddenScale);
        } else {
          m.makeTranslation(a - distance, L.y, L.z);
          L.mesh.setMatrixAt(i, m);
        }
      }
      L.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  return { group: group, update: update };
}
