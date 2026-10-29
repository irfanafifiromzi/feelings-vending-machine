import * as THREE from 'three';
import { makeCanLabel, makeMetalMatcap, makeShineMatcap } from './textures.js';
import { outline, toon } from './toon.js';

const R = 0.05;
const BODY = 0.13; // height of the printed wrapper
const YT = BODY / 2;
const YB = -BODY / 2;

// Distances from the can's centre to its bottom and top, used to stand it on a shelf.
export const CAN = { radius: R, bottom: -YB + 0.0158, top: YT + 0.0262 };

const v2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x * R, y));

// Profiles are listed bottom-to-top so the lathe normals point outwards.
// Lid: shoulder, neck, rolled rim (chime), countersink groove, flat centre panel.
const TOP = v2([
  [1, YT], [0.985, YT + 0.005], [0.87, YT + 0.0145], [0.82, YT + 0.0195], [0.835, YT + 0.0235],
  [0.815, YT + 0.0262], [0.79, YT + 0.0255], [0.775, YT + 0.019], [0.755, YT + 0.0172],
  [0.73, YT + 0.0195], [0.7, YT + 0.0205], [0.001, YT + 0.0205],
]);
// Base: domed centre and the ring the can stands on.
const BOTTOM = v2([
  [0.001, YB - 0.006], [0.55, YB - 0.0115], [0.64, YB - 0.0155], [0.7, YB - 0.0158],
  [0.76, YB - 0.0135], [0.9, YB - 0.008], [0.985, YB - 0.002], [1, YB],
]);
// One closed silhouette for the ink outline.
const HULL = v2([
  [0.001, YB - 0.006], [0.64, YB - 0.0158], [0.76, YB - 0.0135], [0.9, YB - 0.008], [1, YB - 0.001],
  [1, YT + 0.001], [0.87, YT + 0.0145], [0.82, YT + 0.0195], [0.835, YT + 0.0235], [0.815, YT + 0.0262],
  [0.6, YT + 0.0262], [0.001, YT + 0.0262],
]);

function roundedRect(path, x0, y0, x1, y1, r) {
  path.moveTo(x0 + r, y0);
  path.lineTo(x1 - r, y0);
  path.quadraticCurveTo(x1, y0, x1, y0 + r);
  path.lineTo(x1, y1 - r);
  path.quadraticCurveTo(x1, y1, x1 - r, y1);
  path.lineTo(x0 + r, y1);
  path.quadraticCurveTo(x0, y1, x0, y1 - r);
  path.lineTo(x0, y0 + r);
  path.quadraticCurveTo(x0, y0, x0 + r, y0);
  return path;
}

// Stay-on pull tab: a flat ring with a finger hole, riveted at the centre of the lid.
function tabGeometry() {
  const s = new THREE.Shape();
  roundedRect(s, -0.0088, -0.0085, 0.0088, 0.0265, 0.0082);
  s.holes.push(roundedRect(new THREE.Path(), -0.0056, 0.0085, 0.0056, 0.0215, 0.0052));
  const rivetHole = new THREE.Path();
  rivetHole.absarc(0, 0, 0.0024, 0, Math.PI * 2, true);
  s.holes.push(rivetHole);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.0011, bevelEnabled: false, curveSegments: 10 });
  g.rotateX(-Math.PI / 2); // shape y -> towards the back of the can, extrusion -> up
  return g;
}

// The scored opening in front of the rivet.
function tearPanelGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.007, -0.004);
  s.quadraticCurveTo(0, -0.0055, 0.007, -0.004);
  s.quadraticCurveTo(0.0125, -0.016, 0.0095, -0.026);
  s.quadraticCurveTo(0, -0.031, -0.0095, -0.026);
  s.quadraticCurveTo(-0.0125, -0.016, -0.007, -0.004);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.0004, bevelEnabled: false, curveSegments: 8 });
  g.rotateX(-Math.PI / 2); // shape -y ends up in front (+z) of the rivet
  return g;
}

// Height of the lid's centre panel, where the tab, rivet and opening sit.
export const LID_Y = YT + 0.0205;

// Shared by the site and by tools/export.js (which writes the cans out for Blender).
export function createCanGeometry() {
  return {
    body: new THREE.CylinderGeometry(R, R, BODY, 64, 1, true, Math.PI, Math.PI * 2),
    shine: new THREE.CylinderGeometry(R * 1.004, R * 1.004, BODY, 64, 1, true),
    top: new THREE.LatheGeometry(TOP, 64),
    bottom: new THREE.LatheGeometry(BOTTOM, 64),
    hull: new THREE.LatheGeometry(HULL, 48),
    tab: tabGeometry(),
    tear: tearPanelGeometry(),
    rivet: new THREE.CylinderGeometry(0.0026, 0.0028, 0.0016, 16),
  };
}

export function createCanKit() {
  const geo = createCanGeometry();
  const lidY = LID_Y;

  const metal = new THREE.MeshMatcapMaterial({ matcap: makeMetalMatcap(), side: THREE.DoubleSide });
  const metalDark = new THREE.MeshMatcapMaterial({ matcap: metal.matcap, color: '#e2e6ec' });
  const shine = new THREE.MeshMatcapMaterial({
    matcap: makeShineMatcap(), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const labels = new Map();

  function labelFor(f) {
    if (!labels.has(f.code)) labels.set(f.code, toon({ map: makeCanLabel(f) }));
    return labels.get(f.code);
  }

  function assemble(bodyMat, lidMat, darkMat, { detail = true, ink = 1.5 } = {}) {
    const can = new THREE.Group();
    const body = new THREE.Mesh(geo.body, bodyMat);
    const top = new THREE.Mesh(geo.top, lidMat);
    const bottom = new THREE.Mesh(geo.bottom, lidMat);
    body.castShadow = true;
    can.add(body, top, bottom);
    outline(body, ink, { geometry: geo.hull });

    if (detail) {
      can.add(new THREE.Mesh(geo.shine, shine));
      const tear = new THREE.Mesh(geo.tear, darkMat);
      tear.position.y = lidY;
      const tab = new THREE.Mesh(geo.tab, lidMat);
      tab.position.y = lidY + 0.0007;
      const rivet = new THREE.Mesh(geo.rivet, lidMat);
      rivet.position.y = lidY + 0.0012;
      can.add(tear, tab, rivet);
      outline(tab, ink * 0.6);
      outline(tear, ink * 0.5);
    }
    return can;
  }

  // A real, printed can for a feeling.
  function createCan(f) {
    const can = assemble(labelFor(f), metal, metalDark);
    can.userData.feeling = f;
    return can;
  }

  // A one-colour can for the tone-on-tone background (materials are shared so they can be recoloured).
  function createSilhouette(bodyMat, lidMat) {
    return assemble(bodyMat, lidMat, lidMat, { detail: false, ink: 1.6 });
  }

  // the wrapper canvas, also used for the menu's can thumbnails
  const labelImage = (f) => labelFor(f).map.image;

  return { createCan, createSilhouette, labelImage };
}
