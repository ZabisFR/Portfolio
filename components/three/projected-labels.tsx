'use client';

/* Étiquettes HTML accrochées à des points de la scène 3D.
   ---------------------------------------------------------------------------
   Plutôt que <Html> de drei — qui crée une racine React par étiquette et la
   démonte de façon synchrone, ce que React 19 refuse en mode strict — on
   rend des éléments DOM ordinaires à côté du <Canvas>, et un composant posé
   dans la scène projette chaque point 3D à l'écran à chaque image pour les
   déplacer. Aucune racine supplémentaire, aucun rendu React par image. */

import { useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** `point` renvoie la position monde de l'étiquette, ou null pour la masquer.
 *  Il reçoit la caméra, pour pouvoir masquer ce qui est de dos. */
export type Anchor = { id: string; point: (camera: THREE.Camera) => THREE.Vector3 | null };

/** Registre partagé entre la scène (qui projette) et le DOM (qui affiche). */
export function useLabelRegistry() {
  return useRef<Map<string, HTMLElement>>(new Map());
}

/** À placer DANS le <Canvas>. */
export function LabelProjector({
  anchors,
  registry,
}: {
  anchors: MutableRefObject<Anchor[]>;
  registry: MutableRefObject<Map<string, HTMLElement>>;
}) {
  const { camera, size } = useThree();
  const v = useRef(new THREE.Vector3());

  useFrame(() => {
    for (const a of anchors.current) {
      const el = registry.current.get(a.id);
      if (!el) continue;
      const p = a.point(camera);
      if (!p) { el.style.visibility = 'hidden'; continue; }
      v.current.copy(p).project(camera);
      /* Derrière la caméra : on masque plutôt que d'afficher une étiquette inversée. */
      if (v.current.z > 1) { el.style.visibility = 'hidden'; continue; }
      const x = (v.current.x * 0.5 + 0.5) * size.width;
      const y = (-v.current.y * 0.5 + 0.5) * size.height;
      el.style.visibility = '';
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    }
  });

  return null;
}
