'use client';

/* Charge les couvertures de tous les projets en textures, une seule fois. */

import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { PROJECTS } from '@/content/projects';

/* Version 1024 px réservée à la 3D : les cadres et le carrousel n'affichent
   jamais les couvertures en pleine résolution, inutile de télécharger 1600 px. */
const url3d = (cover?: string) => (cover ? cover.replace('/assets/covers/', '/assets/covers/3d/') : '/assets/og.png');

export function useCovers(): Record<string, THREE.Texture> {
  const urls = useMemo(() => PROJECTS.map((p) => url3d(p.cover)), []);
  const textures = useTexture(urls) as THREE.Texture[];
  return useMemo(() => {
    const out: Record<string, THREE.Texture> = {};
    textures.forEach((t, i) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      out[PROJECTS[i].slug] = t;
    });
    return out;
  }, [textures]);
}

/* Précharge les images dès l'import du module, avant même le montage. */
PROJECTS.forEach((p) => { if (p.cover) useTexture.preload(url3d(p.cover)); });
