/**
 * Finitions : architecture seulement en V1 (aucune simulation physique).
 * Chaque finition décrit comment elle affectera le rendu (Phase 9) et le pricing (Phase 10).
 */
export type FinishId =
  | 'MATTE'
  | 'GLOSS'
  | 'SOFT_TOUCH'
  | 'GOLD_FOIL'
  | 'SILVER_FOIL'
  | 'HOLOGRAPHIC'
  | 'SPOT_UV'
  | 'EMBOSS'
  | 'DEBOSS';

export type FinishScope = 'surface' | 'area';

export interface FinishRenderHint {
  /** Modification globale de la rugosité (finitions de surface). */
  readonly roughnessDelta?: number;
  /** Vernis / clearcoat (Phase 9). */
  readonly clearcoat?: number;
  /** Nécessite un masque (zone) dessiné dans l'éditeur. */
  readonly requiresMask: boolean;
  /** Nécessite un relief (normal map générée) — Phase 9. */
  readonly requiresRelief: boolean;
}

export interface FinishDefinition {
  readonly id: FinishId;
  readonly name: string;
  readonly scope: FinishScope;
  readonly render: FinishRenderHint;
  readonly available: boolean;
  /** Exclusions mutuelles (ex. MATTE vs GLOSS). */
  readonly excludes: readonly FinishId[];
}

export const FINISHES: readonly FinishDefinition[] = [
  { id: 'MATTE', name: 'Mat', scope: 'surface', render: { roughnessDelta: 0.15, requiresMask: false, requiresRelief: false }, available: true, excludes: ['GLOSS', 'SOFT_TOUCH'] },
  { id: 'GLOSS', name: 'Brillant', scope: 'surface', render: { roughnessDelta: -0.35, clearcoat: 1, requiresMask: false, requiresRelief: false }, available: true, excludes: ['MATTE', 'SOFT_TOUCH'] },
  { id: 'SOFT_TOUCH', name: 'Soft touch', scope: 'surface', render: { roughnessDelta: 0.3, requiresMask: false, requiresRelief: false }, available: false, excludes: ['MATTE', 'GLOSS'] },
  { id: 'GOLD_FOIL', name: 'Dorure or', scope: 'area', render: { requiresMask: true, requiresRelief: false }, available: false, excludes: [] },
  { id: 'SILVER_FOIL', name: 'Dorure argent', scope: 'area', render: { requiresMask: true, requiresRelief: false }, available: false, excludes: [] },
  { id: 'HOLOGRAPHIC', name: 'Holographique', scope: 'area', render: { requiresMask: true, requiresRelief: false }, available: false, excludes: [] },
  { id: 'SPOT_UV', name: 'Vernis sélectif', scope: 'area', render: { clearcoat: 1, requiresMask: true, requiresRelief: false }, available: false, excludes: [] },
  { id: 'EMBOSS', name: 'Gaufrage', scope: 'area', render: { requiresMask: true, requiresRelief: true }, available: false, excludes: ['DEBOSS'] },
  { id: 'DEBOSS', name: 'Débossage', scope: 'area', render: { requiresMask: true, requiresRelief: true }, available: false, excludes: ['EMBOSS'] },
];

const BY_ID = new Map<FinishId, FinishDefinition>(FINISHES.map((f) => [f.id, f]));

export function getFinish(id: FinishId): FinishDefinition {
  const f = BY_ID.get(id);
  if (!f) throw new Error(`Finition inconnue : ${id}`);
  return f;
}

/** Ajoute/retire une finition en respectant les exclusions mutuelles. */
export function toggleFinish(selected: readonly FinishId[], id: FinishId): FinishId[] {
  if (selected.includes(id)) return selected.filter((f) => f !== id);
  const def = getFinish(id);
  return [...selected.filter((f) => !def.excludes.includes(f)), id];
}
