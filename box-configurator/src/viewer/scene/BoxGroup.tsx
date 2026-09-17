import { useEffect, useMemo } from 'react';
import type { StructureBlueprint } from '../../engine/core/types';
import type { FoldSolution } from '../../engine/folding/fold-transforms';
import type { FinishId } from '../../engine/finishes';
import type { MaterialAppearance } from '../../engine/materials';
import { DebugOverlay, type DebugFlags } from '../debug/DebugOverlay';
import { createPanelMaterials } from '../materials/panel-materials';
import { PanelMesh } from '../meshes/PanelMesh';
import { SCENE_UNITS_PER_MM } from '../units';

interface BoxGroupProps {
  readonly blueprint: StructureBlueprint;
  readonly solution: FoldSolution;
  readonly appearance: MaterialAppearance;
  readonly finishes: readonly FinishId[];
  readonly shadows: boolean;
  readonly debug: DebugFlags | null;
}

/**
 * Groupe racine : mm → scène (une seule échelle). Le centre de l'encombrement courant est
 * ramené à l'origine : pendant le dépliage, le patron reste cadré.
 */
export function BoxGroup({ blueprint, solution, appearance, finishes, shadows, debug }: BoxGroupProps) {
  const uvChecker = debug?.uvChecker ?? false;
  const materials = useMemo(() => createPanelMaterials(appearance, finishes, { uvChecker }), [appearance, finishes, uvChecker]);

  useEffect(() => () => materials.dispose(), [materials]);

  const s = SCENE_UNITS_PER_MM;
  const center = solution.bounds.center;
  const thickness = blueprint.parameters.boardThickness;

  return (
    <group scale={s} position={[-center.x * s, -center.y * s, -center.z * s]}>
      {blueprint.panels.map((panel) => {
        const tr = solution.transforms.get(panel.id);
        if (!tr) return null;
        return (
          <PanelMesh
            key={panel.id}
            panel={panel}
            thickness={thickness}
            blank={blueprint.blank}
            matrix={tr.matrix}
            materials={materials}
            shadows={shadows}
          />
        );
      })}
      {debug ? <DebugOverlay blueprint={blueprint} solution={solution} flags={debug} /> : null}
    </group>
  );
}
