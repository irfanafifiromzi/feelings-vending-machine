import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { FEELINGS } from '../src/feelings.js';
import { createCanGeometry, LID_Y } from '../src/can.js';
import { makeCanLabel } from '../src/textures.js';

// Writes every can as one .glb (plain PBR materials, wrappers embedded) plus each wrapper as a PNG.
// Toon shading and ink outlines are site-only effects, so they are left out.

const logEl = document.getElementById('log');
const log = (m) => { logEl.textContent += m + '\n'; };

async function save(name, blob) {
  const res = await fetch(`/__export?name=${name}`, { method: 'POST', body: blob });
  if (!res.ok) throw new Error(`${name}: ${res.status} ${await res.text()}`);
  log(`saved exports/${name}`);
}

const pngOf = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

async function run() {
  const jp = FEELINGS.map((f) => f.jp).join('') + '新発売アルミ炭酸感情飲料販売終了♻✦';
  await Promise.all([
    document.fonts.load('400 84px "Dela Gothic One"', 'FEELINGS' + jp),
    document.fonts.load('700 24px "Zen Kaku Gothic New"', 'Feelings' + jp),
  ]);

  const geo = createCanGeometry();
  const metal = new THREE.MeshStandardMaterial({ name: 'Can_Metal', color: '#d9dde3', metalness: 1, roughness: 0.28 });
  const scene = new THREE.Scene();

  for (const [i, f] of FEELINGS.entries()) {
    const label = makeCanLabel(f);
    await save(`label_${f.code}.png`, await pngOf(label.image));

    const can = new THREE.Group();
    can.name = `Can_${f.code}_${f.name.replace(/\W+/g, '')}`;
    const part = (name, g, mat, y = 0) => {
      const m = new THREE.Mesh(g, mat);
      m.name = `${f.code}_${name}`;
      m.position.y = y;
      can.add(m);
    };
    part('Body', geo.body, new THREE.MeshStandardMaterial({ name: `Label_${f.code}`, map: label, metalness: 0.25, roughness: 0.35 }));
    part('Lid', geo.top, metal);
    part('Base', geo.bottom, metal);
    part('TearPanel', geo.tear, metal, LID_Y);
    part('Tab', geo.tab, metal, LID_Y + 0.0007);
    part('Rivet', geo.rivet, metal, LID_Y + 0.0012);
    can.position.x = (i - (FEELINGS.length - 1) / 2) * 0.14;
    scene.add(can);
  }

  const glb = await new GLTFExporter().parseAsync(scene, { binary: true });
  await save('feelings_cans.glb', new Blob([glb], { type: 'model/gltf-binary' }));
  log('done');
}

run().catch((e) => log(`FAILED: ${e.message}`));
