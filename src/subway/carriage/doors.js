/**
 * The door pair: two stainless leaves, each with a window, rubber leading edges, sliding into
 * pockets behind the wall lining. set(left, right) takes 0 (closed) .. 1 (open) per leaf.
 */
import * as THREE from 'three';
import { CAR, WORDMARK } from '../config.js';
import { roundedRect, tracker } from '../geo.js';

export function createDoors(mats, registry) {
  var keep = tracker(registry);
  var group = new THREE.Group();
  group.name = 'doors';

  var leafW = CAR.doorWidth / 2;

  // One big Charle$Days tag painted across both leaves below the windows. Each leaf carries its
  // half, so the tag splits down the seam as the doors open.
  var TAG = WORDMARK;
  var tagW = CAR.doorWidth * 0.86;
  var tagH = tagW * (TAG.crop[3] - TAG.crop[1]) / (TAG.crop[2] - TAG.crop[0]);
  function tagHalf(u0) {
    var geo = keep(new THREE.PlaneGeometry(tagW / 2, tagH));
    var uv = geo.attributes.uv;
    for (var i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * 0.5);
    return geo;
  }
  var tagHalves = { '-1': tagHalf(0), '1': tagHalf(0.5) };
  var tagMat = new THREE.MeshStandardMaterial({
    color: 0xf4f1ea, emissive: 0x2a2826, transparent: true, alphaTest: 0.35, roughness: 0.55, opacity: 0
  });
  registry.materials.push(tagMat);
  new THREE.TextureLoader().load(TAG.src, function (tex) {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.repeat.set((TAG.crop[2] - TAG.crop[0]) / TAG.size[0], (TAG.crop[3] - TAG.crop[1]) / TAG.size[1]);
    tex.offset.set(TAG.crop[0] / TAG.size[0], 1 - TAG.crop[3] / TAG.size[1]);
    registry.textures.push(tex);
    tagMat.map = tex;
    tagMat.opacity = 0.92;
    tagMat.needsUpdate = true;
  });

  var h = CAR.doorHeight;
  var win = CAR.doorWindow;
  var depth = 0.035;

  // Leaf: a slab with a rounded window cut out, drawn around its own inner (meeting) edge.
  function leafShape(side) {
    var shape = new THREE.Shape();
    shape.moveTo(-leafW / 2, 0);
    shape.lineTo(leafW / 2, 0);
    shape.lineTo(leafW / 2, h);
    shape.lineTo(-leafW / 2, h);
    shape.lineTo(-leafW / 2, 0);
    // Windows sit slightly toward the meeting edge, as on the real cars.
    var cx = side * -0.03;
    shape.holes.push(roundedRect(new THREE.Path(), cx - win.width / 2, win.bottom, win.width, win.height, win.radius));
    return shape;
  }

  function buildLeaf(side) {
    var leaf = new THREE.Group();
    var body = new THREE.Mesh(
      keep(new THREE.ExtrudeGeometry(leafShape(side), { depth: depth, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 8 })),
      mats.steel
    );
    leaf.add(body);

    var cx = side * -0.03;
    var glass = new THREE.Mesh(keep(new THREE.PlaneGeometry(win.width, win.height)), mats.glass);
    glass.position.set(cx, win.bottom + win.height / 2, depth * 0.5);
    glass.renderOrder = 2;
    leaf.add(glass);
    leaf.userData.glass = glass;

    // Rubber nosing on the meeting edge.
    var edge = new THREE.Mesh(keep(new THREE.BoxGeometry(0.03, h, depth + 0.02)), mats.rubber);
    edge.position.set(-side * (leafW / 2 - 0.012), h / 2, depth / 2);
    leaf.add(edge);

    // Kick plate at the bottom, scuffed darker steel.
    var kick = new THREE.Mesh(keep(new THREE.BoxGeometry(leafW - 0.04, 0.16, 0.006)), mats.steelDark);
    kick.position.set(side * 0.01, 0.1, depth + 0.004);
    leaf.add(kick);

    // This leaf's half of the tag, butted against the meeting edge (painted over the rubber).
    var tag = new THREE.Mesh(tagHalves[side], tagMat);
    tag.position.set(-side * (leafW / 2 - tagW / 4), 0.74, depth + 0.012);
    leaf.add(tag);
    return leaf;
  }

  var left = buildLeaf(-1);
  var right = buildLeaf(1);
  var z = -0.075;
  var closedLeft = CAR.doorCenterX - leafW / 2;
  var closedRight = CAR.doorCenterX + leafW / 2;
  left.position.set(closedLeft, 0, z);
  right.position.set(closedRight, 0, z);
  group.add(left, right);

  // Threshold plate: grooved steel the leaves ride in.
  var sill = new THREE.Mesh(keep(new THREE.BoxGeometry(CAR.doorWidth + 0.06, 0.012, 0.2)), mats.steelDark);
  sill.position.set(CAR.doorCenterX, 0.006, -0.04);
  group.add(sill);

  function set(l, r) {
    left.position.x = closedLeft - l * CAR.doorTravel;
    right.position.x = closedRight + r * CAR.doorTravel;
  }

  return { group: group, leaves: [left, right], set: set };
}
