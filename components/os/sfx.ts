/* Sons d'interface synthétisés à la volée (Web Audio) : aucun fichier audio à
   télécharger. Désactivés par défaut — un site qui fait du bruit sans
   prévenir est un site qu'on ferme. */

let ctx: AudioContext | null = null;

function ensure() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function blip(freqs: number[], { dur = 0.16, type = 'sine' as OscillatorType, gain = 0.05 } = {}) {
  const ac = ensure();
  if (!ac) return;
  const t = ac.currentTime;
  const out = ac.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(gain, t + 0.012);
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  out.connect(ac.destination);
  freqs.forEach((f, i) => {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t + i * 0.035);
    o.connect(out);
    o.start(t + i * 0.035);
    o.stop(t + dur + i * 0.035);
  });
}

/** Lit la préférence directement dans le stockage : pas besoin d'abonner
 *  chaque appelant au magasin de préférences. */
function enabled() {
  try { return JSON.parse(localStorage.getItem('evanos.prefs') || '{}').sound === true; } catch { return false; }
}

export const sfx = {
  open: () => enabled() && blip([523.25, 783.99], { dur: 0.22, gain: 0.045 }),
  close: () => enabled() && blip([440, 293.66], { dur: 0.18, gain: 0.04 }),
  click: () => enabled() && blip([880], { dur: 0.06, type: 'triangle', gain: 0.03 }),
  toast: () => enabled() && blip([659.25, 987.77, 1318.5], { dur: 0.3, gain: 0.04 }),
  /** Joué à l'activation, pour que le visiteur entende tout de suite l'effet. */
  test: () => blip([523.25, 659.25, 783.99], { dur: 0.32, gain: 0.05 }),
};
