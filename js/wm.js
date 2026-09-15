/* Gestionnaire de fenêtres : ouverture, focus, déplacement, redimensionnement,
   ancrage sur les bords, barre des tâches et raccourcis clavier. */

import { sfx } from './sfx.js';

const MOBILE_Q = '(max-width: 820px), (pointer: coarse) and (max-width: 1024px)';
export const isMobile = () => matchMedia(MOBILE_Q).matches;

const GEO_KEY = 'evanos.geo';
const TB = 52;          // hauteur de la barre des tâches
const EDGE = 8;         // marge de déclenchement de l'ancrage

const CTRL_SVG = {
  min: '<svg viewBox="0 0 12 12"><path d="M1.5 6h9"/></svg>',
  max: '<svg viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1"/></svg>',
  restore: '<svg viewBox="0 0 12 12"><rect x="1.5" y="3.5" width="7" height="7" rx="1"/><path d="M4 3.5V2.2A.7.7 0 0 1 4.7 1.5h5.1a.7.7 0 0 1 .7.7v5.1a.7.7 0 0 1-.7.7H8.5"/></svg>',
  close: '<svg viewBox="0 0 12 12"><path d="m2 2 8 8M10 2l-8 8"/></svg>'
};

export const WM = {
  wins: new Map(),
  order: [],            // ids, du plus ancien au plus récent focus
  z: 20,
  t: (k) => k,          // remplacé par main.js une fois l'i18n prêt
  onChange: () => {},

  init() {
    document.querySelectorAll('.os-window').forEach((el) => this.register(el));
    this.bindGlobalKeys();
    addEventListener('resize', () => this.clampAll(), { passive: true });
  },

  register(el) {
    const id = el.id;
    if (this.wins.has(id)) return;
    el.tabIndex = -1;
    el.setAttribute('aria-modal', 'false');

    // Boutons de la barre de titre
    const btns = el.querySelector('.win-btns');
    if (btns && !btns.childElementCount) {
      btns.innerHTML =
        `<button class="win-btn min" data-act="min">${CTRL_SVG.min}</button>` +
        `<button class="win-btn max" data-act="max">${CTRL_SVG.max}</button>` +
        `<button class="win-btn close" data-act="close">${CTRL_SVG.close}</button>`;
      btns.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        e.stopPropagation();
        if (b.dataset.act === 'close') this.close(id);
        else if (b.dataset.act === 'min') this.minimize(id);
        else this.toggleMax(id);
      });
    }

    // Poignées de redimensionnement
    if (!el.querySelector('.rz')) {
      ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach((d) => {
        const h = document.createElement('i');
        h.className = `rz rz-${d}`;
        h.dataset.dir = d;
        el.appendChild(h);
      });
    }

    el.addEventListener('pointerdown', () => this.focus(id), true);
    this.bindDrag(el, id);
    this.bindResize(el, id);
    this.wins.set(id, { el, open: false, min: false, max: false });
  },

  labelOf(id) {
    const el = this.wins.get(id).el;
    const t = el.querySelector('.win-title');
    const use = t.querySelector('use');
    return {
      icon: use ? use.getAttribute('href') : '#i-folder',
      text: t.textContent.trim()
    };
  },

  /* ---------------- ouverture / fermeture ---------------- */

  open(id, { focusIn = true, silent = false } = {}) {
    const w = this.wins.get(id);
    if (!w) return;
    const { el } = w;

    if (w.open && !w.min) { this.focus(id); return; }

    el.hidden = false;
    el.classList.remove('is-closing', 'is-min');
    if (!w.open && !isMobile()) this.place(el, id);
    w.open = true;
    w.min = false;
    el.classList.add('is-open');
    setTimeout(() => el.classList.remove('is-open'), 260);

    this.focus(id);
    if (focusIn) setTimeout(() => el.focus({ preventScroll: true }), 30);
    if (!silent) sfx.open();
    this.sync();
  },

  close(id) {
    const w = this.wins.get(id);
    if (!w || !w.open) return;
    const { el } = w;
    w.open = false;
    w.min = false;
    this.order = this.order.filter((x) => x !== id);
    el.classList.add('is-closing');
    const done = () => { el.hidden = true; el.classList.remove('is-closing'); };
    el.addEventListener('animationend', done, { once: true });
    setTimeout(() => { if (!el.hidden && !w.open) done(); }, 400);
    sfx.close();
    this.sync();
    const next = this.order[this.order.length - 1];
    if (next) this.focus(next);
  },

  closeAll() {
    [...this.wins.keys()].forEach((id) => { if (this.wins.get(id).open) this.close(id); });
  },

  minimize(id) {
    const w = this.wins.get(id);
    if (!w || !w.open || w.min) return;
    w.min = true;
    w.el.classList.add('is-min');
    w.el.addEventListener('animationend', () => {
      if (w.min) { w.el.hidden = true; w.el.classList.remove('is-min'); }
    }, { once: true });
    this.order = this.order.filter((x) => x !== id);
    sfx.close();
    this.sync();
  },

  toggleTask(id) {
    const w = this.wins.get(id);
    if (!w) return;
    if (w.min || !w.open) this.open(id);
    else if (this.order[this.order.length - 1] === id) this.minimize(id);
    else this.focus(id);
  },

  focus(id) {
    const w = this.wins.get(id);
    if (!w || !w.open || w.min) return;
    w.el.style.zIndex = ++this.z;
    this.order = this.order.filter((x) => x !== id);
    this.order.push(id);
    this.wins.forEach((v, k) => v.el.classList.toggle('is-focus', k === id));
    this.sync();
  },

  toggleMax(id) {
    const w = this.wins.get(id);
    if (!w || isMobile()) return;
    w.max = !w.max;
    w.el.classList.toggle('is-max', w.max);
    const b = w.el.querySelector('.win-btn.max');
    if (b) b.innerHTML = w.max ? CTRL_SVG.restore : CTRL_SVG.max;
    if (!w.max) this.saveGeo(id);
  },

  /* ---------------- position ---------------- */

  place(el, id) {
    const saved = this.geo()[id];
    const maxW = innerWidth - 20;
    const maxH = innerHeight - TB - 20;
    let w = Math.min(+el.dataset.w || 720, maxW);
    let h = Math.min(+el.dataset.h || 540, maxH);
    let x = +el.dataset.x || 120;
    let y = +el.dataset.y || 70;

    if (saved) { w = Math.min(saved.w, maxW); h = Math.min(saved.h, maxH); x = saved.x; y = saved.y; }
    else {
      // Cascade : chaque nouvelle fenêtre se décale un peu.
      const n = this.order.length;
      x += n * 26;
      y += n * 22;
    }

    x = Math.max(8, Math.min(x, innerWidth - w - 8));
    y = Math.max(8, Math.min(y, innerHeight - TB - 60));

    Object.assign(el.style, { width: `${w}px`, height: `${h}px`, left: `${x}px`, top: `${y}px` });
  },

  clampAll() {
    if (isMobile()) return;
    this.wins.forEach((w, id) => {
      if (!w.open || w.max) return;
      const el = w.el;
      const r = el.getBoundingClientRect();
      const x = Math.max(8, Math.min(r.left, innerWidth - Math.min(r.width, innerWidth - 16) - 8));
      const y = Math.max(8, Math.min(r.top, innerHeight - TB - 50));
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.width = `${Math.min(r.width, innerWidth - 16)}px`;
    });
  },

  geo() {
    try { return JSON.parse(localStorage.getItem(GEO_KEY)) || {}; } catch { return {}; }
  },

  saveGeo(id) {
    if (isMobile()) return;
    const w = this.wins.get(id);
    if (!w || w.max) return;
    const r = w.el.getBoundingClientRect();
    const all = this.geo();
    all[id] = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
    try { localStorage.setItem(GEO_KEY, JSON.stringify(all)); } catch { /* mode privé */ }
  },

  /* ---------------- déplacement + ancrage ---------------- */

  bindDrag(el, id) {
    const head = el.querySelector('.win-head');
    if (!head) return;
    const hint = document.getElementById('snap-hint');
    let sx = 0, sy = 0, ox = 0, oy = 0, snap = null, dragging = false;

    head.addEventListener('pointerdown', (e) => {
      if (isMobile() || e.button !== 0 || e.target.closest('.win-btn')) return;
      const w = this.wins.get(id);
      if (w.max) {
        // Un glissement sur une fenêtre maximisée la restaure sous le curseur.
        this.toggleMax(id);
        const r = el.getBoundingClientRect();
        el.style.left = `${e.clientX - r.width / 2}px`;
        el.style.top = '10px';
      }
      dragging = true;
      const r = el.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
      el.classList.add('is-drag');
      head.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    head.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const x = ox + (e.clientX - sx);
      const y = Math.max(0, oy + (e.clientY - sy));
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;

      snap = e.clientY <= EDGE ? 'max'
           : e.clientX <= EDGE ? 'left'
           : e.clientX >= innerWidth - EDGE ? 'right'
           : null;

      if (snap) {
        const h = innerHeight - TB;
        const box = snap === 'max' ? [0, 0, innerWidth, h]
                  : snap === 'left' ? [0, 0, innerWidth / 2, h]
                  : [innerWidth / 2, 0, innerWidth / 2, h];
        Object.assign(hint.style, { left: `${box[0]}px`, top: `${box[1]}px`, width: `${box[2]}px`, height: `${box[3]}px` });
        hint.classList.add('on');
      } else hint.classList.remove('on');
    });

    const end = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('is-drag');
      hint.classList.remove('on');
      if (snap === 'max') this.toggleMax(id);
      else if (snap) {
        const h = innerHeight - TB;
        Object.assign(el.style, {
          left: snap === 'left' ? '0px' : `${innerWidth / 2}px`,
          top: '0px', width: `${innerWidth / 2}px`, height: `${h}px`
        });
      }
      snap = null;
      this.saveGeo(id);
    };
    head.addEventListener('pointerup', end);
    head.addEventListener('pointercancel', end);

    head.addEventListener('dblclick', (e) => {
      if (e.target.closest('.win-btn')) return;
      this.toggleMax(id);
    });
  },

  /* ---------------- redimensionnement ---------------- */

  bindResize(el, id) {
    let dir = null, sx = 0, sy = 0, r0 = null;

    el.addEventListener('pointerdown', (e) => {
      const h = e.target.closest('.rz');
      if (!h || isMobile()) return;
      dir = h.dataset.dir;
      sx = e.clientX; sy = e.clientY;
      r0 = el.getBoundingClientRect();
      el.classList.add('is-drag');
      h.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    el.addEventListener('pointermove', (e) => {
      if (!dir) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      let { left: x, top: y, width: w, height: hgt } = r0;
      if (dir.includes('e')) w = r0.width + dx;
      if (dir.includes('s')) hgt = r0.height + dy;
      if (dir.includes('w')) { w = r0.width - dx; x = r0.left + dx; }
      if (dir.includes('n')) { hgt = r0.height - dy; y = r0.top + dy; }
      w = Math.max(320, Math.min(w, innerWidth - 8));
      hgt = Math.max(220, Math.min(hgt, innerHeight - TB));
      Object.assign(el.style, { width: `${w}px`, height: `${hgt}px`, left: `${Math.max(0, x)}px`, top: `${Math.max(0, y)}px` });
    });

    const stop = () => {
      if (!dir) return;
      dir = null;
      el.classList.remove('is-drag');
      this.saveGeo(id);
    };
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
  },

  /* ---------------- barre des tâches ---------------- */

  sync() {
    const bar = document.getElementById('tb-tasks');
    if (!bar) return;
    const opened = [...this.wins.entries()].filter(([, w]) => w.open);
    const top = this.order[this.order.length - 1];

    bar.innerHTML = opened.map(([id, w]) => {
      const { icon, text } = this.labelOf(id);
      const on = id === top && !w.min;
      return `<button class="tb-task${on ? ' is-focus' : ''}" data-task="${id}" aria-label="${text}" title="${text}">
        <svg class="ic"><use href="${icon}"/></svg><span>${text}</span></button>`;
    }).join('');

    this.onChange(opened.map(([id]) => id), top);
  },

  /* ---------------- clavier ---------------- */

  bindGlobalKeys() {
    document.getElementById('tb-tasks')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-task]');
      if (b) this.toggleTask(b.dataset.task);
    });

    addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName);

      // Alt+Tab : fenêtre suivante
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        const live = this.order.filter((id) => this.wins.get(id)?.open);
        if (live.length > 1) this.focus(live[e.shiftKey ? live.length - 2 : 0]);
        return;
      }
      if (e.key === 'Escape') {
        const top = this.order[this.order.length - 1];
        if (top) { this.close(top); e.preventDefault(); }
        return;
      }
      // Ctrl + flèches : ancrage de la fenêtre au premier plan
      if (e.ctrlKey && !typing && ['ArrowLeft', 'ArrowRight', 'ArrowUp'].includes(e.key)) {
        const top = this.order[this.order.length - 1];
        if (!top || isMobile()) return;
        e.preventDefault();
        const el = this.wins.get(top).el;
        if (e.key === 'ArrowUp') { if (!this.wins.get(top).max) this.toggleMax(top); return; }
        if (this.wins.get(top).max) this.toggleMax(top);
        Object.assign(el.style, {
          left: e.key === 'ArrowLeft' ? '0px' : `${innerWidth / 2}px`,
          top: '0px', width: `${innerWidth / 2}px`, height: `${innerHeight - TB}px`
        });
        this.saveGeo(top);
      }
    });
  }
};
