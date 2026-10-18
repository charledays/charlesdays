/**
 * Station takeover: the platform handed over to one body of work. Flat 2.5D layers on top of
 * the station template (which keeps the platform, tiles, ceiling and the hero lightbox):
 *
 *   wall      the back wall covered edge to edge in full-height panels, with only thin tile
 *             seams between them: full-bleed wraps, branded campaign ads, editorial spreads,
 *             wheatpaste walls and pairs of backlit lightboxes, in a seeded, varied order;
 *             or (content.wall 'wallpaper') one continuous run of floor-to-ceiling sheets,
 *             butted edge to edge, the tile wall reading through (grout, relief, torn spots)
 *   backdrop  a darkened wrap behind the hero lightbox, so the hero stays the brightest thing
 *   columns   the platform columns wrapped continuously round all four faces (seam at the back)
 *   floor     contact shadows, light pooling under the lit panels, a few spray stencils
 *   approach  the same campaign running out along the tunnel wall either side of the platform,
 *             so the ride shows the next stop's work before the platform arrives
 *
 * No station signage: the name lives on the route map and the arrival display. Panels are
 * painted from the station's own artwork (content.js), lazily, when the station first comes
 * near (wake), so a visit only loads what it's about to show.
 *
 * Station-local x runs along the platform. layout() builds the wall around the hero (boardX)
 * for the current viewpoint, the same way the template places its columns.
 */
import * as THREE from 'three';
import { WORLD, WORDMARK } from '../config.js';
import { tracker, textCanvas, canvasTexture, frameGeometry } from '../geo.js';
import { rng } from '../materials.js';
import { web } from '../web.js';

var FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
var S = WORLD.station;

/** Takeover sizes, metres. */
export var TAKEOVER = {
  hero: { width: 3.4, height: 2.3, bottom: 0.78 },
  /** Panels run from just above the floor to just under the ceiling. */
  wall: { bottom: 0.12, top: 3.66 },
  /** Panel widths by kind; the gap between panels is a tile seam. */
  widths: { wrap: 5.6, campaign: 4.4, editorial: 2.9, paste: 3.3, lights: 3.1 },
  seam: [0.14, 0.3],
  lightbox: { width: 1.24, height: 1.86, bottom: 0.78 },
  /** Wallpaper sheet width (floor to ceiling, butted); how strongly the tiles read through. */
  sheet: { width: 2.6, tiles: 0.62 },
  column: 0.34,
  /** Tunnel-wall campaign either side: panel offsets past the platform's end. */
  approach: [5, 13, 22, 31, 40, 48]
};

/** The order panels run in from the hero outward, per side. */
var SEQUENCE = ['editorial', 'wrap', 'lights', 'campaign', 'paste', 'wrap', 'editorial', 'campaign', 'lights', 'paste'];

/**
 * Paint queue, shared by every station: painting a platform is dozens of full-size canvas draws
 * plus a GPU upload each, which done at once (as a station wakes) stalls the ride for a beat
 * on a phone. Jobs run a few per frame inside a small time budget, lowest priority number
 * first: the sheets nearest where you stand get painted before the far ends of the wall.
 */
var PAINT = { budgetMs: 6, perFrame: 3 };
var paintQueue = [];
var pumping = false;
function schedulePaint(job, priority) {
  paintQueue.push({ job: job, p: priority });
  paintQueue.sort(function (a, b) { return a.p - b.p; });
  if (!pumping) { pumping = true; requestAnimationFrame(pumpPaint); }
}
function pumpPaint() {
  var t0 = performance.now();
  for (var n = 0; paintQueue.length && n < PAINT.perFrame && (n === 0 || performance.now() - t0 < PAINT.budgetMs); n++) {
    paintQueue.shift().job();
  }
  if (paintQueue.length) requestAnimationFrame(pumpPaint);
  else pumping = false;
}

var images = {};
/** One decode per image path, shared by every painter. Resolves null if it fails to load. */
function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (!images[src]) {
    images[src] = new Promise(function (resolve) {
      var img = new Image();
      img.decoding = 'async';
      // Counted by three's loading manager, so the loader waits for the wall art too (main.js).
      var manager = THREE.DefaultLoadingManager;
      manager.itemStart(src);
      img.onload = function () { manager.itemEnd(src); resolve(img); };
      img.onerror = function () { manager.itemError(src); resolve(null); };
      // The light web copy (web.js): the wall is painted at a few hundred px per metre.
      img.src = web(src);
    });
  }
  return images[src];
}

/** Cover-fit img into (x, y, w, h), never stretched; fx/fy pick the focus (0..1). */
function cover(ctx, img, x, y, w, h, fx, fy) {
  var a = w / h, ia = img.naturalWidth / img.naturalHeight;
  var sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
  if (ia > a) { sw = sh * a; sx = (img.naturalWidth - sw) * (fx == null ? 0.5 : fx); }
  else { sh = sw / a; sy = (img.naturalHeight - sh) * (fy == null ? 0.4 : fy); }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** Contain-fit (the whole image, original proportions) centred in (x, y, w, h); returns the rect. */
function contain(ctx, img, x, y, w, h) {
  var s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  var dw = img.naturalWidth * s, dh = img.naturalHeight * s;
  var r = { x: x + (w - dw) / 2, y: y + (h - dh) / 2, w: dw, h: dh };
  ctx.drawImage(img, r.x, r.y, r.w, r.h);
  return r;
}

/** The Charle$Days tag at (x, y), width w. */
function drawWordmark(ctx, img, x, y, w, rot, alpha) {
  // The crop is in the original's pixels; the web copy is smaller.
  var s = img.naturalWidth / WORDMARK.size[0];
  var cw = WORDMARK.crop[2] - WORDMARK.crop[0], ch = WORDMARK.crop[3] - WORDMARK.crop[1];
  var h = w * ch / cw;
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.translate(x, y);
  ctx.rotate(rot || 0);
  ctx.drawImage(img, WORDMARK.crop[0] * s, WORDMARK.crop[1] * s, cw * s, ch * s, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/** A die-cut sticker: the image on a rounded backing, slightly turned. */
function drawSticker(ctx, img, x, y, w, rot, backing) {
  var h = w * img.naturalHeight / img.naturalWidth;
  var pad = w * 0.07;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = w * 0.04;
  ctx.fillStyle = backing || '#f4f1ea';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2, pad * 1.2);
  else ctx.rect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/** Grout reading through vinyl pasted over tiles, and grime settling toward the floor. */
function onTiles(ctx, w, h, ppm, strength) {
  var tile = ppm * 0.152;
  ctx.fillStyle = 'rgba(0,0,0,' + (0.05 * strength).toFixed(3) + ')';
  for (var x = tile; x < w; x += tile) ctx.fillRect(Math.round(x), 0, 1, h);
  for (var y = tile; y < h; y += tile) ctx.fillRect(0, Math.round(y), w, 1);
  var g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(0,0,0,0.1)');
  g.addColorStop(0.55, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(28,20,10,' + (0.32 * strength).toFixed(3) + ')');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Small nicks and lifted corners along a panel's sides (the paper and paste behind showing). */
function tornEdges(ctx, w, h, rand, count) {
  ctx.fillStyle = 'rgba(150,144,132,0.85)';
  for (var k = 0; k < count; k++) {
    var ex = rand() < 0.5 ? 0 : w, ey = rand() * h, r = h * (0.004 + rand() * 0.01);
    ctx.beginPath();
    ctx.moveTo(ex, ey - r);
    ctx.lineTo(ex + (ex ? -1 : 1) * r * (0.5 + rand()), ey + (rand() - 0.5) * r);
    ctx.lineTo(ex, ey + r);
    ctx.fill();
  }
}

/**
 * Treatments: how a station's panels are finished, so each stop reads as its own show on the
 * same platform. They tune the paint, not the layout. glow is how much the work lights itself:
 * kept low so the station's light (its rig and baked pools) shapes it, high enough to stay legible.
 *   campaign  crisp, bright, branded (Art Direction)
 *   cinema    graded down and letterboxed (Film)
 */
var TREATMENTS = {
  campaign: { grade: null, letterbox: false, glow: 0.2 },
  cinema: { grade: 'rgba(6,8,14,0.28)', letterbox: true, glow: 0.15 }
};

export function createTakeover(station, content, mats, registry, options) {
  var keep = tracker(registry);
  var T = TREATMENTS[content.treatment] || TREATMENTS.campaign;
  var ads = content.ads.length ? content.ads : station.billboard ? [station.billboard.src] : [];
  var titles = content.adTitles || [];
  var ppm = options && options.coarse ? 80 : 115;
  var group = new THREE.Group();
  group.name = 'takeover:' + station.id;
  var wall = new THREE.Group();
  group.add(wall);

  // Painting waits for wake(): until then every panel is a dark board.
  var jobs = [];
  var awake = false;
  function later(job) { if (awake) job(); else jobs.push(job); }
  function wake() {
    if (awake) return;
    awake = true;
    jobs.forEach(function (job) { job(); });
    jobs = [];
  }

  var stickerSrc = {
    wordmark: WORDMARK.src,
    eye: '/images/wall/eye-tag.jpg',
    throwie: '/images/brand/601-throwie.png',
    criterio: '/images/brand/hecho-con-criterio.png',
    aragua: '/images/brand/de-aragua-al-mundo.png'
  };
  var stickerKeys = Object.keys(stickerSrc);
  function withStickers() {
    return Promise.all(stickerKeys.map(function (k) { return loadImage(stickerSrc[k]); })).then(function (list) {
      var o = {};
      stickerKeys.forEach(function (k, i) { o[k] = list[i]; });
      return o;
    });
  }

  /**
   * A canvas texture painted (on wake) once its images arrive, through the paint queue.
   * paint(ctx, w, h, imgs, stickers); priority: lower paints sooner (default: after the wall).
   */
  function painted(w, h, srcs, paint, base, priority) {
    var c = textCanvas(w, h, function (ctx) { ctx.fillStyle = base || '#111'; ctx.fillRect(0, 0, w, h); });
    var tex = canvasTexture(c, registry);
    later(function () {
      Promise.all([Promise.all(srcs.map(loadImage)), withStickers()]).then(function (r) {
        schedulePaint(function () {
          paint(c.getContext('2d'), w, h, r[0], r[1]);
          tex.needsUpdate = true;
        }, priority == null ? 60 : priority);
      });
    });
    return tex;
  }
  function track(m) { registry.materials.push(m); return m; }
  function paper(tex) {
    return track(new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: T.glow, roughness: 0.82 }));
  }
  var geos = {};
  function plane(w, h) {
    var key = w.toFixed(3) + 'x' + h.toFixed(3);
    return geos[key] || (geos[key] = keep(new THREE.PlaneGeometry(w, h)));
  }
  function art(k) { return ads.length ? ads[((k % ads.length) + ads.length) % ads.length] : null; }

  var W = TAKEOVER.wall;
  var panelH = W.top - W.bottom;

  // ---- Panel painters ------------------------------------------------------------------------

  function grade(ctx, w, h) {
    if (T.grade) { ctx.fillStyle = T.grade; ctx.fillRect(0, 0, w, h); }
    if (T.letterbox) { ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h * 0.07); ctx.fillRect(0, h * 0.93, w, h * 0.07); }
  }

  var painters = {
    /** One image, full bleed, floor to ceiling. */
    wrap: function (k, seed) {
      return function (ctx, w, h, im, st) {
        var rand = rng(seed);
        if (im[0]) cover(ctx, im[0], 0, 0, w, h, 0.5, 0.25 + rand() * 0.3);
        grade(ctx, w, h);
        if (st.wordmark && rand() < 0.6) drawWordmark(ctx, st.wordmark, w * (0.12 + rand() * 0.1), h * 0.1, w * 0.14, 0, 0.9);
        onTiles(ctx, w, h, ppm, 1);
        tornEdges(ctx, w, h, rand, 6);
      };
    },
    /** A branded campaign: full-bleed image, white inner border, the tag in a corner. */
    campaign: function (k, seed) {
      return function (ctx, w, h, im, st) {
        var rand = rng(seed);
        ctx.fillStyle = '#0c0c0c';
        ctx.fillRect(0, 0, w, h);
        var m = w * 0.035;
        if (im[0]) cover(ctx, im[0], m, m, w - m * 2, h - m * 2, 0.5, 0.3);
        grade(ctx, w, h);
        ctx.strokeStyle = 'rgba(243,239,231,0.9)';
        ctx.lineWidth = Math.max(2, w * 0.004);
        ctx.strokeRect(m * 1.6, m * 1.6, w - m * 3.2, h - m * 3.2);
        if (st.wordmark) drawWordmark(ctx, st.wordmark, w - m * 1.6 - w * 0.12, h - m * 1.6 - w * 0.06, w * 0.22, 0, 1);
        onTiles(ctx, w, h, ppm, 0.6);
        tornEdges(ctx, w, h, rand, 3);
      };
    },
    /** Editorial spread: off-white stock, the photo whole (its own proportions), a quiet title. */
    editorial: function (k, seed) {
      return function (ctx, w, h, im, st) {
        var rand = rng(seed);
        ctx.fillStyle = '#e9e4d8';
        ctx.fillRect(0, 0, w, h);
        var m = w * 0.08;
        var r = im[0] ? contain(ctx, im[0], m, m, w - m * 2, h - m * 2 - h * 0.08) : { x: m, y: m, w: w - m * 2, h: h * 0.7 };
        var title = titles[((k % ads.length) + ads.length) % ads.length];
        if (title) {
          ctx.fillStyle = '#141414';
          ctx.font = '700 ' + Math.round(w * 0.045) + 'px ' + FONT;
          ctx.textBaseline = 'top';
          ctx.fillText(title.toUpperCase(), r.x, r.y + r.h + h * 0.02, w - m * 2);
        }
        if (st.criterio && rand() < 0.5) drawSticker(ctx, st.criterio, w * 0.72, h * 0.93, w * 0.22, (rand() - 0.5) * 0.3, '#111');
        grade(ctx, w, h);
        onTiles(ctx, w, h, ppm, 0.8);
        tornEdges(ctx, w, h, rand, 5);
      };
    },
    /** Wheatpaste: a few posters pasted in an uneven grid, older layers showing through rips. */
    paste: function (k, seed) {
      return function (ctx, w, h, im, st) {
        var rand = rng(seed);
        ctx.fillStyle = '#cfc8b8';
        ctx.fillRect(0, 0, w, h);
        var cols = 3, rows = 4;
        var cw = w / cols, ch = h / rows;
        for (var row = 0; row < rows; row++) {
          for (var col = 0; col < cols; col++) {
            var img = im[(row + col) % im.length];
            ctx.save();
            ctx.translate(col * cw + cw / 2 + (rand() - 0.5) * cw * 0.06, row * ch + ch / 2 + (rand() - 0.5) * ch * 0.06);
            ctx.rotate((rand() - 0.5) * 0.035);
            if (img) cover(ctx, img, -cw / 2 - 2, -ch / 2 - 2, cw + 4, ch + 4, 0.5, 0.35);
            ctx.restore();
          }
        }
        grade(ctx, w, h);
        for (var t = 0; t < 9; t++) {
          ctx.fillStyle = rand() < 0.5 ? 'rgba(222,215,200,0.95)' : 'rgba(170,160,140,0.9)';
          var tx = rand() * w, ty = rand() * h, tr = w * (0.02 + rand() * 0.05);
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          for (var q = 0; q < 6; q++) ctx.lineTo(tx + (rand() - 0.3) * tr * 2, ty + (rand() - 0.3) * tr * 1.5);
          ctx.fill();
        }
        if (st.throwie && rand() < 0.7) {
          var tw = w * 0.62;
          ctx.globalAlpha = 0.88;
          ctx.drawImage(st.throwie, w * 0.2 + (rand() - 0.5) * w * 0.15, h * (0.55 + rand() * 0.2), tw, tw * st.throwie.naturalHeight / st.throwie.naturalWidth);
          ctx.globalAlpha = 1;
        }
        if (st.aragua) drawSticker(ctx, st.aragua, w * (0.15 + rand() * 0.6), h * 0.62, w * 0.07, (rand() - 0.5) * 0.4, '#111');
        if (st.eye) drawSticker(ctx, st.eye, w * (0.15 + rand() * 0.6), h * 0.68, w * 0.05, (rand() - 0.5) * 0.5);
        onTiles(ctx, w, h, ppm, 0.9);
        tornEdges(ctx, w, h, rand, 8);
      };
    },
    /** Behind the hero: the hero's own image, blown up, blurred and dark, as a halo. */
    halo: function (k, seed) {
      return function (ctx, w, h, im, st) {
        if (im[0]) {
          ctx.save();
          ctx.filter = 'blur(' + Math.round(w * 0.02) + 'px) saturate(1.2)';
          cover(ctx, im[0], -w * 0.05, -h * 0.05, w * 1.1, h * 1.1, 0.5, 0.5);
          ctx.restore();
        }
        ctx.fillStyle = 'rgba(6,6,8,0.58)';
        ctx.fillRect(0, 0, w, h);
        if (st.wordmark) drawWordmark(ctx, st.wordmark, w / 2, h * 0.075, w * 0.26, 0, 0.8);
        onTiles(ctx, w, h, ppm, 1);
      };
    },
    /** Backing for lit panels: the campaign pasted dark behind them. */
    lights: function (k, seed) {
      return function (ctx, w, h, im, st) {
        var rand = rng(seed);
        if (im[0]) cover(ctx, im[0], 0, 0, w, h, 0.5, 0.4);
        ctx.fillStyle = 'rgba(8,8,8,0.62)';
        ctx.fillRect(0, 0, w, h);
        if (st.wordmark) drawWordmark(ctx, st.wordmark, w / 2, h * 0.11, w * 0.4, 0, 0.85);
        onTiles(ctx, w, h, ppm, 1);
        tornEdges(ctx, w, h, rand, 4);
      };
    }
  };

  var materialCache = {};
  /** Panel k of a kind: its material (shared when the same panel repeats in the tunnel). */
  function panelMaterial(kind, k, width) {
    var key = kind + ':' + k + ':' + width.toFixed(1);
    if (materialCache[key]) return materialCache[key];
    var w = Math.round(width * ppm), h = Math.round(panelH * ppm);
    var srcs = kind === 'paste' ? [art(k), art(k + 3), art(k + 5)] : kind === 'halo' ? [station.billboard.src] : [art(k)];
    var tex = painted(w, h, srcs, painters[kind](k, 101 + k * 37), kind === 'editorial' ? '#e9e4d8' : '#111');
    return (materialCache[key] = paper(tex));
  }

  // ---- Wallpaper ----------------------------------------------------------------------------

  // The tile wall's texture: 1.22 m per repeat, laid from the platform's left end (x = -halfLength)
  // and from the floor up, so a sheet can line its grout and relief up with the tiles behind it.
  var TILE_M = 1.22;
  var tileImage = mats.tileTexture.image;

  /**
   * The tiles behind, through the paper: the wall's own texture multiplied over (w, h) at `pxm`
   * canvas px per metre, `tx`/`ty` the pattern's offset in px. Returns the pattern (bare tile).
   */
  function tilesThrough(ctx, w, h, pxm, tx, ty) {
    var s = (TILE_M * pxm) / tileImage.width;
    var pattern = ctx.createPattern(tileImage, 'repeat');
    pattern.setTransform(new DOMMatrix([s, 0, 0, s, tx || 0, ty || 0]));
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = TAKEOVER.sheet.tiles;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return pattern;
  }
  /** The tile relief as a bump map: `w` x `h` metres of wall per 0..1 of uv, from (u0, 0) in tiles. */
  function tileBump(w, h, u0) {
    var bump = mats.tileTexture.clone();
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
    bump.colorSpace = THREE.NoColorSpace;
    bump.repeat.set(w / TILE_M, h / TILE_M);
    bump.offset.set(u0 || 0, 0);
    bump.needsUpdate = true;
    registry.textures.push(bump);
    return bump;
  }

  var sheetCache = {};
  /**
   * Sheet k of the wallpaper: left edge at station x `x0`, `width` wide, floor to ceiling. The
   * deal sheet carries the station's offer instead of the artwork.
   */
  function sheetMaterial(k, x0, width, deal) {
    if (content.poem && !deal) return poemSheet(k, x0, width);
    var key = k + ':' + x0.toFixed(2) + ':' + width.toFixed(2) + (deal ? ':deal' : '');
    return sheetCache[key] || (sheetCache[key] = paintSheet(k, x0, width, deal));
  }
  /** fine: the close-look copy of an art sheet (sharpen), printed at SHARP px per metre. */
  function paintSheet(k, x0, width, deal, fine) {
    // The offer is type, read up close through the doors: printed at a finer grain than the art.
    var pxm = deal ? ppm * 3 : fine ? SHARP : ppm;
    var w = Math.round(width * pxm), h = Math.round(S.ceilingY * pxm);
    var seed = 401 + k * 29;
    // Queued nearest the doors (station x = 0) first; a close look's sharp print jumps the queue.
    var tex = painted(w, h, [art(k)], function (ctx, w, h, im, st) {
      var rand = rng(seed);
      if (deal) paintDeal(ctx, w, h, st);
      else {
        if (im[0]) cover(ctx, im[0], 0, 0, w, h, 0.5, 0.2 + rand() * 0.3);
        grade(ctx, w, h);
        if (st.wordmark && !content.pattern && k % 4 === 1) drawWordmark(ctx, st.wordmark, w * 0.5, h * 0.12, w * 0.3, 0, 0.85);
      }
      // The tiles behind, lined up with the wall's own (laid from x = -halfLength, floor up).
      var pattern = tilesThrough(ctx, w, h, pxm, -(x0 + S.halfLength) * pxm, S.ceilingY * pxm);
      // Now and then a small rip low down, where bags catch: bare tile.
      for (var t = 0; t < (!deal && k % 3 === 2 ? 1 : 0); t++) {
        var cx = w * (0.2 + rand() * 0.6), cy = h * (0.78 + rand() * 0.14), r = w * (0.015 + rand() * 0.02);
        ctx.beginPath();
        for (var q = 0; q < 9; q++) {
          var a = q / 9 * Math.PI * 2, rr = r * (0.5 + rand() * 0.7);
          ctx[q ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr * 1.3, cy + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fillStyle = pattern;
        ctx.fill();
        ctx.strokeStyle = 'rgba(232,226,212,0.55)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // Butt joint: a hairline of shadow where this sheet meets the next, a lifted corner or two.
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(w - 2, 0, 2, h);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, 0, 1, h);
      tornEdges(ctx, w, h, rand, 4);
      // Grime settling toward the floor.
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.7, 'rgba(28,20,10,0)');
      g.addColorStop(1, 'rgba(28,20,10,0.35)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }, null, fine ? -1 : Math.abs(x0 + width / 2));
    // Relief: the same tiles as a bump map, so the grout catches the station light.
    return track(new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: T.glow,
      roughness: 0.78, bumpMap: tileBump(width, S.ceilingY, (x0 + S.halfLength) / TILE_M), bumpScale: 1.6
    }));
  }

  /**
   * The offer, pasted up as its own sheet: black stock, the line's orange, set like a poster.
   * content.deal: { kicker, title: [lines], offer, terms: [lines], proof: [lines] }.
   */
  function paintDeal(ctx, w, h, st) {
    var d = content.deal;
    var orange = '#f26a1b', ink = '#f3efe7';
    var m = w * 0.1;
    ctx.fillStyle = '#0c0c0c';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    function line(text, y, size, weight, color, track) {
      ctx.font = weight + ' ' + Math.round(size) + 'px ' + FONT;
      ctx.fillStyle = color;
      if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(size * (track || 0)) + 'px';
      ctx.fillText(track ? text.toUpperCase() : text, w / 2, y, w - m * 2);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }
    // The line's bullet and the kicker.
    var by = h * 0.12, br = w * 0.045;
    ctx.fillStyle = orange;
    ctx.beginPath();
    ctx.arc(w / 2, by, br, 0, Math.PI * 2);
    ctx.fill();
    line('C', by + br * 0.38, br * 1.1, 800, '#111');
    line(d.kicker, h * 0.2, w * 0.035, 700, orange, 0.22);
    // The headline.
    d.title.forEach(function (t, i) { line(t, h * 0.28 + i * w * 0.115, w * 0.105, 800, ink); });
    // The offer, in a dashed box like a coupon.
    var top = h * 0.43, boxH = h * 0.27;
    ctx.save();
    ctx.strokeStyle = orange;
    ctx.lineWidth = w * 0.009;
    ctx.setLineDash([w * 0.03, w * 0.02]);
    ctx.strokeRect(m, top, w - m * 2, boxH);
    ctx.restore();
    line(d.offer, top + boxH * 0.52, w * 0.16, 800, orange);
    d.terms.forEach(function (t, i) { line(t, top + boxH * 0.72 + i * w * 0.05, w * 0.038, 700, ink, 0.14); });
    // How to claim it.
    d.proof.forEach(function (t, i) { line(t, h * 0.79 + i * w * 0.06, w * 0.045, 500, 'rgba(243,239,231,0.72)'); });
    if (st.wordmark) drawWordmark(ctx, st.wordmark, w / 2, h * 0.9, w * 0.42, -0.04, 0.9);
  }

  /**
   * The poem wallpaper, on black stock, sheets alternating: "De Aragua al mundo" big in white,
   * then the poem in white caps, set flush left on one margin round eye height. The two prints
   * are shared by every sheet (one fine-grained texture each); the tiles behind come through as
   * relief only (each sheet's own bump map, lined up with the wall).
   */
  var POEM_FONT = '"Space Grotesk", ' + FONT;
  var poemPrints = null;
  function poemPrint(paint) {
    var pxm = ppm * 3;
    var c = textCanvas(Math.round(TAKEOVER.sheet.width * pxm), Math.round(S.ceilingY * pxm), function (ctx, w, h) {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);
    });
    var tex = canvasTexture(c, registry);
    later(function () {
      // The page loads Space Grotesk; wait for it so the canvas doesn't set the poem in a fallback.
      var font = document.fonts ? document.fonts.load('700 64px "Space Grotesk"').catch(function () {}) : null;
      Promise.all([loadImage(stickerSrc.aragua), font]).then(function (r) {
        var ctx = c.getContext('2d');
        paint(ctx, c.width, c.height, r[0]);
        // Grime settling toward the floor.
        var g = ctx.createLinearGradient(0, 0, 0, c.height);
        g.addColorStop(0.75, 'rgba(28,20,10,0)');
        g.addColorStop(1, 'rgba(28,20,10,0.3)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, c.width, c.height);
        tex.needsUpdate = true;
      });
    });
    return tex;
  }
  /** Canvas y for a height above the floor (m). */
  function atHeight(h, m) { return h * (1 - m / S.ceilingY); }
  function poemSheet(k, x0, width) {
    var key = 'poem:' + k + ':' + x0.toFixed(2) + ':' + width.toFixed(2);
    if (sheetCache[key]) return sheetCache[key];
    if (!poemPrints) {
      poemPrints = [
        // The tag, big, centred at eye height.
        poemPrint(function (ctx, w, h, tag) {
          if (!tag) return;
          var tw = w * 0.78, th = tw * tag.naturalHeight / tag.naturalWidth;
          ctx.drawImage(tag, (w - tw) / 2, atHeight(h, 1.75) - th / 2, tw, th);
        }),
        // The poem: caps, flush left, an orange rule over it.
        poemPrint(function (ctx, w, h) {
          var lines = content.poem.map(function (l) { return l.toUpperCase(); });
          var m = w * 0.12, size = w * 0.036, lead = size * 1.5;
          var y0 = atHeight(h, 1.6) - (lines.length - 1) * lead / 2;
          ctx.fillStyle = '#f26a1b';
          ctx.fillRect(m, y0 - lead * 1.4, w * 0.12, size * 0.16);
          ctx.fillStyle = '#f3efe7';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.font = '700 ' + Math.round(size) + 'px ' + POEM_FONT;
          if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(size * 0.04) + 'px';
          lines.forEach(function (line, i) { ctx.fillText(line, m, y0 + i * lead, w - m * 2); });
        })
      ];
    }
    var map = poemPrints[((k % 2) + 2) % 2];
    if (width < TAKEOVER.sheet.width - 0.01) {
      // A cut sheet at the wall's end: the same print, trimmed.
      map = map.clone();
      map.repeat.set(width / TAKEOVER.sheet.width, 1);
      map.needsUpdate = true;
      registry.textures.push(map);
    }
    return (sheetCache[key] = track(new THREE.MeshStandardMaterial({
      map: map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: T.glow,
      roughness: 0.85, bumpMap: tileBump(width, S.ceilingY, (x0 + S.halfLength) / TILE_M), bumpScale: 1.6
    })));
  }

  /**
   * Lay the wallpaper along the whole wall, one sheet centred in the doorway's view. With a deal,
   * a seam sits there instead: the first repeat on the left, the offer beside it on the right.
   */
  function layWallpaper(bx) {
    sharpen(null);
    sheets = [];
    var sw = TAKEOVER.sheet.width;
    var edge = S.halfLength;
    var start = content.deal ? bx : bx - sw / 2;
    var first = start - Math.ceil((start + edge) / sw) * sw;
    var z = S.wallZ + 0.012;
    for (var x0 = first, k = 0; x0 < edge; x0 += sw, k++) {
      var a = Math.max(x0, -edge), b = Math.min(x0 + sw, edge);
      if (b - a < 0.05) continue;
      var deal = !!content.deal && Math.abs(x0 - start) < 0.01;
      var m = new THREE.Mesh(plane(b - a, S.ceilingY), sheetMaterial(k, a, b - a, deal));
      m.position.set((a + b) / 2, S.ceilingY / 2, z);
      wall.add(m);
      sheets.push({ mesh: m, k: k, x0: a, width: b - a, deal: deal });
    }
  }

  /**
   * A close look (the phone's tap on the art): the sheet under station-local x is swapped for a
   * copy printed at SHARP px per metre, so it holds up at arm's length; null puts the everyday
   * print back. One sharp copy at a time; poem and offer sheets are already fine-grained.
   */
  var SHARP = 560;
  var sheets = [];
  var sharp = null;
  function sharpen(x) {
    if (sharp) {
      sharp.rec.mesh.material = sharp.base;
      [sharp.mat.map, sharp.mat.bumpMap].forEach(function (t) { if (t) t.dispose(); });
      sharp.mat.dispose();
      sharp = null;
    }
    if (x == null || content.poem) return;
    var rec = sheets.filter(function (r) { return x >= r.x0 && x < r.x0 + r.width; })[0];
    if (!rec || rec.deal) return;
    var mat = paintSheet(rec.k, rec.x0, rec.width, false, true);
    sharp = { rec: rec, base: rec.mesh.material, mat: mat };
    rec.mesh.material = mat;
  }

  // ---- Lit panels ----------------------------------------------------------------------------

  var lightCache = {};
  function lightMaterial(src) {
    if (lightCache[src]) return lightCache[src];
    var L = TAKEOVER.lightbox;
    var w = Math.round(L.width * ppm * 2.2), h = Math.round(L.height * ppm * 2.2);
    var tex = painted(w, h, [src], function (ctx, w, h, im) {
      if (im[0]) cover(ctx, im[0], 0, 0, w, h, 0.5, 0.3);
      grade(ctx, w, h);
    });
    return (lightCache[src] = track(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })));
  }
  var spillMat = track(new THREE.MeshBasicMaterial({
    map: mats.glowTexture, color: 0xfff4e0, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  var lightFrameGeo = keep(frameGeometry(TAKEOVER.lightbox.width, TAKEOVER.lightbox.height, 0.05, 0.08, 0.01));

  function lightbox(target, x, src, z, bottom, scale) {
    var L = TAKEOVER.lightbox;
    var k = scale || 1;
    var y = bottom + L.height * k / 2;
    var face = new THREE.Mesh(plane(L.width, L.height), lightMaterial(src));
    var frame = new THREE.Mesh(lightFrameGeo, mats.ironwork);
    var spill = new THREE.Mesh(plane(L.width * 2, L.height * 1.6), spillMat);
    face.position.set(x, y, z + 0.085);
    frame.position.set(x, y, z + 0.03);
    spill.position.set(x, y, z + 0.006);
    [face, frame, spill].forEach(function (m) { m.scale.setScalar(k); target.add(m); });
    if (target === wall) pool(x, L.width * k * 1.3, 0.16);
  }

  // ---- Floor: contact shadows, light pools, stencils -----------------------------------------

  var poolTex = canvasTexture(textCanvas(64, 128, function (ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,244,224,1)');
    g.addColorStop(1, 'rgba(255,244,224,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-in';
    var gx = ctx.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, 'rgba(0,0,0,0)');
    gx.addColorStop(0.5, 'rgba(0,0,0,1)');
    gx.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gx;
    ctx.fillRect(0, 0, w, h);
  }), registry);
  var poolMats = {};
  function poolMat(opacity) {
    var key = opacity.toFixed(2);
    return poolMats[key] || (poolMats[key] = track(new THREE.MeshBasicMaterial({
      map: poolTex, transparent: true, opacity: opacity, depthWrite: false, blending: THREE.AdditiveBlending
    })));
  }
  /** A faint pool of a lit panel's light on the floor in front of it (the floor's sheen). */
  function pool(x, width, opacity) {
    var m = new THREE.Mesh(plane(width, 1.8), poolMat(opacity));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.008, S.wallZ + 0.9);
    wall.add(m);
  }

  var shadowTex = canvasTexture(textCanvas(128, 128, function (ctx) {
    var g = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.7)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }), registry);
  var shadowMat = track(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  var shadowGeo = keep(new THREE.PlaneGeometry(1.1, 1.1));
  shadowGeo.rotateX(-Math.PI / 2);
  var shadows = new THREE.InstancedMesh(shadowGeo, shadowMat, 40);
  shadows.count = 0;
  shadows.renderOrder = 1;
  group.add(shadows);

  /** Spray stencils on the floor from the brand marks: a few, one colour, worn by feet. */
  var stencilGeo = keep(new THREE.PlaneGeometry(1, 1));
  stencilGeo.rotateX(-Math.PI / 2);
  var stencilAspect = [WORDMARK.crop[2] - WORDMARK.crop[0], 1475, 1957].map(function (w, i) {
    return w / [WORDMARK.crop[3] - WORDMARK.crop[1], 783, 546][i];
  });
  var stencilMats = ['wordmark', 'throwie', 'criterio'].map(function (key, i) {
    var c = textCanvas(512, Math.round(512 / stencilAspect[i]), function () {});
    var tex = canvasTexture(c, registry);
    later(function () {
      loadImage(stickerSrc[key]).then(function (img) {
        if (!img) return;
        var ctx = c.getContext('2d');
        var w = c.width, h = c.height;
        if (key === 'wordmark') drawWordmark(ctx, img, w / 2, h / 2, w, 0, 1);
        else ctx.drawImage(img, 0, 0, w, h);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = '#efece4';
        ctx.fillRect(0, 0, w, h);
        // Overspray holes and wear from foot traffic.
        ctx.globalCompositeOperation = 'destination-out';
        var rand = rng(551 + i);
        for (var k = 0; k < 700; k++) {
          ctx.fillStyle = 'rgba(0,0,0,' + (0.2 + rand() * 0.6).toFixed(2) + ')';
          ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 5, 1 + rand() * 3);
        }
        tex.needsUpdate = true;
      });
    });
    return track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.4, depthWrite: false }));
  });
  function stencil(kind, x, z, width, rot) {
    var m = new THREE.Mesh(stencilGeo, stencilMats[kind]);
    m.scale.set(width, 1, width / stencilAspect[kind]);
    m.rotation.y = rot || 0;
    m.position.set(x, 0.007, z);
    m.renderOrder = 1;
    wall.add(m);
  }

  // ---- Columns: one wrap round all four faces ------------------------------------------------

  var C = TAKEOVER.column;
  var colGeo = keep(new THREE.BoxGeometry(C, S.ceilingY, C));
  (function wrapUVs() {
    // BoxGeometry faces come in order +x, -x, +y, -y, +z, -z, four vertices each, u running to
    // the viewer's right. Going round (front +z, right +x, back -z, left -x) that's continuous,
    // so each side takes its quarter of the texture; top and bottom sample the dark cap.
    var quarter = { 0: 0.25, 1: 0.75, 4: 0, 5: 0.5 };
    var uv = colGeo.attributes.uv;
    for (var f = 0; f < 6; f++) {
      for (var v = 0; v < 4; v++) {
        var i = f * 4 + v;
        if (quarter[f] == null) uv.setXY(i, 0.5, 0.995);
        else uv.setX(i, quarter[f] + uv.getX(i) * 0.25);
      }
    }
    uv.needsUpdate = true;
  })();
  var WRAPS = 4;
  var wrapMats = [];
  for (var wi = 0; wi < WRAPS; wi++) {
    (function (wi) {
      var cw = Math.round(C * 4 * ppm * 2), chh = Math.round(S.ceilingY * ppm * 2);
      var tex = painted(cw, chh, [art(wi * 3 + 2)], function (ctx, w, h, im, st) {
        var rand = rng(71 + wi * 17);
        var top = h * (1 - W.top / S.ceilingY), bottom = h * (1 - 0.16 / S.ceilingY);
        // The artwork covers the whole perimeter at its own proportions; its centre sits on the
        // front face (u = 1/8) and its edges meet at the back seam (u = 5/8).
        if (im[0]) {
          var shift = w * (0.125 - 0.5);
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, top, w, bottom - top);
          ctx.clip();
          [shift, shift + w].forEach(function (dx) { cover(ctx, im[0], dx, top, w, bottom - top, 0.5, 0.3); });
          ctx.restore();
          grade(ctx, w, h);
        }
        // Vinyl folded over each corner: a line of shade and a catch of light.
        [0.25, 0.5, 0.75].forEach(function (u) {
          var x = u * w;
          var g = ctx.createLinearGradient(x - w * 0.02, 0, x + w * 0.02, 0);
          g.addColorStop(0, 'rgba(0,0,0,0)');
          g.addColorStop(0.45, 'rgba(0,0,0,0.35)');
          g.addColorStop(0.55, 'rgba(255,255,255,0.12)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x - w * 0.02, top, w * 0.04, bottom - top);
        });
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(w * 0.625 - 1, top, 3, bottom - top);
        // Scuffed kick band; a sticker at hand height on the front face.
        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(0, bottom, w, h - bottom);
        for (var k = 0; k < 220; k++) {
          ctx.fillStyle = 'rgba(255,255,255,' + (rand() * 0.08).toFixed(3) + ')';
          ctx.fillRect(rand() * w, bottom - rand() * h * 0.08, 1 + rand() * 8, 1);
        }
        if (st.eye && wi % 2 === 0) drawSticker(ctx, st.eye, w * (0.06 + rand() * 0.1), h * 0.66, w * 0.05, (rand() - 0.5) * 0.6);
        if (st.criterio && wi % 2 === 1) drawSticker(ctx, st.criterio, w * 0.13, h * 0.7, w * 0.15, (rand() - 0.5) * 0.4, '#111');
        if (st.wordmark && wi === 2) drawWordmark(ctx, st.wordmark, w * 0.15, h * 0.8, w * 0.2, -0.12, 0.85);
        var gl = ctx.createLinearGradient(0, top, 0, bottom);
        gl.addColorStop(0.75, 'rgba(0,0,0,0)');
        gl.addColorStop(1, 'rgba(25,18,10,0.4)');
        ctx.fillStyle = gl;
        ctx.fillRect(0, top, w, bottom - top);
        // Contact shade where the column meets the ceiling beam: the fixtures can't reach in there.
        var ct = ctx.createLinearGradient(0, 0, 0, h * 0.12);
        ct.addColorStop(0, 'rgba(8,7,6,0.6)');
        ct.addColorStop(1, 'rgba(8,7,6,0)');
        ctx.fillStyle = ct;
        ctx.fillRect(0, 0, w, h * 0.12);
        // Tiled columns under the vinyl: grout reading through, floor to ceiling.
        tilesThrough(ctx, w, h, h / S.ceilingY, 0, 0);
      }, '#1a1c1b');
      wrapMats.push(track(new THREE.MeshStandardMaterial({
        map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: T.glow * 0.8, roughness: 0.6,
        bumpMap: tileBump(C * 4, S.ceilingY), bumpScale: 1.4
      })));
    })(wi);
  }
  var colMeshes = wrapMats.map(function (mat) {
    var m = new THREE.InstancedMesh(colGeo, mat, 32);
    m.count = 0;
    group.add(m);
    return m;
  });

  // ---- Approach: the campaign running out along the tunnel wall ------------------------------

  var approach = new THREE.Group();
  var tunnelZ = WORLD.tunnelWallZ + 0.07;
  TAKEOVER.approach.forEach(function (d, i) {
    [-1, 1].forEach(function (side) {
      var x = side * (S.halfLength + d);
      var k = i * 2 + (side > 0 ? 1 : 0);
      if (i % 3 === 2) { lightbox(approach, x, art(k), tunnelZ, 0.7, 0.95); return; }
      var kind = i % 3 === 0 ? 'wrap' : 'campaign';
      var width = i % 3 === 0 ? 6.2 : 4.4;
      var m = new THREE.Mesh(plane(width, 2.9), panelMaterial(kind, k, width));
      m.position.set(x, 1.55, tunnelZ);
      approach.add(m);
    });
  });
  group.add(approach);

  // ---- Layout --------------------------------------------------------------------------------

  var mtx = new THREE.Matrix4();
  var H = TAKEOVER.hero;
  var backdropW = H.width + 1.5;

  /** v: { boardX, columns (x list clear of the doorway and window), doorSight (x at column depth) }. */
  function layout(v) {
    wall.clear();
    var bx = v.boardX;
    var y = W.bottom + panelH / 2;
    var z = S.wallZ + 0.014;
    var edge = S.halfLength - 0.6;

    if (content.wall === 'wallpaper') layWallpaper(bx);
    else layPanels(bx, y, z, edge);
    layDressing(v, bx);
  }

  /** The panel wall: the hero's dark halo, then panels outward both ways with tile seams. */
  function layPanels(bx, y, z, edge) {
    // Behind the hero: its own campaign, pasted dark, so the lit hero leads.
    var back = new THREE.Mesh(plane(backdropW, panelH), panelMaterial('halo', -1, backdropW));
    back.position.set(bx, y, z);
    wall.add(back);
    pool(bx, H.width * 1.4, 0.3);

    // Outward from the hero both ways: panels in sequence, tile seams between.
    var counter = 0;
    [-1, 1].forEach(function (dir) {
      var rand = rng(dir > 0 ? 907 : 311);
      var cursor = bx + dir * (backdropW / 2);
      for (var i = 0; ; i++) {
        var kind = SEQUENCE[(i + (dir > 0 ? 2 : 0)) % SEQUENCE.length];
        var width = TAKEOVER.widths[kind] * (0.92 + rand() * 0.16);
        var seam = TAKEOVER.seam[0] + rand() * (TAKEOVER.seam[1] - TAKEOVER.seam[0]);
        var near = cursor + dir * seam;
        if (Math.abs(near + dir * width) > edge) {
          // Close the run with a wrap of whatever width is left.
          width = edge - Math.abs(near);
          if (width < 1.2) break;
          kind = 'wrap';
        }
        var cx = near + dir * width / 2;
        var k = counter++;
        var m = new THREE.Mesh(plane(width, panelH), panelMaterial(kind, k, width));
        m.position.set(cx, y, z);
        wall.add(m);
        if (kind === 'lights') {
          var L = TAKEOVER.lightbox;
          var off = (L.width + 0.22) / 2;
          lightbox(wall, cx - off, art(k + 1), S.wallZ, L.bottom);
          lightbox(wall, cx + off, art(k + 4), S.wallZ, L.bottom);
        }
        cursor = near + dir * width;
      }
    });
  }

  /** Floor stencils, wrapped columns and their shadows. */
  function layDressing(v, bx) {
    // Stencils: one in view of the open doors, a few more spaced down the platform.
    stencil(0, v.doorSight + 0.3, -1.9, 1.5, 0.08);
    [-30, -17, 12, 27].forEach(function (dx, i) { stencil((i + 1) % 3, bx + dx, -1.6 - (i % 2) * 1.6, 1.4 + (i % 2) * 0.4, (i - 1.5) * 0.2); });

    // Wrapped columns on the grid, plus one standing just inside the doorway's left edge.
    var counts = colMeshes.map(function () { return 0; });
    var cols = v.columns.concat([v.doorSight - 1.2]);
    shadows.count = cols.length;
    cols.forEach(function (x, i) {
      var w = i % WRAPS;
      mtx.makeTranslation(x, S.ceilingY / 2, S.columnZ);
      colMeshes[w].setMatrixAt(counts[w]++, mtx);
      mtx.makeTranslation(x, 0.005, S.columnZ);
      shadows.setMatrixAt(i, mtx);
    });
    shadows.instanceMatrix.needsUpdate = true;
    colMeshes.forEach(function (m, i) { m.count = counts[i]; m.instanceMatrix.needsUpdate = true; });
  }

  return {
    group: group,
    layout: layout,
    wake: wake,
    sharpen: sharpen,
    /** How far past the platform's ends the takeover reaches (for visibility). */
    reach: TAKEOVER.approach[TAKEOVER.approach.length - 1] + 6
  };
}
