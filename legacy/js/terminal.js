/* Terminal interactif.
   Remplace l'ancien bloc PowerShell statique : ici on tape vraiment des
   commandes, et elles pilotent le reste du bureau. */

import { PROJECTS, SKILLS } from './data.js';
import { sfx } from './sfx.js';

const PROMPT = 'PS <span class="ps-path">C:\\Users\\Evan&gt;</span>';

export function initTerminal(app) {
  const out = document.getElementById('term-out');
  const input = document.getElementById('term-input');
  const body = document.getElementById('term-body');
  if (!out || !input) return { boot() {} };

  const hist = [];
  let hIdx = -1;
  let booted = false;

  const isEn = () => app.lang() === 'en';
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  function write(html, cls = '') {
    const d = document.createElement('div');
    d.className = `term-line ${cls}`;
    d.innerHTML = html;
    out.appendChild(d);
    body.scrollTop = body.scrollHeight;
    return d;
  }
  const blank = () => write('&nbsp;');

  /* Écriture caractère par caractère, coupée si l'utilisateur préfère
     moins d'animation. */
  function type(html, cls = '', speed = 9) {
    return new Promise((res) => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { write(html, cls); return res(); }
      const el = write('', cls);
      const txt = html;
      let i = 0;
      const step = () => {
        i += 3;
        el.innerHTML = txt.slice(0, i);
        body.scrollTop = body.scrollHeight;
        if (i < txt.length) setTimeout(step, speed); else { el.innerHTML = txt; res(); }
      };
      step();
    });
  }

  const CMDS = {
    help: {
      fr: 'la liste des commandes', en: 'list the commands',
      run() {
        write(isEn() ? '<span class="t-head">AVAILABLE COMMANDS</span>' : '<span class="t-head">COMMANDES DISPONIBLES</span>');
        Object.entries(CMDS).forEach(([name, c]) => {
          write(`  <span class="t-key">${name.padEnd(12, '\u00a0')}</span><span class="t-dim">${isEn() ? c.en : c.fr}</span>`);
        });
        blank();
        write(`<span class="t-dim">${isEn() ? 'Tab completes, \u2191 \u2193 browse history.' : 'Tab compl\u00e8te, \u2191 \u2193 parcourent l\u2019historique.'}</span>`);
      }
    },
    whoami: {
      fr: 'qui je suis, en trois lignes', en: 'who I am, in three lines',
      run() {
        write('<span class="t-key">Evan Pouteau</span>');
        write(isEn()
          ? 'Second-year BUT MMI student, front-end web developer.'
          : '\u00c9tudiant en 2\u1d49 ann\u00e9e de BUT MMI, d\u00e9veloppeur web front-end.');
        write(isEn()
          ? 'Two Next.js + Supabase apps in production. Seeking a web development internship, 12 April to 18 June 2027.'
          : 'Deux applications Next.js + Supabase en production. Recherche un stage en d\u00e9veloppement web du 12 avril au 18 juin 2027.');
        blank();
        write(`<button class="t-a" data-open="win-about">${isEn() ? 'Open the full profile \u2192' : 'Ouvrir la fiche compl\u00e8te \u2192'}</button>`);
      }
    },
    skills: {
      fr: 'mes comp\u00e9tences techniques', en: 'my technical skills',
      run() {
        SKILLS.forEach(([fr, en, rows]) => {
          write(`<span class="t-head">[${isEn() ? en : fr}]</span>`);
          rows.forEach(([k, vf, ve]) => {
            write(`  <span class="t-key">${k.padEnd(26, '\u00a0')}</span><span class="t-val">=> ${isEn() ? ve : vf}</span>`);
          });
          blank();
        });
      }
    },
    projets: {
      fr: 'la liste de mes projets', en: 'list my projects',
      run() {
        write(`<span class="t-head">${isEn() ? 'PROJECTS' : 'PROJETS'}</span>`);
        PROJECTS.forEach((p) => {
          const star = p.star ? '<span class="t-val">\u2605</span> ' : '  ';
          write(`  ${star}<span class="t-key">${p.id.padEnd(12, '\u00a0')}</span><span class="t-dim">${esc(isEn() && p.name_en ? p.name_en : p.name)} \u2014 ${esc(isEn() && p.desc_en ? p.desc_en : p.desc)}</span>`);
        });
        blank();
        write(`<span class="t-dim">${isEn() ? 'Type' : 'Tapez'} <span class="t-key">open &lt;id&gt;</span> ${isEn() ? 'to open one.' : 'pour en ouvrir un.'}</span>`);
      }
    },
    open: {
      fr: 'ouvrir un projet : open arabe', en: 'open a project: open arabe',
      run(args) {
        const id = (args[0] || '').toLowerCase();
        if (!id) { write(isEn() ? 'Usage: open &lt;id&gt;' : 'Usage : open &lt;id&gt;', 't-err'); return; }
        const p = PROJECTS.find((x) => x.id === id);
        if (!p) { write(`${isEn() ? 'Unknown project' : 'Projet inconnu'} : ${esc(id)}`, 't-err'); sfx.error(); return; }
        write(`${isEn() ? 'Opening' : 'Ouverture de'} ${esc(p.name)}\u2026`, 't-dim');
        app.openProject(p.id);
      }
    },
    apps: {
      fr: 'mes deux applications en production', en: 'my two production apps',
      run() {
        write('<span class="t-head">' + (isEn() ? 'IN PRODUCTION' : 'EN PRODUCTION') + '</span>');
        write('  <span class="t-key">Arabe \u00e9gyptien</span> <span class="t-dim">Next.js \u00b7 Supabase \u00b7 30 modules, 141 le\u00e7ons</span>');
        write('  <span class="t-key">Muscu</span>          <span class="t-dim">Next.js \u00b7 Supabase \u00b7 Recharts \u2014 ' + (isEn() ? 'private app' : 'application priv\u00e9e') + '</span>');
        blank();
        write(`<button class="t-a" data-open="win-apps">${isEn() ? 'Open the showcase \u2192' : 'Ouvrir la vitrine \u2192'}</button>`);
      }
    },
    cv: {
      fr: 't\u00e9l\u00e9charger mon CV', en: 'download my CV',
      run() {
        const file = isEn() ? 'CV-Evan-Pouteau-EN.pdf' : 'CV-Evan-Pouteau-FR.pdf';
        write(`${isEn() ? 'Downloading' : 'T\u00e9l\u00e9chargement de'} ${file}\u2026`, 't-dim');
        const a = document.createElement('a');
        a.href = `/assets/docs/${file}`;
        a.download = '';
        a.click();
        write(`<span class="t-dim">${isEn()
          ? 'The French version is available too \u2014 type <span class="t-key">lang</span> then <span class="t-key">cv</span>.'
          : 'La version anglaise existe aussi \u2014 tapez <span class="t-key">lang</span> puis <span class="t-key">cv</span>.'}</span>`);
      }
    },
    contact: {
      fr: 'comment me joindre', en: 'how to reach me',
      run() {
        write('  <span class="t-key">email   </span><span class="t-val">pouteaue78@gmail.com</span>');
        write('  <span class="t-key">linkedin</span><span class="t-val">in/evan-pouteau-06a9a7342</span>');
        blank();
        write(`<button class="t-a" data-open="win-contact">${isEn() ? 'Write a message \u2192' : '\u00c9crire un message \u2192'}</button>`);
      }
    },
    theme: {
      fr: 'basculer clair / sombre', en: 'toggle light / dark',
      run() { app.toggleTheme(); write(isEn() ? 'Theme switched.' : 'Th\u00e8me bascul\u00e9.', 't-dim'); }
    },
    lang: {
      fr: 'basculer fran\u00e7ais / anglais', en: 'toggle French / English',
      run() { app.toggleLang(); }
    },
    shortcuts: {
      fr: 'les raccourcis clavier', en: 'keyboard shortcuts',
      run() {
        const rows = [
          ['Alt + Tab', isEn() ? 'next window' : 'fen\u00eatre suivante'],
          ['Esc', isEn() ? 'close the front window' : 'fermer la fen\u00eatre au premier plan'],
          ['Ctrl + \u2190 / \u2192', isEn() ? 'snap to half the screen' : 'ancrer sur une moiti\u00e9 d\u2019\u00e9cran'],
          ['Ctrl + \u2191', isEn() ? 'maximise' : 'maximiser'],
          [isEn() ? 'Win key or ?' : 'Touche Win ou ?', isEn() ? 'open the Start menu' : 'ouvrir le menu D\u00e9marrer'],
          ['Tab', isEn() ? 'navigate everything by keyboard' : 'naviguer partout au clavier']
        ];
        write(`<span class="t-head">${isEn() ? 'SHORTCUTS' : 'RACCOURCIS'}</span>`);
        rows.forEach(([k, v]) => write(`  <span class="t-key">${k.padEnd(20, '\u00a0')}</span><span class="t-dim">${v}</span>`));
      }
    },
    clear: { fr: 'nettoyer l\u2019\u00e9cran', en: 'clear the screen', run() { out.innerHTML = ''; } },
    sudo: {
      fr: '\u2026', en: '\u2026',
      run() {
        write(isEn()
          ? 'Evan is not in the sudoers file. This incident will be reported.'
          : 'Evan n\u2019est pas dans le fichier sudoers. Cet incident sera signal\u00e9.', 't-err');
        sfx.error();
      }
    },
    exit: {
      fr: 'fermer le terminal', en: 'close the terminal',
      run() { app.close('win-terminal'); }
    }
  };
  CMDS.projects = CMDS.projets;
  CMDS.ls = CMDS.projets;

  function run(raw) {
    const line = raw.trim();
    write(`<span class="ps-prompt">${PROMPT}</span> <span class="ps-cmd">${esc(line)}</span>`);
    if (!line) return;
    hist.unshift(line);
    hIdx = -1;
    const [name, ...args] = line.split(/\s+/);
    const cmd = CMDS[name.toLowerCase()];
    if (cmd) { cmd.run(args); }
    else {
      write(`${esc(name)} : ${isEn() ? 'command not found.' : 'commande introuvable.'}`, 't-err');
      write(`<span class="t-dim">${isEn() ? 'Type' : 'Tapez'} <span class="t-key">help</span>.</span>`);
      sfx.error();
    }
    blank();
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { run(input.value); input.value = ''; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (hIdx < hist.length - 1) input.value = hist[++hIdx]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); input.value = hIdx > 0 ? hist[--hIdx] : (hIdx = -1, ''); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const v = input.value.toLowerCase();
      const m = Object.keys(CMDS).filter((c) => c.startsWith(v));
      if (m.length === 1) input.value = m[0];
      else if (m.length > 1) write(`<span class="t-dim">${m.join('  ')}</span>`);
    }
    e.stopPropagation();   // ne pas déclencher les raccourcis globaux
  });

  body.addEventListener('click', (e) => {
    const b = e.target.closest('.t-a');
    if (b) { app.open(b.dataset.open); return; }
    if (!getSelection().toString()) input.focus();
  });

  async function boot() {
    if (booted) { input.focus(); return; }
    booted = true;
    out.innerHTML = '';
    write('<span class="t-dim">Windows PowerShell \u2014 EvanOS build 2026.9</span>');
    blank();
    await type(`<span class="ps-prompt">${PROMPT}</span> <span class="ps-cmd">.\\whoami.ps1</span>`);
    CMDS.whoami.run();
    blank();
    write(`<span class="t-dim">${isEn() ? 'Type' : 'Tapez'} <span class="t-key">help</span> ${isEn() ? 'to see everything this terminal can do.' : 'pour voir tout ce que ce terminal sait faire.'}</span>`);
    blank();
    input.focus();
  }

  return { boot, reset() { booted = false; out.innerHTML = ''; } };
}
