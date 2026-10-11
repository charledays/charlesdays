/**
 * Spray can. With a mouse the cursor is a gloved hand on a Montana GOLD can: hold the button to paint anything
 * in the car except the floor (wall, door frame, seats and their base, poles, windows, the door
 * leaves). Over the line map the can steps aside for the normal pointer so a stop can be picked.
 * On touch, the Spray toggle turns drags from scrolling into painting.
 *
 * Fixed surfaces pick up paint through three projections of the car (onto the x-y, x-z and z-y
 * planes), injected into their materials: a surface shows the projection that faces it most
 * squarely. Each projection also stores the depth where its paint landed, so a stroke on a seat
 * front doesn't also appear on the wall behind it. The door leaves move, so each carries its
 * own paint layer instead; a tag across the seam splits when the doors open. Hold still on an
 * upright surface and the paint runs.
 */
import * as THREE from 'three';
import { CAR } from './config.js';
import { tracker, canvasTexture } from './geo.js';
import { LINE } from './stations.js';

export var COLORS = [
  { name: 'Line orange', hex: LINE.color },
  { name: 'Yellow', hex: '#f2c318' },
  { name: 'Pink', hex: '#ff2e88' },
  { name: 'Blue', hex: '#2f6bff' },
  { name: 'Lime', hex: '#b6f01a' },
  { name: 'White', hex: '#f4f1ea' },
  { name: 'Black', hex: '#111111' }
];

/** Cutout of a gloved hand on a Montana GOLD can; the CSS lines its nozzle up with the aim dot. */
var CAN = { src: '/images/subway/montana-gold.png' };

/** Texture pixels per meter of surface. */
var PPM = 256;
/** Radius of the nozzle's dense core, m. */
var NOZZLE = 0.03;
/** Stamp spacing along a stroke, m. */
var STEP = NOZZLE * 0.35;
/** The part of the car that takes paint: what any framing can see, out past the poles. */
var BOX_MIN = new THREE.Vector3(-4.2, 0, -0.15);
var BOX_MAX = new THREE.Vector3(4.4, 2.3, 1.0);
var BOX_SIZE = BOX_MAX.clone().sub(BOX_MIN);
/** How far (m) a surface may sit from where the paint landed and still show it. */
var DEPTH_TOLERANCE = 0.04;
/** Pixels between raycasts when a stroke jumps from one surface to another. */
var SUBSTEP_PX = 4;

var dL = CAR.doorCenterX - CAR.doorWidth / 2;
var dR = CAR.doorCenterX + CAR.doorWidth / 2;
var leafW = CAR.doorWidth / 2;

/** Each projection: the plane's two axes (a across, b up the canvas) and the depth axis. */
var PROJECTIONS = {
  z: { a: 'x', b: 'y', d: 'z' },
  y: { a: 'x', b: 'z', d: 'y' },
  x: { a: 'z', b: 'y', d: 'x' }
};

function rgb(hex) {
  var n = parseInt(hex.slice(1), 16);
  return { r: n >> 16 & 255, g: n >> 8 & 255, b: n & 255 };
}
function rgba(c, a) {
  return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a.toFixed(3) + ')';
}
/** Roughly normal in -1.5..1.5. */
function gauss() {
  return Math.random() + Math.random() + Math.random() - 1.5;
}

var VERTEX_HEAD = 'varying vec3 vPaintPos;\nvarying vec3 vPaintNormal;\n';
var VERTEX_BODY = [
  'vec4 paintP = vec4(transformed, 1.0);',
  'vec3 paintN = objectNormal;',
  '#ifdef USE_INSTANCING',
  '  paintP = instanceMatrix * paintP;',
  '  paintN = mat3(instanceMatrix) * paintN;',
  '#endif',
  'vPaintPos = (modelMatrix * paintP).xyz;',
  'vPaintNormal = mat3(modelMatrix) * paintN;'
].join('\n');
var FRAGMENT_HEAD = [
  'varying vec3 vPaintPos;',
  'varying vec3 vPaintNormal;',
  'uniform sampler2D uPaintZ, uPaintY, uPaintX, uDepthZ, uDepthY, uDepthX;',
  'uniform vec3 uPaintMin, uPaintSize, uPaintTol, uDoorway;',
  'float paintMask = 0.0;'
].join('\n');
var FRAGMENT_BODY = [
  '{',
  '  vec3 pr = (vPaintPos - uPaintMin) / uPaintSize;',
  '  vec3 an = abs(vPaintNormal);',
  '  vec4 pc; float pd; float pv; float tol;',
  '  if (an.z >= an.x && an.z >= an.y) { pc = texture2D(uPaintZ, pr.xy); pd = texture2D(uDepthZ, pr.xy).r; pv = pr.z; tol = uPaintTol.z; }',
  '  else if (an.y >= an.x) { pc = texture2D(uPaintY, pr.xz); pd = texture2D(uDepthY, pr.xz).r; pv = pr.y; tol = uPaintTol.y; }',
  '  else { pc = texture2D(uPaintX, pr.zy); pd = texture2D(uDepthX, pr.zy).r; pv = pr.x; tol = uPaintTol.x; }',
  '  vec3 inBox = step(vec3(0.0), pr) * step(pr, vec3(1.0));',
  // The leaves in the doorway carry their own paint (they move).
  '  float doorway = step(uDoorway.x, vPaintPos.x) * step(vPaintPos.x, uDoorway.y) * step(vPaintPos.z, uDoorway.z);',
  '  paintMask = pc.a * inBox.x * inBox.y * inBox.z * (1.0 - doorway) * (1.0 - smoothstep(tol, tol * 2.0, abs(pv - pd)));',
  '  diffuseColor.rgb = mix(diffuseColor.rgb, pc.rgb, paintMask);',
  '  diffuseColor.a = max(diffuseColor.a, paintMask);',
  '}'
].join('\n');

export function createSpray(options) {
  var camera = options.camera;
  var canvas = options.canvas;
  var root = options.root;
  var registry = options.registry;
  var leaves = options.leaves;
  var surfaces = options.surfaces;
  var unpaintable = options.unpaintable;
  var noPaint = options.noPaint;
  var selecting = options.selecting;
  var onHiss = options.onHiss || function () {};
  var fine = options.finePointer;

  var keep = tracker(registry);
  var group = new THREE.Group();
  group.name = 'spray';

  function blankCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  // --- Paint targets -------------------------------------------------------------------
  // A target takes stamps at (a, b) in meters on its own plane; depth is used by projections.

  var projections = {};
  Object.keys(PROJECTIONS).forEach(function (key) {
    var p = PROJECTIONS[key];
    var c = blankCanvas(BOX_SIZE[p.a] * PPM, BOX_SIZE[p.b] * PPM);
    var dc = blankCanvas(c.width, c.height);
    var tex = canvasTexture(c, registry);
    var depthTex = new THREE.CanvasTexture(dc);
    depthTex.colorSpace = THREE.NoColorSpace;
    depthTex.minFilter = depthTex.magFilter = THREE.NearestFilter;
    depthTex.generateMipmaps = false;
    registry.textures.push(depthTex);
    projections[key] = {
      key: key,
      axes: p,
      canvas: c,
      ctx: c.getContext('2d'),
      depthCtx: dc.getContext('2d'),
      tex: tex,
      depthTex: depthTex,
      dirty: false,
      upright: key !== 'y',
      toPx: function (a, b) { return [(a - BOX_MIN[p.a]) * PPM, (BOX_MAX[p.b] - b) * PPM]; },
      depthStyle: function (d) {
        var v = Math.round(THREE.MathUtils.clamp((d - BOX_MIN[p.d]) / BOX_SIZE[p.d], 0, 1) * 255);
        return 'rgb(' + v + ',' + v + ',' + v + ')';
      }
    };
  });

  var uniforms = {
    uPaintZ: { value: projections.z.tex }, uDepthZ: { value: projections.z.depthTex },
    uPaintY: { value: projections.y.tex }, uDepthY: { value: projections.y.depthTex },
    uPaintX: { value: projections.x.tex }, uDepthX: { value: projections.x.depthTex },
    uPaintMin: { value: BOX_MIN },
    uPaintSize: { value: BOX_SIZE },
    uPaintTol: { value: new THREE.Vector3(DEPTH_TOLERANCE / BOX_SIZE.x, DEPTH_TOLERANCE / BOX_SIZE.y, DEPTH_TOLERANCE / BOX_SIZE.z) },
    uDoorway: { value: new THREE.Vector3(dL + 0.002, dR - 0.002, -0.005) }
  };

  /** Teach a material to show the projected paint. */
  function inject(mat) {
    if (mat.userData.spray) return;
    mat.userData.spray = true;
    var previous = mat.onBeforeCompile;
    mat.onBeforeCompile = function (shader, renderer) {
      if (previous) previous.call(this, shader, renderer);
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = VERTEX_HEAD + shader.vertexShader.replace('#include <fog_vertex>', '#include <fog_vertex>\n' + VERTEX_BODY);
      shader.fragmentShader = FRAGMENT_HEAD + '\n' + shader.fragmentShader
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + FRAGMENT_BODY)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.75, paintMask);')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor *= 1.0 - paintMask;');
    };
    mat.customProgramCacheKey = function () { return 'spray'; };
    mat.needsUpdate = true;
  }
  surfaces.forEach(function (g) {
    g.traverse(function (o) {
      if (!o.isMesh || !o.material || !o.material.isMeshStandardMaterial) return;
      if (unpaintable.indexOf(o.material) >= 0) return;
      inject(o.material);
    });
  });

  // The leaves: a layer just proud of the face (over the tag), riding with each leaf.
  var doorLayers = leaves.map(function (leaf) {
    var c = blankCanvas(leafW * PPM, CAR.doorHeight * PPM);
    var tex = canvasTexture(c, registry);
    var mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.75 });
    registry.materials.push(mat);
    var mesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(leafW, CAR.doorHeight)), mat);
    // After the window glass, so paint on a window sits on it rather than behind the tint.
    mesh.renderOrder = 3;
    mesh.position.set(0, CAR.doorHeight / 2, options.leafFront + 0.004);
    leaf.add(mesh);
    return {
      leaf: leaf,
      canvas: c,
      ctx: c.getContext('2d'),
      tex: tex,
      dirty: false,
      upright: true,
      toPx: function (a, b) { return [(a + leafW / 2) * PPM, (CAR.doorHeight - b) * PPM]; }
    };
  });
  var targets = [projections.z, projections.y, projections.x].concat(doorLayers);

  // --- Paint ---------------------------------------------------------------------------

  var color = rgb(COLORS[0].hex);

  function puff(t, a, b, depth, amount) {
    var r = NOZZLE * PPM;
    var p = t.toPx(a, b);
    var ctx = t.ctx;
    var g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 1.6);
    g.addColorStop(0, rgba(color, 0.2 * amount));
    g.addColorStop(0.45, rgba(color, 0.1 * amount));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(p[0] - r * 1.6, p[1] - r * 1.6, r * 3.2, r * 3.2);
    // Atomized droplets: dense in the core, thinning out into overspray.
    ctx.fillStyle = rgba(color, 0.8);
    for (var k = 0; k < 16 * amount; k++) {
      var s = 0.6 + Math.random() * 1.2;
      ctx.fillRect(p[0] + gauss() * r * 0.9, p[1] + gauss() * r * 0.9, s, s);
    }
    if (t.depthCtx) {
      t.depthCtx.fillStyle = t.depthStyle(depth);
      t.depthCtx.beginPath();
      t.depthCtx.arc(p[0], p[1], r * 1.7, 0, Math.PI * 2);
      t.depthCtx.fill();
    }
    t.dirty = true;
  }

  var drips = [];
  function addDrip(hit) {
    if (!hit.target.upright) return;
    drips.push({
      target: hit.target,
      a: hit.a + gauss() * NOZZLE * 0.4,
      b: hit.b - NOZZLE * 0.3,
      depth: hit.depth,
      v: 0.05 + Math.random() * 0.05,
      left: 0.03 + Math.random() * 0.14,
      w: 0.003 + Math.random() * 0.003,
      color: color
    });
  }
  function runDrips(dt) {
    for (var i = drips.length - 1; i >= 0; i--) {
      var d = drips[i];
      var t = d.target;
      var step = Math.min(d.left, d.v * dt);
      var p = t.toPx(d.a, d.b);
      d.b -= step;
      d.left -= step;
      d.v *= 1 - 0.5 * dt;
      var ctx = t.ctx;
      ctx.strokeStyle = rgba(d.color, 0.9);
      ctx.lineWidth = d.w * PPM;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(p[0], p[1] + step * PPM);
      ctx.stroke();
      // A bead where it stops.
      if (d.left <= 0) {
        ctx.fillStyle = rgba(d.color, 0.9);
        ctx.beginPath();
        ctx.arc(p[0], p[1] + step * PPM, d.w * PPM * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      if (t.depthCtx) {
        t.depthCtx.fillStyle = t.depthStyle(d.depth);
        t.depthCtx.fillRect(p[0] - d.w * PPM * 1.5, p[1] - 1, d.w * PPM * 3, step * PPM + d.w * PPM * 2);
      }
      t.dirty = true;
      if (d.left <= 0 || d.b < 0.02) drips.splice(i, 1);
    }
  }

  function flush() {
    targets.forEach(function (t) {
      if (!t.dirty) return;
      t.tex.needsUpdate = true;
      if (t.depthTex) t.depthTex.needsUpdate = true;
      t.dirty = false;
    });
  }

  function buff() {
    drips.length = 0;
    targets.forEach(function (t) {
      t.ctx.clearRect(0, 0, t.canvas.width, t.canvas.height);
      if (t.depthCtx) t.depthCtx.clearRect(0, 0, t.canvas.width, t.canvas.height);
      t.dirty = true;
    });
  }

  // --- Aim -----------------------------------------------------------------------------

  var ray = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  var normal = new THREE.Vector3();
  var local = new THREE.Vector3();
  var instance = new THREE.Matrix4();
  var pickables = surfaces.concat(noPaint);

  function leafOf(o) {
    for (; o; o = o.parent) {
      for (var i = 0; i < doorLayers.length; i++) if (doorLayers[i].leaf === o) return doorLayers[i];
    }
    return null;
  }
  function within(o, groups) {
    for (; o; o = o.parent) if (groups.indexOf(o) >= 0) return true;
    return false;
  }

  /** What the nozzle points at, as { target, a, b, depth }, or null if it won't take paint. */
  function aim(at) {
    ray.setFromCamera(at, camera);
    var hit = ray.intersectObjects(pickables, true)[0];
    if (!hit || within(hit.object, noPaint)) return null;
    var o = hit.object;
    var door = leafOf(o);
    if (door) {
      local.copy(hit.point);
      door.leaf.worldToLocal(local);
      return { target: door, a: local.x, b: local.y, depth: 0 };
    }
    if (!o.material || !o.material.userData.spray || !hit.face) return null;
    var pt = hit.point;
    if (pt.x < BOX_MIN.x || pt.y < BOX_MIN.y || pt.z < BOX_MIN.z || pt.x > BOX_MAX.x || pt.y > BOX_MAX.y || pt.z > BOX_MAX.z) return null;
    normal.copy(hit.face.normal);
    if (o.isInstancedMesh && hit.instanceId != null) {
      o.getMatrixAt(hit.instanceId, instance);
      normal.transformDirection(instance);
    }
    normal.transformDirection(o.matrixWorld);
    var ax = Math.abs(normal.x), ay = Math.abs(normal.y), az = Math.abs(normal.z);
    var key = az >= ax && az >= ay ? 'z' : ay >= ax ? 'y' : 'x';
    var axes = PROJECTIONS[key];
    return { target: projections[key], a: pt[axes.a], b: pt[axes.b], depth: pt[axes.d] };
  }

  /** Two hits on the same surface can be joined with a straight run of stamps. */
  function sameSurface(h0, h1) {
    return h0.target === h1.target && Math.abs(h0.depth - h1.depth) < DEPTH_TOLERANCE;
  }

  // --- Input + cursor ------------------------------------------------------------------

  var cursor = document.createElement('div');
  cursor.className = 'spray-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span class="spray-dot"></span><span class="spray-mist"></span><img class="spray-can" alt="" src="' + CAN.src + '">';
  root.appendChild(cursor);

  var tools = root.querySelector('[data-spray-tools]');
  var toggle = tools.querySelector('[data-spray-toggle]');
  var swatches = tools.querySelector('[data-swatches]');
  tools.hidden = false;
  tools.classList.toggle('has-mouse', fine);

  var armedTouch = false;
  var hovering = false;
  var painting = false;
  var hissing = false;
  var last = null;
  var lastNdc = new THREE.Vector2();
  var wet = 0;

  function armed() { return fine || armedTouch; }

  function refresh() {
    var away = selecting().onMap && !painting;
    cursor.classList.toggle('is-on', fine && hovering);
    cursor.classList.toggle('is-away', away);
    cursor.classList.toggle('is-spraying', hissing);
    if (fine) canvas.style.cursor = away ? (selecting().stop >= 0 ? 'pointer' : '') : 'none';
  }

  function setNdc(e) {
    var rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  }

  function onMove(e) {
    setNdc(e);
    hovering = true;
    cursor.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
    refresh();
  }
  function onDown(e) {
    if (!armed() || e.button !== 0) return;
    onMove(e);
    if (selecting().onMap) return;
    painting = true;
    last = null;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* already released */ }
    refresh();
  }
  function onUp() {
    painting = false;
    last = null;
    refresh();
  }
  function onLeave() {
    hovering = false;
    refresh();
  }
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onLeave);

  function pick(i) {
    color = rgb(COLORS[i].hex);
    cursor.style.color = COLORS[i].hex;
    Array.prototype.forEach.call(swatches.children, function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
  }
  COLORS.forEach(function (c, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.style.setProperty('--swatch', c.hex);
    b.setAttribute('aria-label', c.name);
    b.addEventListener('click', function () { pick(i); });
    swatches.appendChild(b);
  });
  pick(0);

  toggle.addEventListener('click', function () {
    armedTouch = !armedTouch;
    toggle.setAttribute('aria-pressed', armedTouch ? 'true' : 'false');
    tools.classList.toggle('is-armed', armedTouch);
    // While armed, a drag on the scene paints instead of scrolling the ride.
    canvas.style.touchAction = armedTouch ? 'none' : '';
  });
  tools.querySelector('[data-buff]').addEventListener('click', buff);

  // --- Frame ---------------------------------------------------------------------------

  var between = new THREE.Vector2();

  function update(dt) {
    var hit = null;
    if (painting && !selecting().onMap) {
      camera.updateMatrixWorld();
      hit = aim(ndc);
    }
    if (!!hit !== hissing) {
      hissing = !!hit;
      onHiss(hissing);
      refresh();
    }
    if (hit) {
      if (last && sameSurface(last, hit)) {
        var dist = Math.hypot(hit.a - last.a, hit.b - last.b);
        var n = Math.max(1, Math.ceil(dist / STEP));
        // Held in place, paint builds with time rather than with frames.
        var amount = 0.55, reps = 1;
        if (n === 1) { reps = Math.max(1, Math.round(dt * 60)); amount *= Math.min(1, dt * 60); }
        for (var i = 1; i <= n; i++) {
          var f = i / n;
          for (var r = 0; r < reps; r++) puff(hit.target, last.a + (hit.a - last.a) * f, last.b + (hit.b - last.b) * f, last.depth + (hit.depth - last.depth) * f, amount);
        }
        wet = dist < 0.004 ? wet + dt : Math.max(0, wet - dt * 2);
        if (wet > 0.55) { wet = 0.25; addDrip(hit); }
      } else {
        // New surface (or a fresh press): walk the gap on screen so edges and seams fill in.
        if (last) {
          var w = canvas.clientWidth / 2, h = canvas.clientHeight / 2;
          var steps = Math.min(24, Math.ceil(Math.hypot((ndc.x - lastNdc.x) * w, (ndc.y - lastNdc.y) * h) / SUBSTEP_PX));
          for (var s = 1; s < steps; s++) {
            var mid = aim(between.lerpVectors(lastNdc, ndc, s / steps));
            if (mid) puff(mid.target, mid.a, mid.b, mid.depth, 0.55);
          }
        }
        puff(hit.target, hit.a, hit.b, hit.depth, 0.55);
        wet = 0;
      }
      last = hit;
      lastNdc.copy(ndc);
    } else {
      last = null;
      wet = 0;
    }
    if (drips.length) runDrips(dt);
    flush();
  }

  function dispose() {
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
    canvas.removeEventListener('pointerleave', onLeave);
    cursor.remove();
    onHiss(false);
  }

  return {
    group: group,
    update: update,
    buff: buff,
    /** On touch, the Spray toggle is on: drags paint instead of riding. */
    touchArmed: function () { return armedTouch; },
    dispose: dispose
  };
}
