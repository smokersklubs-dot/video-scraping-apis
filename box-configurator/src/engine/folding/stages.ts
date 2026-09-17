/**
 * Séquencement du pliage : le progress global [0, 1] est réparti sur `stageCount` étapes
 * successives afin que les rabats ne traversent pas les panneaux pendant l'animation.
 */
export type FoldingMode = 'sequential' | 'simultaneous';

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function stageProgress(
  globalProgress: number,
  stage: number,
  stageCount: number,
  mode: FoldingMode = 'sequential',
): number {
  const p = clamp01(globalProgress);
  if (mode === 'simultaneous' || stageCount <= 1) return p;
  return clamp01(p * stageCount - stage);
}

/** Lissage doux pour l'animation (dérivée nulle aux extrémités). */
export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}
