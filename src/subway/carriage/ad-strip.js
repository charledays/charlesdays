/**
 * Ad cards: artwork printed on paper, behind scratched acrylic, in thin aluminum frames. The
 * strip of them in the cove, and single cards hung elsewhere (createPanelAd). Prints are aged (lifted blacks, yellowing, halftone, grime toward the edges),
 * sit a hair crooked, catch uneven light, and a few have been hit: a scratched-in tag, a marker
 * tag with drips, a torn corner with a sticker. A glossy overlay carries the tube glare, which
 * slides as the passenger's head moves.
 */
import * as THREE from 'three';
import { CAR } from '../config.js';
import { tracker, textCanvas, canvasTexture } from '../geo.js';
import { rng } from '../materials.js';

var PX_PER_M = 520;
var CARD_W = 0.52;
var SEAM = 0.006;
/** Cards that get street damage (slot index → kind). On a desktop frame slots 6–12 are in view. */
var WEAR = { 7: 'scratched', 9: 'marker', 11: 'torn' };

/** A pseudo-tag: a run of jittery letter strokes from (x, y), about w wide and h tall. */
function scrawl(ctx, rand, x, y, w, h) {
  var letters = 5 + Math.floor(rand() * 3);
  var step = w / letters;
  for (var l = 0; l < letters; l++) {
    var lx = x + l * step;
    ctx.beginPath();
    ctx.moveTo(lx + rand() * step * 0.3, y + h * (0.1 + rand() * 0.3));
    for (var s = 0; s < 3; s++) {
      ctx.quadraticCurveTo(
        lx + rand() * step, y + rand() * h,
        lx + rand() * step * 1.1, y + h * (0.2 + rand() * 0.8)
      );
    }
    ctx.stroke();
  }
  // Underline swoosh.
  ctx.beginPath();
  ctx.moveTo(x, y + h * 1.05);
  ctx.quadraticCurveTo(x + w * 0.5, y + h * (1.25 + rand() * 0.2), x + w * 1.05, y + h * 0.85);
  ctx.stroke();
}

function halftonePattern(ctx) {
  var p = textCanvas(5, 5, function (c) {
    c.fillStyle = 'rgba(0,0,0,0.16)';
    c.beginPath();
    c.arc(2.5, 2.5, 1.1, 0, Math.PI * 2);
    c.fill();
  });
  return ctx.createPattern(p, 'repeat');
}

/** Thin brushed-aluminum frame with a dark backing inside it. */
function drawFrame(ctx, x, y, w, h, frame) {
  var g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#9c9c98');
  g.addColorStop(0.5, '#6f6e6a');
  g.addColorStop(1, '#4a4946');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#0b0b0b';
  ctx.fillRect(x + frame, y + frame, w - frame * 2, h - frame * 2);
}

function drawClips(ctx, x, y, w, h, frame) {
  ctx.fillStyle = '#b9b8b2';
  var cw = frame * 3, ch = frame * 1.6;
  [[x + frame * 2, y], [x + w - frame * 2 - cw, y],
    [x + frame * 2, y + h - ch], [x + w - frame * 2 - cw, y + h - ch]].forEach(function (p) {
    ctx.fillRect(p[0], p[1], cw, ch);
  });
}

function applyWear(ctx, kind, rand, ix, iy, iw, ih) {
  if (kind === 'scratched') {
    // Etched into the acrylic with a key: thin, pale, jittery.
    ctx.strokeStyle = 'rgba(235,235,230,0.75)';
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    scrawl(ctx, rand, ix + iw * 0.12, iy + ih * 0.3, iw * 0.72, ih * 0.32);
    ctx.strokeStyle = 'rgba(235,235,230,0.4)';
    scrawl(ctx, rand, ix + iw * 0.14, iy + ih * 0.31, iw * 0.7, ih * 0.3);
  } else if (kind === 'marker') {
    // Fat black marker with drips.
    ctx.strokeStyle = 'rgba(8,8,8,0.92)';
    ctx.lineWidth = Math.max(5, ih * 0.045);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var tx = ix + iw * 0.18, ty = iy + ih * 0.22, tw = iw * 0.6, th = ih * 0.36;
    scrawl(ctx, rand, tx, ty, tw, th);
    ctx.lineWidth = Math.max(2, ih * 0.012);
    for (var d = 0; d < 7; d++) {
      var dx = tx + rand() * tw, dy = ty + th * (0.5 + rand() * 0.6);
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx + (rand() - 0.5) * 2, dy + ih * (0.08 + rand() * 0.3));
      ctx.stroke();
    }
  } else if (kind === 'torn') {
    // Top-right corner ripped away to the backing board, ragged edge.
    ctx.fillStyle = '#d9d2c2';
    ctx.beginPath();
    var cx0 = ix + iw * 0.55, cy1 = iy + ih * 0.55;
    ctx.moveTo(cx0, iy);
    for (var t = 0; t <= 14; t++) {
      var f = t / 14;
      ctx.lineTo(cx0 + (ix + iw - cx0) * f + (rand() - 0.5) * 8, iy + (cy1 - iy) * f + (rand() - 0.5) * 8);
    }
    ctx.lineTo(ix + iw, iy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(60,50,40,0.35)';
    ctx.fillRect(cx0, iy, ix + iw - cx0, cy1 - iy);
    // "HELLO my name is" sticker slapped on lower left, tagged.
    ctx.save();
    ctx.translate(ix + iw * 0.27, iy + ih * 0.72);
    ctx.rotate(-0.12);
    var sw = iw * 0.36, sh = ih * 0.34;
    ctx.fillStyle = '#d12a1f';
    ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
    ctx.fillStyle = '#fff';
    ctx.font = '700 ' + sh * 0.2 + 'px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HELLO', 0, -sh * 0.2);
    ctx.fillRect(-sw * 0.42, -sh * 0.08, sw * 0.84, sh * 0.48);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    scrawl(ctx, rand, -sw * 0.36, -sh * 0.04, sw * 0.72, sh * 0.3);
    ctx.restore();
  }
}

/**
 * One framed, aged print at (x, y, w, h) on ctx. opts: { dots (halftone pattern), frame (px),
 * dim (0..1 extra darkness), bowed, wear ('scratched' | 'marker' | 'torn') }.
 */
function paintCard(ctx, img, x, y, w, h, rand, opts) {
  var frame = opts.frame;
  var ix = x + frame, iy = y + frame, iw = w - frame * 2, ih = h - frame * 2;
  drawFrame(ctx, x, y, w, h, frame);

  ctx.save();
  ctx.beginPath();
  ctx.rect(ix, iy, iw, ih);
  ctx.clip();

  // The print: cover-cropped, a hair crooked and off-centre, as if hung in a hurry.
  var tilt = (rand() - 0.5) * 0.025;
  var nudgeX = (rand() - 0.5) * frame * 1.5, nudgeY = (rand() - 0.5) * frame;
  ctx.translate(ix + iw / 2 + nudgeX, iy + ih / 2 + nudgeY);
  ctx.rotate(tilt);
  var dw = iw * 1.04, dh = ih * 1.04;
  var a = dw / dh, ia = img.naturalWidth / img.naturalHeight;
  var cw = img.naturalWidth, ch = img.naturalHeight, ox = 0, oy = 0;
  if (ia > a) { cw = ch * a; ox = (img.naturalWidth - cw) / 2; } else { ch = cw / a; oy = (img.naturalHeight - ch) / 2; }
  ctx.drawImage(img, ox, oy, cw, ch, -dw / 2, -dh / 2, dw, dh);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Paper and age: lifted blacks, yellowing, halftone, grime creeping in from the edges.
  ctx.globalCompositeOperation = 'lighten';
  ctx.fillStyle = 'rgb(30,26,22)';
  ctx.fillRect(ix, iy, iw, ih);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgb(255,241,216)';
  ctx.fillRect(ix, iy, iw, ih);
  ctx.fillStyle = opts.dots;
  ctx.fillRect(ix, iy, iw, ih);
  var edge = ctx.createRadialGradient(ix + iw / 2, iy + ih / 2, Math.min(iw, ih) * 0.3, ix + iw / 2, iy + ih / 2, Math.max(iw, ih) * 0.75);
  edge.addColorStop(0, 'rgba(255,255,255,1)');
  edge.addColorStop(1, 'rgba(150,130,105,1)');
  ctx.fillStyle = edge;
  ctx.fillRect(ix, iy, iw, ih);
  ctx.globalCompositeOperation = 'source-over';

  // Uneven light, and a bowed card here and there.
  ctx.fillStyle = 'rgba(0,0,0,' + (rand() * 0.14 + (opts.dim || 0)).toFixed(3) + ')';
  ctx.fillRect(ix, iy, iw, ih);
  if (opts.bowed) {
    var bow = ctx.createLinearGradient(ix, 0, ix + iw, 0);
    bow.addColorStop(0, 'rgba(0,0,0,0.3)');
    bow.addColorStop(0.45, 'rgba(255,255,255,0.06)');
    bow.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = bow;
    ctx.fillRect(ix, iy, iw, ih);
  }

  applyWear(ctx, opts.wear, rand, ix, iy, iw, ih);

  // Fine scratches in the acrylic.
  for (var k = 0; k < 90; k++) {
    ctx.fillStyle = 'rgba(255,255,255,' + (rand() * 0.2).toFixed(3) + ')';
    ctx.fillRect(ix + rand() * iw, iy + rand() * ih, 1 + rand() * 22, 1);
  }
  ctx.restore();
  drawClips(ctx, x, y, w, h, frame);
}

function stripTexture(registry, widthM, heightM, art) {
  var w = Math.min(4096, Math.round(widthM * PX_PER_M));
  var h = Math.round(heightM * PX_PER_M);
  var scale = w / widthM;
  var cardW = CARD_W * scale, gap = SEAM * scale;
  var frame = Math.max(4, Math.round(0.008 * scale));
  var slots = [];
  for (var x = gap; x + cardW < w; x += cardW + gap) slots.push(x);

  var c = textCanvas(w, h, function (ctx) {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, w, h);
  });
  var tex = canvasTexture(c, registry);
  var ctx = c.getContext('2d');
  var dots = halftonePattern(ctx);

  art.forEach(function (src, n) {
    var img = new Image();
    img.onload = function () {
      for (var i = n; i < slots.length; i += art.length) {
        // The strip dims toward its ends.
        var ends = Math.abs((slots[i] + cardW / 2) / w - 0.5) * 2;
        paintCard(ctx, img, slots[i], 0, cardW, h, rng(97 + i * 13), {
          dots: dots, frame: frame, dim: ends * ends * 0.35, bowed: i % 5 === 3, wear: WEAR[i]
        });
      }
      tex.needsUpdate = true;
    };
    img.src = src;
  });
  return tex;
}

/** Soft diagonal glare bands, smudges and fingerprints on the acrylic (added on top). */
function glareTexture(registry) {
  var rand = rng(331);
  var c = textCanvas(1024, 128, function (ctx, w, h) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    [[0.18, 0.22], [0.31, 0.06], [0.63, 0.16], [0.82, 0.05]].forEach(function (b) {
      var x = b[0] * w, bw = w * (0.04 + b[1] * 0.5);
      var g = ctx.createLinearGradient(x - bw, 0, x + bw, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,' + b[1] + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save();
      ctx.transform(1, 0, -0.6, 1, h * 0.3, 0);
      ctx.fillStyle = g;
      ctx.fillRect(x - bw, 0, bw * 2, h);
      ctx.restore();
    });
    for (var k = 0; k < 40; k++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.02 + rand() * 0.04).toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(rand() * w, rand() * h, 4 + rand() * 10, 6 + rand() * 12, rand() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  var tex = canvasTexture(c, registry);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

export function createAdStrip(mats, registry, shell, art) {
  var keep = tracker(registry);
  var group = new THREE.Group();
  group.name = 'ad-strip';
  var stripW = CAR.wallX1 - CAR.wallX0;
  var geo = keep(new THREE.PlaneGeometry(stripW, shell.cove.length));

  // Prints: unlit and untoned so the art keeps its punch from the seat.
  var printMat = new THREE.MeshBasicMaterial({ map: stripTexture(registry, stripW, shell.cove.length, art), toneMapped: false });
  var prints = new THREE.Mesh(geo, printMat);

  // Acrylic glare on top, added light only.
  var glare = glareTexture(registry);
  var glareSpan = 1.7;
  glare.repeat.set(stripW / glareSpan, 1);
  var glareMat = new THREE.MeshBasicMaterial({
    map: glare, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.85
  });
  var acrylic = new THREE.Mesh(geo, glareMat);
  acrylic.renderOrder = 3;
  registry.materials.push(printMat, glareMat);

  [prints, acrylic].forEach(function (m, k) {
    m.position.set((CAR.wallX0 + CAR.wallX1) / 2, shell.cove.y, shell.cove.z + 0.004 + k * 0.003);
    m.rotation.x = shell.cove.tilt;
    group.add(m);
  });

  /** The glare is a reflection of fixed tubes: it slides when the head moves, not with the train. */
  function update(cameraX) {
    glare.offset.x = (cameraX * 1.6) / glareSpan;
  }

  return { group: group, update: update };
}

/**
 * A single framed ad card on a wall. opts: { src, width, height (m), position: [x, y, z], seed }
 */
export function createPanelAd(registry, opts) {
  var keep = tracker(registry);
  var group = new THREE.Group();
  group.name = 'panel-ad';
  var w = Math.round(opts.width * PX_PER_M * 1.6), h = Math.round(opts.height * PX_PER_M * 1.6);
  var c = textCanvas(w, h, function (ctx) {
    ctx.fillStyle = '#0b0b0b';
    ctx.fillRect(0, 0, w, h);
  });
  var tex = canvasTexture(c, registry);
  var ctx = c.getContext('2d');
  var img = new Image();
  img.onload = function () {
    paintCard(ctx, img, 0, 0, w, h, rng(opts.seed || 7), {
      dots: halftonePattern(ctx), frame: Math.max(5, Math.round(0.012 * w / opts.width))
    });
    tex.needsUpdate = true;
  };
  img.src = opts.src;

  var geo = keep(new THREE.PlaneGeometry(opts.width, opts.height));
  var printMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  var glareMat = new THREE.MeshBasicMaterial({
    map: glareTexture(registry), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.6
  });
  registry.materials.push(printMat, glareMat);
  var print = new THREE.Mesh(geo, printMat);
  var acrylic = new THREE.Mesh(geo, glareMat);
  acrylic.renderOrder = 3;
  print.position.fromArray(opts.position);
  acrylic.position.fromArray(opts.position);
  acrylic.position.z += 0.003;
  group.add(print, acrylic);
  return { group: group };
}
