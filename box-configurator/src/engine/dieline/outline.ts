import { chainSegments, ensureCounterClockwise, offsetPolygon, type Segment } from '../core/polygon';
import type { Vec2 } from '../core/vec2';

export interface OutlineResult {
  /** Boucles fermées de découpe, anti-horaires. */
  readonly loops: Vec2[][];
  /** Chaînes ouvertes : signalent un défaut de topologie (doit être vide). */
  readonly open: Vec2[][];
}

/** Chaîne les segments de découpe en contours fermés. */
export function buildOutline(cuts: readonly Segment[]): OutlineResult {
  const loops: Vec2[][] = [];
  const open: Vec2[][] = [];
  for (const chain of chainSegments(cuts, 1e-3)) {
    if (chain.closed && chain.points.length >= 3) loops.push(ensureCounterClockwise(chain.points));
    else open.push(chain.points);
  }
  return { loops, open };
}

/** Contour de fond perdu : offset extérieur de chaque boucle. */
export function buildBleed(loops: readonly Vec2[][], bleedMm: number): Vec2[][] {
  return loops.map((loop) => offsetPolygon(loop, bleedMm));
}
