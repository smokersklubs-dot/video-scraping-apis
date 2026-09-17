import { collinearOverlap, polygonEdges, segmentLength, subtractIntervals, type Segment } from '../core/polygon';
import type { StructureBlueprint } from '../core/types';
import { lerp } from '../core/vec2';

export interface ClassifiedEdges {
  /** Bords libres : découpe. */
  readonly cuts: Segment[];
  /** Charnières : rainage/pli (émises une fois, via les plis). */
  readonly creases: Segment[];
}

const MIN_SEGMENT_MM = 1e-3;

/**
 * Classe chaque bord de chaque panneau : la partie recouverte par une charnière colinéaire
 * est un pli, le reste est une découpe. Gère les rabats plus étroits que le bord parent.
 */
export function classifyEdges(blueprint: StructureBlueprint): ClassifiedEdges {
  const creases: Segment[] = blueprint.folds.map((f) => f.hinge);
  const cuts: Segment[] = [];

  for (const panel of blueprint.panels) {
    for (const edge of polygonEdges(panel.polygon)) {
      const edgeLen = segmentLength(edge);
      if (edgeLen < MIN_SEGMENT_MM) continue;
      const covered: [number, number][] = [];
      for (const hinge of creases) {
        const overlap = collinearOverlap(edge, hinge, 1e-4);
        if (overlap) covered.push(overlap);
      }
      for (const [t0, t1] of subtractIntervals(covered)) {
        if ((t1 - t0) * edgeLen < MIN_SEGMENT_MM) continue;
        cuts.push({ a: lerp(edge.a, edge.b, t0), b: lerp(edge.a, edge.b, t1) });
      }
    }
  }

  return { cuts, creases };
}
