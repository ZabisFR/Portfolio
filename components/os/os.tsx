'use client';
import './os.css';

/* Le bureau : icônes, couche de fenêtres en relief, barre des tâches,
   menu Démarrer, paramètres rapides et notifications. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon, type IconName } from './icons';
import { WindowManager, Window, useWM, useIsMobile, TASKBAR } from './wm';
import { ACCENTS, resetPrefs, usePrefs } from './prefs';
import { PROJECTS, bySlug, type L } from '@/content/projects';
import { SITE } from '@/content/site';
import { AboutWin, AppsWin, ContactWin, LegalWin, ProjectsWin, ProjectWin, ViewerWin, type ViewerPayload } from './windows';
import { TerminalWin } from './terminal';
import { GalleryWin } from './gallery-win';
import { sfx } from './sfx';

/* -------------------------------------------------------- registre des fenêtres */

type Def = { title: L; icon: IconName; size: { w: number; h: number }; body?: string };

const DEFS: Record<string, Def> = {
  about: { title: { fr: 'Ce PC — Evan Pouteau', en: 'This PC — Evan Pouteau' }, icon: 'user', size: { w: 760, h: 620 } },
  apps: { title: { fr: 'Mes applications', en: 'My apps' }, icon: 'apps', size: { w: 1000, h: 680 } },
  projects: { title: { fr: 'Projets', en: 'Projects' }, icon: 'folder', size: { w: 1000, h: 640 }, body: 'p-0' },
  gallery: { title: { fr: 'Galerie 3D', en: '3D Gallery' }, icon: 'cube', size: { w: 1080, h: 700 }, body: 'p-0' },
  terminal: { title: { fr: 'Windows PowerShell', en: 'Windows PowerShell' }, icon: 'terminal', size: { w: 700, h: 520 }, body: 'term-body' },
  contact: { title: { fr: 'Nouveau message', en: 'New message' }, icon: 'mail', size: { w: 640, h: 600 } },
  legal: { title: { fr: 'Mentions légales', en: 'Legal notice' }, icon: 'scale', size: { w: 780, h: 620 }, body: 'p-0' },
  viewer: { title: { fr: 'Visionneuse', en: 'Viewer' }, icon: 'folder', size: { w: 900, h: 680 }, body: 'p-0' },
};

const DESKTOP: { id: string; icon: IconName; label: L; accent?: boolean }[] = [
  { id: 'about', icon: 'user', label: { fr: 'Ce PC', en: 'This PC' } },
  { id: 'apps', icon: 'apps', label: { fr: 'Mes applications', en: 'My apps' }, accent: true },
  { id: 'projects', icon: 'folder', label: { fr: 'Projets', en: 'Projects' } },
  { id: 'gallery', icon: 'cube', label: { fr: 'Galerie 3D', en: '3D Gallery' } },
  { id: 'terminal', icon: 'terminal', label: { fr: 'Terminal', en: 'Terminal' } },
  { id: 'contact', icon: 'mail', label: { fr: 'Contact', en: 'Contact' } },
];

/* ------------------------------------------------------------------ racine */

export function OS(props: { initialWindow?: string; onBackTo3D?: () => void }) {
  return (
    <WindowManager>
      <Desktop {...props} />
    </WindowManager>
  );
}

function Desktop({ initialWindow, onBackTo3D }: { initialWindow?: string; onBackTo3D?: () => void }) {
  const wm = useWM();
  const { prefs, setPrefs } = usePrefs();
  const lang = prefs.lang;
  const mobile = useIsMobile();
  const [panel, setPanel] = useState<'start' | 'quick' | null>(null);
  const [toast, setToast] = useState<null | { title: string; body: string; cta?: string; action?: () => void }>(null);
  const layer = useRef<HTMLDivElement>(null);

  /* Ouvrir une fenêtre de premier niveau, une fiche projet ou la visionneuse. */
  const openWin = useCallback((id: string, payload?: unknown) => {
    const proj = id.startsWith('project:') ? bySlug(id.slice(8)) : null;
    const def = DEFS[id];
    wm.open(id, { size: proj ? { w: 820, h: 620 } : def?.size, payload });
    setPanel(null);
  }, [wm]);

  const openViewer = useCallback((p: ViewerPayload) => openWin('viewer', p), [openWin]);

  /* Fenêtre demandée par l'URL (lien profond depuis une page projet, etc.) */
  useEffect(() => {
    if (initialWindow) openWin(initialWindow);
    else {
      const t = setTimeout(() => { sfx.toast(); setToast({
        title: 'Evan Pouteau',
        body: lang === 'en'
          ? 'Seeking a web development internship for spring 2027. Two apps in production — have a look.'
          : 'Recherche un stage en développement web pour le printemps 2027. Deux applications en production — jetez-y un œil.',
        cta: lang === 'en' ? 'See my apps' : 'Voir mes applications',
        action: () => openWin('apps'),
      }); }, 1200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Inclinaison de toute la couche de fenêtres selon le pointeur. */
  useEffect(() => {
    if (!prefs.depth || mobile) {
      layer.current?.style.setProperty('--rx', '0deg');
      layer.current?.style.setProperty('--ry', '0deg');
      return;
    }
    let raf = 0, tx = 0, ty = 0, x = 0, y = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / innerWidth - 0.5) * 2;
      ty = (e.clientY / innerHeight - 0.5) * 2;
    };
    const loop = () => {
      x += (tx - x) * 0.06; y += (ty - y) * 0.06;
      layer.current?.style.setProperty('--ry', `${(x * 2.2).toFixed(3)}deg`);
      layer.current?.style.setProperty('--rx', `${(-y * 1.6).toFixed(3)}deg`);
      raf = requestAnimationFrame(loop);
    };
    addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => { removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, [prefs.depth, mobile]);

  /* Fermer les panneaux au clic extérieur ; touche Windows ou « ? » pour le menu. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA)$/.test((document.activeElement as HTMLElement)?.tagName);
      if (e.key === 'Meta' || (e.key === '?' && !typing)) { e.preventDefault(); setPanel((p) => (p === 'start' ? null : 'start')); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  const ranks = useMemo(() => {
    const r: Record<string, number> = {};
    [...wm.order].reverse().forEach((id, i) => { r[id] = i; });
    return r;
  }, [wm.order]);

  const titleOf = (id: string) => {
    if (id.startsWith('project:')) return bySlug(id.slice(8))?.name[lang] ?? id;
    if (id === 'viewer') return (wm.wins.viewer?.payload as ViewerPayload | undefined)?.name ?? DEFS.viewer.title[lang];
    return DEFS[id]?.title[lang] ?? id;
  };
  const iconOf = (id: string): IconName => (id.startsWith('project:') ? 'apps' : DEFS[id]?.icon ?? 'folder');

  const render = (id: string) => {
    const ctx = { openWin, openViewer, lang };
    if (id.startsWith('project:')) return <ProjectWin slug={id.slice(8)} {...ctx} />;
    switch (id) {
      case 'about': return <AboutWin {...ctx} />;
      case 'apps': return <AppsWin {...ctx} />;
      case 'projects': return <ProjectsWin {...ctx} />;
      case 'gallery': return <GalleryWin {...ctx} />;
      case 'terminal': return <TerminalWin {...ctx} />;
      case 'contact': return <ContactWin {...ctx} />;
      case 'legal': return <LegalWin {...ctx} />;
      case 'viewer': return <ViewerWin payload={wm.wins.viewer?.payload as ViewerPayload} />;
      default: return null;
    }
  };

  const tasks = Object.values(wm.wins).sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="os" onClick={() => setPanel(null)}>
      {/* barre d'état façon téléphone, sur mobile */}
      <div className="statusbar" aria-hidden="true">
        <Clock />
        <span className="sb-right"><Icon name="wifi" size={15} /><span className="sb-batt" /></span>
      </div>

      <main className="desktop" aria-label={lang === 'en' ? 'Desktop' : 'Bureau'}>
        <h1 className="sr-only">Evan Pouteau — portfolio</h1>
        <ul className="desktop-icons">
          {DESKTOP.map((d) => (
            <li key={d.id}>
              <button className="desktop-icon" onClick={(e) => { e.stopPropagation(); openWin(d.id); }}>
                <span className={`ic-tile${d.accent ? ' accent' : ''}`}><Icon name={d.icon} size={25} /></span>
                <span className="ic-label">{d.label[lang]}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="desktop-hint">
          {lang === 'en'
            ? <>Drag the windows, snap them to the edges, or press <kbd>?</kbd> for the Start menu.</>
            : <>Glissez les fenêtres, ancrez-les aux bords, ou tapez <kbd>?</kbd> pour le menu Démarrer.</>}
        </p>
      </main>

      {/* couche de fenêtres, en perspective */}
      <div ref={layer} className={`win-layer${prefs.depth && !mobile ? ' is-3d' : ''}`} onClick={(e) => e.stopPropagation()}>
        {Object.keys(wm.wins).map((id) => (
          <Window
            key={id}
            id={id}
            title={titleOf(id)}
            icon={iconOf(id)}
            rank={ranks[id] ?? 0}
            depth={prefs.depth}
            bodyClass={id.startsWith('project:') ? 'case' : DEFS[id]?.body ?? ''}
          >
            {render(id)}
          </Window>
        ))}
      </div>

      {/* ---------------------------------------------------- menu Démarrer */}
      {panel === 'start' && (
        <div className="panel start-menu" role="dialog" aria-label={lang === 'en' ? 'Start menu' : 'Menu Démarrer'} onClick={(e) => e.stopPropagation()}>
          <StartMenu lang={lang} openWin={openWin} onBackTo3D={onBackTo3D} onShutdown={() => { wm.closeAll(); setPanel(null); onBackTo3D?.(); }} />
        </div>
      )}

      {/* ----------------------------------------------- paramètres rapides */}
      {panel === 'quick' && (
        <div className="panel quick" role="dialog" aria-label={lang === 'en' ? 'Quick settings' : 'Paramètres rapides'} onClick={(e) => e.stopPropagation()}>
          <div className="quick-row">
            <button className="quick-tile" aria-pressed={prefs.theme === 'dark'} onClick={() => setPrefs({ theme: prefs.theme === 'dark' ? 'light' : 'dark' })}>
              <Icon name={prefs.theme === 'dark' ? 'moon' : 'sun'} size={18} />
              <span>{prefs.theme === 'dark' ? (lang === 'en' ? 'Dark theme' : 'Thème sombre') : (lang === 'en' ? 'Light theme' : 'Thème clair')}</span>
            </button>
            <button className="quick-tile" aria-pressed={prefs.depth} onClick={() => setPrefs({ depth: !prefs.depth })}>
              <Icon name="layers" size={18} /><span>{lang === 'en' ? '3D windows' : 'Fenêtres 3D'}</span>
            </button>
            <button className="quick-tile" onClick={() => setPrefs({ lang: lang === 'fr' ? 'en' : 'fr' })}>
              <Icon name="globe" size={18} /><span>{lang === 'fr' ? 'English' : 'Français'}</span>
            </button>
            <button className="quick-tile" aria-pressed={prefs.sound} onClick={() => { const on = !prefs.sound; setPrefs({ sound: on }); if (on) sfx.test(); }}>
              <Icon name={prefs.sound ? 'volume' : 'mute'} size={18} /><span>{lang === 'en' ? 'Sounds' : 'Sons'}</span>
            </button>
          </div>
          <p className="panel-label">{lang === 'en' ? 'Accent colour' : 'Couleur d’accentuation'}</p>
          <div className="swatches" role="group">
            {ACCENTS.map(([hex, name]) => (
              <button key={hex} className="swatch" style={{ background: hex }} aria-label={name[lang]} title={name[lang]}
                aria-pressed={hex === prefs.accent} onClick={() => setPrefs({ accent: hex })} />
            ))}
          </div>
          <button className="quick-reset" onClick={() => { resetPrefs(); location.reload(); }}>
            <Icon name="reset" size={15} />{lang === 'en' ? 'Reset preferences' : 'Réinitialiser les préférences'}
          </button>
        </div>
      )}

      {/* ---------------------------------------------------- notification */}
      {toast && (
        <div className="toasts" role="region" aria-live="polite" onClick={(e) => e.stopPropagation()}>
          <div className="toast">
            <div className="toast-ic"><Icon name="apps" size={19} /></div>
            <div>
              <b>{toast.title}</b>
              <p>{toast.body}</p>
              {toast.cta && <button className="btn btn-primary btn-sm" onClick={() => { toast.action?.(); setToast(null); }}>{toast.cta}</button>}
            </div>
            <button className="toast-x" aria-label={lang === 'en' ? 'Close' : 'Fermer'} onClick={() => setToast(null)}>✕</button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------- barre des tâches */}
      <footer className="taskbar" style={{ height: TASKBAR }} onClick={(e) => e.stopPropagation()}>
        <div className="tb-center">
          <button className="tb-start" aria-label={lang === 'en' ? 'Start menu' : 'Menu Démarrer'} aria-expanded={panel === 'start'}
            onClick={() => { sfx.click(); setPanel((p) => (p === 'start' ? null : 'start')); }}>
            <span className="winlogo"><i /><i /><i /><i /></span>
          </button>
          <div className="tb-tasks">
            {tasks.map((w) => (
              <button key={w.id} className={`tb-task${wm.top === w.id && !w.min ? ' is-focus' : ''}`}
                title={titleOf(w.id)} onClick={() => wm.toggleTask(w.id)}>
                <Icon name={iconOf(w.id)} size={17} /><span>{titleOf(w.id)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="tb-right">
          <button className="tb-tray" aria-label={lang === 'en' ? 'Quick settings' : 'Paramètres rapides'} aria-expanded={panel === 'quick'}
            onClick={() => setPanel((p) => (p === 'quick' ? null : 'quick'))}>
            <Icon name="wifi" size={17} /><Icon name={prefs.sound ? 'volume' : 'mute'} size={17} /><Icon name="settings" size={17} />
          </button>
          <button className="tb-clock" onClick={() => openWin('legal')} aria-label={lang === 'en' ? 'Legal notice' : 'Mentions légales'}>
            <Clock /><DateLabel lang={lang} />
          </button>
        </div>
      </footer>

      {/* barre d'accueil, sur mobile */}
      <div className="home-bar" aria-hidden="true"><button onClick={() => wm.closeAll()} /></div>
    </div>
  );
}

/* ----------------------------------------------------------- menu Démarrer */

function StartMenu({ lang, openWin, onBackTo3D, onShutdown }: {
  lang: 'fr' | 'en';
  openWin: (id: string) => void;
  onBackTo3D?: () => void;
  onShutdown: () => void;
}) {
  const [q, setQ] = useState('');
  const apps: { id: string; icon: IconName; label: L }[] = [
    ...DESKTOP,
    { id: 'legal', icon: 'scale', label: { fr: 'Mentions légales', en: 'Legal notice' } },
  ];
  const projects = PROJECTS.filter((p) => !q || p.name[lang].toLowerCase().includes(q.toLowerCase()));
  const shown = apps.filter((a) => !q || a.label[lang].toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <label className="search search-lg">
        <Icon name="search" size={15} />
        <input autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={lang === 'en' ? 'Search apps and projects' : 'Rechercher une application ou un projet'} />
      </label>
      <p className="panel-label">{lang === 'en' ? 'Pinned' : 'Épinglé'}</p>
      <div className="start-grid">
        {shown.map((a) => (
          <button key={a.id} className="start-app" onClick={() => openWin(a.id)}>
            <Icon name={a.icon} size={24} /><span>{a.label[lang]}</span>
          </button>
        ))}
      </div>
      {q && projects.length > 0 && (
        <>
          <p className="panel-label">{lang === 'en' ? 'Projects' : 'Projets'}</p>
          <div className="start-list">
            {projects.map((p) => (
              <button key={p.slug} onClick={() => openWin(`project:${p.slug}`)}>
                <span className="sl-dot" style={{ background: p.three.color }} />{p.name[lang]}<i>{p.type[lang]}</i>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="start-foot">
        <div className="start-user"><img src="/assets/images/profil.webp" width={32} height={32} alt="" /><span>Evan Pouteau</span></div>
        <div className="start-foot-btns">
          {onBackTo3D && (
            <button className="iconbtn" onClick={onBackTo3D} title={lang === 'en' ? 'Back to the 3D desk' : 'Retour au bureau 3D'}
              aria-label={lang === 'en' ? 'Back to the 3D desk' : 'Retour au bureau 3D'}>
              <Icon name="cube" size={18} />
            </button>
          )}
          <a className="iconbtn" href={SITE.cv[lang]} download title={lang === 'en' ? 'Download CV' : 'Télécharger le CV'}
            aria-label={lang === 'en' ? 'Download CV' : 'Télécharger le CV'}>
            <Icon name="download" size={18} />
          </a>
          <button className="iconbtn" onClick={onShutdown} title={lang === 'en' ? 'Shut down' : 'Arrêter'}
            aria-label={lang === 'en' ? 'Shut down' : 'Arrêter'}>
            <Icon name="power" size={18} />
          </button>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------- horloge */

function Clock() {
  const [t, setT] = useState('');
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const iv = setInterval(tick, 10000);
    return () => clearInterval(iv);
  }, []);
  return <span suppressHydrationWarning>{t}</span>;
}

function DateLabel({ lang }: { lang: 'fr' | 'en' }) {
  const [d, setD] = useState('');
  useEffect(() => { setD(new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR')); }, [lang]);
  return <span className="tb-date" suppressHydrationWarning>{d}</span>;
}
