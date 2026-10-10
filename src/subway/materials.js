/**
 * Shared materials and procedural canvas textures (no downloads). Every random choice is
 * seeded, so the grime lands in the same place on every load.
 */
import * as THREE from 'three';
import { PALETTE } from './config.js';

function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  var c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/** Soft blotches of dirt; heavier toward the bottom edge, like a real lower wall. */
function grime(ctx, w, h, rand, amount, color) {
  for (var i = 0; i < amount; i++) {
    var x = rand() * w;
    var y = Math.pow(rand(), 0.6) * h;
    var r = (0.02 + rand() * 0.12) * w;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color.replace('A', (0.05 + rand() * 0.08).toFixed(3)));
    g.addColorStop(1, color.replace('A', '0'));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function toTexture(c, registry, opts) {
  var tex = new THREE.CanvasTexture(c);
  tex.colorSpace = opts && opts.data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  registry.textures.push(tex);
  return tex;
}

function brushedSteel(registry) {
  var w = 512, h = 512, c = canvas(w, h), ctx = c.getContext('2d'), rand = rng(11);
  ctx.fillStyle = '#b4b4b4';
  ctx.fillRect(0, 0, w, h);
  for (var i = 0; i < 2600; i++) {
    var y = rand() * h, v = 120 + rand() * 90 | 0;
    ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.03 + rand() * 0.07).toFixed(2) + ')';
    ctx.fillRect(0, y, w, 0.6 + rand() * 1.4);
  }
  grime(ctx, w, h, rand, 50, 'rgba(40,34,26,A)');
  // Fingerprints and smears near the middle (where doors get pushed).
  for (var j = 0; j < 22; j++) {
    ctx.fillStyle = 'rgba(70,64,56,' + (0.04 + rand() * 0.05).toFixed(2) + ')';
    ctx.beginPath();
    ctx.ellipse(rand() * w, h * (0.3 + rand() * 0.4), 6 + rand() * 14, 9 + rand() * 18, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(c, registry, { data: true });
}

function panelTexture(registry) {
  var w = 512, h = 512, c = canvas(w, h), ctx = c.getContext('2d'), rand = rng(23);
  var g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#d8d2c6');
  g.addColorStop(1, '#bdb5a6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  grime(ctx, w, h, rand, 90, 'rgba(60,48,32,A)');
  for (var i = 0; i < 1800; i++) {
    ctx.fillStyle = 'rgba(0,0,0,' + (rand() * 0.05).toFixed(3) + ')';
    ctx.fillRect(rand() * w, rand() * h, 1, 1);
  }
  // Scratched tags — the train has been tagged and buffed more than once.
  ctx.strokeStyle = 'rgba(40,40,40,0.08)';
  ctx.lineWidth = 1;
  for (var k = 0; k < 14; k++) {
    ctx.beginPath();
    var x = rand() * w, y = rand() * h;
    ctx.moveTo(x, y);
    for (var s = 0; s < 6; s++) ctx.lineTo(x += (rand() - 0.4) * 30, y += (rand() - 0.5) * 18);
    ctx.stroke();
  }
  return toTexture(c, registry);
}

function floorTexture(registry) {
  var w = 1024, h = 1024, c = canvas(w, h), ctx = c.getContext('2d'), rand = rng(37);
  ctx.fillStyle = '#17181b';
  ctx.fillRect(0, 0, w, h);
  var flecks = ['#6d6f73', '#9a9b9d', '#3d3f44', '#585048', '#b9b4aa', '#2c3a4e'];
  for (var i = 0; i < 26000; i++) {
    ctx.fillStyle = flecks[(rand() * flecks.length) | 0];
    ctx.globalAlpha = 0.25 + rand() * 0.6;
    var s = 0.8 + rand() * 2.2;
    ctx.fillRect(rand() * w, rand() * h, s, s);
  }
  ctx.globalAlpha = 1;
  grime(ctx, w, h, rand, 70, 'rgba(0,0,0,A)');
  // Scuff paths.
  for (var k = 0; k < 40; k++) {
    ctx.strokeStyle = 'rgba(120,120,120,' + (0.03 + rand() * 0.05).toFixed(3) + ')';
    ctx.lineWidth = 6 + rand() * 20;
    ctx.beginPath();
    var x = rand() * w, y = rand() * h;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (rand() - 0.5) * 300, y + (rand() - 0.5) * 80, x + (rand() - 0.5) * 500, y + (rand() - 0.5) * 120);
    ctx.stroke();
  }
  return toTexture(c, registry);
}

/** 3×6" white subway tile with grout and soot. */
function tileTexture(registry) {
  var w = 512, h = 512, c = canvas(w, h), ctx = c.getContext('2d'), rand = rng(41);
  ctx.fillStyle = '#6b665c';
  ctx.fillRect(0, 0, w, h);
  var tw = 64, th = 32;
  for (var row = 0; row < h / th; row++) {
    var off = row % 2 ? tw / 2 : 0;
    for (var col = -1; col < w / tw + 1; col++) {
      var v = 214 + rand() * 22 | 0;
      ctx.fillStyle = 'rgb(' + v + ',' + (v - 4) + ',' + (v - 12) + ')';
      ctx.fillRect(col * tw + off + 2, row * th + 2, tw - 4, th - 4);
    }
  }
  grime(ctx, w, h, rand, 120, 'rgba(50,40,28,A)');
  return toTexture(c, registry);
}

function concreteTexture(registry) {
  var w = 512, h = 512, c = canvas(w, h), ctx = c.getContext('2d'), rand = rng(53);
  ctx.fillStyle = '#2a2826';
  ctx.fillRect(0, 0, w, h);
  for (var i = 0; i < 9000; i++) {
    var v = 30 + rand() * 40 | 0;
    ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 3) + ',0.5)';
    ctx.fillRect(rand() * w, rand() * h, 2, 2);
  }
  // Water streaks running down.
  for (var k = 0; k < 40; k++) {
    var x = rand() * w;
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(10,8,6,0.35)');
    g.addColorStop(1, 'rgba(10,8,6,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 2 + rand() * 8, h * (0.3 + rand() * 0.7));
  }
  return toTexture(c, registry);
}

function radialGlow(registry) {
  var c = canvas(128, 128), ctx = c.getContext('2d');
  var g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return toTexture(c, registry);
}

export function createMaterials(renderer, registry) {
  var pmrem = new THREE.PMREMGenerator(renderer);
  // A dim fluorescent box: enough for steel to read as steel without a real-time probe.
  var envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x2a2a2c);
  var strip = new THREE.Mesh(new THREE.BoxGeometry(20, 0.6, 1.5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  strip.position.set(0, 4, 0);
  envScene.add(strip);
  var side = new THREE.Mesh(new THREE.BoxGeometry(20, 3, 0.2), new THREE.MeshBasicMaterial({ color: 0x9a9284 }));
  side.position.set(0, 0, -5);
  envScene.add(side);
  var floorGlow = new THREE.Mesh(new THREE.BoxGeometry(20, 0.1, 6), new THREE.MeshBasicMaterial({ color: 0x1a1a1c }));
  floorGlow.position.set(0, -3, 0);
  envScene.add(floorGlow);
  var env = pmrem.fromScene(envScene, 0.04).texture;
  registry.textures.push(env);
  strip.geometry.dispose(); strip.material.dispose();
  side.geometry.dispose(); side.material.dispose();
  floorGlow.geometry.dispose(); floorGlow.material.dispose();
  pmrem.dispose();

  var steelTex = brushedSteel(registry);
  var steelRough = steelTex.clone();
  steelRough.colorSpace = THREE.NoColorSpace;
  registry.textures.push(steelRough);

  function track(m) { registry.materials.push(m); return m; }

  var floorTex = floorTexture(registry);
  floorTex.repeat.set(3, 1.2);
  var tileTex = tileTexture(registry);
  var concreteTex = concreteTexture(registry);

  return {
    envMap: env,
    tileTexture: tileTex,
    concreteTexture: concreteTex,
    glowTexture: radialGlow(registry),
    steel: track(new THREE.MeshStandardMaterial({
      color: PALETTE.steel, metalness: 0.9, roughness: 0.42,
      map: steelTex, roughnessMap: steelRough, envMap: env, envMapIntensity: 1.1
    })),
    steelDark: track(new THREE.MeshStandardMaterial({
      color: PALETTE.steelDark, metalness: 0.85, roughness: 0.5, map: steelTex, envMap: env
    })),
    chrome: track(new THREE.MeshStandardMaterial({
      color: 0xd8dadc, metalness: 1, roughness: 0.18, envMap: env, envMapIntensity: 1.3
    })),
    panel: track(new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.55, metalness: 0.05, map: panelTexture(registry), envMap: env, envMapIntensity: 0.4
    })),
    floor: track(new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.32, metalness: 0.1, map: floorTex, envMap: env, envMapIntensity: 0.8
    })),
    rubber: track(new THREE.MeshStandardMaterial({ color: PALETTE.rubber, roughness: 0.85 })),
    /** White base; each seat's orange/amber comes from its instance color. */
    seat: track(new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.2, metalness: 0, envMap: env, envMapIntensity: 1
    })),
    seatFrame: track(new THREE.MeshStandardMaterial({
      color: PALETTE.seatFrame, roughness: 0.4, metalness: 0.2, envMap: env, envMapIntensity: 0.6
    })),
    glass: track(new THREE.MeshStandardMaterial({
      color: 0x0d1012, roughness: 0.06, metalness: 0.1, envMap: env, envMapIntensity: 1.6,
      transparent: true, opacity: 0.3, depthWrite: false
    })),
    fluorescent: track(new THREE.MeshBasicMaterial({ color: PALETTE.fluorescent })),
    blackout: track(new THREE.MeshBasicMaterial({ color: 0x050505 })),
    concrete: track(new THREE.MeshStandardMaterial({ color: 0xffffff, map: concreteTex, roughness: 0.95 })),
    ironwork: track(new THREE.MeshStandardMaterial({ color: 0x23211f, roughness: 0.8, metalness: 0.4 })),
    rail: track(new THREE.MeshStandardMaterial({ color: 0x8a8580, roughness: 0.3, metalness: 0.9, envMap: env }))
  };
}

export { rng };
