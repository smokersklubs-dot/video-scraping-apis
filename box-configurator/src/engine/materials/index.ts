/**
 * Définitions de matériaux. Le viewer ne consomme que `appearance` ; le pricing ne consomme
 * que `commercial` ; la géométrie ne consomme que `boardThickness`.
 */
export type MaterialId = 'WHITE_BOARD' | 'KRAFT' | 'COATED_BOARD' | 'CORRUGATED' | 'PREMIUM_BOARD';

export interface MaterialAppearance {
  /** Couleur de la face imprimée (hex). */
  readonly outerColor: string;
  /** Couleur du dos du carton. */
  readonly innerColor: string;
  /** Couleur de la tranche. */
  readonly edgeColor: string;
  readonly roughness: number;
  readonly metalness: number;
  /** Intensité d'un futur relief (grain) — Phase 8. */
  readonly bumpStrength: number;
}

export interface MaterialCommercial {
  readonly available: boolean;
  readonly note?: string;
  /** Grammage indicatif g/m² (informatif). */
  readonly grammage?: number;
}

export interface MaterialDefinition {
  readonly id: MaterialId;
  readonly name: string;
  readonly description: string;
  /** Épaisseur du carton, mm. PACKAGING_VALIDATION_REQUIRED sur chaque valeur. */
  readonly boardThickness: number;
  readonly appearance: MaterialAppearance;
  readonly commercial: MaterialCommercial;
}

export const MATERIALS: readonly MaterialDefinition[] = [
  {
    id: 'WHITE_BOARD',
    name: 'Carton blanc',
    description: 'Carton compact blanc, surface lisse, idéal pour une impression couleur.',
    boardThickness: 0.6,
    appearance: { outerColor: '#F4F2EC', innerColor: '#E9E6DE', edgeColor: '#D8D4CA', roughness: 0.62, metalness: 0, bumpStrength: 0 },
    commercial: { available: true, grammage: 400 },
  },
  {
    id: 'KRAFT',
    name: 'Carton kraft',
    description: 'Carton kraft naturel, rendu brut et chaleureux.',
    boardThickness: 0.6,
    appearance: { outerColor: '#B98A5A', innerColor: '#A97C4F', edgeColor: '#8F673F', roughness: 0.85, metalness: 0, bumpStrength: 0.3 },
    commercial: { available: true, grammage: 350 },
  },
  {
    id: 'COATED_BOARD',
    name: 'Carton couché',
    description: 'Carton blanc couché une face, surface très lisse.',
    boardThickness: 0.5,
    appearance: { outerColor: '#FAFAF7', innerColor: '#D9D9D4', edgeColor: '#CFCFC8', roughness: 0.45, metalness: 0, bumpStrength: 0 },
    commercial: { available: false, note: 'Bientôt disponible' },
  },
  {
    id: 'CORRUGATED',
    name: 'Micro-cannelure',
    description: 'Carton ondulé cannelure E, rigidité renforcée.',
    boardThickness: 1.5,
    appearance: { outerColor: '#C9A87C', innerColor: '#B58F60', edgeColor: '#A67F50', roughness: 0.9, metalness: 0, bumpStrength: 0.5 },
    commercial: { available: false, note: 'Bientôt disponible' },
  },
  {
    id: 'PREMIUM_BOARD',
    name: 'Carton premium',
    description: 'Carton haut de gamme, forte épaisseur, toucher luxe.',
    boardThickness: 0.8,
    appearance: { outerColor: '#F7F5F0', innerColor: '#EFECE4', edgeColor: '#E0DCD2', roughness: 0.55, metalness: 0, bumpStrength: 0 },
    commercial: { available: false, note: 'Bientôt disponible' },
  },
];

const BY_ID = new Map<MaterialId, MaterialDefinition>(MATERIALS.map((m) => [m.id, m]));

export function getMaterial(id: MaterialId): MaterialDefinition {
  const m = BY_ID.get(id);
  if (!m) throw new Error(`Matériau inconnu : ${id}`);
  return m;
}

export const DEFAULT_MATERIAL_ID: MaterialId = 'WHITE_BOARD';
