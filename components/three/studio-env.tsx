'use client';

/* Éclairage d'environnement construit sur place.
   ---------------------------------------------------------------------------
   Remplace <Environment> + <Lightformer> de drei : même principe — quelques
   panneaux lumineux rendus une fois dans une carte d'environnement filtrée —
   mais sans embarquer les chargeurs EXR, RGBE et GainMap que drei importe
   d'office, soit environ 100 Ko de JavaScript compressé en moins.

   Le filtrage (PMREM) utilise deux shaders lourds : compilés de façon
   synchrone, ils gelaient la page 0,4 s. On les compile d'abord en tâche de
   fond, puis on filtre.

   Les matériaux de la scène dépendent du format de la carte : compilés sans
   elle, ils seraient recompilés une fois la carte posée. On pose donc tout
   de suite une carte provisoire du bon format (`onPlaceholder`) : la scène
   compile ses matériaux pendant que la vraie carte se prépare (`onReady`). */

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type Panel = {
  color: string;
  /** Au-delà de 1 : les valeurs HDR sont conservées par le PMREM. */
  intensity: number;
  position: [number, number, number];
  scale: [number, number];
  target?: [number, number, number];
  circle?: boolean;
};

/* Accès aux rouages internes du PMREMGenerator (three r186) : ils ne sont pas
   publics, d'où le try/catch — au pire on retombe sur la compilation
   synchrone d'origine, sans rien casser. */
type PMREMInternals = {
  _setSize(size: number): void;
  _allocateTargets(): THREE.WebGLRenderTarget;
  _blurMaterial: THREE.Material | null;
  _ggxMaterial: THREE.Material | null;
  _lodMeshes?: THREE.Mesh[];
};

/** Alloue les cibles du PMREM et renvoie une carte vide au format final. */
function allocate(pmrem: THREE.PMREMGenerator): THREE.WebGLRenderTarget | null {
  try {
    const p = pmrem as unknown as PMREMInternals;
    p._setSize(256);
    return p._allocateTargets();
  } catch { return null; }
}

async function precompilePMREM(gl: THREE.WebGLRenderer, pmrem: THREE.PMREMGenerator, rt: THREE.WebGLRenderTarget | null) {
  if (!rt) return;
  try {
    const p = pmrem as unknown as PMREMInternals;
    const scene = new THREE.Scene();
    /* Avec la vraie géométrie : sous Windows (ANGLE/Direct3D), le shader
       final dépend aussi des attributs de sommets ; compilé sur une géométrie
       vide, il était recompilé — de façon bloquante — au premier filtrage. */
    const geo = p._lodMeshes?.[0]?.geometry ?? new THREE.BufferGeometry();
    for (const m of [p._blurMaterial, p._ggxMaterial]) if (m) scene.add(new THREE.Mesh(geo, m));
    /* Compilés pour une cible de rendu flottante, comme lors du vrai filtrage :
       sinon la variante obtenue (espace colorimétrique, tone mapping) diffère. */
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(rt);
    const done = gl.compileAsync(scene, new THREE.OrthographicCamera());
    gl.setRenderTarget(prev);
    await done;
  } catch { /* compilation synchrone au moment du filtrage */ }
}

export function StudioEnv({
  panels,
  background = '#05070b',
  onPlaceholder,
  onReady,
}: {
  panels: Panel[];
  background?: string;
  onPlaceholder?: () => void;
  onReady?: () => void;
}) {
  const { gl, scene } = useThree();
  const key = JSON.stringify(panels);
  const ready = useRef(onReady);
  ready.current = onReady;
  const early = useRef(onPlaceholder);
  early.current = onPlaceholder;
  /* Carte en place. Quand l'accent change, l'ancienne reste affichée pendant
     le calcul de la nouvelle : un seul instant sans carte et tous les
     matériaux seraient recompilés dans une variante sans reflets. */
  const current = useRef<THREE.WebGLRenderTarget | null>(null);
  useEffect(() => () => {
    scene.environment = null;
    current.current?.dispose();
    current.current = null;
  }, [scene]);

  useEffect(() => {
    let alive = true;
    const pmrem = new THREE.PMREMGenerator(gl);
    const geos: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];
    const placeholder = allocate(pmrem);
    if (!current.current && placeholder) scene.environment = placeholder.texture;
    early.current?.();

    (async () => {
      await precompilePMREM(gl, pmrem, placeholder);
      if (!alive) return;

      const env = new THREE.Scene();
      env.background = new THREE.Color(background);
      for (const p of panels) {
        const geo = p.circle ? new THREE.CircleGeometry(0.5, 32) : new THREE.PlaneGeometry(1, 1);
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(p.color).multiplyScalar(p.intensity),
          side: THREE.DoubleSide,
          toneMapped: false,
        });
        const m = new THREE.Mesh(geo, mat);
        m.position.set(...p.position);
        m.scale.set(p.scale[0], p.scale[1], 1);
        if (p.target) m.lookAt(...p.target);
        env.add(m);
        geos.push(geo); mats.push(mat);
      }

      const rt = pmrem.fromScene(env, 0.03);
      const old = current.current;
      scene.environment = rt.texture;
      current.current = rt;
      old?.dispose();
      placeholder?.dispose();
      ready.current?.();
    })();

    return () => {
      alive = false;
      if (scene.environment === placeholder?.texture) scene.environment = current.current?.texture ?? null;
      placeholder?.dispose();
      pmrem.dispose();
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, key, background]);

  return null;
}
