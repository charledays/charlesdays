/**
 * The tunnel outside the windows. The train never moves: every repeating element is an
 * instanced layer laid out by track position, and update(distance) places the instances that
 * fall within view. Anything inside a station's span is hidden so the platform can take over.
 *
 * Track position a appears at world x = a - distance.
 *
 * Light streaks: small lamps along the walls and track bed that smear into streaks along the
 * direction of travel as the train picks up speed (the instance is stretched by speed, so a
 * standing train sees dots, and reduced motion never sees a smear).
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
    layers.push({ mesh: mesh, period: period, count: count, y: y, z: z, margin: (opts && opts.margin) || 0, stretch: (opts && opts.stretch) || 0, phase: (opts && opts.phase) || 0 });
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

  // Streak lamps on the far wall, within what the windows show (about y 0.9 to 2.9 there).
  // Periods divide the span.
  var streakTex = textCanvas(256, 32, function (ctx, w, h) {
    var gx = ctx.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, 'rgba(255,255,255,0)');
    gx.addColorStop(0.5, 'rgba(255,255,255,1)');
    gx.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gx;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-in';
    var gy = ctx.createLinearGradient(0, 0, 0, h);
    gy.addColorStop(0, 'rgba(0,0,0,0)');
    gy.addColorStop(0.5, 'rgba(0,0,0,1)');
    gy.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gy;
    ctx.fillRect(0, 0, w, h);
  });
  var streakMap = canvasTexture(streakTex, registry);
  function streakMat(color, opacity) {
    var mat = new THREE.MeshBasicMaterial({
      map: streakMap, color: color, transparent: true, opacity: opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
    });
    registry.materials.push(mat);
    return mat;
  }
  var streak = new THREE.PlaneGeometry(0.5, 0.11);
  layer(streak, streakMat(0xffc27a, 0.95), 6.2, 2.55, WORLD.tunnelWallZ + 0.25, { stretch: 9 });
  layer(streak.clone(), streakMat(0xbcd4ff, 0.8), 15.5, 1.05, WORLD.tunnelWallZ + 0.25, { stretch: 12, phase: 0.37 });
  layer(streak.clone(), streakMat(0xff5a3c, 0.75), 31, 1.75, WORLD.tunnelWallZ + 0.25, { stretch: 7, phase: 0.61 });
  layer(streak.clone(), streakMat(0xfff2dc, 0.6), 7.75, 1.32, WORLD.tunnelWallZ + 0.22, { stretch: 14, phase: 0.2 });

  /**
   * distance: train position on the track. hide(a, margin): true when track position a is
   * inside a station. speed: 0..1, how far the streak lamps smear (0 under reduced motion).
   */
  function update(distance, hide, speed) {
    var v = speed || 0;
    for (var l = 0; l < layers.length; l++) {
      var L = layers[l];
      var offset = L.phase * L.period;
      var first = Math.floor((distance - offset - span / 2) / L.period);
      var sx = 1 + L.stretch * v * v;
      for (var i = 0; i < L.count; i++) {
        var a = (first + i) * L.period + offset;
        if (hide(a, L.margin + (L.stretch ? sx * 0.25 : 0))) {
          L.mesh.setMatrixAt(i, hiddenScale);
        } else {
          m.makeScale(sx, 1, 1).setPosition(a - distance, L.y, L.z);
          L.mesh.setMatrixAt(i, m);
        }
      }
      L.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  return { group: group, update: update };
}
