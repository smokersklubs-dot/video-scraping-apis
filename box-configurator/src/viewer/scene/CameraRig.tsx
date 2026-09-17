import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { smoothstep } from '../../engine/folding/stages';

interface CameraRigProps {
  /** Diagonale de l'encombrement courant (boîte ou patron), unités scène. */
  readonly diagonal: number;
}

const FOV_DEG = 32;
const FIT_MARGIN = 1.35;
const TRANSITION_MS = 650;

interface DistanceTransition {
  from: number;
  to: number;
  start: number;
}

/**
 * Cadre la boîte en vue 3/4 : la distance caméra glisse vers la distance de cadrage à chaque
 * changement d'encombrement (dimensions ou dépliage) sans écraser l'orbite de l'utilisateur.
 */
export function CameraRig({ diagonal }: CameraRigProps) {
  const camera = useThree((s) => s.camera);
  const controls = useRef<OrbitControlsImpl>(null);
  const transition = useRef<DistanceTransition | null>(null);
  const initialised = useRef(false);
  const fitDistance = (diagonal / 2 / Math.tan((FOV_DEG * Math.PI) / 360)) * FIT_MARGIN;

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = FOV_DEG;
      camera.near = Math.max(0.001, fitDistance / 200);
      camera.far = fitDistance * 20;
      camera.updateProjectionMatrix();
    }
    if (!initialised.current) {
      initialised.current = true;
      const dir = new THREE.Vector3(1, 0.65, 1.25).normalize();
      camera.position.copy(dir.multiplyScalar(fitDistance));
      camera.lookAt(0, 0, 0);
      controls.current?.target.set(0, 0, 0);
      controls.current?.update();
      return;
    }
    transition.current = { from: camera.position.length(), to: fitDistance, start: performance.now() };
  }, [camera, fitDistance]);

  useFrame(() => {
    const t = transition.current;
    if (!t) return;
    const k = Math.min(1, (performance.now() - t.start) / TRANSITION_MS);
    const distance = t.from + (t.to - t.from) * smoothstep(k);
    camera.position.setLength(distance);
    controls.current?.update();
    if (k >= 1) transition.current = null;
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.8}
      minDistance={fitDistance * 0.3}
      maxDistance={fitDistance * 3}
      minPolarAngle={0.05}
      maxPolarAngle={Math.PI - 0.05}
    />
  );
}
