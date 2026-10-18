/** Small geometry helpers shared by the carriage and exterior builders. */
import * as THREE from 'three';

/** Rounded rectangle (x, y = bottom-left) traced into a Shape or Path. */
export function roundedRect(path, x, y, w, h, r) {
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r);
  path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h);
  path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  return path;
}

/** Rectangular frame (ring) of a given border, extruded toward +z. */
export function frameGeometry(w, h, border, depth, radius) {
  var shape = roundedRect(new THREE.Shape(), -w / 2 - border, -h / 2 - border, w + border * 2, h + border * 2, (radius || 0) + border * 0.6);
  shape.holes.push(roundedRect(new THREE.Path(), -w / 2, -h / 2, w, h, radius || 0.001));
  return new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: true, bevelThickness: depth * 0.25, bevelSize: Math.min(border, depth) * 0.25, bevelSegments: 2, curveSegments: 6 });
}

/** Keeps every geometry made through it so dispose() can free them in one pass. */
export function tracker(registry) {
  return function (geometry) { registry.geometries.push(geometry); return geometry; };
}

/** Text drawn to a canvas texture (signage, displays, ads). */
export function textCanvas(w, h, draw) {
  var c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
}

export function canvasTexture(c, registry) {
  var tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  registry.textures.push(tex);
  return tex;
}
