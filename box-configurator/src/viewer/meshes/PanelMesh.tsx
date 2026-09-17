import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import type { Mat4 } from '../../engine/core/mat4';
import type { Rect } from '../../engine/core/polygon';
import type { Panel } from '../../engine/core/types';
import type { PanelMaterialSet } from '../materials/panel-materials';
import { buildPanelGeometry } from './panel-geometry';

interface PanelMeshProps {
  readonly panel: Panel;
  readonly thickness: number;
  readonly blank: Rect;
  readonly matrix: Mat4;
  readonly materials: PanelMaterialSet;
  readonly shadows: boolean;
}

/**
 * Un panneau = une géométrie (dépend du polygone) + une matrice (dépend du pliage).
 * Le slider de pliage ne reconstruit jamais la géométrie.
 */
export function PanelMesh({ panel, thickness, blank, matrix, materials, shadows }: PanelMeshProps) {
  const ref = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => buildPanelGeometry(panel, thickness, blank), [panel, thickness, blank]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.matrix.fromArray(matrix);
    mesh.matrixWorldNeedsUpdate = true;
  }, [matrix]);

  return (
    <mesh
      ref={ref}
      name={panel.id}
      geometry={geometry}
      material={materials.list}
      matrixAutoUpdate={false}
      castShadow={shadows}
      receiveShadow={shadows}
    />
  );
}
