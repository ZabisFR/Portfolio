'use client';

/* La scène d'accueil : un bureau vu de loin, une étagère de projets, et un écran
   que la caméra traverse pour entrer dans l'OS. */

import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { StudioEnv } from './studio-env';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { Desk, DeskMat, Keyboard, Mouse, Mug, Lamp, Plant, Notebook, Room } from './desk-parts';
import { Monstera, FiddleFig, HangingPothos, StringLights, Candle, Rug } from './cozy';
import { Monitor, SCREEN } from './monitor';
import { ProjectShelf } from './project-shelf';
import { LabelProjector, useLabelRegistry, type Anchor } from './projected-labels';
import type { Project } from '@/content/projects';

/* Sans cette initialisation, les rectAreaLight n'éclairent rien. */
let rectInit = false;
function ensureRectLights() {
  if (!rectInit) { RectAreaLightUniformsLib.init(); rectInit = true; }
}

const START_POS = new THREE.Vector3(0, 1.72, 3.1);
const START_LOOK = new THREE.Vector3(0, 1.22, -0.3);
/* Point d'arrivée : juste devant la dalle, cadrée plein champ. */
const END_POS = new THREE.Vector3(SCREEN.center.x, SCREEN.center.y, SCREEN.center.z + 0.52);
const END_LOOK = SCREEN.center.clone();

export type SceneMode = 'idle' | 'enter' | 'exit';

/* Ombres figées. Rien ne bouge vraiment dans la pièce : recalculer les
   ombres à chaque image (dont six rendus pour la lampe, une lumière
   ponctuelle) coûtait la moitié du temps de rendu. On les calcule pendant
   la première seconde, le temps que tout soit chargé et posé, puis on fige.
   Seule conséquence : l'ombre d'un cadre survolé ne le suit pas. */
function StaticShadows() {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => { gl.shadowMap.autoUpdate = true; };
  }, [gl]);
  useFrame(() => {
    if (frames.current < 60) { gl.shadowMap.needsUpdate = true; frames.current++; }
  });
  return null;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function CameraRig({
  mode,
  onProgress,
  onDone,
}: {
  mode: SceneMode;
  onProgress: (t: number) => void;
  onDone: (mode: SceneMode) => void;
}) {
  const { camera, pointer } = useThree();
  const t = useRef(mode === 'exit' ? 1 : 0);
  const look = useRef(START_LOOK.clone());
  const doneFor = useRef<SceneMode | null>(null);

  useEffect(() => { doneFor.current = null; }, [mode]);

  useFrame((_, dt) => {
    const DURATION = 1.55;
    if (mode === 'enter') t.current = Math.min(1, t.current + dt / DURATION);
    else if (mode === 'exit') t.current = Math.max(0, t.current - dt / DURATION);

    const k = ease(t.current);

    /* Au repos, la caméra suit légèrement le pointeur : la scène respire. */
    const sway = (1 - k) * 0.22;
    const swayPos = new THREE.Vector3(pointer.x * sway, pointer.y * sway * 0.5, 0);

    camera.position.lerpVectors(START_POS, END_POS, k).add(swayPos);
    look.current.lerpVectors(START_LOOK, END_LOOK, k);
    camera.lookAt(look.current);

    /* Au repos, on garde un champ HORIZONTAL constant (~63°) : sur un écran
       étroit la caméra s'ouvre verticalement au lieu de rogner les étagères. */
    const cam = camera as THREE.PerspectiveCamera;
    const H_FOV = 63 * THREE.MathUtils.DEG2RAD;
    const idleFov = THREE.MathUtils.clamp(
      2 * Math.atan(Math.tan(H_FOV / 2) / cam.aspect) * THREE.MathUtils.RAD2DEG, 38, 90);
    const fov = THREE.MathUtils.lerp(idleFov, 62, k);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }

    onProgress(k);

    const finished = (mode === 'enter' && t.current >= 1) || (mode === 'exit' && t.current <= 0);
    if (finished && doneFor.current !== mode) {
      doneFor.current = mode;
      onDone(mode);
    }
  });

  return null;
}

function Scene({
  mode,
  accent,
  projects,
  onEnterRequest,
  onOpenProject,
  onProgress,
  onDone,
  onHover,
  hoverObj,
  anchors,
  registry,
}: Props & {
  onHover: (slug: string | null) => void;
  hoverObj: MutableRefObject<THREE.Object3D | null>;
  anchors: MutableRefObject<Anchor[]>;
  registry: MutableRefObject<Map<string, HTMLElement>>;
}) {
  const [screenHover, setScreenHover] = useState(false);
  ensureRectLights();

  return (
    <>
      <color attach="background" args={['#17100c']} />
      <fog attach="fog" args={['#17100c', 5, 10]} />

      {/* Reflets : uniquement des sources chaudes, comme une pièce éclairée
          à la lampe en fin de journée. */}
      <StudioEnv background="#120c09" panels={[
        { color: '#ffcf9e', intensity: 1.3, position: [-3, 2.5, 2], scale: [2.5, 1.2], target: [0, 1, 0] },
        { color: '#ffd8b8', intensity: 0.7, position: [3, 2.2, 1.5], scale: [2, 1], target: [0, 1, 0] },
        { color: '#fff1e2', intensity: 0.4, position: [0, 4, 0], scale: [4, 4], target: [0, 0, 0] },
        { color: accent, intensity: 1.4, position: [0, 1.3, -1], scale: [1.2, 1.2], target: [0, 1.3, 2], circle: true },
      ]} />

      {/* Lumière tamisée : aucune source froide, des intensités basses, et
          plusieurs petites lumières chaudes plutôt qu'une grosse. */}
      <hemisphereLight args={['#ffd9b5', '#2b1a10', 0.24]} />
      <ambientLight intensity={0.06} />
      <pointLight position={[0, 2.6, -0.65]} intensity={1.05} distance={3.6} decay={1.8} color="#ffcf9a" />
      <pointLight position={[-0.74, 1.12, -0.1]} intensity={2.3} distance={2.8} decay={2} color="#ffb06a" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <directionalLight position={[2.2, 3, 2]} intensity={0.32} color="#ffe0c2" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003}
        shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-1} />

      <Rug />
      <StringLights from={[-1.68, 2.42, -1.27]} to={[1.68, 2.42, -1.27]} sag={0.2} />
      <Monstera position={[1.78, 0, -0.62]} scale={1.15} />
      <FiddleFig position={[-2.2, 0, -0.72]} scale={0.9} />
      <HangingPothos position={[2.24, 2.36, -0.98]} short />
      <HangingPothos position={[-2.24, 2.36, -0.98]} short />
      <Candle position={[-0.68, 0.805, 0.2]} />

      <Room accent={accent} />
      <Desk />
      <DeskMat />
      <Monitor
        accent={accent}
        hovered={screenHover && mode === 'idle'}
        onHover={setScreenHover}
        onClick={() => mode === 'idle' && onEnterRequest()}
      />
      <Keyboard />
      <Mouse />
      <Mug accent={accent} />
      <Lamp />
      <Plant />
      <Notebook accent={accent} />
      <ProjectShelf projects={projects} onOpen={onOpenProject} onHover={onHover} hoverObj={hoverObj} disabled={mode !== 'idle'} />
      <LabelProjector anchors={anchors} registry={registry} />

      <ContactShadows position={[0, 0.012, 0]} opacity={0.55} scale={7} blur={2.4} far={1.4} />
      <ContactShadows position={[0, 0.7716, 0]} opacity={0.5} scale={[2.6, 1.2]} blur={1.6} far={0.3} resolution={512} />

      <StaticShadows />
      <CameraRig mode={mode} onProgress={onProgress} onDone={onDone} />
    </>
  );
}

type Props = {
  mode: SceneMode;
  accent: string;
  projects: Project[];
  lang: 'fr' | 'en';
  onEnterRequest: () => void;
  onOpenProject: (slug: string) => void;
  onProgress: (t: number) => void;
  onDone: (mode: SceneMode) => void;
};

export default function DeskScene(props: Props) {
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);
  const hoverObj = useRef<THREE.Object3D | null>(null);
  const registry = useLabelRegistry();
  const tmp = useMemo(() => new THREE.Vector3(), []);
  /* Pendant la plongée, l'étiquette disparaît : le pointeur n'a pas bougé,
     mais l'objet survolé, lui, sort du cadre. */
  const modeRef = useRef(props.mode);
  modeRef.current = props.mode;

  /* Une seule étiquette, accrochée au-dessus de l'objet survolé. */
  const anchors = useRef<Anchor[]>([{
    id: 'shelf',
    point: () => {
      const o = hoverObj.current;
      if (!o || modeRef.current !== 'idle') return null;
      o.getWorldPosition(tmp);
      return tmp.setY(tmp.y + 0.36);
    },
  }]);

  const hovered = props.projects.find((p) => p.slug === hoverSlug);

  return (
    <>
      <Canvas
        shadows="percentage"
        dpr={[1, 1.75]}
        camera={{ position: START_POS.toArray(), fov: 38, near: 0.05, far: 30 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <Suspense fallback={null}>
          <Scene {...props} onHover={setHoverSlug} hoverObj={hoverObj} anchors={anchors} registry={registry} />
        </Suspense>
      </Canvas>
      <div
        ref={(el) => { if (el) registry.current.set('shelf', el); else registry.current.delete('shelf'); }}
        className={`shelf-label${hovered ? ' is-on' : ''}`}
        aria-hidden="true"
        style={{ position: 'absolute', left: 0, top: 0, visibility: 'hidden' }}
      >
        {hovered && (
          <>
            <b>{hovered.name[props.lang]}</b>
            <span>{hovered.type[props.lang]} · {hovered.year}</span>
          </>
        )}
      </div>
    </>
  );
}
