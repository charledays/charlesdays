/**
 * Station template. buildStation(data) returns a platform, tiled wall with name tablets,
 * columns, hanging signs and the billboard holding the station's artwork. The group's origin is
 * the point that lines up with the middle of the car doors when the train stops, so the
 * billboard sits right behind the doors.
 */
import * as THREE from 'three';
import { WORLD, CAR } from '../config.js';
import { LINE } from '../stations.js';
import { tracker, textCanvas, canvasTexture, frameGeometry } from '../geo.js';

var SIGN_FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
var TABLET_FONT = 'Georgia, "Times New Roman", serif';

/** Classic mosaic name tablet: maroon border, cream field, dark lettering. */
function tabletTexture(registry, name) {
  var c = textCanvas(1024, 300, function (ctx, w, h) {
    ctx.fillStyle = '#5a1d1a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#b48a3c';
    ctx.fillRect(18, 18, w - 36, h - 36);
    ctx.fillStyle = '#e8dfc8';
    ctx.fillRect(40, 40, w - 80, h - 80);
    ctx.fillStyle = '#1d1a16';
    ctx.font = '700 ' + h * 0.38 + 'px ' + TABLET_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.toUpperCase(), w / 2, h / 2 + 6, w - 140);
    // Mosaic grid and grime.
    ctx.fillStyle = 'rgba(40,30,20,0.18)';
    for (var x = 0; x < w; x += 12) ctx.fillRect(x, 0, 1.2, h);
    for (var y = 0; y < h; y += 12) ctx.fillRect(0, y, w, 1.2);
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(30,22,12,0.25)');
    g.addColorStop(0.4, 'rgba(30,22,12,0)');
    g.addColorStop(1, 'rgba(30,22,12,0.15)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  return canvasTexture(c, registry);
}

/** Black hanging sign with the line bullet and station name in white. */
function hangingSignTexture(registry, name) {
  var c = textCanvas(1024, 170, function (ctx, w, h) {
    ctx.fillStyle = '#0c0c0c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 10, w, 4);
    ctx.font = '700 ' + h * 0.46 + 'px ' + SIGN_FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 40, h * 0.56);
    var r = h * 0.3;
    ctx.fillStyle = LINE.color;
    ctx.beginPath();
    ctx.arc(w - 40 - r, h * 0.56, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 ' + r * 1.25 + 'px ' + SIGN_FONT;
    ctx.textAlign = 'center';
    ctx.fillText(LINE.bullet, w - 40 - r, h * 0.56 + r * 0.06);
  });
  return canvasTexture(c, registry);
}

function bandTexture(registry) {
  var c = textCanvas(256, 64, function (ctx, w, h) {
    ctx.fillStyle = '#6b2420';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#b48a3c';
    ctx.fillRect(0, 8, w, 6);
    ctx.fillRect(0, h - 14, w, 6);
    for (var x = 0; x < w; x += 32) {
      ctx.fillStyle = '#d9c9a0';
      ctx.fillRect(x + 10, 22, 12, 20);
    }
  });
  var tex = canvasTexture(c, registry);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

export function buildStation(data, mats, registry, loader) {
  var keep = tracker(registry);
  var S = WORLD.station;
  var len = S.halfLength * 2;
  var group = new THREE.Group();
  group.name = 'station:' + data.id;

  function track(mat) { registry.materials.push(mat); return mat; }

  // Platform slab, flush with the car floor, with the yellow edge strip.
  var platformMat = track(new THREE.MeshStandardMaterial({ color: 0x67635c, roughness: 0.88 }));
  var platform = new THREE.Mesh(keep(new THREE.BoxGeometry(len, 1.3, S.platformDepth)), platformMat);
  platform.position.set(0, -0.65, -0.13 - S.platformDepth / 2);
  group.add(platform);
  var stripMat = track(new THREE.MeshStandardMaterial({ color: 0xc9a218, roughness: 0.7 }));
  var strip = new THREE.Mesh(keep(new THREE.PlaneGeometry(len, 0.6)), stripMat);
  strip.rotation.x = -Math.PI / 2;
  strip.position.set(0, 0.003, -0.13 - 0.06 - 0.3);
  group.add(strip);

  // Tiled back wall.
  var tileTex = mats.tileTexture;
  tileTex.repeat.set(len / 1.22, S.ceilingY / 1.22);
  var tileMat = track(new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.35, envMap: mats.envMap, envMapIntensity: 0.4 }));
  var wall = new THREE.Mesh(keep(new THREE.PlaneGeometry(len, S.ceilingY)), tileMat);
  wall.position.set(0, S.ceilingY / 2, S.wallZ);
  group.add(wall);

  var bandTex = bandTexture(registry);
  bandTex.repeat.set(len / 1.4, 1);
  var bandMat = track(new THREE.MeshStandardMaterial({ map: bandTex, roughness: 0.5 }));
  var band = new THREE.Mesh(keep(new THREE.PlaneGeometry(len, 0.3)), bandMat);
  band.position.set(0, 3.05, S.wallZ + 0.01);
  group.add(band);

  // Name tablets along the wall, laid out by layout() once the viewpoint is known.
  var tabletMat = track(new THREE.MeshStandardMaterial({ map: tabletTexture(registry, data.name), roughness: 0.4, envMap: mats.envMap, envMapIntensity: 0.3 }));
  var tabletSlots = Math.floor(len / 9.2) + 1;
  var tablets = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(1.9, 0.56)), tabletMat, tabletSlots);
  group.add(tablets);

  // Ceiling and fluorescent runs.
  var ceilMat = track(new THREE.MeshStandardMaterial({ color: 0x2c2b29, roughness: 0.95 }));
  var ceiling = new THREE.Mesh(keep(new THREE.PlaneGeometry(len, -S.wallZ + 0.4)), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, S.ceilingY, S.wallZ / 2);
  group.add(ceiling);
  var tubeGeo = keep(new THREE.BoxGeometry(1.2, 0.05, 0.14));
  var tubeCount = Math.floor(len / 2.4) * 2;
  var tubes = new THREE.InstancedMesh(tubeGeo, mats.fluorescent, tubeCount);
  var m = new THREE.Matrix4();
  for (var i = 0; i < tubeCount / 2; i++) {
    var x = -S.halfLength + 1.2 + i * 2.4;
    m.makeTranslation(x, S.ceilingY - 0.04, -1.7);
    tubes.setMatrixAt(i * 2, m);
    m.makeTranslation(x, S.ceilingY - 0.04, -4.6);
    tubes.setMatrixAt(i * 2 + 1, m);
  }
  group.add(tubes);

  // Painted I-beam columns, clear of the billboard.
  var colMat = track(new THREE.MeshStandardMaterial({ color: 0x1e2a24, roughness: 0.55, metalness: 0.3, envMap: mats.envMap, envMapIntensity: 0.5 }));
  var colGeo = keep(new THREE.BoxGeometry(0.22, S.ceilingY, 0.22));
  var colXs = [];
  for (var cx = -S.halfLength + S.columnStep / 2; cx < S.halfLength; cx += S.columnStep) colXs.push(cx);
  var columns = new THREE.InstancedMesh(colGeo, colMat, colXs.length);
  group.add(columns);

  // Hanging signs.
  var signMat = track(new THREE.MeshBasicMaterial({ map: hangingSignTexture(registry, data.name) }));
  var signGeo = keep(new THREE.PlaneGeometry(1.9, 0.32));
  [7.8, -10.6, 26].forEach(function (x) {
    var sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(x, 2.45, -4.2);
    group.add(sign);
  });

  // End portals, so the station reads as a box cut into the tunnel.
  var portalGeo = keep(new THREE.PlaneGeometry(-S.wallZ + 1, S.ceilingY + 1.4));
  [-1, 1].forEach(function (side) {
    var portal = new THREE.Mesh(portalGeo, mats.concrete);
    portal.rotation.y = side * -Math.PI / 2;
    portal.position.set(side * S.halfLength, S.ceilingY / 2 - 0.7, S.wallZ / 2);
    group.add(portal);
  });

  // Billboard: black lightbox frame around the artwork.
  var B = S.billboard;
  var artMat = track(new THREE.MeshBasicMaterial({ color: 0x222222 }));
  var art = new THREE.Mesh(keep(new THREE.PlaneGeometry(B.width, B.height)), artMat);
  var boardZ = S.wallZ + 0.1;
  art.position.set(0, B.bottom + B.height / 2, boardZ);
  var board = new THREE.Group();
  board.add(art);
  group.add(board);
  var frame = new THREE.Mesh(keep(frameGeometry(B.width, B.height, 0.09, 0.1, 0.01)), mats.ironwork);
  frame.position.set(0, art.position.y, boardZ - 0.06);
  board.add(frame);
  // Faint spill of light from the lightbox onto the tiles.
  var spillMat = track(new THREE.MeshBasicMaterial({
    map: mats.glowTexture, color: 0xfff4e0, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  var spill = new THREE.Mesh(keep(new THREE.PlaneGeometry(B.width * 1.9, B.height * 2.1)), spillMat);
  spill.position.set(0, art.position.y, S.wallZ + 0.02);
  board.add(spill);

  var hidden = new THREE.Matrix4().makeScale(0, 0, 0);

  /**
   * Where a seated passenger's line of sight through point x (on the door wall, z = 0) lands
   * at depth z, in station-local x.
   */
  function sightAt(camX, camZ, x, z) {
    return camX + (x - camX) * (camZ - z) / camZ - CAR.doorCenterX;
  }

  /**
   * Fit the station to the viewpoint: the billboard dead centre in the open doors, a name
   * tablet framed in the side window, no column standing in front of either.
   */
  function setViewpoint(camX, camZ) {
    var boardX = sightAt(camX, camZ, CAR.doorCenterX, boardZ);
    board.position.x = boardX;
    var clearHalf = B.width / 2 + 0.45;

    var windowX = sightAt(camX, camZ, (CAR.window.x0 + CAR.window.x1) / 2, S.wallZ);
    var k = 0;
    var first = windowX - Math.floor((windowX + S.halfLength - 1.2) / 9.2) * 9.2;
    for (var tx = first; tx < S.halfLength - 1.2 && k < tabletSlots; tx += 9.2) {
      if (Math.abs(tx - boardX) < clearHalf + 1) continue;
      m.makeTranslation(tx, 2.3, S.wallZ + 0.012);
      tablets.setMatrixAt(k++, m);
    }
    for (; k < tabletSlots; k++) tablets.setMatrixAt(k, hidden);
    tablets.instanceMatrix.needsUpdate = true;

    var doorSight = sightAt(camX, camZ, CAR.doorCenterX, S.columnZ);
    var windowSight = sightAt(camX, camZ, (CAR.window.x0 + CAR.window.x1) / 2, S.columnZ);
    colXs.forEach(function (x, i) {
      var blocks = Math.abs(x - doorSight) < 1.5 || Math.abs(x - windowSight) < 0.9;
      if (blocks) columns.setMatrixAt(i, hidden);
      else { m.makeTranslation(x, S.ceilingY / 2, S.columnZ); columns.setMatrixAt(i, m); }
    });
    columns.instanceMatrix.needsUpdate = true;
  }
  setViewpoint(0, 2.7);

  if (data.billboard && data.billboard.src) {
    loader.load(data.billboard.src, function (tex) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      // Cover-fit the image into the board.
      var imgAspect = tex.image.width / tex.image.height;
      var boardAspect = B.width / B.height;
      if (imgAspect > boardAspect) {
        tex.repeat.set(boardAspect / imgAspect, 1);
        tex.offset.set((1 - tex.repeat.x) / 2, 0);
      } else {
        tex.repeat.set(1, imgAspect / boardAspect);
        tex.offset.set(0, (1 - tex.repeat.y) / 2);
      }
      registry.textures.push(tex);
      artMat.map = tex;
      artMat.color.set(0xffffff);
      artMat.needsUpdate = true;
    });
  }

  // Station lighting rides with the station and fades in as it nears.
  var lights = [-4.5, 4.5].map(function (x) {
    var l = new THREE.PointLight(0xe9f1ff, 0, 18, 1.3);
    l.position.set(x, S.ceilingY - 0.5, -3.2);
    group.add(l);
    return l;
  });

  /** Track position that lines up with the door centre when stopped. */
  var trackOrigin = 0;

  function place(stopDistance, distance, presence) {
    trackOrigin = stopDistance + CAR.doorCenterX;
    var x = trackOrigin - distance;
    group.position.x = x;
    group.visible = Math.abs(x) < S.halfLength + 40;
    lights.forEach(function (l) { l.intensity = 26 * presence; });
  }

  return {
    group: group,
    place: place,
    setViewpoint: setViewpoint,
    /** True when track position a (± margin) falls inside this station. */
    contains: function (a, margin) { return Math.abs(a - trackOrigin) < S.halfLength + (margin || 0); }
  };
}
