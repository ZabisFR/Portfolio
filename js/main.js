/* Point d'entrée : séquence de démarrage, préférences, panneaux, explorateur,
   liens profonds et tout ce qui relie les modules entre eux. */

import { PROJECTS, CATS } from './data.js';
import { EN } from './i18n.js';
import { WM, isMobile } from './wm.js';
import { sfx } from './sfx.js';
import { startBackground } from './bg.js';
import { initTerminal } from './terminal.js';

/* ------------------------------------------------------------------ prefs */

const PREF = 'evanos.prefs';
const defaults = {
  theme: matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
  lang: (navigator.language || 'fr').startsWith('en') ? 'en' : 'fr',
  sound: false,
  accent: '#4cc2ff'
};
let prefs = { ...defaults };
try { prefs = { ...defaults, ...JSON.parse(localStorage.getItem(PREF) || '{}') }; } catch { /* mode privé */ }
const savePrefs = () => { try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch { /* ignore */ } };

const ACCENTS = [
  ['#4cc2ff', 'Bleu'], ['#7c5cff', 'Violet'], ['#22c55e', 'Vert'],
  ['#f59e0b', 'Ambre'], ['#f43f5e', 'Rose'], ['#14b8a6', 'Turquoise']
];

const bg = startBackground();

/* ----------------------------------------------------------------- i18n */

const origin = new WeakMap();
const t = (k, ...a) => {
  const v = (prefs.lang === 'en' ? EN[k] : null) ?? FR[k] ?? k;
  return typeof v === 'function' ? v(...a) : v;
};

/* Chaînes françaises produites par le JavaScript (leur pendant anglais est
   dans i18n.js). */
const FR = {
  'js.min': 'Réduire', 'js.max': 'Agrandir', 'js.restore': 'Restaurer', 'js.close': 'Fermer',
  'js.toast.title': 'Evan Pouteau',
  'js.toast.body': 'En recherche d\u2019alternance pour septembre 2027. Deux applications en production \u2014 jetez-y un \u0153il.',
  'js.toast.cta': 'Voir mes applications',
  'js.copied': 'Adresse copiée dans le presse-papiers.',
  'js.copied.t': 'Presse-papiers',
  'js.count': (n) => `${n} élément${n > 1 ? 's' : ''}`,
  'js.back': 'Retour aux projets',
  'js.viewer': 'Visionneuse',
  'js.shortcuts.t': 'Raccourcis clavier',
  'js.lang': 'English'
};

function applyLang() {
  const lang = prefs.lang;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const k = el.dataset.i18n;
    if (!origin.has(el)) origin.set(el, el.innerHTML);
    el.innerHTML = lang === 'en' ? (EN[k] ?? origin.get(el)) : origin.get(el);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const k = el.dataset.i18nPh;
    if (!origin.has(el)) origin.set(el, el.placeholder);
    el.placeholder = lang === 'en' ? (EN[k] ?? origin.get(el)) : origin.get(el);
  });
  document.querySelectorAll('[data-i18n-al]').forEach((el) => {
    const k = el.dataset.i18nAl;
    if (!origin.has(el)) origin.set(el, el.getAttribute('aria-label'));
    el.setAttribute('aria-label', lang === 'en' ? (EN[k] ?? origin.get(el)) : origin.get(el));
  });
  const ll = document.getElementById('q-lang-label');
  if (ll) ll.textContent = t('js.lang');
  document.querySelectorAll('.win-btn').forEach((b) => {
    const a = b.dataset.act;
    b.setAttribute('aria-label', t(a === 'min' ? 'js.min' : a === 'max' ? 'js.max' : 'js.close'));
  });
  renderProjects();
  WM.sync();
}

/* ---------------------------------------------------------------- thème */

function applyTheme() {
  document.documentElement.dataset.theme = prefs.theme;
  document.documentElement.style.setProperty('--accent', prefs.accent);
  document.documentElement.style.setProperty('--glow', `${prefs.accent}33`);
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', prefs.theme === 'light' ? '#e9edf5' : '#080c14');
  bg.setAccent(prefs.accent);
  bg.setTheme(prefs.theme);
  const qt = document.getElementById('q-theme');
  if (qt) {
    qt.setAttribute('aria-pressed', String(prefs.theme === 'dark'));
    qt.querySelector('use').setAttribute('href', prefs.theme === 'dark' ? '#i-moon' : '#i-sun');
    qt.querySelector('span').textContent = prefs.lang === 'en'
      ? (prefs.theme === 'dark' ? 'Dark theme' : 'Light theme')
      : (prefs.theme === 'dark' ? 'Thème sombre' : 'Thème clair');
  }
}

function applySound() {
  sfx.enabled = prefs.sound;
  const icon = prefs.sound ? '#i-volume' : '#i-mute';
  document.querySelector('#tray-sound use')?.setAttribute('href', icon);
  const qs = document.getElementById('q-sound');
  if (qs) {
    qs.setAttribute('aria-pressed', String(prefs.sound));
    qs.querySelector('use').setAttribute('href', icon);
  }
}

/* -------------------------------------------------------------- horloges */

function tick() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const time = `${hh}:${mm}`;
  const date = now.toLocaleDateString(prefs.lang === 'en' ? 'en-GB' : 'fr-FR');
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('tb-time', time); set('tb-date', date); set('sb-time', time); set('lock-time', time);
  const ld = document.getElementById('lock-date');
  if (ld) ld.textContent = now.toLocaleDateString(prefs.lang === 'en' ? 'en-GB' : 'fr-FR',
    { weekday: 'long', day: 'numeric', month: 'long' });
}

/* ------------------------------------------------------------ explorateur */

let cat = 'all';
let view = 'grid';
let query = '';

const pName = (p) => (prefs.lang === 'en' && p.name_en) ? p.name_en : p.name;
const pDesc = (p) => (prefs.lang === 'en' && p.desc_en) ? p.desc_en : p.desc;
const pType = (p) => (prefs.lang === 'en' && p.type_en) ? p.type_en : p.type;

function matches(p) {
  if (cat !== 'all' && p.cat !== cat) return false;
  if (!query) return true;
  const hay = `${p.name} ${p.name_en || ''} ${p.desc} ${p.type} ${p.tags.join(' ')}`.toLowerCase();
  return hay.includes(query);
}

function renderProjects() {
  const host = document.getElementById('proj-list');
  if (!host) return;
  const list = PROJECTS.filter(matches);

  host.className = view === 'grid' ? 'proj-grid' : 'proj-list';
  host.innerHTML = list.map((p) => view === 'grid'
    ? `<button class="proj-card${p.star ? ' is-star' : ''}" data-proj="${p.id}">
         <span class="pc-icon"><svg class="ic"><use href="#${p.icon}"/></svg></span>
         <h4>${pName(p)}</h4>
         <p>${pDesc(p)}</p>
         <span class="pc-foot">${p.year} · ${pType(p)}</span>
       </button>`
    : `<button class="proj-row" data-proj="${p.id}">
         <svg class="ic"><use href="#${p.icon}"/></svg>
         <span class="r-name">${p.star ? '★ ' : ''}${pName(p)}</span>
         <span class="r-type">${pType(p)}</span>
         <span class="r-year">${p.year}</span>
       </button>`).join('');

  const empty = document.getElementById('proj-empty');
  if (empty) empty.hidden = list.length > 0;
  const count = document.getElementById('proj-count');
  if (count) count.textContent = t('js.count', list.length);
  const crumb = document.getElementById('crumb-cat');
  if (crumb) crumb.textContent = CATS[cat][prefs.lang];

  document.querySelectorAll('.cat').forEach((b) => {
    const c = b.dataset.cat;
    const n = PROJECTS.filter((p) => c === 'all' || p.cat === c).length;
    b.querySelector('.count').textContent = n;
    b.classList.toggle('is-on', c === cat);
  });
}

/* --------------------------------------------- fenêtres de projet générées */

function openProject(id) {
  const p = PROJECTS.find((x) => x.id === id);
  if (!p) return;
  if (p.win) { WM.open(p.win); syncHash(p.win); return; }

  const winId = `win-p-${p.id}`;
  if (!document.getElementById(winId)) buildProjectWindow(p, winId);
  else fillProjectWindow(p, winId);
  WM.open(winId);
  syncHash(winId);
}

function buildProjectWindow(p, winId) {
  const el = document.createElement('section');
  el.className = 'os-window';
  el.id = winId;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', p.name);
  el.hidden = true;
  el.dataset.w = 760; el.dataset.h = 560; el.dataset.x = 220; el.dataset.y = 90;
  el.innerHTML = `<header class="win-head">
      <div class="win-title"><svg class="ic"><use href="#${p.icon}"/></svg><span></span></div>
      <div class="win-btns"></div>
    </header>
    <div class="win-body case"></div>`;
  document.body.appendChild(el);
  WM.register(el);
  fillProjectWindow(p, winId);
}

function fillProjectWindow(p, winId) {
  const el = document.getElementById(winId);
  const en = prefs.lang === 'en';
  const d = p.detail || { blocks: [] };
  el.querySelector('.win-title span').textContent = pName(p);

  const meta = `<dl class="case-meta">
      <div><dt>${en ? 'Year' : 'Année'}</dt><dd>${p.year}</dd></div>
      <div><dt>${en ? 'Role' : 'Rôle'}</dt><dd>${en && d.role_en ? d.role_en : (d.role || '—')}</dd></div>
      <div><dt>${en ? 'Context' : 'Contexte'}</dt><dd>${en && d.ctx_en ? d.ctx_en : (d.ctx || '—')}</dd></div>
      <div><dt>Type</dt><dd>${pType(p)}</dd></div>
    </dl>`;

  const blocks = (d.blocks || []).map(([fr, enh, body]) =>
    `<h3 class="h3">${en ? enh : fr}</h3><p>${body}</p>`).join('');

  const note = d.note ? `<p class="note">${en && d.note_en ? d.note_en : d.note}</p>` : '';
  const tags = `<div class="tags">${p.tags.map((x) => `<span>${x}</span>`).join('')}</div>`;

  const links = (d.links || []).map(([fr, enl, href]) => {
    const label = en ? enl : fr;
    const v = href.match(/^view:([a-z]+):(.+)$/);
    if (v) return `<button class="btn btn-primary" data-view="${v[1]}" data-src="${v[2]}">${label}</button>`;
    if (href === '#shortcuts') return `<button class="btn" data-shortcuts>${label}</button>`;
    const ext = /^https?:/.test(href);
    return `<a class="btn btn-primary" href="${href}"${ext ? ' target="_blank" rel="noopener"' : ' target="_blank"'}>
      <svg class="ic"><use href="#i-external"/></svg>${label}</a>`;
  }).join('');

  el.querySelector('.win-body').innerHTML =
    `<p class="lede">${pDesc(p)}</p>${tags}${meta}${blocks}${note}
     <div class="row-actions">${links}
       <button class="btn" data-open="win-projects">${t('js.back')}</button>
     </div>`;
}

/* ------------------------------------------------------------ visionneuse */

function openViewer(kind, src) {
  const body = document.getElementById('viewer-body');
  const name = decodeURIComponent(src.split('/').pop());
  document.getElementById('viewer-name').textContent = name;
  body.innerHTML = kind === 'image'
    ? `<img src="${src}" alt="${name}">`
    : `<iframe src="${src}" title="${name}"></iframe>`;
  WM.open('win-viewer');
}

/* ------------------------------------------------------- notifications */

function toast({ title, body, cta, action, icon = '#i-mail', timeout = 11000 }) {
  const host = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="toast-ic"><svg class="ic"><use href="${icon}"/></svg></div>
    <div><b>${title}</b><p>${body}</p>${cta ? `<button class="btn btn-primary">${cta}</button>` : ''}</div>
    <button class="toast-x" aria-label="Fermer">✕</button>`;
  host.appendChild(el);
  sfx.toast();
  const kill = () => {
    el.classList.add('is-out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  };
  el.querySelector('.toast-x').onclick = kill;
  const b = el.querySelector('.btn');
  if (b) b.onclick = () => { action?.(); kill(); };
  if (timeout) setTimeout(kill, timeout);
}

/* ------------------------------------------------------------- panneaux */

function panel(id, btnId) {
  const el = document.getElementById(id);
  const btn = document.getElementById(btnId);
  const close = () => { el.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  const open = () => {
    document.querySelectorAll('.panel').forEach((p) => { if (p !== el) p.hidden = true; });
    document.querySelectorAll('[aria-expanded]').forEach((b) => { if (b !== btn) b.setAttribute('aria-expanded', 'false'); });
    el.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    sfx.click();
    el.querySelector('input, button')?.focus({ preventScroll: true });
  };
  btn.addEventListener('click', (e) => { e.stopPropagation(); el.hidden ? open() : close(); });
  el.addEventListener('click', (e) => e.stopPropagation());
  return { open, close, el, toggle: () => (el.hidden ? open() : close()) };
}

/* ------------------------------------------------------- liens profonds */

const HASH = {
  about: 'win-about', apps: 'win-apps', applications: 'win-apps',
  projets: 'win-projects', projects: 'win-projects',
  terminal: 'win-terminal', skills: 'win-terminal',
  contact: 'win-contact', legal: 'win-legal', mentions: 'win-legal'
};

/* Ouverture centralisée : toutes les entrées (clic, lien profond, terminal)
   passent par ici, pour que le hash et l'amorçage du terminal suivent. */
function openWin(id, opts) {
  WM.open(id, opts);
  syncHash(id);
  if (id === 'win-terminal') setTimeout(() => term?.boot(), 260);
}

function syncHash(winId) {
  const key = Object.keys(HASH).find((k) => HASH[k] === winId);
  const proj = PROJECTS.find((p) => (p.win || `win-p-${p.id}`) === winId);
  const h = key ? `#${key}` : proj ? `#p/${proj.id}` : '';
  if (h) history.replaceState(null, '', h);
}

function fromHash() {
  const h = decodeURIComponent(location.hash.replace(/^#/, '')).toLowerCase();
  if (!h) return null;
  if (h.startsWith('p/')) {
    const p = PROJECTS.find((x) => x.id === h.slice(2));
    return p ? { proj: p.id } : null;
  }
  return HASH[h] ? { win: HASH[h] } : null;
}

/* ------------------------------------------------------------ démarrage */

const bootEl = document.getElementById('boot');
const lockEl = document.getElementById('lock');
let term;

function hide(el) {
  el.classList.add('is-out');
  el.addEventListener('animationend', () => { el.hidden = true; el.classList.remove('is-out'); }, { once: true });
  setTimeout(() => { el.hidden = true; el.classList.remove('is-out'); }, 700);
}

function enterDesktop({ greet = true } = {}) {
  hide(lockEl);
  try { localStorage.setItem('evanos.seen', '1'); } catch { /* ignore */ }
  const target = fromHash();
  if (target?.win) openWin(target.win, { silent: true });
  else if (target?.proj) openProject(target.proj);
  else if (greet && !sessionStorage.getItem('evanos.toast')) {
    setTimeout(() => {
      toast({
        title: t('js.toast.title'),
        body: t('js.toast.body'),
        cta: t('js.toast.cta'),
        icon: '#i-apps',
        action: () => openWin('win-apps')
      });
      try { sessionStorage.setItem('evanos.toast', '1'); } catch { /* ignore */ }
    }, 1400);
  }
}

function startSequence() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seen = (() => { try { return localStorage.getItem('evanos.seen'); } catch { return null; } })();
  const deep = !!location.hash;

  if (reduce || seen || deep) {
    bootEl.hidden = true;
    lockEl.hidden = true;
    enterDesktop({ greet: !deep });
    return;
  }

  const msgs = ['Initialisation du noyau…', 'Montage de C:\\Users\\Evan…', 'Chargement du profil…', 'Prêt.'];
  const msgEl = bootEl.querySelector('.boot-msg');
  let i = 0;
  const iv = setInterval(() => { msgEl.textContent = msgs[++i] || msgs[3]; }, 520);

  const finish = () => {
    clearInterval(iv);
    hide(bootEl);
    lockEl.hidden = false;
    sfx.boot();
  };
  const timer = setTimeout(finish, 2300);
  document.getElementById('boot-skip').onclick = () => { clearTimeout(timer); finish(); };
}

function shutdown() {
  const sd = document.getElementById('shutdown');
  WM.closeAll();
  document.querySelectorAll('.panel').forEach((p) => { p.hidden = true; });
  sd.hidden = false;
  setTimeout(() => {
    sd.hidden = true;
    lockEl.hidden = false;
    lockEl.classList.remove('is-out');
    try { localStorage.removeItem('evanos.seen'); } catch { /* ignore */ }
    history.replaceState(null, '', location.pathname);
  }, 1900);
}

/* ------------------------------------------------------------------ init */

function init() {
  applyTheme();
  applySound();
  WM.init();
  applyLang();
  tick();
  setInterval(tick, 10000);

  const start = panel('start-menu', 'btn-start');
  const quick = panel('quick', 'btn-quick');
  document.addEventListener('click', () => { start.close(); quick.close(); });

  /* Ouverture par attribut, partout dans la page. */
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (o) {
      e.preventDefault();
      openWin(o.dataset.open);
      start.close(); quick.close();
      return;
    }
    const p = e.target.closest('[data-proj]');
    if (p) { openProject(p.dataset.proj); return; }
    const v = e.target.closest('[data-view]');
    if (v) { openViewer(v.dataset.view, v.dataset.src); return; }
    if (e.target.closest('[data-shortcuts]')) {
      openWin('win-terminal');
      setTimeout(() => { document.getElementById('term-input').value = 'shortcuts'; }, 320);
    }
  });

  /* Explorateur */
  document.querySelectorAll('.cat').forEach((b) => b.addEventListener('click', () => {
    cat = b.dataset.cat; sfx.click(); renderProjects();
  }));
  document.querySelectorAll('.vt').forEach((b) => b.addEventListener('click', () => {
    view = b.dataset.view;
    document.querySelectorAll('.vt').forEach((x) => {
      x.classList.toggle('is-on', x === b);
      x.setAttribute('aria-pressed', String(x === b));
    });
    renderProjects();
  }));
  document.getElementById('proj-search')?.addEventListener('input', (e) => {
    query = e.target.value.trim().toLowerCase(); renderProjects();
  });

  /* Onglets de la fenêtre juridique */
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => {
      const on = x === b;
      x.classList.toggle('is-on', on);
      x.setAttribute('aria-selected', String(on));
    });
    document.querySelectorAll('.tabpane').forEach((p) => { p.hidden = p.dataset.pane !== b.dataset.tab; });
  }));

  /* Contact : composition d'un mail, sans serveur */
  document.getElementById('mail-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('m-name').value.trim();
    const subj = document.getElementById('m-subject').value.trim();
    const body = document.getElementById('m-body').value.trim();
    const sig = prefs.lang === 'en' ? `\n\n— ${name}` : `\n\n— ${name}`;
    location.href = `mailto:pouteaue78@gmail.com?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body + sig)}`;
  });
  document.getElementById('m-copy')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('pouteaue78@gmail.com'); }
    catch { /* presse-papiers refusé */ }
    toast({ title: t('js.copied.t'), body: t('js.copied'), icon: '#i-mail', timeout: 4000 });
  });

  /* Paramètres rapides */
  document.getElementById('q-theme').onclick = () => {
    prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark'; savePrefs(); applyTheme(); sfx.click();
  };
  document.getElementById('q-sound').onclick = () => {
    prefs.sound = !prefs.sound; savePrefs(); applySound(); if (prefs.sound) sfx.open();
  };
  document.getElementById('q-lang').onclick = () => { toggleLang(); };
  document.getElementById('q-reset').onclick = () => {
    try { localStorage.removeItem('evanos.geo'); localStorage.removeItem(PREF); } catch { /* ignore */ }
    location.reload();
  };

  const sw = document.getElementById('swatches');
  sw.innerHTML = ACCENTS.map(([hex, name]) =>
    `<button class="swatch" style="background:${hex}" data-accent="${hex}" title="${name}" aria-label="${name}"
       aria-pressed="${hex === prefs.accent}"></button>`).join('');
  sw.addEventListener('click', (e) => {
    const b = e.target.closest('[data-accent]');
    if (!b) return;
    prefs.accent = b.dataset.accent; savePrefs(); applyTheme(); sfx.click();
    sw.querySelectorAll('.swatch').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  });

  /* Recherche du menu Démarrer */
  document.getElementById('start-search')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('.start-app').forEach((a) => {
      a.hidden = q ? !a.textContent.toLowerCase().includes(q) : false;
    });
  });

  document.getElementById('btn-shutdown').onclick = shutdown;
  document.getElementById('btn-home').onclick = () => WM.closeAll();
  document.getElementById('btn-clock').onclick = () => openWin('win-legal');
  document.getElementById('lock-enter').onclick = () => { sfx.click(); enterDesktop(); };
  lockEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') enterDesktop(); });

  /* Raccourcis globaux */
  addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName);
    if (e.key === 'Meta' || e.key === 'OS') { e.preventDefault(); start.toggle(); }
    else if (e.key === '?' && !typing) { e.preventDefault(); start.toggle(); }
  });

  /* Halo qui suit le curseur */
  const glow = document.getElementById('cursor-glow');
  if (glow && matchMedia('(hover: hover) and (pointer: fine)').matches
      && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
    addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; glow.classList.add('on'); }, { passive: true });
    (function loop() {
      x += (tx - x) * 0.12; y += (ty - y) * 0.12;
      glow.style.transform = `translate(${x}px, ${y}px)`;
      requestAnimationFrame(loop);
    })();
  }

  /* Terminal */
  term = initTerminal({
    lang: () => prefs.lang,
    open: (id) => openWin(id),
    close: (id) => WM.close(id),
    openProject,
    toggleTheme: () => { prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark'; savePrefs(); applyTheme(); },
    toggleLang
  });

  WM.onChange = () => { /* réservé : badge de titre, etc. */ };
  addEventListener('hashchange', () => {
    const tgt = fromHash();
    if (tgt?.win) openWin(tgt.win);
    else if (tgt?.proj) openProject(tgt.proj);
  });

  startSequence();
}

function toggleLang() {
  prefs.lang = prefs.lang === 'fr' ? 'en' : 'fr';
  savePrefs();
  applyLang();
  applyTheme();
  tick();
  term?.reset();
  if (!document.getElementById('win-terminal').hidden) term?.boot();
  document.querySelectorAll('.os-window[id^="win-p-"]').forEach((el) => {
    const p = PROJECTS.find((x) => `win-p-${x.id}` === el.id);
    if (p && !p.win) fillProjectWindow(p, el.id);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
