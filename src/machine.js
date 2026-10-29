import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CAN } from './can.js';
import {
  makeBurstSticker, makeDisplay, makeGlare, makePlate, makeShelfStrip, makeSideDecal, makeSignTexture,
  makeMetalMatcap, makeWindowBack,
} from './textures.js';
import { INK, outline, toon } from './toon.js';

// A Japanese-style drinks machine: sample cans in a lit window, a price tag and a button
// under each can, a money panel, and the take-out tray at the bottom. Sizes in metres; faces +z.
export const LAYOUT = {
  width: 1.2,
  height: 1.94,
  front: 0.39,
  back: 0.24, // the lit back wall of the window (and of the tray) sits here
  window: { x0: -0.52, x1: 0.52, y0: 0.745, y1: 1.62 },
  tray: { x0: -0.36, x1: 0.36, y0: 0.14, y1: 0.42 },
  cols: [-0.375, -0.125, 0.125, 0.375],
  rows: [1.375, 1.105, 0.835], // shelf tops, row A (top) to row C
  canZ: 0.315,
  glassZ: 0.391,
};

const CREAM = '#fff3dd';
const NAVY = '#262a52';

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

function rbox(w, h, d, mat, r = 0.012, ink = 1.6) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  if (ink) outline(m, ink, { smooth: false });
  return m;
}

function plane(w, h, mat) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

function unlit(map, extra = {}) {
  return new THREE.MeshBasicMaterial({ map, ...extra });
}

export function buildMachine(feelings, kit) {
  const L = LAYOUT;
  const W = L.width, H = L.height;
  const w = L.window, t = L.tray;
  const group = new THREE.Group();

  const cream = toon({ color: CREAM });
  const navy = toon({ color: NAVY });
  const red = toon({ color: '#e8352a' });
  const metal = new THREE.MeshMatcapMaterial({ matcap: makeMetalMatcap() });
  const black = toon({ color: '#17131d' });

  // body behind the front, plus a plinth
  const bodyDepth = L.back + 0.39;
  const body = rbox(W, H - 0.08, bodyDepth, cream, 0.04, 2.2);
  body.position.set(0, 0.08 + (H - 0.08) / 2, L.back - bodyDepth / 2);
  const plinth = rbox(W - 0.06, 0.08, 0.74, navy, 0.02, 2);
  plinth.position.set(0, 0.04, 0);
  group.add(body, plinth);

  // the front: one extruded slab with the window and tray cut out of it
  const bevel = 0.012, depth = L.front - L.back - 2 * bevel;
  const shape = roundedRect(new THREE.Shape(), -W / 2 + bevel, 0.08 + bevel, W / 2 - bevel, H - bevel, 0.05);
  shape.holes.push(roundedRect(new THREE.Path(), w.x0, w.y0, w.x1, w.y1, 0.03));
  shape.holes.push(roundedRect(new THREE.Path(), t.x0, t.y0, t.x1, t.y1, 0.03));
  const frame = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 12,
    }),
    cream,
  );
  frame.position.z = L.back + bevel;
  frame.castShadow = true;
  frame.receiveShadow = true;
  outline(frame, 2.2);
  group.add(frame);

  // red side panel so the machine reads from a three-quarter view
  const decal = plane(0.62, 1.5, unlit(makeSideDecal()));
  decal.rotation.y = Math.PI / 2;
  decal.position.set(W / 2 + 0.001, 1.02, -0.02);
  group.add(decal);

  // ---------- display window ----------
  const iw = w.x1 - w.x0, ih = w.y1 - w.y0;
  const cx = (w.x0 + w.x1) / 2, cy = (w.y0 + w.y1) / 2;
  const back = plane(iw, ih, unlit(makeWindowBack()));
  back.position.set(cx, cy, L.back + 0.001);
  group.add(back);

  const shelfMat = toon({ color: '#ffffff' });
  const shelfDepth = L.front - L.back - 0.02;
  const buttonGeo = new RoundedBoxGeometry(0.06, 0.024, 0.012, 2, 0.005);
  const lampGeo = new THREE.PlaneGeometry(0.044, 0.01);
  const hitGeo = new THREE.BoxGeometry(0.2, 0.25, 0.14);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const slots = [];
  const hitTargets = [];

  L.rows.forEach((y, r) => {
    const shelf = rbox(iw, 0.012, shelfDepth, shelfMat, 0.004, 1.2);
    shelf.position.set(cx, y - 0.006, L.back + shelfDepth / 2);
    group.add(shelf);

    const rowFeelings = feelings.slice(r * 4, r * 4 + 4);
    const stripH = 0.075;
    const strip = plane(iw, stripH, unlit(makeShelfStrip(rowFeelings.map((f, c) => ({ feeling: f, u: (L.cols[c] - w.x0) / iw })))));
    strip.position.set(cx, y - 0.003 - stripH / 2, L.back + shelfDepth + 0.001);
    group.add(strip);

    rowFeelings.forEach((f, c) => {
      const x = L.cols[c];
      const index = r * 4 + c;
      const restY = y + CAN.bottom;
      const can = kit.createCan(f);
      can.position.set(x, restY, L.canZ);
      can.rotation.y = (c - 1.5) * -0.08;
      group.add(can);

      const button = new THREE.Mesh(buttonGeo, cream);
      button.castShadow = true;
      outline(button, 1.2, { smooth: false });
      button.position.set(x + 0.078, y - 0.056, L.back + shelfDepth + 0.007);
      const lamp = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: f.soldOut ? '#ff3b2e' : '#6b2a22' }));
      lamp.position.z = 0.0062;
      button.add(lamp);
      button.userData.slot = index;
      button.userData.restZ = button.position.z;
      group.add(button);

      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.position.set(x, y + 0.07, L.canZ);
      hit.userData.slot = index;
      group.add(hit);
      hitTargets.push(hit, button);

      slots.push({ index, feeling: f, code: f.code, x, restY, can, button, lamp });
    });
  });

  const glass = plane(iw + 0.02, ih + 0.02, new THREE.MeshBasicMaterial({
    color: '#ffffff', transparent: true, opacity: 0.06, depthWrite: false,
  }));
  glass.position.set(cx, cy, L.glassZ);
  const glare = plane(iw, ih, new THREE.MeshBasicMaterial({
    map: makeGlare(), transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  glare.position.set(cx, cy, L.glassZ + 0.001);
  group.add(glass, glare);

  // ---------- header sign ----------
  const signBox = rbox(1.1, 0.2, 0.05, red, 0.02, 2);
  signBox.position.set(0, 1.79, L.front + 0.02);
  const sign = plane(1.06, 0.17, unlit(makeSignTexture()));
  sign.position.set(0, 1.79, L.front + 0.046);
  group.add(signBox, sign);

  // ---------- money panel ----------
  const panel = rbox(iw, 0.21, 0.014, navy, 0.02, 1.8);
  panel.position.set(0, 0.585, L.front + 0.006);
  group.add(panel);

  const bezel = rbox(0.42, 0.14, 0.01, black, 0.012, 1.2);
  bezel.position.set(-0.27, 0.585, L.front + 0.015);
  const display = makeDisplay();
  const screen = plane(0.4, 0.125, unlit(display.texture));
  screen.position.set(-0.27, 0.585, L.front + 0.0205);
  group.add(bezel, screen);

  const coin = rbox(0.085, 0.13, 0.014, metal, 0.01, 1.2);
  coin.position.set(0.1, 0.585, L.front + 0.016);
  const slit = rbox(0.012, 0.07, 0.006, black, 0.003, 0);
  slit.position.set(0.1, 0.6, L.front + 0.024);
  const coinLabel = plane(0.075, 0.022, unlit(makePlate('1 SMILE', null, { bg: '#c9d0db', fg: INK, w: 256, h: 76 })));
  coinLabel.position.set(0.1, 0.537, L.front + 0.0235);
  group.add(coin, slit, coinLabel);

  const bill = rbox(0.17, 0.05, 0.012, black, 0.008, 1.2);
  bill.position.set(0.3, 0.615, L.front + 0.016);
  const billLamp = plane(0.13, 0.008, new THREE.MeshBasicMaterial({ color: '#3dff8a' }));
  billLamp.position.set(0.3, 0.615, L.front + 0.0225);
  const billLabel = plane(0.17, 0.04, unlit(makePlate('紙幣 · HUGS', null, { bg: NAVY, fg: '#ffd23f', w: 320, h: 76 })));
  billLabel.position.set(0.3, 0.55, L.front + 0.0135);
  group.add(bill, billLamp, billLabel);

  const ret = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.014, 32), metal);
  ret.rotation.x = Math.PI / 2;
  ret.position.set(0.46, 0.6, L.front + 0.018);
  outline(ret, 1.2);
  const retLabel = plane(0.08, 0.024, unlit(makePlate('おつり', null, { bg: NAVY, fg: CREAM, w: 256, h: 76 })));
  retLabel.position.set(0.46, 0.545, L.front + 0.0135);
  group.add(ret, retLabel);

  // ---------- take-out tray ----------
  const trayW = t.x1 - t.x0, trayH = t.y1 - t.y0;
  const tray = new THREE.Mesh(
    new THREE.BoxGeometry(trayW - 0.002, trayH - 0.002, L.front - L.back - 0.004),
    toon({ color: '#2b2440', side: THREE.BackSide }),
  );
  tray.position.set((t.x0 + t.x1) / 2, (t.y0 + t.y1) / 2, (L.front + L.back) / 2 - 0.001);
  tray.receiveShadow = true;
  group.add(tray);

  const flap = new THREE.Group();
  flap.position.set(tray.position.x, t.y1 - 0.01, L.front - 0.012);
  const flapPane = new THREE.Mesh(
    new RoundedBoxGeometry(trayW - 0.02, trayH - 0.02, 0.006, 2, 0.004),
    new THREE.MeshBasicMaterial({ color: '#2a2238', transparent: true, opacity: 0.62 }),
  );
  flapPane.position.y = -(trayH - 0.02) / 2;
  const flapLabel = plane(0.3, 0.05, unlit(makePlate('とりだし口', 'TAKE OUT', { bg: '#2a2238', fg: CREAM, w: 512, h: 86 }), { transparent: true, opacity: 0.9 }));
  flapLabel.position.set(0, -0.06, 0.004);
  flap.add(flapPane, flapLabel);
  group.add(flap);

  // ---------- stickers ----------
  const s1 = plane(0.16, 0.16, unlit(makeBurstSticker(['NO', 'REFUNDS'], '#ffd23f', INK), { transparent: true }));
  s1.position.set(0.47, 0.28, L.front + 0.002);
  s1.rotation.z = -0.2;
  const s2 = plane(0.15, 0.15, unlit(makeBurstSticker(['100%', 'REAL'], '#ff5a8a', '#fff6e5'), { transparent: true }));
  s2.position.set(-0.5, 0.29, L.front + 0.002);
  s2.rotation.z = 0.25;
  group.add(s1, s2);

  return {
    group, slots, hitTargets, display, flap,
    trayRest: { y: t.y0 + CAN.radius + 0.004, z: (L.front + L.back) / 2, xMin: t.x0 + 0.1, xMax: t.x1 - 0.1, dropY: t.y1 + 0.03 },
    trayCenter: new THREE.Vector3(tray.position.x, (t.y0 + t.y1) / 2, L.front),
  };
}
