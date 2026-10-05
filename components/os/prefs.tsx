'use client';

/* Préférences de l'utilisateur, partagées entre la scène 3D et l'OS.
   Petit magasin externe (useSyncExternalStore) plutôt qu'un contexte React :
   pas de provider à placer, et n'importe quel composant peut s'y abonner. */

import { useSyncExternalStore } from 'react';

export type Lang = 'fr' | 'en';
export type Theme = 'dark' | 'light';

export type Prefs = {
  theme: Theme;
  lang: Lang;
  accent: string;
  sound: boolean;
  /** Fenêtres en relief : inclinaison et profondeur selon le focus. */
  depth: boolean;
};

export const ACCENTS: [string, { fr: string; en: string }][] = [
  ['#4cc2ff', { fr: 'Bleu', en: 'Blue' }],
  ['#7c5cff', { fr: 'Violet', en: 'Purple' }],
  ['#22c55e', { fr: 'Vert', en: 'Green' }],
  ['#f59e0b', { fr: 'Ambre', en: 'Amber' }],
  ['#f43f5e', { fr: 'Rose', en: 'Rose' }],
  ['#14b8a6', { fr: 'Turquoise', en: 'Teal' }],
];

const KEY = 'evanos.prefs';
const DEFAULTS: Prefs = { theme: 'dark', lang: 'fr', accent: '#4cc2ff', sound: false, depth: true };

let state: Prefs = DEFAULTS;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  let saved: Partial<Prefs> = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* mode privé */ }
  state = {
    ...DEFAULTS,
    theme: matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
    lang: (navigator.language || 'fr').startsWith('en') ? 'en' : 'fr',
    depth: !matchMedia('(prefers-reduced-motion: reduce)').matches,
    ...saved,
  };
  apply();
}

function apply() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = state.theme;
  root.lang = state.lang;
  root.style.setProperty('--accent', state.accent);
  root.style.setProperty('--glow', `${state.accent}33`);
}

export function setPrefs(patch: Partial<Prefs>) {
  state = { ...state, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  apply();
  listeners.forEach((l) => l());
}

export function resetPrefs() {
  try { localStorage.removeItem(KEY); localStorage.removeItem('evanos.geo'); } catch { /* ignore */ }
  hydrated = false;
  hydrate();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  hydrate();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePrefs() {
  const prefs = useSyncExternalStore(subscribe, () => { hydrate(); return state; }, () => DEFAULTS);
  return { prefs, setPrefs };
}

/** Raccourci pour choisir la bonne langue d'un texte bilingue. */
export function useT() {
  const { prefs } = usePrefs();
  return <T,>(l: { fr: T; en: T }) => l[prefs.lang];
}
