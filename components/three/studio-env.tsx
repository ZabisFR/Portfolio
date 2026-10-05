'use client';

/* Éclairage d'environnement construit sur place.
   ---------------------------------------------------------------------------
   Remplace <Environment> + <Lightformer> de drei : même principe — quelques
   panneaux lumineux rendus une fois dans une carte d'environnement filtrée —
   mais sans embarquer les chargeurs EXR, RGBE et GainMap que drei importe
   d'office, soit environ 100 Ko de JavaScript compressé en moins. */

import { useEffect } from 'react';
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

export function StudioEnv({ panels, background = '#05070b' }: { panels: Panel[]; background?: string }) {
  const { gl, scene } = useThree();
  const key = JSON.stringify(panels);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = new THREE.Scene();
    env.background = new THREE.Color(background);
    const geos: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];

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
    scene.environment = rt.texture;

    return () => {
      scene.environment = null;
      rt.dispose();
      pmrem.dispose();
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, key, background]);

  return null;
}
