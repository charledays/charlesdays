/**
 * Printed and lit signage inside the car: the destination display over the doors (redrawn only
 * when its text changes), the framed route map, and the sprayed tags. The ad cards live in
 * ad-strip.js.
 */
import * as THREE from 'three';
import { CAR } from '../config.js';
import { LINE } from '../stations.js';
import { textCanvas, canvasTexture, tracker, frameGeometry } from '../geo.js';
import { rng } from '../materials.js';

var SIGN_FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

function drawBullet(ctx, x, y, r) {
  ctx.fillStyle = LINE.color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 ' + r * 1.25 + 'px ' + SIGN_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(LINE.bullet, x, y + r * 0.06);
}

function mapTexture(registry) {
  var w = 640, h = 760, rand = rng(97);
  var c = textCanvas(w, h, function (ctx) {
    ctx.fillStyle = '#a9cfe0';
    ctx.fillRect(0, 0, w, h);
    // Land masses.
    ctx.fillStyle = '#efe7cf';
    for (var k = 0; k < 5; k++) {
      ctx.beginPath();
      var cx = 80 + rand() * 480, cy = 140 + rand() * 520, r = 110 + rand() * 140;
      for (var a = 0; a <= 24; a++) {
        var t = a / 24 * Math.PI * 2, rr = r * (0.7 + rand() * 0.35);
        ctx[a ? 'lineTo' : 'moveTo'](cx + Math.cos(t) * rr * 0.6, cy + Math.sin(t) * rr);
      }
      ctx.fill();
    }
    ctx.fillStyle = '#c9d8b0';
    ctx.fillRect(300, 300, 34, 120);
    // Lines.
    var lineColors = ['#ee352e', '#00933c', '#0039a6', '#ff6319', '#fccc0a', '#6cbe45', '#a626aa', '#808183'];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    lineColors.forEach(function (col) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 6;
      ctx.beginPath();
      var x = 160 + rand() * 320, y = 100;
      ctx.moveTo(x, y);
      while (y < h - 60) {
        y += 40 + rand() * 70;
        x += (rand() - 0.5) * 110;
        ctx.lineTo(Math.max(40, Math.min(w - 40, x)), y);
      }
      ctx.stroke();
      ctx.fillStyle = '#fff';
    });
    // Header bar.
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, w, 74);
    drawBullet(ctx, 44, 37, 22);
    ctx.fillStyle = '#fff';
    ctx.font = '700 30px ' + SIGN_FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Charle$Days Universe — Route Map', 80, 38);
    // Wear.
    for (var n = 0; n < 1400; n++) {
      ctx.fillStyle = 'rgba(40,30,20,' + (rand() * 0.08).toFixed(3) + ')';
      ctx.fillRect(rand() * w, rand() * h, 2, 2);
    }
  });
  return canvasTexture(c, registry);
}

export function createSignage(mats, registry, shell, stations) {
  var keep = tracker(registry);
  var group = new THREE.Group();
  group.name = 'signage';

  // Destination display over the doors: amber-on-black, hung just under the cove.
  var dispW = 1.05, dispH = 0.17;
  var dispCanvas = document.createElement('canvas');
  dispCanvas.width = 1024;
  dispCanvas.height = Math.round(1024 * dispH / dispW);
  var dispTex = canvasTexture(dispCanvas, registry);
  var dispMat = new THREE.MeshBasicMaterial({ map: dispTex, toneMapped: false });
  registry.materials.push(dispMat);
  var housing = new THREE.Mesh(keep(new THREE.BoxGeometry(dispW + 0.06, dispH + 0.05, 0.06)), mats.steelDark);
  var face = new THREE.Mesh(keep(new THREE.PlaneGeometry(dispW, dispH)), dispMat);
  face.position.z = 0.031;
  var display = new THREE.Group();
  display.add(housing, face);
  display.position.set(CAR.doorCenterX, CAR.wallTop + 0.03, 0.16);
  display.rotation.x = 0.22;
  group.add(display);

  var lastText = '';
  function drawDisplay(kicker, name) {
    var key = kicker + '|' + name;
    if (key === lastText) return;
    lastText = key;
    var ctx = dispCanvas.getContext('2d');
    var w = dispCanvas.width, h = dispCanvas.height;
    ctx.fillStyle = '#050403';
    ctx.fillRect(0, 0, w, h);
    drawBullet(ctx, h * 0.55, h / 2, h * 0.34);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffb030';
    ctx.font = '600 ' + h * 0.24 + 'px ' + SIGN_FONT;
    ctx.fillText(kicker, h * 1.05, h * 0.3);
    ctx.font = '700 ' + h * 0.42 + 'px ' + SIGN_FONT;
    ctx.fillText(name, h * 1.05, h * 0.68, w - h * 1.2);
    // LED matrix: dark gaps between "pixels".
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    for (var x = 0; x < w; x += 4) ctx.fillRect(x, 0, 1, h);
    for (var y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
    dispTex.needsUpdate = true;
  }

  // Framed route map on the panel left of the doors.
  var mapW = 0.66, mapH = 0.78;
  var mapMat = new THREE.MeshStandardMaterial({ map: mapTexture(registry), roughness: 0.25, envMap: mats.envMap, envMapIntensity: 0.6 });
  registry.materials.push(mapMat);
  var map = new THREE.Mesh(keep(new THREE.PlaneGeometry(mapW, mapH)), mapMat);
  var mapX = CAR.doorCenterX - CAR.doorWidth / 2 - CAR.doorTravel - 0.05 - 0.55;
  map.position.set(mapX, 1.42, 0.02);
  var mapFrame = new THREE.Mesh(keep(frameGeometry(mapW, mapH, 0.025, 0.02, 0.005)), mats.steel);
  mapFrame.position.set(mapX, 1.42, 0.005);
  group.add(map, mapFrame);

  // MTA-style placard over the side window: black field, white rule along the top, white
  // Helvetica centred, no line bullet (it's a motto, not a stop). Between window frame and grab rail,
  // centred over the first three seats.
  // The sign is cut to the lettering plus a little padding each side.
  var MOTTO = 'Hecho Con Criterio';
  var mottoH = 0.11, mottoPx = 176, mottoFont = '700 ' + mottoPx * 0.52 + 'px ' + SIGN_FONT;
  var measure = document.createElement('canvas').getContext('2d');
  measure.font = mottoFont;
  var mottoPxW = Math.ceil(measure.measureText(MOTTO).width + mottoPx * 0.9);
  var mottoW = mottoH * mottoPxW / mottoPx;
  // "Criterio" is a secret door (main.js): its span across the sign, in uv.
  var mottoFull = measure.measureText(MOTTO).width;
  var criterioU0 = ((mottoPxW - mottoFull) / 2 + measure.measureText('Hecho Con ').width) / mottoPxW;
  var criterioU1 = ((mottoPxW + mottoFull) / 2) / mottoPxW;
  var motto = textCanvas(mottoPxW, mottoPx, function (ctx, w, h) {
    var rand = rng(53);
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f2f2f0';
    ctx.fillRect(h * 0.16, h * 0.12, w - h * 0.32, h * 0.045);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = mottoFont;
    ctx.fillText(MOTTO, w / 2, h * 0.62);
    // Years behind the acrylic: dust and the odd scuff.
    for (var n = 0; n < 300; n++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (rand() * 0.035).toFixed(3) + ')';
      ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 1);
    }
  });
  var mottoMat = new THREE.MeshStandardMaterial({ map: canvasTexture(motto, registry), roughness: 0.3, envMap: mats.envMap, envMapIntensity: 0.4 });
  registry.materials.push(mottoMat);
  var mottoSign = new THREE.Mesh(keep(new THREE.PlaneGeometry(mottoW, mottoH)), mottoMat);
  var mottoX = CAR.seat.x0 + CAR.seat.width * 1.5;
  var mottoY = CAR.window.y1 + 0.03 + mottoH / 2 + 0.012;
  mottoSign.position.set(mottoX, mottoY, 0.012);
  var mottoFrame = new THREE.Mesh(keep(frameGeometry(mottoW, mottoH, 0.012, 0.012, 0.003)), mats.steel);
  mottoFrame.position.set(mottoX, mottoY, 0.004);
  group.add(mottoSign, mottoFrame);

  /** A sprayed tag from a transparent PNG: a plane sized to `width` (m), placed by `place`. */
  var tags = [];
  function loadTag(src, aspect, width, place) {
    var mat = new THREE.MeshStandardMaterial({ transparent: true, alphaTest: 0.2, roughness: 0.6, opacity: 0 });
    registry.materials.push(mat);
    var height = width / aspect;
    var mesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(width, height)), mat);
    place(mesh, width, height);
    group.add(mesh);
    tags.push(mesh);
    new THREE.TextureLoader().load(src, function (tex) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      registry.textures.push(tex);
      mat.map = tex;
      mat.opacity = 0.95;
      mat.needsUpdate = true;
    });
  }

  // The 601 throwie, sprayed floor to seat across the front of the bench base.
  var baseH = CAR.seat.height - 0.04;
  loadTag('/images/brand/601-throwie.png', 1475 / 783, baseH * 1475 / 783, function (mesh, w, h) {
    mesh.position.set(CAR.seat.x0 + 0.01 + w / 2, h / 2, CAR.seat.depth - 0.05 + 0.002);
  });

  function update(state) {
    var station = state.station || stations[state.stationIndex];
    var stopped = state.phase === 'settle' || state.phase === 'opening' || state.phase === 'dwell' ||
      state.phase === 'closing' || state.phase === 'hold';
    drawDisplay(stopped ? 'THIS IS' : 'NEXT STOP', station.name);
  }

  return {
    group: group,
    update: update,
    /** The sprayed tags (the 601 throwie): they take more paint (spray.js). */
    tags: tags,
    /** The motto sign, and whether a ray hit's uv lands on the word "Criterio". */
    motto: { mesh: mottoSign, onCriterio: function (uv) { return uv.x >= criterioU0 - 0.01 && uv.x <= criterioU1 + 0.01; } }
  };
}
