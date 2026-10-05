'use client';

/* Gestionnaire de fenêtres.
   ---------------------------------------------------------------------------
   L'état (ouverte, réduite, agrandie, ordre, géométrie) vit dans un reducer.
   Le déplacement et le redimensionnement, eux, écrivent directement dans le
   style pendant le geste — un rendu React par image serait inutilement coûteux
   — puis valident la géométrie finale dans l'état au relâchement. */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState,
  type ReactNode, type PointerEvent as RPointerEvent,
} from 'react';
import { Icon, type IconName } from './icons';
import { sfx } from './sfx';

export const TASKBAR = 52;
const EDGE = 8;
const GEO_KEY = 'evanos.geo';

export type Geom = { x: number; y: number; w: number; h: number };

export type WinState = {
  id: string;
  open: boolean;
  min: boolean;
  max: boolean;
  z: number;
  geom: Geom;
  /** Charge utile libre (ex. : le fichier affiché par la visionneuse). */
  payload?: unknown;
};

type Action =
  | { t: 'open'; id: string; geom: Geom; payload?: unknown }
  | { t: 'close'; id: string }
  | { t: 'min'; id: string }
  | { t: 'max'; id: string; value?: boolean }
  | { t: 'focus'; id: string }
  | { t: 'geom'; id: string; geom: Geom }
  | { t: 'closeAll' };

type State = { wins: Record<string, WinState>; z: number };

function reducer(s: State, a: Action): State {
  switch (a.t) {
    case 'open': {
      const prev = s.wins[a.id];
      const z = s.z + 1;
      return {
        z,
        wins: {
          ...s.wins,
          [a.id]: prev?.open
            ? { ...prev, min: false, z, payload: a.payload ?? prev.payload }
            : { id: a.id, open: true, min: false, max: false, z, geom: a.geom, payload: a.payload },
        },
      };
    }
    case 'close': {
      const { [a.id]: _gone, ...rest } = s.wins;
      return { ...s, wins: rest };
    }
    case 'min':
      return s.wins[a.id] ? { ...s, wins: { ...s.wins, [a.id]: { ...s.wins[a.id], min: true } } } : s;
    case 'max': {
      const w = s.wins[a.id];
      if (!w) return s;
      return { ...s, wins: { ...s.wins, [a.id]: { ...w, max: a.value ?? !w.max } } };
    }
    case 'focus': {
      const w = s.wins[a.id];
      if (!w || w.min) return s;
      const z = s.z + 1;
      return { z, wins: { ...s.wins, [a.id]: { ...w, z } } };
    }
    case 'geom': {
      const w = s.wins[a.id];
      return w ? { ...s, wins: { ...s.wins, [a.id]: { ...w, geom: a.geom } } } : s;
    }
    case 'closeAll':
      return { ...s, wins: {} };
  }
}

/* ------------------------------------------------------------- persistance */

function loadGeo(): Record<string, Geom> {
  try { return JSON.parse(localStorage.getItem(GEO_KEY) || '{}'); } catch { return {}; }
}
function saveGeo(id: string, g: Geom) {
  try { const all = loadGeo(); all[id] = g; localStorage.setItem(GEO_KEY, JSON.stringify(all)); } catch { /* ignore */ }
}

export function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const q = matchMedia('(max-width: 820px), (pointer: coarse) and (max-width: 1024px)');
    const on = () => setM(q.matches);
    on();
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  return m;
}

/* ------------------------------------------------------------------ contexte */

type WM = {
  wins: Record<string, WinState>;
  order: string[];
  top: string | undefined;
  open: (id: string, opts?: { size?: Partial<Geom>; payload?: unknown }) => void;
  close: (id: string) => void;
  minimize: (id: string) => void;
  toggleMax: (id: string, value?: boolean) => void;
  focus: (id: string) => void;
  setGeom: (id: string, g: Geom) => void;
  closeAll: () => void;
  toggleTask: (id: string) => void;
};

const Ctx = createContext<WM | null>(null);

export function useWM() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useWM hors de <WindowManager>');
  return v;
}

export function WindowManager({ children }: { children: ReactNode }) {
  const [s, dispatch] = useReducer(reducer, { wins: {}, z: 20 });

  const order = useMemo(
    () => Object.values(s.wins).filter((w) => !w.min).sort((a, b) => a.z - b.z).map((w) => w.id),
    [s.wins]
  );
  const top = order[order.length - 1];

  const open = useCallback<WM['open']>((id, opts) => {
    const saved = loadGeo()[id];
    const vw = innerWidth, vh = innerHeight - TASKBAR;
    const n = Object.keys(s.wins).length;
    const w = Math.min(saved?.w ?? opts?.size?.w ?? 760, vw - 20);
    const h = Math.min(saved?.h ?? opts?.size?.h ?? 560, vh - 20);
    let x = saved?.x ?? opts?.size?.x ?? Math.round((vw - w) / 2 + (n - 1) * 26);
    let y = saved?.y ?? opts?.size?.y ?? Math.round(Math.max(16, (vh - h) / 2 - 20 + (n - 1) * 22));
    x = Math.max(8, Math.min(x, vw - w - 8));
    y = Math.max(8, Math.min(y, vh - 60));
    if (!s.wins[id]?.open) sfx.open();
    dispatch({ t: 'open', id, geom: { x, y, w, h }, payload: opts?.payload });
  }, [s.wins]);

  const value: WM = {
    wins: s.wins,
    order,
    top,
    open,
    close: (id) => dispatch({ t: 'close', id }),
    minimize: (id) => dispatch({ t: 'min', id }),
    toggleMax: (id, v) => dispatch({ t: 'max', id, value: v }),
    focus: (id) => dispatch({ t: 'focus', id }),
    setGeom: (id, g) => { dispatch({ t: 'geom', id, geom: g }); saveGeo(id, g); },
    closeAll: () => dispatch({ t: 'closeAll' }),
    toggleTask: (id) => {
      const w = s.wins[id];
      if (!w) return;
      if (w.min) dispatch({ t: 'open', id, geom: w.geom });
      else if (id === top) dispatch({ t: 'min', id });
      else dispatch({ t: 'focus', id });
    },
  };

  /* Raccourcis clavier globaux */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA)$/.test((document.activeElement as HTMLElement)?.tagName);
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        if (order.length > 1) dispatch({ t: 'focus', id: order[e.shiftKey ? order.length - 2 : 0] });
      } else if (e.key === 'Escape' && top && !typing) {
        dispatch({ t: 'close', id: top });
      } else if (e.ctrlKey && top && !typing && ['ArrowLeft', 'ArrowRight', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'ArrowUp') { dispatch({ t: 'max', id: top, value: true }); return; }
        const half = Math.round(innerWidth / 2);
        const g = { x: e.key === 'ArrowLeft' ? 0 : half, y: 0, w: half, h: innerHeight - TASKBAR };
        dispatch({ t: 'max', id: top, value: false });
        dispatch({ t: 'geom', id: top, geom: g });
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [order, top]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ------------------------------------------------------------------ fenêtre */

type Snap = 'max' | 'left' | 'right' | null;

export function Window({
  id, title, icon, children, bodyClass = '', toolbar, rank, depth,
}: {
  id: string;
  title: string;
  icon: IconName;
  children: ReactNode;
  bodyClass?: string;
  toolbar?: ReactNode;
  /** Rang dans la pile (0 = premier plan), pour l'effet de profondeur. */
  rank: number;
  depth: boolean;
}) {
  const wm = useWM();
  const w = wm.wins[id];
  const mobile = useIsMobile();
  const el = useRef<HTMLElement>(null);
  const [closing, setClosing] = useState(false);
  const [gesture, setGesture] = useState(false);
  const [snap, setSnap] = useState<Snap>(null);

  /* La fenêtre prend le focus clavier à l'ouverture. */
  useEffect(() => { el.current?.focus({ preventScroll: true }); }, []);

  if (!w) return null;
  const isTop = wm.top === id;
  const focused = isTop && !w.min;

  const startDrag = (e: RPointerEvent) => {
    if (mobile || e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    const node = el.current!;
    let geom = { ...w.geom };
    if (w.max) {
      /* Glisser une fenêtre agrandie la restaure sous le curseur, comme sous Windows. */
      wm.toggleMax(id, false);
      geom = { ...geom, x: e.clientX - geom.w / 2, y: 8 };
      node.style.left = `${geom.x}px`; node.style.top = `${geom.y}px`;
    }
    const sx = e.clientX, sy = e.clientY, ox = geom.x, oy = geom.y;
    let curSnap: Snap = null;
    setGesture(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const move = (ev: PointerEvent) => {
      geom.x = ox + (ev.clientX - sx);
      geom.y = Math.max(0, oy + (ev.clientY - sy));
      node.style.left = `${geom.x}px`;
      node.style.top = `${geom.y}px`;
      const next: Snap = ev.clientY <= EDGE ? 'max' : ev.clientX <= EDGE ? 'left' : ev.clientX >= innerWidth - EDGE ? 'right' : null;
      if (next !== curSnap) { curSnap = next; setSnap(next); }
    };
    const up = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      setGesture(false);
      setSnap(null);
      if (curSnap === 'max') { wm.toggleMax(id, true); return; }
      if (curSnap) {
        const half = Math.round(innerWidth / 2);
        geom = { x: curSnap === 'left' ? 0 : half, y: 0, w: half, h: innerHeight - TASKBAR };
      }
      wm.setGeom(id, geom);
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  };

  const startResize = (dir: string) => (e: RPointerEvent) => {
    if (mobile || w.max) return;
    e.preventDefault(); e.stopPropagation();
    const node = el.current!;
    const g0 = { ...w.geom };
    const geom = { ...g0 };
    const sx = e.clientX, sy = e.clientY;
    setGesture(true);
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (dir.includes('e')) geom.w = g0.w + dx;
      if (dir.includes('s')) geom.h = g0.h + dy;
      if (dir.includes('w')) { geom.w = g0.w - dx; geom.x = g0.x + dx; }
      if (dir.includes('n')) { geom.h = g0.h - dy; geom.y = g0.y + dy; }
      geom.w = Math.max(340, Math.min(geom.w, innerWidth - 8));
      geom.h = Math.max(240, Math.min(geom.h, innerHeight - TASKBAR));
      Object.assign(node.style, { left: `${geom.x}px`, top: `${geom.y}px`, width: `${geom.w}px`, height: `${geom.h}px` });
    };
    const up = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      setGesture(false);
      wm.setGeom(id, geom);
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  };

  const close = () => { sfx.close(); setClosing(true); setTimeout(() => wm.close(id), 160); };

  /* Profondeur : la fenêtre au premier plan reste à plat, les autres reculent
     d'un cran chacune et s'assombrissent légèrement. */
  const z = depth && !mobile && !w.max ? -rank * 70 : 0;
  const style: React.CSSProperties = mobile || w.max ? { zIndex: w.z } : {
    zIndex: w.z,
    left: w.geom.x, top: w.geom.y, width: w.geom.w, height: w.geom.h,
    ['--z' as string]: `${z}px`,
    ['--dim' as string]: depth ? Math.min(rank * 0.06, 0.24) : 0,
  };

  return (
    <>
      {snap && (
        <div
          className="snap-hint on"
          style={snap === 'max'
            ? { left: 0, top: 0, width: '100%', height: `calc(100% - ${TASKBAR}px)` }
            : { left: snap === 'left' ? 0 : '50%', top: 0, width: '50%', height: `calc(100% - ${TASKBAR}px)` }}
        />
      )}
      <section
        ref={el}
        role="dialog"
        aria-label={title}
        tabIndex={-1}
        hidden={w.min}
        className={[
          'os-window',
          focused && 'is-focus',
          w.max && 'is-max',
          gesture && 'is-gesture',
          closing && 'is-closing',
          depth && !mobile && 'has-depth',
        ].filter(Boolean).join(' ')}
        style={style}
        onPointerDownCapture={() => wm.focus(id)}
      >
        <header className="win-head" onPointerDown={startDrag} onDoubleClick={() => !mobile && wm.toggleMax(id)}>
          <div className="win-title"><Icon name={icon} size={16} /><span>{title}</span></div>
          <div className="win-btns">
            <button className="win-btn min" onClick={() => { sfx.close(); wm.minimize(id); }} aria-label="Réduire">
              <svg viewBox="0 0 12 12"><path d="M1.5 6h9" /></svg>
            </button>
            <button className="win-btn max" onClick={() => wm.toggleMax(id)} aria-label={w.max ? 'Restaurer' : 'Agrandir'}>
              {w.max
                ? <svg viewBox="0 0 12 12"><rect x="1.5" y="3.5" width="7" height="7" rx="1" /><path d="M4 3.5V2.2a.7.7 0 0 1 .7-.7h5.1a.7.7 0 0 1 .7.7v5.1a.7.7 0 0 1-.7.7H8.5" /></svg>
                : <svg viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1" /></svg>}
            </button>
            <button className="win-btn close" onClick={close} aria-label="Fermer">
              <svg viewBox="0 0 12 12"><path d="m2 2 8 8M10 2l-8 8" /></svg>
            </button>
          </div>
        </header>
        {toolbar}
        <div className={`win-body ${bodyClass}`}>{children}</div>
        {!mobile && !w.max && ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map((d) => (
          <i key={d} className={`rz rz-${d}`} onPointerDown={startResize(d)} />
        ))}
      </section>
    </>
  );
}
