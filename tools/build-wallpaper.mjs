/* Génère public/assets/wallpaper/leaves.svg : silhouettes de feuillage pour
   le fond du bureau. Le SVG ne sert que de masque : sa couleur vient de la
   variable CSS --leaf, ce qui le rend lisible en thème clair comme sombre.
   Usage : node tools/build-wallpaper.mjs                                     */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'assets', 'wallpaper', 'leaves.svg');
const f = (n) => n.toFixed(1);

/* Feuille de monstera : contour en cœur, échancrures qui traversent le bord
   et trous près de la nervure. Les découpes passent par un <mask> : une
   simple règle evenodd remplirait la partie des échancrures hors du contour. */
let maskId = 0;
function monstera({ x, y, len, rot, slits = 5 }) {
  const id = `m${maskId++}`;
  const W = len * 0.55;
  const N = 40;
  const right = [], left = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const w = W * Math.pow(Math.sin(Math.PI * Math.min(u * 1.06, 1)), 0.7) * (1 - 0.22 * u);
    const yy = -u * len + (u < 0.1 ? (0.1 - u) * len * 1.1 : 0); // base en cœur
    right.push([w, yy]);
    left.push([-w, yy]);
  }
  const outline = `M0,0 ${right.map(([a, b]) => `L${f(a)},${f(b)}`).join(' ')} ${left.reverse().map(([a, b]) => `L${f(a)},${f(b)}`).join(' ')} Z`;
  let cuts = '';
  for (let k = 1; k <= slits; k++) {
    const u = 0.2 + (k / (slits + 1)) * 0.66;
    const w = W * Math.pow(Math.sin(Math.PI * u), 0.7) * (1 - 0.22 * u);
    const yy = -u * len;
    for (const s of [1, -1]) {
      /* échancrure : part bien au-delà du bord, s'arrête aux 2/5 vers la nervure */
      const ex = s * (w + len * 0.1), ey = yy - len * 0.06;
      const ix = s * w * 0.4, iy = yy - len * 0.035;
      cuts += ` M${f(ex)},${f(ey - len * 0.022)} L${f(ix)},${f(iy)} L${f(ex)},${f(ey + len * 0.022)} Z`;
    }
    if (k % 2 === 0) {
      for (const s of [1, -1]) {
        cuts += ` M${f(s * w * 0.2)},${f(yy + len * 0.02)} m-${f(len * 0.016)},0 a${f(len * 0.016)},${f(len * 0.028)} 0 1,0 ${f(len * 0.032)},0 a${f(len * 0.016)},${f(len * 0.028)} 0 1,0 -${f(len * 0.032)},0`;
      }
    }
  }
  const pad = len * 0.2;
  return `<mask id="${id}" maskUnits="userSpaceOnUse" x="${f(-W - pad)}" y="${f(-len - pad)}" width="${f(2 * W + 2 * pad)}" height="${f(len + 2 * pad)}">
<path fill="#fff" d="${outline}"/><path fill="#000" d="${cuts}"/></mask>
<g transform="translate(${x},${y}) rotate(${rot})"><rect x="${f(-W - pad)}" y="${f(-len - pad)}" width="${f(2 * W + 2 * pad)}" height="${f(len + 2 * pad)}" mask="url(#${id})"/><rect x="-3" y="0" width="6" height="${f(len * 0.45)}" rx="3"/></g>`;
}

/* Fougère : une tige courbe, des folioles qui raccourcissent vers la pointe. */
function fern({ x, y, len, rot, bend = 0.25 }) {
  let s = `<g transform="translate(${x},${y}) rotate(${rot})">`;
  const pts = [];
  for (let i = 0; i <= 30; i++) {
    const u = i / 30;
    pts.push([Math.sin(u * Math.PI * 0.5) * len * bend, -u * len]);
  }
  s += `<path d="M${pts.map(([a, b]) => `${f(a)},${f(b)}`).join(' L')}" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round"/>`;
  for (let i = 2; i < 29; i++) {
    const [px, py] = pts[i];
    const u = i / 30;
    const l = len * 0.16 * (1 - u * 0.85);
    for (const side of [1, -1]) {
      const a = side * 62 - 18;
      s += `<ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(l * 0.22)}" ry="${f(l / 2)}" transform="rotate(${a} ${f(px)} ${f(py)}) translate(0 ${f(-l / 2)})"/>`;
    }
  }
  return s + '</g>';
}

/* Branche d'eucalyptus : feuilles rondes alternées. */
function eucalyptus({ x, y, len, rot }) {
  let s = `<g transform="translate(${x},${y}) rotate(${rot})"><path d="M0,0 Q${f(len * 0.15)},${f(-len * 0.5)} 0,${f(-len)}" fill="none" stroke="#000" stroke-width="4"/>`;
  for (let i = 1; i < 11; i++) {
    const u = i / 11;
    const px = Math.sin(u * Math.PI) * len * 0.075, py = -u * len;
    const r = len * 0.06 * (1 - u * 0.4);
    const side = i % 2 ? 1 : -1;
    s += `<circle cx="${f(px + side * r * 0.9)}" cy="${f(py)}" r="${f(r)}"/>`;
  }
  return s + '</g>';
}

const W = 1600, H = 1000;
const parts = [
  /* coin haut droit */
  monstera({ x: 1590, y: 40, len: 360, rot: -132 }),
  monstera({ x: 1650, y: 330, len: 280, rot: -100, slits: 4 }),
  fern({ x: 1620, y: -20, len: 520, rot: -150, bend: -0.2 }),
  eucalyptus({ x: 1380, y: -30, len: 300, rot: -160 }),
  /* coin bas gauche */
  monstera({ x: 30, y: 1050, len: 390, rot: 36 }),
  monstera({ x: -70, y: 780, len: 270, rot: 72, slits: 4 }),
  fern({ x: 220, y: 1060, len: 480, rot: 12, bend: 0.3 }),
  eucalyptus({ x: 420, y: 1040, len: 260, rot: 28 }),
];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<g fill="#000">${parts.join('\n')}</g>
</svg>
`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, svg);
console.log(path.relative(ROOT, OUT), Math.round(svg.length / 1024) + ' Ko');
