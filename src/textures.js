import * as THREE from 'three';
import { INK } from './toon.js';

// Every label, sign and screen is drawn on a 2D canvas, so the project ships no image files.

export const DISPLAY = '"Dela Gothic One", "Zen Kaku Gothic New", sans-serif';
export const BODY = '"Zen Kaku Gothic New", sans-serif';
const LED = '"DotGothic16", monospace';
const CREAM = '#fff6e5';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function mix(a, b, amount) {
  return '#' + new THREE.Color(a).lerp(new THREE.Color(b), amount).getHexString();
}

function spacing(g, px) {
  if ('letterSpacing' in g) g.letterSpacing = `${px}px`;
}

function fitFont(g, text, weight, size, family, maxWidth) {
  g.font = `${weight} ${size}px ${family}`;
  const w = g.measureText(text).width;
  if (w > maxWidth) size = Math.floor((size * maxWidth) / w);
  g.font = `${weight} ${size}px ${family}`;
  return size;
}

// Cream letters with an ink outline and a hard ink drop shadow, like a sticker.
function stickerText(g, text, x, y, size, { fill = CREAM, shadow = 0.09 } = {}) {
  const off = size * shadow;
  g.lineJoin = 'round';
  g.lineWidth = size * 0.18;
  g.strokeStyle = INK;
  g.fillStyle = INK;
  g.strokeText(text, x + off, y + off);
  g.fillText(text, x + off, y + off);
  g.strokeText(text, x, y);
  g.fillStyle = fill;
  g.fillText(text, x, y);
}

// Japanese vertical writing: stack the glyphs, and turn the long-vowel marks upright.
function verticalText(g, text, x, y, size) {
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  [...text].forEach((ch, i) => {
    const cy = y + i * size * 1.04;
    if ('ー〜…'.includes(ch)) {
      g.save();
      g.translate(x, cy);
      g.rotate(Math.PI / 2);
      g.fillText(ch, 0, 0);
      g.restore();
    } else {
      g.fillText(ch, x, cy);
    }
  });
}

function sparkle(g, x, y, r) {
  g.beginPath();
  g.moveTo(x, y - r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r, y);
  g.quadraticCurveTo(x, y, x, y - r);
  g.closePath();
}

function star(g, x, y, r, inner = 0.45, points = 5) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const rr = i % 2 ? r * inner : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}

function inked(g, fill, width) {
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = width;
  g.strokeStyle = INK;
  g.stroke();
}

// ---------- front drawings, one per feeling (drawn around 0,0 with size s) ----------
const MOTIFS = {
  bolt(g, s, c) {
    g.beginPath();
    [[-0.1, -1], [0.62, -1], [0.16, -0.18], [0.62, -0.18], [-0.32, 1.05], [-0.02, 0.12], [-0.5, 0.12]]
      .forEach(([x, y]) => g.lineTo(x * s, y * s));
    g.closePath();
    inked(g, c.pop, s * 0.08);
  },
  target(g, s, c) {
    [[1, CREAM], [0.72, c.pop], [0.44, CREAM], [0.18, c.pop]].forEach(([r, fill]) => {
      g.beginPath();
      g.arc(0, 0, r * s, 0, Math.PI * 2);
      inked(g, fill, s * 0.06);
    });
    g.lineCap = 'round';
    g.lineWidth = s * 0.09;
    g.strokeStyle = INK;
    g.beginPath();
    g.moveTo(s * 0.05, -s * 0.05);
    g.lineTo(s * 1.05, -s * 1.05);
    g.stroke();
    g.beginPath();
    g.moveTo(s * 0.8, -s * 1.12);
    g.lineTo(s * 1.15, -s * 1.15);
    g.lineTo(s * 1.12, -s * 0.8);
    inked(g, c.pop, s * 0.05);
  },
  grin(g, s, c) {
    g.beginPath();
    g.arc(0, 0, s, 0, Math.PI * 2);
    inked(g, c.pop, s * 0.07);
    g.lineCap = 'round';
    g.lineWidth = s * 0.09;
    for (const x of [-0.4, 0.4]) {
      g.beginPath();
      g.arc(x * s, -0.2 * s, s * 0.2, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(-0.6 * s, 0.12 * s);
    g.quadraticCurveTo(0, 0.12 * s, 0.6 * s, 0.12 * s);
    g.quadraticCurveTo(0.55 * s, 0.85 * s, 0, 0.85 * s);
    g.quadraticCurveTo(-0.55 * s, 0.85 * s, -0.6 * s, 0.12 * s);
    inked(g, INK, s * 0.06);
    g.beginPath();
    g.ellipse(0, 0.62 * s, s * 0.26, s * 0.16, 0, 0, Math.PI * 2);
    g.fillStyle = '#ff7a8a';
    g.fill();
  },
  moon(g, s, c) {
    g.beginPath();
    g.arc(0, 0, s, 0, Math.PI * 2);
    inked(g, c.pop, s * 0.07);
    g.save();
    g.beginPath();
    g.arc(0, 0, s - s * 0.035, 0, Math.PI * 2);
    g.clip();
    g.beginPath();
    g.arc(s * 0.45, -s * 0.3, s * 0.85, 0, Math.PI * 2);
    inked(g, c.color, s * 0.07);
    g.restore();
    g.fillStyle = CREAM;
    g.strokeStyle = INK;
    g.font = `400 ${s * 0.5}px ${DISPLAY}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    [[0.55, -0.55, 0.5], [0.95, -0.95, 0.36]].forEach(([x, y, k]) => {
      g.font = `400 ${s * k}px ${DISPLAY}`;
      g.lineWidth = s * 0.07;
      g.strokeText('Z', x * s, y * s);
      g.fillText('Z', x * s, y * s);
    });
  },
  tape(g, s, c) {
    g.beginPath();
    g.roundRect(-1.15 * s, -0.75 * s, 2.3 * s, 1.5 * s, s * 0.16);
    inked(g, c.pop, s * 0.07);
    g.beginPath();
    g.roundRect(-0.9 * s, -0.55 * s, 1.8 * s, 0.75 * s, s * 0.08);
    inked(g, CREAM, s * 0.05);
    for (const x of [-0.45, 0.45]) {
      g.beginPath();
      g.arc(x * s, -0.17 * s, s * 0.22, 0, Math.PI * 2);
      inked(g, INK, s * 0.04);
      g.beginPath();
      g.arc(x * s, -0.17 * s, s * 0.08, 0, Math.PI * 2);
      g.fillStyle = CREAM;
      g.fill();
    }
    g.beginPath();
    g.moveTo(-0.6 * s, 0.75 * s);
    g.lineTo(-0.45 * s, 0.4 * s);
    g.lineTo(0.45 * s, 0.4 * s);
    g.lineTo(0.6 * s, 0.75 * s);
    inked(g, c.color, s * 0.05);
  },
  snail(g, s, c) {
    g.beginPath();
    g.moveTo(-1.2 * s, 0.75 * s);
    g.quadraticCurveTo(-1.25 * s, 0.2 * s, -0.85 * s, 0.25 * s);
    g.lineTo(-0.85 * s, 0.5 * s);
    g.lineTo(1.0 * s, 0.5 * s);
    g.quadraticCurveTo(1.25 * s, 0.75 * s, 1.0 * s, 0.75 * s);
    g.closePath();
    inked(g, CREAM, s * 0.06);
    g.beginPath();
    g.arc(0.1 * s, -0.1 * s, s * 0.68, 0, Math.PI * 2);
    inked(g, c.pop, s * 0.07);
    g.beginPath();
    for (let a = 0; a < Math.PI * 5; a += 0.1) {
      const r = s * 0.06 * a * 0.8;
      g.lineTo(0.1 * s + Math.cos(a) * r, -0.1 * s + Math.sin(a) * r);
    }
    g.lineWidth = s * 0.06;
    g.strokeStyle = INK;
    g.stroke();
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-1.0 * s, 0.3 * s);
    g.lineTo(-1.1 * s, -0.15 * s);
    g.stroke();
    g.beginPath();
    g.arc(-1.1 * s, -0.2 * s, s * 0.07, 0, Math.PI * 2);
    g.fillStyle = INK;
    g.fill();
  },
  star(g, s, c) {
    star(g, 0, 0.05 * s, s * 1.1, 0.48);
    inked(g, c.pop, s * 0.08);
    sparkle(g, 0.95 * s, -0.85 * s, s * 0.3);
    inked(g, CREAM, s * 0.05);
    sparkle(g, -1.0 * s, -0.55 * s, s * 0.2);
    inked(g, CREAM, s * 0.05);
  },
  mug(g, s, c) {
    g.lineCap = 'round';
    g.lineWidth = s * 0.07;
    g.strokeStyle = CREAM;
    for (const x of [-0.35, 0.05, 0.45]) {
      g.beginPath();
      g.moveTo(x * s, -0.55 * s);
      g.bezierCurveTo((x - 0.2) * s, -0.75 * s, (x + 0.2) * s, -0.9 * s, x * s, -1.1 * s);
      g.stroke();
    }
    g.beginPath();
    g.arc(0.85 * s, 0.15 * s, s * 0.33, -Math.PI / 2, Math.PI / 2);
    g.lineWidth = s * 0.2;
    g.strokeStyle = INK;
    g.stroke();
    g.lineWidth = s * 0.1;
    g.strokeStyle = c.pop;
    g.stroke();
    g.beginPath();
    g.roundRect(-0.8 * s, -0.4 * s, 1.6 * s, 1.25 * s, [s * 0.08, s * 0.08, s * 0.4, s * 0.4]);
    inked(g, c.pop, s * 0.07);
    g.beginPath();
    g.ellipse(0, -0.4 * s, 0.8 * s, 0.14 * s, 0, 0, Math.PI * 2);
    inked(g, mix(c.color, '#000', 0.3), s * 0.05);
  },
  wave(g, s, c) {
    g.lineCap = 'round';
    [[-0.55, c.pop], [0.05, CREAM], [0.65, c.pop]].forEach(([y, col]) => {
      g.beginPath();
      for (let x = -1.2; x <= 1.2; x += 0.05) g.lineTo(x * s, (y + Math.sin(x * 4) * 0.14) * s);
      g.lineWidth = s * 0.32;
      g.strokeStyle = INK;
      g.stroke();
      g.lineWidth = s * 0.2;
      g.strokeStyle = col;
      g.stroke();
    });
  },
  sprout(g, s, c) {
    g.beginPath();
    g.ellipse(0, 0.85 * s, s * 0.9, s * 0.28, 0, Math.PI, 0);
    g.closePath();
    inked(g, mix(c.color, '#000', 0.35), s * 0.06);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0, 0.6 * s);
    g.quadraticCurveTo(0.1 * s, 0, 0, -0.35 * s);
    g.lineWidth = s * 0.16;
    g.strokeStyle = INK;
    g.stroke();
    g.lineWidth = s * 0.08;
    g.strokeStyle = CREAM;
    g.stroke();
    for (const side of [-1, 1]) {
      g.save();
      g.translate(0, -0.35 * s);
      g.rotate(side * 0.6);
      g.beginPath();
      g.ellipse(side * 0.5 * s, -0.1 * s, s * 0.55, s * 0.28, 0, 0, Math.PI * 2);
      inked(g, side < 0 ? CREAM : c.pop === CREAM ? '#b6f07a' : c.pop, s * 0.07);
      g.restore();
    }
  },
  crown(g, s, c) {
    g.beginPath();
    [[-1.05, 0.6], [-1.15, -0.55], [-0.55, -0.05], [0, -0.85], [0.55, -0.05], [1.15, -0.55], [1.05, 0.6]]
      .forEach(([x, y]) => g.lineTo(x * s, y * s));
    g.closePath();
    inked(g, c.pop, s * 0.08);
    g.beginPath();
    g.roundRect(-1.1 * s, 0.55 * s, 2.2 * s, 0.38 * s, s * 0.08);
    inked(g, c.pop, s * 0.07);
    for (const [x, y] of [[-1.15, -0.6], [0, -0.9], [1.15, -0.6]]) {
      g.beginPath();
      g.arc(x * s, y * s, s * 0.14, 0, Math.PI * 2);
      inked(g, CREAM, s * 0.05);
    }
    for (const x of [-0.6, 0, 0.6]) {
      g.beginPath();
      g.arc(x * s, 0.74 * s, s * 0.1, 0, Math.PI * 2);
      inked(g, c.color, s * 0.04);
    }
  },
  umbrella(g, s, c) {
    g.beginPath();
    g.arc(0.75 * s, -0.75 * s, s * 0.35, 0, Math.PI * 2);
    inked(g, '#ffd23f', s * 0.06);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0, -0.3 * s);
    g.lineTo(0.15 * s, 1.0 * s);
    g.lineWidth = s * 0.1;
    g.strokeStyle = INK;
    g.stroke();
    for (let i = 0; i < 4; i++) {
      const a0 = Math.PI + (i * Math.PI) / 4, a1 = a0 + Math.PI / 4;
      g.beginPath();
      g.moveTo(0, -0.1 * s);
      g.arc(0, -0.1 * s, s * 1.1, a0, a1);
      g.closePath();
      inked(g, i % 2 ? CREAM : c.pop, s * 0.06);
    }
  },
};

function halftone(g, x0, y0, x1, y1, color, step, maxR, fromTop) {
  g.fillStyle = color;
  for (let y = y0; y < y1; y += step) {
    const t = fromTop ? 1 - (y - y0) / (y1 - y0) : (y - y0) / (y1 - y0);
    const r = maxR * t;
    if (r < 0.6) continue;
    const shift = ((y - y0) / step) % 2 ? step / 2 : 0;
    for (let x = x0 + shift; x < x1; x += step) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  }
}

function sunburst(g, cx, cy, radius, rays, color) {
  g.fillStyle = color;
  for (let i = 0; i < rays; i++) {
    const a0 = (i / rays) * Math.PI * 2, a1 = a0 + Math.PI / rays;
    g.beginPath();
    g.moveTo(cx, cy);
    g.arc(cx, cy, radius, a0, a1);
    g.closePath();
    g.fill();
  }
}

// ---------- can wrapper ----------
// The canvas wraps the whole can: x = 0.5 is the front, 0 / 1 is the back seam.
export function makeCanLabel(f) {
  const W = 1280, H = 534;
  const [c, g] = canvas(W, H);
  g.scale(W / 1536, H / 640);
  const SW = 1536, SH = 640, cx = SW / 2;
  const light = mix(f.color, '#ffffff', 0.18);
  const dark = mix(f.color, '#000000', 0.22);

  g.fillStyle = f.color;
  g.fillRect(0, 0, SW, SH);
  g.save();
  g.globalAlpha = 0.55;
  sunburst(g, cx, 230, 520, 18, light);
  g.restore();
  halftone(g, 0, 380, SW, 560, dark, 18, 6.5, false);

  // top band: ink with repeating brand text
  g.fillStyle = INK;
  g.fillRect(0, 0, SW, 58);
  g.fillStyle = f.pop;
  g.fillRect(0, 58, SW, 10);
  g.fillStyle = CREAM;
  g.font = `400 26px ${DISPLAY}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  spacing(g, 6);
  for (let x = 96; x < SW; x += 384) g.fillText('FEELINGS ✦ きもち', x + 96, 31);
  spacing(g, 0);

  // front: drawing, name, Japanese name down the side
  g.save();
  g.translate(cx, 215);
  MOTIFS[f.motif](g, 92, f);
  g.restore();

  const words = f.name.toUpperCase().split(' ');
  // the display face has a very narrow space, so words are joined with an en space
  const lines = words.length > 2 ? [words.slice(0, -1).join(' '), words.at(-1)] : words;
  let size = 84;
  g.font = `400 ${size}px ${DISPLAY}`;
  const widest = Math.max(...lines.map((l) => g.measureText(l).width));
  if (widest > 420) size = Math.floor((size * 420) / widest);
  g.font = `400 ${size}px ${DISPLAY}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const lh = size * 1.08;
  const y0 = 430 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => stickerText(g, l, cx, y0 + i * lh, size, { fill: f.ink === INK ? CREAM : f.ink }));

  const jpSize = Math.min(46, Math.floor(470 / [...f.jp].length));
  g.beginPath();
  g.roundRect(cx + 255, 92, jpSize + 26, [...f.jp].length * jpSize * 1.04 + 26, 14);
  inked(g, f.pop, 5);
  g.fillStyle = INK;
  g.font = `400 ${jpSize}px ${DISPLAY}`;
  verticalText(g, f.jp, cx + 255 + (jpSize + 26) / 2, 105 + jpSize / 2, jpSize);

  g.save();
  g.translate(cx - 270, 330);
  g.rotate(-Math.PI / 2);
  g.fillStyle = f.ink;
  g.font = `700 26px ${BODY}`;
  spacing(g, 5);
  g.fillText(`NO.${f.code}  ·  350ml`, 0, 0);
  g.restore();
  spacing(g, 0);

  if (f.isNew) {
    g.save();
    g.translate(cx - 230, 120);
    g.rotate(-0.25);
    star(g, 0, 0, 74, 0.72, 12);
    inked(g, '#ffe14d', 5);
    g.fillStyle = '#e8261b';
    g.font = `400 34px ${DISPLAY}`;
    g.fillText('新発売', 0, 2);
    g.restore();
  }

  // bottom band
  g.fillStyle = INK;
  g.fillRect(0, 566, SW, 74);
  g.fillStyle = f.pop;
  g.fillRect(0, 556, SW, 10);
  g.fillStyle = CREAM;
  g.font = `700 24px ${BODY}`;
  spacing(g, 5);
  g.fillText(f.soldOut ? 'DISCONTINUED · 販売終了' : '100% REAL FEELING · 炭酸感情飲料 · 350ml', cx, 604);
  spacing(g, 0);

  // back, either side of the seam: facts box, barcode, recycling mark
  const box = (x) => {
    g.beginPath();
    g.roundRect(x, 110, 300, 230, 10);
    inked(g, CREAM, 5);
    g.fillStyle = INK;
    g.textAlign = 'left';
    g.font = `400 30px ${DISPLAY}`;
    g.fillText('FEELING FACTS', x + 18, 140);
    g.fillRect(x + 14, 160, 272, 8);
    g.font = `700 22px ${BODY}`;
    f.facts.forEach(([k, v], i) => {
      const y = 195 + i * 44;
      g.textAlign = 'left';
      g.fillText(k, x + 18, y);
      g.textAlign = 'right';
      g.fillText(v, x + 282, y);
      g.fillRect(x + 14, y + 20, 272, 2);
    });
  };
  box(SW - 340);

  g.fillStyle = CREAM;
  g.fillRect(50, 130, 220, 150);
  g.fillStyle = INK;
  let bx = 66, seed = f.code.charCodeAt(0) * 7 + f.code.charCodeAt(1);
  while (bx < 254) {
    seed = (seed * 9301 + 49297) % 233280;
    const w = 3 + (seed % 6);
    g.fillRect(bx, 146, w, 96);
    bx += w + 3 + (seed % 4);
  }
  g.textAlign = 'center';
  g.font = `700 18px ${BODY}`;
  g.fillText(`4 902 ${f.code} 2026`, 160, 262);

  g.beginPath();
  g.roundRect(100, 320, 120, 120, 12);
  inked(g, CREAM, 5);
  g.fillStyle = INK;
  g.font = `400 34px ${DISPLAY}`;
  g.fillText('アルミ', 160, 395);
  g.font = `400 26px ${DISPLAY}`;
  g.fillText('♻', 160, 350);

  return toTexture(c);
}

// ---------- machine parts ----------
export function makeSignTexture() {
  const W = 1280, H = 256;
  const [c, g] = canvas(W, H);
  g.fillStyle = '#e8352a';
  g.fillRect(0, 0, W, H);
  halftone(g, 0, 0, W, H, '#d42a20', 16, 5, false);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `400 124px ${DISPLAY}`;
  spacing(g, 4);
  stickerText(g, 'FEELINGS', W / 2, 108, 124);
  spacing(g, 0);
  g.font = `400 40px ${DISPLAY}`;
  g.lineWidth = 10;
  g.strokeStyle = INK;
  g.strokeText('きもちの自販機', W / 2, 206);
  g.fillStyle = '#ffd23f';
  g.fillText('きもちの自販機', W / 2, 206);
  for (const [x, y, r] of [[120, 90, 34], [190, 170, 18], [W - 120, 160, 34], [W - 190, 76, 18]]) {
    sparkle(g, x, y, r);
    inked(g, CREAM, 6);
  }
  return toTexture(c);
}

export function makeDisplay() {
  const W = 512, H = 160;
  const [c, g] = canvas(W, H);
  const texture = toTexture(c);

  function draw(lines) {
    g.fillStyle = '#140b0b';
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255, 90, 40, 0.07)';
    for (let x = 0; x < W; x += 8) for (let y = 0; y < H; y += 8) g.fillRect(x, y, 5, 5);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ff6a3d';
    g.shadowColor = '#ff3b1a';
    g.shadowBlur = 14;
    const size = lines.length > 1 ? 58 : 72;
    const lh = size * 1.05;
    const y0 = H / 2 - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => {
      fitFont(g, l, 400, size, LED, W - 30);
      g.fillText(l, W / 2, y0 + i * lh);
    });
    g.shadowBlur = 0;
    texture.needsUpdate = true;
  }

  draw(['いらっしゃいませ']);
  return { texture, draw };
}

// Price tags under one shelf of cans. entries: [{ feeling, u }]
export function makeShelfStrip(entries) {
  const W = 1600, H = 150;
  const [c, g] = canvas(W, H);
  g.fillStyle = CREAM;
  g.fillRect(0, 0, W, H);
  g.fillStyle = INK;
  g.fillRect(0, 0, W, 6);
  g.textBaseline = 'middle';
  for (const { feeling: f, u } of entries) {
    const x = u * W;
    g.beginPath();
    g.roundRect(x - 150, 18, 300, 52, 10);
    inked(g, f.soldOut ? '#e8261b' : '#2f6bff', 4);
    g.fillStyle = CREAM;
    g.textAlign = 'center';
    g.font = `400 30px ${DISPLAY}`;
    g.fillText(f.soldOut ? '売切 SOLD OUT' : 'つめた〜い COLD', x, 45);

    g.fillStyle = INK;
    fitFont(g, f.soldOut ? 'sold out' : f.price, 700, 34, BODY, 300);
    g.fillText(f.soldOut ? 'sold out' : f.price, x, 108);
  }
  return toTexture(c);
}

// Big red graphic for the side of the cabinet.
export function makeSideDecal() {
  const W = 400, H = 968;
  const [c, g] = canvas(W, H);
  g.fillStyle = CREAM;
  g.fillRect(0, 0, W, H);
  g.beginPath();
  g.roundRect(30, 30, W - 60, H - 60, 40);
  inked(g, '#e8352a', 8);
  halftone(g, 40, H * 0.55, W - 40, H - 40, '#c9261c', 18, 6, false);
  g.fillStyle = CREAM;
  g.strokeStyle = INK;
  g.lineWidth = 16;
  g.lineJoin = 'round';
  g.font = `400 170px ${DISPLAY}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  ['き', 'も', 'ち'].forEach((ch, i) => {
    g.strokeText(ch, W / 2, 190 + i * 190);
    g.fillText(ch, W / 2, 190 + i * 190);
  });
  g.save();
  g.translate(W / 2, 820);
  sparkle(g, 0, 0, 70);
  inked(g, '#ffd23f', 8);
  g.restore();
  return toTexture(c);
}

// The lit back wall of the display window.
export function makeWindowBack() {
  const W = 256, H = 512;
  const [c, g] = canvas(W, H);
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#d9ecff');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  halftone(g, 0, H * 0.55, W, H, 'rgba(90, 150, 230, 0.18)', 12, 3.5, false);
  return toTexture(c);
}

export function makePlate(text, sub, { bg = INK, fg = CREAM, w = 512, h = 96 } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  fitFont(g, text, 400, h * 0.42, DISPLAY, w * 0.9);
  g.fillText(text, w / 2, sub ? h * 0.38 : h / 2);
  if (sub) {
    spacing(g, 4);
    fitFont(g, sub, 700, h * 0.2, BODY, w * 0.9);
    g.fillText(sub, w / 2, h * 0.76);
    spacing(g, 0);
  }
  return toTexture(c);
}

export function makeBurstSticker(lines, bg, fg) {
  const S = 256;
  const [c, g] = canvas(S, S);
  star(g, S / 2, S / 2, S / 2 - 8, 0.8, 14);
  inked(g, bg, 7);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const lh = 50;
  const y0 = S / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => {
    fitFont(g, l, 400, 48, DISPLAY, S - 90);
    g.fillText(l, S / 2, y0 + i * lh + 2);
  });
  return toTexture(c);
}

export function makeGlare() {
  const W = 256, H = 512;
  const [c, g] = canvas(W, H);
  g.fillStyle = 'rgba(255,255,255,1)';
  g.save();
  g.translate(W / 2, H / 2);
  g.rotate(-0.5);
  g.fillRect(-150, -600, 60, 1200);
  g.fillRect(-70, -600, 18, 1200);
  g.restore();
  return toTexture(c);
}

// Toon metal for lids, coin plate etc. Read through MeshMatcapMaterial.
export function makeMetalMatcap() {
  const S = 256;
  const [c, g] = canvas(S, S);
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = '#9aa3b2';
  g.fillRect(0, 0, S, S);
  g.fillStyle = '#c9d0db';
  g.beginPath();
  g.ellipse(S * 0.42, S * 0.38, S * 0.42, S * 0.36, -0.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(S * 0.34, S * 0.28, S * 0.14, S * 0.07, -0.6, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#6b7383';
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2, -0.1, Math.PI * 0.9);
  g.arc(S * 0.44, S * 0.42, S * 0.5, Math.PI * 0.9, -0.1, true);
  g.fill();
  return toTexture(c);
}

// Additive matcap that paints fixed highlight streaks on the round can body.
export function makeShineMatcap() {
  const S = 256;
  const [c, g] = canvas(S, S);
  g.fillStyle = '#000000';
  g.fillRect(0, 0, S, S);
  g.fillStyle = '#ffffff';
  g.fillRect(S * 0.27, 0, S * 0.07, S);
  g.fillStyle = '#9a9a9a';
  g.fillRect(S * 0.39, 0, S * 0.025, S);
  g.fillStyle = '#5a5a5a';
  g.fillRect(S * 0.9, 0, S * 0.04, S);
  return toTexture(c);
}

// Comic sunburst behind the can while it is being shown. cx, cy in 0..1 of the sheet.
export function makeBackdrop() {
  const S = 1024;
  const [c, g] = canvas(S, S);
  const texture = toTexture(c);
  function draw(bg, cx, cy) {
    g.fillStyle = bg;
    g.fillRect(0, 0, S, S);
    sunburst(g, cx * S, (1 - cy) * S, S * 1.6, 28, mix(bg, '#ffffff', 0.22));
    halftone(g, 0, S * 0.72, S, S, mix(bg, '#000000', 0.12), 22, 7, false);
    texture.needsUpdate = true;
  }
  return { texture, draw };
}

export function makeDot() {
  const S = 64;
  const [c, g] = canvas(S, S);
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2 - 4, 0, Math.PI * 2);
  g.fillStyle = '#ffffff';
  g.fill();
  return new THREE.CanvasTexture(c);
}
