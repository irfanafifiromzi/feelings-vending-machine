import * as THREE from 'three';
import gsap from 'gsap';
import { inject } from '@vercel/analytics';
import { FEELINGS, START_BG } from './feelings.js';
import { createCanKit } from './can.js';
import { buildMachine } from './machine.js';
import { Sound } from './sound.js';
import { makeBackdrop, makeDot, mix } from './textures.js';
import { INK, outline, setOutlineResolution, toon } from './toon.js';
import { createUI } from './ui.js';

inject(); // Vercel Web Analytics: counts visitors and page views on the deployed site (debug-only in dev)

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const CREAM = '#fff6e5';
const HERO_DISTANCE = 1.25;
const LAMP = { off: '#6b2a22', on: '#ffe14d', soldOut: '#ff3b2e' };
const IDLE_LINES = [['いらっしゃいませ'], ['PICK A', 'FEELING'], ['EXACT CHANGE', 'ONLY'], ['NO REFUNDS']];

// tone-on-tone helpers: background shapes are the world colour pushed darker or lighter
const darker = (hex, k = 0.14) => mix(hex, INK, k);
const lighter = (hex, k = 0.22) => mix(hex, '#ffffff', k);

// ---------- renderer, scene, camera ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.toneMapping = THREE.NoToneMapping; // flat colours should match the CSS exactly
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const bg = new THREE.Color(START_BG);
scene.background = bg;

const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);
scene.add(camera);
const LOOK = new THREE.Vector3(0, 0.96, 0);
const basePos = new THREE.Vector3();
const introOffset = new THREE.Vector3();
let viewTan = Math.tan(THREE.MathUtils.degToRad(16));

// Toon lighting: ambient sets the shadow tone, ambient + key = the true colour.
scene.add(new THREE.HemisphereLight('#eef0ff', '#ffe6d6', 1.85));
const key = new THREE.DirectionalLight('#ffffff', 1.35);
key.position.set(-2.6, 4.4, 4);
key.target.position.set(0, 0.9, 0);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -1.9, right: 1.9, top: 1.9, bottom: -1.9, near: 1, far: 12 });
key.shadow.bias = -0.0005;
key.shadow.normalBias = 0.015;
scene.add(key, key.target);

// ---------- tone-on-tone world ----------
const tones = {
  dark: toon({ color: darker(START_BG) }),
  darkLid: toon({ color: darker(START_BG, 0.06) }),
  light: toon({ color: lighter(START_BG) }),
  stage: toon({ color: darker(START_BG, 0.2) }),
};
const sparkleMat = toon({ color: CREAM });

const stage = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.05, 72), tones.stage);
stage.position.y = -0.025;
stage.receiveShadow = true;
outline(stage, 2);
scene.add(stage);

function sparkleGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 1);
  s.quadraticCurveTo(0.12, 0.12, 1, 0);
  s.quadraticCurveTo(0.12, -0.12, 0, -1);
  s.quadraticCurveTo(-0.12, -0.12, -1, 0);
  s.quadraticCurveTo(-0.12, 0.12, 0, 1);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 10 });
  g.center();
  return g;
}

function capGeometry() {
  const s = new THREE.Shape();
  const n = 42;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = i % 2 ? 1 : 0.88;
    s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 2 });
  g.center();
  return g;
}

let kit = null;
let machine = null;
const decor = []; // { obj, nx, ny, z, kind, phase, speed }

function buildDecor() {
  const add = (obj, nx, ny, z, kind, extra = {}) => {
    scene.add(obj);
    decor.push({ obj, nx, ny, z, kind, phase: Math.random() * Math.PI * 2, speed: 0.6 + Math.random() * 0.6, ...extra });
  };

  [[-0.8, 0.5, -2.4, 5.2, 0.45], [0.84, -0.55, -1.7, 4.2, -0.7], [0.66, 0.78, -3.4, 3.4, 0.3], [-0.9, -0.72, -2.9, 3.8, -0.4]]
    .forEach(([nx, ny, z, s, rz]) => {
      const can = kit.createSilhouette(tones.dark, tones.darkLid);
      can.scale.setScalar(s);
      can.rotation.set(0.2, Math.random() * 3, rz);
      add(can, nx, ny, z, 'can', { rz });
    });

  const cap = capGeometry();
  [[-0.62, -0.15, -1.2, 0.09], [0.58, 0.22, -1.0, 0.08], [0.92, 0.42, -2.1, 0.12], [-0.5, 0.86, -1.8, 0.1]]
    .forEach(([nx, ny, z, s]) => {
      const m = new THREE.Mesh(cap, tones.dark);
      m.scale.setScalar(s);
      outline(m, 1.4);
      add(m, nx, ny, z, 'cap');
    });

  const bubble = new THREE.SphereGeometry(1, 28, 18);
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(bubble, tones.light);
    m.scale.setScalar(0.04 + Math.random() * 0.1);
    outline(m, 1.3);
    const side = i % 2 ? 1 : -1;
    add(m, side * (0.35 + Math.random() * 0.62), Math.random() * 2 - 1, -0.6 - Math.random() * 2.2, 'bubble');
  }

  const sp = sparkleGeometry();
  [[-0.56, 0.56, 0.4, 0.07], [0.6, 0.64, 0.2, 0.055], [-0.7, -0.32, 0.6, 0.05], [0.72, -0.12, 0.5, 0.075], [-0.36, 0.84, -0.5, 0.045], [0.44, -0.72, 0.3, 0.045]]
    .forEach(([nx, ny, z, s]) => {
      const m = new THREE.Mesh(sp, sparkleMat);
      m.scale.setScalar(s);
      outline(m, 1.6);
      add(m, nx, ny, z, 'sparkle', { base: s });
    });
}

// Decor is placed in view-relative coordinates so it frames the machine on any screen shape.
function placeDecor() {
  const aspect = camera.aspect;
  for (const d of decor) {
    const dist = basePos.z - d.z;
    const halfH = dist * viewTan, halfW = halfH * aspect;
    d.x = d.nx * halfW;
    d.y = LOOK.y + d.ny * halfH;
    d.halfH = halfH;
    // keep the small front sparkles off the machine on narrow screens
    d.allowed = !(d.kind === 'sparkle' && Math.abs(d.x) < 0.75);
    if (d.shown) d.obj.visible = d.allowed;
    d.obj.position.set(d.x, d.y, d.z);
  }
}

function animateDecor(t, dt) {
  for (const d of decor) {
    const o = d.obj;
    if (d.kind === 'can') {
      o.position.y = d.y + Math.sin(t * 0.4 + d.phase) * 0.08;
      o.rotation.y += dt * 0.12 * d.speed;
      o.rotation.z = d.rz + Math.sin(t * 0.3 + d.phase) * 0.06;
    } else if (d.kind === 'cap') {
      o.position.y = d.y + Math.sin(t * 0.7 + d.phase) * 0.06;
      o.rotation.x += dt * 0.5 * d.speed;
      o.rotation.y += dt * 0.3 * d.speed;
    } else if (d.kind === 'bubble') {
      o.position.y += dt * 0.12 * d.speed;
      o.position.x = d.x + Math.sin(t * 0.8 + d.phase) * 0.05;
      if (o.position.y > LOOK.y + d.halfH * 1.1) o.position.y = LOOK.y - d.halfH * 1.1;
    } else {
      o.scale.setScalar(d.base * (0.8 + 0.2 * Math.sin(t * 2.2 + d.phase)));
      o.rotation.z = Math.sin(t * 0.6 + d.phase) * 0.25;
    }
  }
}

// ---------- hero backdrop ----------
const backdropArt = makeBackdrop();
const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ map: backdropArt.texture, transparent: true, opacity: 0, depthWrite: false }),
);
backdrop.visible = false;
camera.add(backdrop);

// ---------- particles ----------
const dot = makeDot();

function createBurst() {
  const N = 140;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.04, map: dot, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, alphaTest: 0.3,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);
  let age = Infinity;
  const c = new THREE.Color();

  return {
    fire(origin, colors) {
      for (let i = 0; i < N; i++) {
        pos.set([origin.x, origin.y, origin.z], i * 3);
        const dir = new THREE.Vector3().randomDirection();
        const speed = 0.6 + Math.random() * 1.2;
        vel.set([dir.x * speed, dir.y * speed + 0.9, dir.z * speed], i * 3);
        c.set(colors[i % colors.length]).toArray(col, i * 3);
      }
      geo.attributes.color.needsUpdate = true;
      age = 0;
    },
    update(dt) {
      if (age > 1.8) return;
      age += dt;
      for (let i = 0; i < N * 3; i += 3) {
        vel[i + 1] -= 1.6 * dt;
        for (let k = 0; k < 3; k++) {
          vel[i + k] *= 0.985;
          pos[i + k] += vel[i + k] * dt;
        }
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = age > 1.4 ? Math.max(0, 1 - (age - 1.4) / 0.4) : 1;
    },
  };
}

const burst = createBurst();

// ---------- state ----------
const sound = new Sound();
const state = {
  mode: 'loading', // loading | idle | vending | presenting | drinking
  hovered: -1,
  slot: null,
  feeling: null,
  can: null,
  hero: new THREE.Vector3(),
  heroScale: 1.75,
  face: 0,
  sway: 0,
};
let holdUntil = 0;

const ui = createUI({
  onPick: (i) => vend(i),
  onDrink: () => drink(),
  onPutBack: () => putBack(),
  onEscape: () => putBack(),
  sound,
});

function say(lines, hold = 2.5) {
  machine.display.draw(lines);
  holdUntil = performance.now() + hold * 1000;
}

let idleLine = 0;
setInterval(() => {
  if (machine && state.mode === 'idle' && performance.now() > holdUntil) {
    machine.display.draw(IDLE_LINES[idleLine++ % IDLE_LINES.length]);
  }
}, 2600);

function setLamp(slot, on) {
  slot.lamp.material.color.set(slot.feeling.soldOut ? LAMP.soldOut : on ? LAMP.on : LAMP.off);
}

// ---------- layout ----------
function isNarrow() {
  return window.innerWidth / window.innerHeight < 0.8 || window.innerWidth < 760;
}

function fit() {
  const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight), aspect = w / h;
  const narrow = aspect < 0.8;
  viewTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  // leave room for the top bar and the hint under the machine
  const needH = narrow ? 3.15 : 3.0;
  const needW = narrow ? 1.68 : 1.9;
  const d = Math.max(needH / 2 / viewTan, needW / 2 / (viewTan * aspect));
  basePos.set(d * 0.13, 1.24, d);
  LOOK.set(0, narrow ? 0.84 : 0.86, 0);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();

  // the backdrop sits between the hero can and the machine
  const dist = d - 1.0;
  const bh = 2 * dist * viewTan * 1.15;
  backdrop.position.z = -dist;
  backdrop.scale.set(bh * aspect, bh, 1);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(w, h);
  setOutlineResolution(w, h);
  state.heroScale = narrow ? 1.1 : 1.75;
  if (machine) placeDecor();
}

const heroCam = new THREE.PerspectiveCamera();
function heroNdc() {
  return isNarrow() ? new THREE.Vector2(0, 0.44) : new THREE.Vector2(-0.32, 0.02);
}

function heroSpot() {
  heroCam.copy(camera, false);
  heroCam.position.copy(basePos);
  heroCam.lookAt(LOOK);
  heroCam.updateMatrixWorld();
  const n = heroNdc();
  const p = new THREE.Vector3(n.x, n.y, 0.5).unproject(heroCam);
  return basePos.clone().add(p.sub(basePos).normalize().multiplyScalar(HERO_DISTANCE));
}

// ---------- hover + picking ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pointer = new THREE.Vector2();
const parallax = new THREE.Vector2();

function pick(e) {
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(machine.hitTargets, false)[0];
  return hit ? hit.object.userData.slot : -1;
}

function setHover(index) {
  if (index === state.hovered) return;
  const prev = machine.slots[state.hovered];
  if (prev) {
    gsap.to(prev.can.position, { y: prev.restY, duration: 0.25 });
    gsap.to(prev.can.rotation, { z: 0, duration: 0.2 });
    setLamp(prev, false);
  }
  state.hovered = index;
  const slot = machine.slots[index];
  if (slot) {
    gsap.to(slot.can.position, { y: slot.restY + 0.016, duration: 0.25, ease: 'back.out(3)' });
    gsap.fromTo(slot.can.rotation, { z: 0 }, { z: 0.07, duration: 0.09, yoyo: true, repeat: 3, ease: 'sine.inOut' });
    setLamp(slot, true);
    sound.tick();
  }
  canvas.style.cursor = slot ? 'pointer' : '';
}

window.addEventListener('pointermove', (e) => {
  pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
});

// browsers only allow audio after a gesture, so the first click or key anywhere starts the music
window.addEventListener('pointerdown', () => sound.unlock(), { once: true });
window.addEventListener('keydown', () => sound.unlock(), { once: true });

canvas.addEventListener('pointermove', (e) => {
  if (!machine || e.pointerType !== 'mouse') return;
  if (state.mode !== 'idle') {
    setHover(-1);
    ui.hideTooltip();
    return;
  }
  const index = pick(e);
  setHover(index);
  if (index >= 0) ui.showTooltip(e.clientX, e.clientY, FEELINGS[index]);
  else ui.hideTooltip();
});

canvas.addEventListener('pointerleave', () => {
  if (!machine) return;
  setHover(-1);
  ui.hideTooltip();
});

canvas.addEventListener('click', (e) => {
  sound.unlock();
  if (!machine || state.mode !== 'idle') return;
  const index = pick(e);
  if (index >= 0) vend(index);
});

// ---------- the vend sequence ----------
function pressButton(btn) {
  gsap.fromTo(btn.position, { z: btn.userData.restZ }, {
    z: btn.userData.restZ - 0.006, duration: 0.07, yoyo: true, repeat: 1,
  });
}

function trayX() {
  const tr = machine.trayRest;
  return THREE.MathUtils.clamp(state.slot.x * 0.8, tr.xMin, tr.xMax);
}

function screenOf(v) {
  const p = v.clone().project(camera);
  return [((p.x + 1) / 2) * window.innerWidth, ((1 - p.y) / 2) * window.innerHeight];
}

function vend(index) {
  if (!machine || state.mode !== 'idle') return;
  sound.unlock();
  const slot = machine.slots[index];
  const f = slot.feeling;
  setHover(-1);
  ui.hideTooltip();
  ui.hideHint();
  pressButton(slot.button);
  if (f.soldOut) {
    soldOut(slot);
    return;
  }

  state.mode = 'vending';
  state.slot = slot;
  state.feeling = f;
  setLamp(slot, true);
  say([f.code, f.price.toUpperCase()]);
  sound.beep(1568);

  // the sample can does a little hop to say "this one!"
  const sample = slot.can;
  gsap.killTweensOf([sample.position, sample.rotation]);
  gsap.timeline()
    .to(sample.position, { y: slot.restY + 0.05, duration: 0.18, ease: 'power2.out' })
    .to(sample.rotation, { y: `+=${Math.PI * 2}`, duration: 0.5, ease: 'power2.inOut' }, 0)
    .to(sample.position, { y: slot.restY, duration: 0.35, ease: 'bounce.out' }, 0.18)
    .set(sample.rotation, { z: 0 });

  // the real can falls into the tray from the hidden chute above it
  const tr = machine.trayRest;
  const product = kit.createCan(f);
  product.position.set(trayX(), tr.dropY, tr.z);
  product.rotation.set(0, 0, Math.PI / 2);
  machine.group.add(product);

  const drop = 0.95;
  gsap.timeline()
    .call(() => { say(['ガコン!']); sound.motor(0.55); }, null, 0.35)
    .to(product.position, { y: tr.y, duration: 0.42, ease: 'bounce.out' }, drop)
    .to(product.rotation, { x: 0.9, duration: 0.6, ease: 'power2.out' }, drop)
    .call(() => {
      sound.clunk();
      ui.sfx('ガコン!', ...screenOf(machine.trayCenter));
    }, null, drop + 0.15)
    .call(() => sound.thud(), null, drop + 0.3)
    .to(machine.flap.rotation, { x: 0.14, duration: 0.08, yoyo: true, repeat: 3, ease: 'sine.inOut' }, drop + 0.12)
    .call(() => say(['PLEASE TAKE', 'YOUR FEELING'], 4), null, drop + 0.5)
    .call(() => { setLamp(slot, false); pickUp(product); }, null, drop + 1.1);
}

function pickUp(can) {
  const f = state.feeling;
  state.can = can;
  state.hero.copy(heroSpot());
  state.face = Math.atan2(basePos.x - state.hero.x, basePos.z - state.hero.z);
  state.sway = 0;
  const n = heroNdc();
  backdropArt.draw(f.bg, 0.5 + (n.x * 0.5) / 1.15, 0.5 + (n.y * 0.5) / 1.15);
  backdrop.visible = true;
  sound.whoosh();

  const s = state.heroScale;
  const ease = 'power3.inOut';
  gsap.timeline({ onComplete: () => { state.mode = 'presenting'; ui.showCard(f); } })
    .to(machine.flap.rotation, { x: -1.15, duration: 0.3, ease: 'power2.out' })
    .to(can.position, { z: 0.62, y: 0.3, duration: 0.35, ease: 'power2.out' }, 0.05)
    .to(can.position, { x: state.hero.x, y: state.hero.y, z: state.hero.z, duration: 0.85, ease }, 0.4)
    // tipped slightly towards the viewer so the lid and pull tab show
    .to(can.rotation, { x: 0.18, y: state.face, z: 0, duration: 0.85, ease }, 0.4)
    .to(can.scale, { x: s, y: s, z: s, duration: 0.85, ease }, 0.4)
    .to(backdrop.material, { opacity: 1, duration: 0.6, ease: 'power2.inOut' }, 0.65)
    .to(machine.flap.rotation, { x: 0, duration: 0.5, ease: 'bounce.out' }, 0.75);
}

function drink() {
  if (state.mode !== 'presenting') return;
  state.mode = 'drinking';
  const { can, feeling: f } = state;
  ui.hideCard();
  sound.psst();

  const tl = gsap.timeline({ onComplete: () => finish(can) })
    .to(can.rotation, { x: 0.75, duration: 0.45, ease: 'power2.out' }, 0.25)
    .to(can.position, { y: '+=0.1', duration: 0.45, ease: 'power2.out' }, 0.25);
  for (const at of [0.8, 1.1, 1.4]) {
    tl.call(() => sound.gulp(), null, at);
    tl.to(can.position, { y: '-=0.012', duration: 0.08, yoyo: true, repeat: 1 }, at);
  }
  tl.call(() => {
    burst.fire(can.position, [f.color, f.pop, CREAM, INK]);
    sound.chime(392 * 2 ** ((FEELINGS.indexOf(f) % 7) / 12));
    applyFeeling(f);
    ui.toast('You now feel', f.feel, f.color);
    say(['YOU FEEL', f.feel.toUpperCase()], 4);
  }, null, 1.75)
    .to(can.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.35, ease: 'back.in(2)' }, 1.75)
    .to(backdrop.material, { opacity: 0, duration: 0.7, ease: 'power2.inOut' }, 1.85);
}

function putBack() {
  if (state.mode !== 'presenting') return;
  state.mode = 'drinking';
  const { can } = state;
  const tr = machine.trayRest;
  ui.hideCard();
  sound.whoosh();
  say(['NO REFUNDS', 'BUT OK'], 3);

  const ease = 'power3.inOut';
  gsap.timeline({ onComplete: () => finish(can) })
    .to(backdrop.material, { opacity: 0, duration: 0.5 }, 0)
    .to(can.position, { x: trayX(), y: tr.y + 0.04, z: 0.6, duration: 0.75, ease }, 0)
    .to(can.rotation, { x: 0, y: 0, z: Math.PI / 2, duration: 0.75, ease }, 0)
    .to(can.scale, { x: 1, y: 1, z: 1, duration: 0.75, ease }, 0)
    .to(machine.flap.rotation, { x: -1.1, duration: 0.25 }, 0.5)
    .to(can.position, { y: tr.y, z: tr.z, duration: 0.3, ease: 'power2.in' }, 0.75)
    .call(() => sound.clunk(), null, 1.02)
    .to(machine.flap.rotation, { x: 0, duration: 0.5, ease: 'bounce.out' }, 1.05)
    .to(can.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.25 }, 1.2);
}

function finish(can) {
  machine.group.remove(can);
  backdrop.visible = false;
  state.can = null;
  state.mode = 'idle';
}

function soldOut(slot) {
  state.mode = 'vending';
  sound.buzz();
  say(['売切', 'SOLD OUT'], 3);
  ui.toast('Free Time is', 'sold out', '#e8261b');
  gsap.fromTo(slot.can.rotation, { z: 0 }, { z: 0.1, duration: 0.06, yoyo: true, repeat: 5 });
  gsap.delayedCall(0.8, () => { state.mode = 'idle'; });
}

function tweenColor(target, hex, duration = 1.4) {
  const to = new THREE.Color(hex);
  gsap.to(target, { r: to.r, g: to.g, b: to.b, duration, ease: 'power2.inOut' });
}

function applyFeeling(f) {
  tweenColor(bg, f.bg);
  tweenColor(tones.dark.color, darker(f.bg));
  tweenColor(tones.darkLid.color, darker(f.bg, 0.06));
  tweenColor(tones.light.color, lighter(f.bg));
  tweenColor(tones.stage.color, darker(f.bg, 0.2));
  document.documentElement.style.setProperty('--bg', f.bg);
}

// ---------- loop ----------
let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;

  const free = state.mode === 'idle' && !reduceMotion;
  const ease = Math.min(1, dt * 3);
  parallax.x += ((free ? pointer.x : 0) - parallax.x) * ease;
  parallax.y += ((free ? pointer.y : 0) - parallax.y) * ease;
  camera.position.set(
    basePos.x + parallax.x * 0.35 + introOffset.x,
    basePos.y + parallax.y * 0.15 + introOffset.y,
    basePos.z + introOffset.z,
  );
  camera.lookAt(LOOK);

  if (state.mode === 'presenting' && state.can) {
    state.sway += (pointer.x * 0.6 - state.sway) * ease;
    state.can.position.y = state.hero.y + Math.sin(t * 1.6) * 0.012;
    state.can.rotation.y = state.face + Math.sin(t * 0.9) * 0.3 + state.sway;
  }

  if (!reduceMotion) animateDecor(t, dt);
  burst.update(dt);
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  fit();
  if (state.mode === 'presenting' && state.can) {
    state.hero.copy(heroSpot());
    state.can.position.copy(state.hero);
    state.can.scale.setScalar(state.heroScale);
    const n = heroNdc();
    backdropArt.draw(state.feeling.bg, 0.5 + (n.x * 0.5) / 1.15, 0.5 + (n.y * 0.5) / 1.15);
  }
});

// ---------- start ----------
async function loadFonts() {
  if (!document.fonts) return;
  const jp = FEELINGS.map((f) => f.jp).join('') + 'きもちの自販機新発売アルミ炭酸感情飲料販売終了つめた〜い売切おつり紙幣とりだし口♻✦';
  const fonts = Promise.all([
    document.fonts.load('400 84px "Dela Gothic One"', 'FEELINGS' + jp),
    document.fonts.load('700 24px "Zen Kaku Gothic New"', 'Feelings' + jp),
    document.fonts.load('400 60px "DotGothic16"', 'いらっしゃいませガコン!PICK A FEELING'),
  ]);
  // never let a slow font server block the page
  await Promise.race([fonts, new Promise((r) => setTimeout(r, 4000))]).catch(() => {});
}

async function start() {
  fit();
  await loadFonts(); // labels are drawn on canvases, so fonts must be ready first
  kit = createCanKit();
  machine = buildMachine(FEELINGS, kit);
  scene.add(machine.group);
  ui.setCanArt(kit.labelImage);
  buildDecor();
  placeDecor();
  renderer.setAnimationLoop(frame);
  ui.loaded();
  say(['いらっしゃいませ'], 2.5);

  if (reduceMotion) {
    for (const d of decor) d.shown = true;
    placeDecor();
    state.mode = 'idle';
    return;
  }
  introOffset.set(0.6, 0.5, 3);
  gsap.to(introOffset, { x: 0, y: 0, z: 0, duration: 2.0, ease: 'power3.out' });
  // pop things in; they stay hidden until their turn, or the constant-width ink lines show as dots
  const popIn = (obj, delay, onShow) => {
    const s = obj.scale.x;
    obj.visible = false;
    gsap.fromTo(obj.scale, { x: 0.001, y: 0.001, z: 0.001 }, {
      x: s, y: s, z: s, duration: 0.55, delay, ease: 'back.out(2.2)', onStart: onShow ?? (() => { obj.visible = true; }),
    });
  };
  machine.slots.forEach((s, i) => popIn(s.can, 0.6 + i * 0.05));
  decor.forEach((d, i) => popIn(d.obj, 0.3 + i * 0.03, () => { d.shown = true; d.obj.visible = d.allowed; }));
  gsap.delayedCall(1.2, () => { state.mode = 'idle'; });
}

start();
