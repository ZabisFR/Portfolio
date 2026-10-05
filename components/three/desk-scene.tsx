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
      <color attach="background" args={['#0a0d14']} />
      <fog attach="fog" args={['#0a0d14', 4.5, 9]} />

      {/* Environnement construit sur place : quelques panneaux lumineux
          virtuels suffisent à donner de vrais reflets au métal, à la
          céramique et aux vitres des cadres — sans fichier HDR à télécharger. */}
      <StudioEnv panels={[
        { color: '#ffd9a8', intensity: 1.6, position: [-3, 2.5, 2], scale: [2.5, 1.2], target: [0, 1, 0] },
        { color: '#9fc0ff', intensity: 1.1, position: [3, 2.2, 1.5], scale: [2, 1], target: [0, 1, 0] },
        { color: '#ffffff', intensity: 0.7, position: [0, 4, 0], scale: [4, 4], target: [0, 0, 0] },
        { color: accent, intensity: 2, position: [0, 1.3, -1], scale: [1.2, 1.2], target: [0, 1.3, 2], circle: true },
      ]} />

      <hemisphereLight args={['#8fb4ff', '#1a1208', 0.4]} />
      <ambientLight intensity={0.1} />
      {/* lumière rasante sur le mur : détache les étagères du fond */}
      <pointLight position={[0, 2.75, -0.7]} intensity={3.4} distance={4.2} decay={1.6} color="#c9d8ff" />
      {/* lumière chaude de la lampe */}
      <pointLight position={[-0.74, 1.12, -0.1]} intensity={1.9} distance={2.6} decay={2} color="#ffcf8f" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      {/* contre-jour froid */}
      <directionalLight position={[2.5, 3.2, 1.5]} intensity={0.45} color="#a9c4ff" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003}
        shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-1} />

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

      <ContactShadows position={[0, 0.002, 0]} opacity={0.6} scale={7} blur={2.4} far={1.4} />
      <ContactShadows position={[0, 0.7716, 0]} opacity={0.5} scale={[2.6, 1.2]} blur={1.6} far={0.3} resolution={512} />

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
