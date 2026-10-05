/* Sons d'interface synthétisés à la volée (Web Audio) : aucun fichier audio à
   télécharger. Désactivés par défaut — un site qui fait du bruit sans prévenir
   est un site qu'on ferme. */

let ctx = null;
let on = false;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/* Une enveloppe courte, volontairement discrète. */
function blip(freqs, { dur = 0.16, type = 'sine', gain = 0.05 } = {}) {
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

export const sfx = {
  get enabled() { return on; },
  set enabled(v) { on = !!v; if (on) ensure(); },
  open()   { if (on) blip([523.25, 783.99], { dur: 0.22, gain: 0.045 }); },
  close()  { if (on) blip([440, 293.66], { dur: 0.18, gain: 0.04 }); },
  click()  { if (on) blip([880], { dur: 0.06, type: 'triangle', gain: 0.03 }); },
  toast()  { if (on) blip([659.25, 987.77, 1318.5], { dur: 0.3, gain: 0.04 }); },
  error()  { if (on) blip([196, 174.6], { dur: 0.26, type: 'square', gain: 0.025 }); },
  boot()   { if (on) blip([392, 523.25, 659.25, 783.99], { dur: 0.5, gain: 0.05 }); }
};
