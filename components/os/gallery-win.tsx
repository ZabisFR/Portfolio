'use client';

/* « Galerie 3D » : choisir un projet dans un carrousel 3D.
   Le carrousel est chargé seulement à l'ouverture de la fenêtre. Le panneau
   d'informations est du HTML ordinaire, synchronisé avec la carte de face :
   texte net, lisible par les lecteurs d'écran, et pilotable au clavier
   (← → pour tourner, Entrée pour ouvrir). */

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PROJECTS, CATEGORIES } from '@/content/projects';
import { Icon } from './icons';

const CarouselScene = dynamic(() => import('../three/carousel-scene'), {
  ssr: false,
  loading: () => <div className="gallery-loading">…</div>,
});

const N = PROJECTS.length;
const wrap = (i: number) => ((i % N) + N) % N;

export function GalleryWin({ openWin, lang }: { openWin: (id: string) => void; lang: 'fr' | 'en' }) {
  /* Cible non bornée : passer de la dernière carte à la première tourne
     d'un seul cran, sans faire le tour complet de l'anneau. */
  const [target, setTarget] = useState(0);
  const p = PROJECTS[wrap(target)];
  const en = lang === 'en';

  const open = useCallback((slug: string) => openWin(`project:${slug}`), [openWin]);
  const go = (delta: number) => setTarget((t) => t + delta);
  const root = useRef<HTMLDivElement>(null);
  const slugRef = useRef(p.slug);
  slugRef.current = p.slug;

  /* À l'ouverture, c'est la fenêtre qui prend le focus, pas le carrousel :
     on écoute donc le clavier dès que le focus est n'importe où dans la
     fenêtre de la galerie. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const win = root.current?.closest('.os-window');
      if (!win || !win.contains(document.activeElement)) return;
      if ((document.activeElement as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); setTarget((t) => t + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setTarget((t) => t - 1); }
      else if (e.key === 'Enter' && document.activeElement === win) { e.preventDefault(); open(slugRef.current); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div
      ref={root}
      className="carousel"
      aria-roledescription={en ? 'carousel' : 'carrousel'}
      aria-label={en ? 'Projects in 3D' : 'Projets en 3D'}
    >
      <CarouselScene target={target} onTarget={setTarget} onOpen={open} />

      <div className="carousel-top">
        <span className="carousel-count">{String(wrap(target) + 1).padStart(2, '0')}<i> / {String(N).padStart(2, '0')}</i></span>
        <span className="carousel-cat" style={{ color: p.three.color }}>{CATEGORIES[p.category][lang]}</span>
      </div>

      <div className="carousel-info" aria-live="polite">
        <div className="carousel-text">
          <p className="carousel-kicker">{p.type[lang]} · {p.year}</p>
          <h2>{p.name[lang]}</h2>
          <p className="carousel-tag">{p.tagline[lang]}</p>
          <div className="tags">{p.tags.slice(0, 5).map((t) => <span key={t}>{t}</span>)}</div>
        </div>
        <div className="carousel-ctrl">
          <button className="iconbtn round" onClick={() => go(-1)} aria-label={en ? 'Previous project' : 'Projet précédent'}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button className="btn btn-primary" onClick={() => open(p.slug)}>
            {en ? 'Open the project' : 'Ouvrir le projet'}<Icon name="external" size={16} />
          </button>
          <button className="iconbtn round" onClick={() => go(1)} aria-label={en ? 'Next project' : 'Projet suivant'}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      <div className="carousel-dots" role="tablist" aria-label={en ? 'Choose a project' : 'Choisir un projet'}>
        {PROJECTS.map((q, i) => {
          const on = i === wrap(target);
          return (
            <button
              key={q.slug}
              role="tab"
              aria-selected={on}
              aria-label={q.name[lang]}
              className={on ? 'is-on' : ''}
              style={on ? { background: q.three.color } : undefined}
              onClick={() => {
                /* aller à la carte i par le chemin le plus court */
                const cur = wrap(target);
                let d = i - cur;
                if (d > N / 2) d -= N;
                if (d < -N / 2) d += N;
                go(d);
              }}
            />
          );
        })}
      </div>

      <p className="carousel-hint">{en ? 'Drag, scroll or use ← → · Enter to open' : 'Glissez, faites défiler ou utilisez ← → · Entrée pour ouvrir'}</p>
    </div>
  );
}
