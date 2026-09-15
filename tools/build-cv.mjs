/* Génère assets/docs/CV-Evan-Pouteau.pdf à partir de tools/cv.html.
   Prérequis : npx playwright install chromium (une seule fois).
   Usage     : node tools/build-cv.mjs [--force]

   ATTENTION : le CV en ligne est un PDF fait à la main, pas celui de ce modèle.
   Le script refuse donc d'écraser un fichier existant sans --force.          */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'docs', 'CV-Evan-Pouteau.pdf');

if (fs.existsSync(OUT) && !process.argv.includes('--force')) {
  console.error([
    'Refus : assets/docs/CV-Evan-Pouteau.pdf existe déjà.',
    'C’est probablement ton vrai CV. Pour l’écraser volontairement :',
    '  node tools/build-cv.mjs --force'
  ].join('\n'));
  process.exit(1);
}

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('playwright-core')); }

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(ROOT, 'tools', 'cv.html')).href, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.pdf({
  path: OUT,
  format: 'A4',
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 }
});
await browser.close();
console.log('assets/docs/CV-Evan-Pouteau.pdf');
