/**
 * MTA-style vertical line map on the steel panel between the doors and the seats. Each stop is
 * a link: hovering a stop highlights it, clicking (or tapping) it goes to that page. The page
 * also carries the same links as a hidden list for keyboards and screen readers.
 */
import * as THREE from 'three';
import { CAR, WORDMARK } from '../config.js';
import { LINE } from '../stations.js';
import { tracker, canvasTexture, frameGeometry } from '../geo.js';
import { rng } from '../materials.js';
import { web } from '../web.js';

var FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
var W = 0.5, H = 1.18;
var PX_W = 600, PX_H = Math.round(PX_W * H / W);
var HEADER = 0.13, TOP = 0.22, BOTTOM = 0.86;

export function createLineMap(mats, registry, stops) {
  var keep = tracker(registry);
  var group = new THREE.Group();
  group.name = 'line-map';

  var c = document.createElement('canvas');
  c.width = PX_W;
  c.height = PX_H;
  var tex = canvasTexture(c, registry);
  var hovered = -1;
  /** What the pointer is over, for the spray can (which steps aside over the map). */
  var pointer = { onMap: false, stop: -1 };
  var logo = new Image();
  logo.onload = function () { draw(hovered); };
  logo.src = web(WORDMARK.src);

  function rowY(i) {
    var n = stops.length;
    return PX_H * (TOP + (BOTTOM - TOP) * (n > 1 ? i / (n - 1) : 0.5));
  }

  function draw(hover) {
    var ctx = c.getContext('2d');
    var w = PX_W, h = PX_H;
    ctx.fillStyle = '#f3f1ea';
    ctx.fillRect(0, 0, w, h);

    // Header: black band carrying the Charle$Days tag.
    ctx.fillStyle = '#0c0c0c';
    ctx.fillRect(0, 0, w, h * HEADER);
    if (logo.complete && logo.naturalWidth) {
      // The crop is in the original's pixels; the web copy is smaller.
      var k = logo.naturalWidth / WORDMARK.size[0];
      var cw = WORDMARK.crop[2] - WORDMARK.crop[0], ch = WORDMARK.crop[3] - WORDMARK.crop[1];
      var lh = h * HEADER * 0.78;
      var lw = Math.min(w * 0.86, lh * cw / ch);
      lh = lw * ch / cw;
      ctx.drawImage(logo, WORDMARK.crop[0] * k, WORDMARK.crop[1] * k, cw * k, ch * k, (w - lw) / 2, (h * HEADER - lh) / 2, lw, lh);
    }

    // The line.
    var lx = w * 0.13;
    ctx.strokeStyle = LINE.color;
    ctx.lineWidth = w * 0.045;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lx, rowY(0));
    ctx.lineTo(lx, rowY(stops.length - 1));
    ctx.stroke();

    stops.forEach(function (stop, i) {
      var y = rowY(i);
      var on = i === hover;
      if (on) {
        ctx.fillStyle = 'rgba(242,106,27,0.14)';
        ctx.fillRect(0, y - h * 0.045, w, h * 0.09);
      }
      // Stop marker: white dot, black ring (every stop is a transfer to a page).
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#0c0c0c';
      ctx.lineWidth = w * 0.014;
      ctx.beginPath();
      ctx.arc(lx, y, w * 0.032, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = on ? LINE.color : '#0c0c0c';
      ctx.font = '700 ' + h * 0.034 + 'px ' + FONT;
      ctx.fillText(stop.name + (on ? '  →' : ''), w * 0.22, y + h * 0.004, w * 0.74);
      ctx.fillStyle = '#6d6a64';
      ctx.font = '500 ' + h * 0.022 + 'px ' + FONT;
      ctx.fillText(stop.note, w * 0.22, y + h * 0.032, w * 0.74);
    });

    // Footer notice.
    ctx.fillStyle = '#0c0c0c';
    ctx.fillRect(w * 0.06, h * 0.915, w * 0.88, 2);
    ctx.font = '600 ' + h * 0.017 + 'px ' + FONT;
    ctx.fillText('Tap a stop to ride there', w * 0.06, h * 0.945);
    ctx.fillStyle = '#6d6a64';
    ctx.font = '500 ' + h * 0.014 + 'px ' + FONT;
    ctx.fillText('Charle$Days Transit · charlesdays.art', w * 0.06, h * 0.968);

    // Wear: faded edges and grime, it has been behind this acrylic for years.
    var rand = rng(211);
    for (var k = 0; k < 1500; k++) {
      ctx.fillStyle = 'rgba(40,30,20,' + (rand() * 0.07).toFixed(3) + ')';
      ctx.fillRect(rand() * w, rand() * h, 2, 2);
    }
    var g = ctx.createLinearGradient(0, h * 0.7, 0, h);
    g.addColorStop(0, 'rgba(60,45,25,0)');
    g.addColorStop(1, 'rgba(60,45,25,0.12)');
    ctx.fillStyle = g;
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
    tex.needsUpdate = true;
  }
  draw(-1);

  var mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3, envMap: mats.envMap, envMapIntensity: 0.45 });
  registry.materials.push(mat);
  var map = new THREE.Mesh(keep(new THREE.PlaneGeometry(W, H)), mat);
  var panelX0 = CAR.doorCenterX + CAR.doorWidth / 2;
  var panelX1 = panelX0 + CAR.doorTravel + 0.05;
  var x = (panelX0 + panelX1) / 2;
  var y = 0.62 + H / 2;
  map.position.set(x, y, 0.02);
  var frame = new THREE.Mesh(keep(frameGeometry(W, H, 0.02, 0.016, 0.004)), mats.steel);
  frame.position.set(x, y, 0.006);
  group.add(map, frame);

  /** Stop index under a ray hit's uv, or -1 in the header/footer. */
  function stopAt(uv) {
    var py = (1 - uv.y) * PX_H;
    var half = (rowY(1) - rowY(0)) / 2;
    for (var i = 0; i < stops.length; i++) if (Math.abs(py - rowY(i)) < half) return i;
    return -1;
  }

  /** Hover + click on the map through the WebGL canvas. Returns a dispose function. */
  function attach(camera, canvas, navigate) {
    var ray = new THREE.Raycaster();
    var ndc = new THREE.Vector2();
    var hover = -1;

    function pick(e) {
      var rect = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      var hit = ray.intersectObject(map, false)[0];
      pointer.onMap = !!hit;
      pointer.stop = hit ? stopAt(hit.uv) : -1;
      return pointer.stop;
    }
    function onMove(e) {
      var i = pick(e);
      if (i === hover) return;
      hover = i;
      hovered = i;
      draw(hover);
      canvas.style.cursor = i >= 0 ? 'pointer' : '';
    }
    // Only a press that starts on the stop counts, so a spray stroke ending on the map doesn't navigate.
    var pressed = -1;
    function onDown(e) {
      onMove(e);
      pressed = hover;
    }
    function onClick(e) {
      var i = pick(e);
      if (i >= 0 && i === pressed) navigate(stops[i].href);
    }
    function onLeave() {
      pointer.onMap = false;
      pointer.stop = -1;
    }
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('click', onClick);
    return function () {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('click', onClick);
    };
  }

  return { group: group, attach: attach, pointer: function () { return pointer; } };
}
