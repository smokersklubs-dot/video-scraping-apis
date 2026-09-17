import { Html, Line } from '@react-three/drei';
import { useMemo } from 'react';
import { transformPoint, v3 } from '../../engine/core/mat4';
import { polygonCentroid } from '../../engine/core/polygon';
import type { StructureBlueprint } from '../../engine/core/types';
import type { FoldSolution } from '../../engine/folding/fold-transforms';

export interface DebugFlags {
  readonly panelIds: boolean;
  readonly hinges: boolean;
  readonly normals: boolean;
  readonly pivots: boolean;
  readonly uvChecker: boolean;
  readonly axes: boolean;
}

export const DEFAULT_DEBUG_FLAGS: DebugFlags = {
  panelIds: true,
  hinges: true,
  normals: true,
  pivots: true,
  uvChecker: false,
  axes: true,
};

type Point3 = [number, number, number];

interface DebugOverlayProps {
  readonly blueprint: StructureBlueprint;
  readonly solution: FoldSolution;
  readonly flags: DebugFlags;
}

/**
 * Superposition de diagnostic, dans le repère du groupe racine (mm) : identifiants,
 * charnières, normales et pivots suivent le pliage en temps réel.
 */
export function DebugOverlay({ blueprint, solution, flags }: DebugOverlayProps) {
  const normalLength = Math.max(8, Math.min(blueprint.parameters.dimensions.width, blueprint.parameters.dimensions.depth) * 0.15);

  const items = useMemo(() => {
    const byId = new Map(blueprint.panels.map((p) => [p.id, p]));
    const labels: { id: string; at: Point3 }[] = [];
    const normals: { from: Point3; to: Point3 }[] = [];
    for (const panel of blueprint.panels) {
      const tr = solution.transforms.get(panel.id);
      if (!tr) continue;
      const c = polygonCentroid(panel.polygon);
      const w = transformPoint(tr.matrix, v3(c.x, c.y, 0));
      labels.push({ id: panel.id, at: [w.x, w.y, w.z] });
      normals.push({ from: [w.x, w.y, w.z], to: [w.x + tr.normal.x * normalLength, w.y + tr.normal.y * normalLength, w.z + tr.normal.z * normalLength] });
    }
    const hinges: { from: Point3; to: Point3 }[] = [];
    const pivots: Point3[] = [];
    for (const fold of blueprint.folds) {
      const parent = byId.get(fold.parentId);
      const tr = parent ? solution.transforms.get(parent.id) : undefined;
      if (!tr) continue;
      const a = transformPoint(tr.matrix, v3(fold.hinge.a.x, fold.hinge.a.y, 0));
      const b = transformPoint(tr.matrix, v3(fold.hinge.b.x, fold.hinge.b.y, 0));
      hinges.push({ from: [a.x, a.y, a.z], to: [b.x, b.y, b.z] });
      pivots.push([(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2]);
    }
    return { labels, normals, hinges, pivots };
  }, [blueprint, solution, normalLength]);

  const pivotRadius = Math.max(1, normalLength * 0.12);

  return (
    <group>
      {flags.axes ? <axesHelper args={[normalLength * 3]} /> : null}
      {flags.hinges
        ? items.hinges.map((h, i) => <Line key={`h${i}`} points={[h.from, h.to]} color="#1E90FF" lineWidth={2} />)
        : null}
      {flags.normals
        ? items.normals.map((n, i) => <Line key={`n${i}`} points={[n.from, n.to]} color="#FF6A00" lineWidth={1.5} />)
        : null}
      {flags.pivots
        ? items.pivots.map((p, i) => (
            <mesh key={`p${i}`} position={p}>
              <sphereGeometry args={[pivotRadius, 10, 10]} />
              <meshBasicMaterial color="#00E676" />
            </mesh>
          ))
        : null}
      {flags.panelIds
        ? items.labels.map((l) => (
            <Html key={l.id} position={l.at} center style={{ pointerEvents: 'none' }}>
              <span className="debug-label">{l.id}</span>
            </Html>
          ))
        : null}
    </group>
  );
}
