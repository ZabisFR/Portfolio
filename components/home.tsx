'use client';

/* Orchestre les deux mondes : la scène 3D d'accueil et l'OS.
   La 3D ne bloque jamais l'accès au contenu : elle se saute, se souvient
   d'avoir été vue, et n'est pas chargée du tout si le système demande moins
   d'animations ou ne sait pas faire de WebGL. */

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PROJECTS } from '@/content/projects';
import { AVAILABILITY, ROLE } from '@/content/site';
import type { SceneMode } from './three/desk-scene';
import { OS } from './os/os';
import { usePrefs } from './os/prefs';

const loadScene = () => import('./three/desk-scene');
const DeskScene = dynamic(loadScene, { ssr: false });

type Phase = 'scene' | 'entering' | 'os' | 'exiting';

/* Liens profonds de l'ancienne version statique (#projets, #p/arabe…) :
   ils ont pu être partagés, on les redirige vers la bonne fenêtre. */
const LEGACY_WIN: Record<string, string> = {
  about: 'about', apps: 'apps', applications: 'apps', projets: 'projects', projects: 'projects',
  terminal: 'terminal', skills: 'terminal', contact: 'contact', legal: 'legal', mentions: 'legal',
};
const LEGACY_PROJECT: Record<string, string> = {
  arabe: 'arabe-egyptien', muscu: 'muscu', urbex: 'lobby-urbex', gestuel: 'experience-gestuelle',
  portfolio: 'evanos', crozatier: 'musee-crozatier', fillia: 'filia', fracture: 'fracture',
};
function legacyHash(hash: string): string | undefined {
  const h = decodeURIComponent(hash.replace(/^#/, '')).toLowerCase();
  if (!h) return undefined;
  if (h.startsWith('p/')) { const slug = LEGACY_PROJECT[h.slice(2)]; return slug ? `project:${slug}` : undefined; }
  return LEGACY_WIN[h];
}

function canUse3D() {
  if (typeof window === 'undefined') return false;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    /* contexte de test rendu tout de suite : le navigateur en limite le nombre */
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch { return false; }
}

const seenIntro = () => { try { return sessionStorage.getItem('evanos.entered') === '1'; } catch { return false; } };

/* La scène pèse l'essentiel du JavaScript : son téléchargement part dès
   l'évaluation de ce module, en parallèle de l'hydratation, au lieu
   d'attendre le premier rendu. Seulement si elle va vraiment s'afficher. */
if (typeof window !== 'undefined'
  && !matchMedia('(prefers-reduced-motion: reduce)').matches
  && !seenIntro()
  && !new URLSearchParams(location.search).get('open')
  && !legacyHash(location.hash)) {
  loadScene();
}

export default function Home() {
  const { prefs } = usePrefs();
  const lang = prefs.lang;
  const [phase, setPhase] = useState<Phase | null>(null);
  const [ready3D, setReady3D] = useState(false);
  /* Projet cliqué sur l'étagère : on plonge dans l'écran, puis on l'ouvre dans l'OS. */
  const [pending, setPending] = useState<string | undefined>(undefined);
  const [initialWindow, setInitialWindow] = useState<string | undefined>(undefined);
  const flash = useRef<HTMLDivElement>(null);

  /* Choix de la phase de départ, côté client uniquement. */
  useEffect(() => {
    const open = new URLSearchParams(location.search).get('open') ?? legacyHash(location.hash);
    setInitialWindow(open);
    const ok = canUse3D();
    setReady3D(ok);
    setPhase(!ok || seenIntro() || open ? 'os' : 'scene');
  }, []);

  const enter = useCallback(() => setPhase((p) => (p === 'scene' ? 'entering' : p)), []);
  const exit = useCallback(() => {
    if (!ready3D) return;
    try { sessionStorage.removeItem('evanos.entered'); } catch { /* ignore */ }
    setPhase('exiting');
  }, [ready3D]);

  const onProgress = useCallback((t: number) => {
    /* Le flash monte sur le dernier quart de la plongée : on « traverse » la dalle. */
    if (flash.current) flash.current.style.opacity = String(Math.max(0, (t - 0.72) / 0.28));
  }, []);

  const onDone = useCallback((mode: SceneMode) => {
    if (mode === 'enter') {
      try { sessionStorage.setItem('evanos.entered', '1'); } catch { /* ignore */ }
      setPhase('os');
    } else if (mode === 'exit') {
      setPhase('scene');
    }
  }, []);

  /* Raccourcis : Entrée ou Espace pour entrer, Échap pour passer l'intro. */
  useEffect(() => {
    if (phase !== 'scene') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); enter(); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [phase, enter]);

  if (phase === null) return <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)' }} />;

  const sceneMounted = ready3D && phase !== 'os';
  const mode: SceneMode = phase === 'entering' ? 'enter' : phase === 'exiting' ? 'exit' : 'idle';

  return (
    <>
      {phase === 'os' || phase === 'exiting' ? (
        <OS initialWindow={pending ?? initialWindow} onBackTo3D={ready3D ? exit : undefined} />
      ) : null}

      {sceneMounted && (
        <div className="scene-wrap" data-phase={phase}>
          <DeskScene
            mode={mode}
            accent={prefs.accent}
            projects={PROJECTS}
            lang={lang}
            onEnterRequest={enter}
            onOpenProject={(slug) => { setPending(`project:${slug}`); enter(); }}
            onProgress={onProgress}
            onDone={onDone}
          />
          <div ref={flash} className="scene-flash" aria-hidden="true" />

          {phase === 'scene' && (
            <>
              <p className="scene-hint">
                <span className="hint-fine">
                  {lang === 'en'
                    ? 'Click the screen to enter · hover the framed photos to preview a project'
                    : 'Cliquez sur l’écran pour entrer · survolez les cadres pour voir un projet'}
                </span>
                <span className="hint-touch">
                  {lang === 'en' ? 'Tap the screen or a framed photo' : 'Touchez l’écran ou un cadre'}
                </span>
              </p>
              <div className="scene-ui">
                <div className="scene-title">
                  <h1>Evan <em>Pouteau</em></h1>
                  <p>{ROLE[lang]}</p>
                  <span className="scene-badge"><i />{AVAILABILITY[lang]}</span>
                </div>
                <div className="scene-actions">
                  <button className="btn btn-primary" onClick={enter} autoFocus>
                    {lang === 'en' ? 'Enter the desktop' : 'Entrer dans le bureau'}
                  </button>
                  <button className="btn" onClick={() => { setPending('gallery'); enter(); }}>
                    {lang === 'en' ? 'Browse projects in 3D' : 'Parcourir les projets en 3D'}
                  </button>
                  <a className="btn" href={lang === 'en' ? '/assets/docs/CV-Evan-Pouteau-EN.pdf' : '/assets/docs/CV-Evan-Pouteau-FR.pdf'} download>
                    {lang === 'en' ? 'Download CV' : 'Télécharger le CV'}
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
