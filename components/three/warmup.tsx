'use client';

/* Compile tous les shaders de la scène AVANT la première image.
   ---------------------------------------------------------------------------
   Laissée à elle-même, three.js compile chaque matériau au moment de le
   dessiner, sur le fil principal : la première image de la pièce gelait la
   page 3 à 5 s (boutons inertes compris). `compileAsync` confie la
   compilation au GPU en parallèle (extension KHR_parallel_shader_compile) et
   rend la main au navigateur ; le <Canvas> reste en `frameloop="never"`
   jusqu'à ce que tout soit prêt, puis apparaît en fondu.

   Usage : `useWarmup()` dans le composant qui porte le <Canvas> ; `env` va
   sur <StudioEnv>, `warmup` sur <Warmup> (en dernier dans la scène), et
   `live` pilote `frameloop`. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';

export function useWarmup() {
  /* 0 : pas de carte · 1 : carte provisoire (on peut compiler) · 2 : vraie carte */
  const [env, setEnv] = useState(0);
  const [compiled, setCompiled] = useState(false);
  const onPlaceholder = useCallback(() => setEnv((s) => Math.max(s, 1)), []);
  const onReady = useCallback(() => setEnv(2), []);
  const onCompiled = useCallback(() => setCompiled(true), []);
  return {
    live: compiled && env === 2,
    /** La scène est montée (images chargées) : il ne reste qu'à compiler. */
    mounted: env >= 1,
    env: { onPlaceholder, onReady },
    warmup: { when: env >= 1, onReady: onCompiled },
  };
}

export function Warmup({ when = true, onReady }: { when?: boolean; onReady: () => void }) {
  const { gl, scene, camera } = useThree();
  const cb = useRef(onReady);
  cb.current = onReady;

  useEffect(() => {
    if (!when) return;
    let alive = true;
    gl.compileAsync(scene, camera)
      .catch(() => { /* la première image compilera ce qui manque */ })
      .then(() => { if (alive) cb.current(); });
    return () => { alive = false; };
  }, [when, gl, scene, camera]);

  return null;
}
