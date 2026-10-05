'use client';

/* L'écran du bureau. Sa dalle affiche une capture réelle de l'OS : pendant la
   plongée de la caméra, l'image se confond avec le bureau qui apparaît
   ensuite, ce qui rend la transition presque continue. */

import { useMemo } from 'react';
import { RoundedBox, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { roundedRect } from './materials';

const SCREEN_URL = '/assets/screen/os-desktop.webp';

/** Position et taille de la dalle, partagées avec la caméra qui vise dedans. */
export const SCREEN = {
  center: new THREE.Vector3(0, 1.235, -0.255),
  width: 1.12,
  height: 0.63,
};

export function Monitor({
  accent = '#4cc2ff',
  onClick,
  hovered = false,
  onHover,
}: {
  accent?: string;
  onClick?: () => void;
  hovered?: boolean;
  onHover?: (h: boolean) => void;
}) {
  const screen = useTexture(SCREEN_URL);
  useMemo(() => {
    screen.colorSpace = THREE.SRGBColorSpace;
    screen.anisotropy = 8;
  }, [screen]);
  const { center, width, height } = SCREEN;
  const panel = useMemo(() => roundedRect(width, height, 0.008), [width, height]);
  const glow = useMemo(() => roundedRect(width + 0.03, height + 0.03, 0.02), [width, height]);

  return (
    <group>
      {/* pied : socle plat et colonne */}
      <RoundedBox args={[0.3, 0.012, 0.2]} radius={0.005} smoothness={3} position={[0, 0.774, -0.31]} castShadow receiveShadow>
        <meshStandardMaterial color="#c3c7ce" roughness={0.25} metalness={0.9} />
      </RoundedBox>
      <RoundedBox args={[0.06, 0.38, 0.022]} radius={0.008} smoothness={3} position={[0, 0.96, -0.345]} castShadow>
        <meshStandardMaterial color="#c3c7ce" roughness={0.25} metalness={0.9} />
      </RoundedBox>

      {/* coque, bords fins */}
      <RoundedBox
        args={[width + 0.03, height + 0.03, 0.03]}
        radius={0.012}
        smoothness={4}
        position={[center.x, center.y, center.z - 0.018]}
        castShadow
      >
        <meshStandardMaterial color="#0f1116" roughness={0.35} metalness={0.4} />
      </RoundedBox>

      {/* liseré d'accentuation au survol */}
      <mesh geometry={glow} position={[center.x, center.y, center.z - 0.0005]}>
        <meshBasicMaterial color={accent} transparent opacity={hovered ? 0.65 : 0} toneMapped={false} />
      </mesh>

      {/* dalle — c'est elle qu'on clique pour entrer */}
      <mesh
        geometry={panel}
        position={center}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover?.(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { onHover?.(false); document.body.style.cursor = ''; }}
      >
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>

      {/* lumière émise par l'écran, qui éclaire le clavier et le bureau */}
      <rectAreaLight
        position={[center.x, center.y, center.z + 0.02]}
        width={width}
        height={height}
        intensity={hovered ? 2.4 : 1.6}
        color={accent}
      />
    </group>
  );
}

/* Préchargée dès l'import, avec les couvertures : sinon elle n'était
   demandée qu'une fois celles-ci arrivées (chargement en cascade). */
useTexture.preload(SCREEN_URL);
