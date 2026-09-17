import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { StructureBlueprint } from '../engine/core/types';
import { computeFoldTransforms } from '../engine/folding/fold-transforms';
import type { FinishId } from '../engine/finishes';
import type { MaterialAppearance } from '../engine/materials';
import type { DebugFlags } from './debug/DebugOverlay';
import { DevProbe } from './debug/DevProbe';
import { detectQuality, type QualityProfile } from './quality';
import { BoxGroup } from './scene/BoxGroup';
import { CameraRig } from './scene/CameraRig';
import { StudioLighting } from './scene/StudioLighting';
import { mmToScene } from './units';

export interface BoxViewerProps {
  readonly blueprint: StructureBlueprint;
  readonly foldProgress: number;
  readonly appearance: MaterialAppearance;
  readonly finishes: readonly FinishId[];
  readonly debug: DebugFlags | null;
  readonly quality?: QualityProfile;
  readonly background?: string;
}

/**
 * Viewer 3D autonome : reçoit un blueprint (mm) et l'affiche. Aucune logique métier ici.
 * Le pliage est résolu ici une fois par valeur de progress et partagé avec la scène.
 */
export function BoxViewer({ blueprint, foldProgress, appearance, finishes, debug, quality: qualityProp, background = '#F4F6F8' }: BoxViewerProps) {
  const [quality] = useState<QualityProfile>(() => qualityProp ?? detectQuality());

  const solution = useMemo(() => computeFoldTransforms(blueprint, foldProgress), [blueprint, foldProgress]);
  const size = solution.bounds.size;
  const diagonal = mmToScene(Math.hypot(size.x, size.y, size.z));
  // La boîte (ou le patron à plat) est centrée à l'origine ; le sol est juste dessous.
  const floorY = -mmToScene(size.y / 2) - 0.0005;

  return (
    <Canvas
      shadows={quality.shadows ? 'percentage' : false}
      dpr={[1, quality.maxDpr]}
      camera={{ fov: 32, near: 0.01, far: 50, position: [0.4, 0.3, 0.5] }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
        outputColorSpace: THREE.SRGBColorSpace,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
    >
      <color attach="background" args={[background]} />
      <Suspense fallback={null}>
        <StudioLighting quality={quality} diagonal={diagonal} floorY={floorY} />
        <BoxGroup blueprint={blueprint} solution={solution} appearance={appearance} finishes={finishes} shadows={quality.shadows} debug={debug} />
      </Suspense>
      <CameraRig diagonal={diagonal} />
      <DevProbe />
    </Canvas>
  );
}
