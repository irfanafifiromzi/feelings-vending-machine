import { FEELINGS } from './feelings.js';

const $ = (id) => document.getElementById(id);

// A comic "pow" outline for clip-path, shared by the toast and the product badge.
function burstPolygon(points = 22, inner = 0.82) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2;
    const r = (i % 2 ? inner : 1) * 50;
    pts.push(`${(50 + Math.cos(a) * r).toFixed(2)}% ${(50 + Math.sin(a) * r).toFixed(2)}%`);
  }
  return `polygon(${pts.join(',')})`;
}

// The HTML layer on top of the canvas: tooltip, product card, menu, toast, sound toggle.
export function createUI({ onPick, onDrink, onPutBack, onEscape, sound }) {
  const card = $('card');
  const tooltip = $('tooltip');
  const toastEl = $('toast');
  const sfxEl = $('sfx');
  const hint = $('hint');
  const menu = $('menu');
  const menuList = $('menu-list');
  const menuBtn = $('menu-btn');
  const soundBtn = $('sound-btn');
  const loader = $('loader');
  let toastTimer = 0;
  let cardTimer = 0;

  document.documentElement.style.setProperty('--burst', burstPolygon());

  FEELINGS.forEach((f, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.className = 'tile';
    b.disabled = !!f.soldOut;
    b.style.setProperty('--feel', f.color);
    b.style.setProperty('--i', i);
    b.innerHTML = `
      <span class="tile-code">${f.code}</span>
      <canvas class="tile-can" width="120" height="200" aria-hidden="true"></canvas>
      <span class="tile-tag" lang="ja">${f.soldOut ? '売切' : 'つめた〜い'}</span>
      <span class="tile-name">${f.name}</span>
      <span class="tile-price">${f.soldOut ? 'sold out' : f.price}</span>
      ${f.soldOut ? '<span class="tile-stamp" lang="ja" aria-hidden="true">売切</span>' : ''}`;
    b.addEventListener('click', () => {
      closeMenu(false);
      setTimeout(() => onPick(i), 250);
    });
    li.append(b);
    menuList.append(li);
  });

  function openMenu() {
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => menu.classList.add('open'));
    menuList.querySelector('button:not(:disabled)')?.focus();
  }

  function closeMenu(returnFocus = true) {
    menu.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
    setTimeout(() => { menu.hidden = true; }, 250);
    if (returnFocus) menuBtn.focus();
  }

  menuBtn.addEventListener('click', () => {
    sound.unlock();
    if (menu.hidden) openMenu();
    else closeMenu();
  });
  $('menu-close').addEventListener('click', () => closeMenu());
  menu.addEventListener('click', (e) => {
    if (e.target === menu) closeMenu();
  });

  function renderSound() {
    soundBtn.setAttribute('aria-pressed', String(sound.enabled));
    soundBtn.setAttribute('aria-label', sound.enabled ? 'Mute sound' : 'Turn sound on');
    soundBtn.classList.toggle('muted', !sound.enabled);
  }
  soundBtn.addEventListener('click', () => {
    sound.unlock();
    sound.setEnabled(!sound.enabled);
    renderSound();
  });
  renderSound();

  card.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'drink') onDrink();
    if (act === 'back') onPutBack();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!menu.hidden) closeMenu();
    else onEscape();
  });

  return {
    showTooltip(x, y, f) {
      tooltip.style.setProperty('--feel', f.color);
      tooltip.innerHTML = `
        <span class="tip-code">${f.code}</span>
        <span class="tip-name">${f.name}</span>
        <small>${f.soldOut ? '売切 · sold out' : f.price}</small>`;
      tooltip.style.transform = `translate(${x + 18}px, ${y + 18}px)`;
      tooltip.hidden = false;
    },

    hideTooltip() {
      tooltip.hidden = true;
    },

    hideHint() {
      hint.classList.add('gone');
    },

    showCard(f) {
      clearTimeout(cardTimer);
      card.style.setProperty('--feel', f.color);
      card.style.setProperty('--feel-ink', f.ink);
      // laid out like a poster on the sunburst: burst badge, big headline, two small columns, a label
      card.innerHTML = `
        <div class="pd-badge">
          <span class="pd-badge-jp" lang="ja">${f.jp}</span>
          <h2 class="pd-badge-name sticker" data-text="${f.name}">${f.name}</h2>
        </div>
        <p class="pd-kicker"><span class="code">${f.code}</span><span lang="ja">つめた〜い</span> · Cold · 350 ml</p>
        <p class="pd-headline">${f.tagline}</p>
        <div class="pd-cols">
          <div><h3>Price</h3><p>${f.price}</p></div>
          <div><h3>Side effects</h3><p>${f.side}</p></div>
        </div>
        <section class="pd-facts" aria-label="Feeling facts">
          <h3>Feeling Facts</h3>
          <dl>${f.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
          <p>Serving size 1 can · No refunds</p>
        </section>
        <div class="pd-actions">
          <button class="pd-drink" data-act="drink">Drink it! <small lang="ja">のむ</small></button>
          <button class="pd-back" data-act="back">Put it back</button>
        </div>`;
      card.hidden = false;
      requestAnimationFrame(() => card.classList.add('show'));
      card.querySelector('[data-act="drink"]').focus({ preventScroll: true });
    },

    hideCard() {
      card.classList.remove('show');
      cardTimer = setTimeout(() => { card.hidden = true; }, 350);
    },

    toast(small, big, color) {
      clearTimeout(toastTimer);
      toastEl.style.setProperty('--feel', color);
      toastEl.innerHTML = `<span class="toast-small">${small}</span><span class="toast-big sticker" data-text="${big}">${big}</span>`;
      toastEl.hidden = false;
      requestAnimationFrame(() => toastEl.classList.add('show'));
      toastTimer = setTimeout(() => {
        toastEl.classList.remove('show');
        toastTimer = setTimeout(() => { toastEl.hidden = true; }, 500);
      }, 3200);
    },

    // comic sound effect lettering that pops at a point on screen
    sfx(text, x, y) {
      sfxEl.textContent = text;
      sfxEl.dataset.text = text;
      sfxEl.style.left = `${x}px`;
      sfxEl.style.top = `${y}px`;
      sfxEl.hidden = false;
      sfxEl.classList.remove('pop');
      void sfxEl.offsetWidth; // restart the animation
      sfxEl.classList.add('pop');
    },

    // paint each menu tile's little can from the real wrapper (front third of the label canvas)
    setCanArt(labelFor) {
      menuList.querySelectorAll('.tile-can').forEach((cv, i) => {
        const label = labelFor(FEELINGS[i]);
        const g = cv.getContext('2d');
        const x = 8, y = 6, w = cv.width - 16, h = cv.height - 12;
        const top = y + 22, bottom = y + h - 16;
        const shape = () => {
          g.beginPath();
          g.roundRect(x, y, w, h, [18, 18, 12, 12]);
        };
        g.save();
        shape();
        g.clip();
        const metal = g.createLinearGradient(x, 0, x + w, 0);
        [[0, '#8a92a1'], [0.35, '#eef1f5'], [0.6, '#c2c9d4'], [1, '#8a92a1']].forEach(([s, c]) => metal.addColorStop(s, c));
        g.fillStyle = metal;
        g.fillRect(x, y, w, h);
        const cw = label.width * 0.3;
        g.drawImage(label, label.width / 2 - cw / 2, 0, cw, label.height, x, top, w, bottom - top);
        const round = g.createLinearGradient(x, 0, x + w, 0);
        [[0, 'rgba(29,20,38,0.25)'], [0.3, 'rgba(255,255,255,0.18)'], [0.36, 'rgba(255,255,255,0)'], [1, 'rgba(29,20,38,0.3)']]
          .forEach(([s, c]) => round.addColorStop(s, c));
        g.fillStyle = round;
        g.fillRect(x, top, w, bottom - top);
        g.restore();
        g.strokeStyle = '#1d1426';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x, top);
        g.lineTo(x + w, top);
        g.moveTo(x, bottom);
        g.lineTo(x + w, bottom);
        g.stroke();
        g.lineWidth = 4;
        shape();
        g.stroke();
      });
    },

    loaded() {
      loader.classList.add('gone');
      setTimeout(() => loader.remove(), 800);
    },
  };
}
