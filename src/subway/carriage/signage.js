/**
 * Printed and lit signage inside the car: the ad cards in the cove, the destination display
 * over the doors (redrawn only when its text changes), and the framed route map.
 */
import * as THREE from 'three';
import { CAR } from '../config.js';
import { LINE } from '../stations.js';
import { textCanvas, canvasTexture, tracker, frameGeometry } from '../geo.js';
import { rng } from '../materials.js';

var SIGN_FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

var ADS = [
  { bg: '#0d0d0d', fg: '#f26a1b', lines: ['THE UNIVERSE OF', 'CHARLE$DAHS'] },
  { bg: '#1f3f8f', fg: '#ffffff', lines: ['IF YOU SEE SOMETHING,', 'PAINT SOMETHING.'] },
  { bg: '#efe6d2', fg: '#b3201c', lines: ['TATTOO · FILM', 'ART DIRECTION'] },
  { bg: '#f2c318', fg: '#111111', lines: ['STAND CLEAR OF', 'THE CLOSING DOORS'] },
  { bg: '#181818', fg: '#efe6d2', lines: ['MANIFIESTO', 'NOW SHOWING'] },
  { bg: '#b3201c', fg: '#ffffff', lines: ['DAYS OFF', 'ARE FOR PAINTING'] }
];

function adStripTexture(registry, widthM, heightM) {
  var pxPerM = 520;
  var w = Math.min(4096, Math.round(widthM * pxPerM));
  var h = Math.round(heightM * pxPerM);
  var scale = w / widthM;
  var rand = rng(71);
  var c = textCanvas(w, h, function (ctx) {
    ctx.fillStyle = '#c9c2b4';
    ctx.fillRect(0, 0, w, h);
    var cardW = 0.71 * scale, gap = 0.05 * scale, margin = h * 0.12;
    var x = gap, i = 0;
    while (x + cardW < w) {
      var ad = ADS[i % ADS.length];
      ctx.fillStyle = '#8f8a80';
      ctx.fillRect(x - 4, margin - 4, cardW + 8, h - margin * 2 + 8);
      ctx.fillStyle = ad.bg;
      ctx.fillRect(x, margin, cardW, h - margin * 2);
      ctx.fillStyle = ad.fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var fs = (h - margin * 2) * 0.22;
      ctx.font = '700 ' + fs + 'px ' + SIGN_FONT;
      ctx.fillText(ad.lines[0], x + cardW / 2, h / 2 - fs * 0.62, cardW * 0.9);
      ctx.fillText(ad.lines[1], x + cardW / 2, h / 2 + fs * 0.62, cardW * 0.9);
      // Sun-faded, scratched plastic over each card.
      ctx.fillStyle = 'rgba(255,250,235,' + (0.05 + rand() * 0.1).toFixed(2) + ')';
      ctx.fillRect(x, margin, cardW, h - margin * 2);
      x += cardW + gap;
      i++;
    }
    for (var k = 0; k < 900; k++) {
      ctx.fillStyle = 'rgba(30,24,16,' + (rand() * 0.12).toFixed(3) + ')';
      ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 1);
    }
  });
  return canvasTexture(c, registry);
}

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
    ctx.fillText('Charle$Dahs Universe — Route Map', 80, 38);
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

  // Ad cards laid onto the cove.
  var stripW = CAR.wallX1 - CAR.wallX0;
  var adMat = new THREE.MeshStandardMaterial({
    map: adStripTexture(registry, stripW, shell.cove.length), roughness: 0.45, envMap: mats.envMap, envMapIntensity: 0.5
  });
  registry.materials.push(adMat);
  var ads = new THREE.Mesh(keep(new THREE.PlaneGeometry(stripW, shell.cove.length)), adMat);
  ads.position.set((CAR.wallX0 + CAR.wallX1) / 2, shell.cove.y, shell.cove.z + 0.004);
  ads.rotation.x = shell.cove.tilt;
  group.add(ads);

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

  function update(state) {
    var station = state.stationIndex >= 0 ? stations[state.stationIndex] : null;
    if (!station) { drawDisplay('NEXT STOP', 'Coming soon'); return; }
    var stopped = state.phase === 'settle' || state.phase === 'opening' || state.phase === 'dwell' ||
      state.phase === 'closing' || state.phase === 'hold';
    drawDisplay(stopped ? 'THIS IS' : 'NEXT STOP', station.name);
  }

  return { group: group, update: update };
}
