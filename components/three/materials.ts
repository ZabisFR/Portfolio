/* Géométries et textures procédurales partagées par les scènes.
   Tout est généré dans le navigateur : aucune image de matière à télécharger. */

import * as THREE from 'three';

/** Rectangle aux coins arrondis, avec des UV ramenées sur 0..1 pour qu'une
 *  image s'y plaque sans déformation. */
export function roundedRect(w: number, h: number, r: number, segments = 8) {
  const x = -w / 2, y = -h / 2;
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, segments);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (pos.getX(i) - x) / w, (pos.getY(i) - y) / h);
  }
  uv.needsUpdate = true;
  return g;
}

/* Petit générateur pseudo-aléatoire déterministe : la même graine donne
   toujours le même bois, d'un chargement à l'autre. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

let woodCache: { map: THREE.CanvasTexture; rough: THREE.CanvasTexture } | null = null;

/** Bois de noyer : veines longues, nœuds discrets, et une carte de rugosité
 *  assortie pour que le vernis accroche la lumière le long du fil. */
export function walnut() {
  if (woodCache || typeof document === 'undefined') return woodCache!;
  const W = 1024, H = 512;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const r = document.createElement('canvas'); r.width = W; r.height = H;
  const g = c.getContext('2d')!, gr = r.getContext('2d')!;
  const rand = rng(42);

  g.fillStyle = '#5a3f2b'; g.fillRect(0, 0, W, H);
  gr.fillStyle = '#8a8a8a'; gr.fillRect(0, 0, W, H);

  /* veines : bandes ondulées de teintes voisines */
  for (let i = 0; i < 170; i++) {
    const y0 = rand() * H;
    const amp = 2 + rand() * 9;
    const freq = 0.004 + rand() * 0.01;
    const phase = rand() * Math.PI * 2;
    const light = rand() > 0.5;
    g.strokeStyle = light ? `rgba(140,98,64,${0.05 + rand() * 0.14})` : `rgba(38,24,14,${0.06 + rand() * 0.18})`;
    gr.strokeStyle = light ? 'rgba(110,110,110,.25)' : 'rgba(170,170,170,.25)';
    g.lineWidth = gr.lineWidth = 0.6 + rand() * 2.6;
    g.beginPath(); gr.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const y = y0 + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.1) * amp * 0.25;
      if (x === 0) { g.moveTo(x, y); gr.moveTo(x, y); } else { g.lineTo(x, y); gr.lineTo(x, y); }
    }
    g.stroke(); gr.stroke();
  }
  /* deux nœuds */
  for (let k = 0; k < 2; k++) {
    const cx = 200 + rand() * 600, cy = 80 + rand() * 350;
    for (let i = 14; i > 0; i--) {
      g.strokeStyle = `rgba(35,22,12,${0.05 + i * 0.006})`;
      g.lineWidth = 1.4;
      g.beginPath(); g.ellipse(cx, cy, i * 5.2, i * 1.8, 0, 0, Math.PI * 2); g.stroke();
    }
  }
  /* grain fin */
  const img = g.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 14;
    img.data[i] += n; img.data[i + 1] += n * 0.8; img.data[i + 2] += n * 0.6;
  }
  g.putImageData(img, 0, 0);

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;
  const rough = new THREE.CanvasTexture(r);
  rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
  woodCache = { map, rough };
  return woodCache;
}

/** Feutre sombre pour le tapis de bureau : bruit très fin, sans motif. */
export function felt(color = '#1a1d24') {
  const S = 256;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = color; g.fillRect(0, 0, S, S);
  const img = g.getImageData(0, 0, S, S);
  const rand = rng(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 12;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1.5);
  return t;
}
