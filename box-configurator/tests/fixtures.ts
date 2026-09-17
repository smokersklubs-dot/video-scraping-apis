import type { BoxParameters, Dimensions } from '../src/engine/core/types';
import { BOX_001_ID } from '../src/engine/structures/box-001-tuck-end';

/** Jeux de dimensions du brief (§26) + cas limites. */
export const BRIEF_DIMENSIONS: readonly Dimensions[] = [
  { width: 50, depth: 30, height: 80 },
  { width: 100, depth: 50, height: 150 },
  { width: 200, depth: 100, height: 300 },
  { width: 300, depth: 200, height: 100 },
];

export const EXTRA_DIMENSIONS: readonly Dimensions[] = [
  { width: 150, depth: 80, height: 220 },
  { width: 20, depth: 20, height: 20 },
  { width: 600, depth: 600, height: 600 },
  { width: 40, depth: 300, height: 25 },
];

export const ALL_DIMENSIONS: readonly Dimensions[] = [...BRIEF_DIMENSIONS, ...EXTRA_DIMENSIONS];

export function params(dimensions: Dimensions, boardThickness = 0.6): BoxParameters {
  return { structureId: BOX_001_ID, dimensions, boardThickness };
}

export const DEFAULT_THICKNESS = 0.6;
