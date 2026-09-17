import type { Polygon, Rect, Segment } from './polygon';

/** Identifiant de structure (BOX-001, BOX-002, …). */
export type StructureId = string;

/** Identifiant de panneau propre à chaque structure (FRONT, SIDE_R, …). */
export type PanelId = string;

export interface Dimensions {
  /** Largeur (X), mm. */
  readonly width: number;
  /** Profondeur (Z), mm. */
  readonly depth: number;
  /** Hauteur (Y), mm. */
  readonly height: number;
}

export type DimensionKey = keyof Dimensions;

export type StructureOptions = Readonly<Record<string, number | string | boolean>>;

export interface BoxParameters {
  readonly structureId: StructureId;
  /** Dimensions EXTÉRIEURES en V1 (voir BOX_ENGINE.md §1). */
  readonly dimensions: Dimensions;
  /** Épaisseur du carton, mm. */
  readonly boardThickness: number;
  readonly options?: StructureOptions;
}

export type PanelRole = 'body' | 'closure' | 'tuck' | 'dust' | 'glue';

export interface Panel {
  readonly id: PanelId;
  readonly role: PanelRole;
  readonly label: string;
  /** Contour dans le repère patron (mm), anti-horaire. */
  readonly polygon: Polygon;
  readonly bounds: Rect;
  /** Participe à la surface imprimable (safe zone, artwork). */
  readonly printable: boolean;
  /** Zone artwork (bbox du panneau) — Phase 7. */
  readonly artworkRegion: Rect;
}

export type FoldDirection = 'inward' | 'outward';

export interface Fold {
  readonly id: string;
  readonly parentId: PanelId;
  readonly childId: PanelId;
  /** Charnière dans le repère patron : bord partagé parent/enfant. */
  readonly hinge: Segment;
  /** Angle cible en radians (π/2 pour un pli à 90°). */
  readonly targetAngle: number;
  readonly direction: FoldDirection;
  /** Retrait de la charnière dans le parent, en multiples d'épaisseur (empilement propre). */
  readonly hingeInset: number;
  /** Décalage le long de la normale de l'enfant une fois plié, mm (anti z-fighting). */
  readonly lift: number;
  /** Étape de pliage (0 = corps, puis pattes, languettes, couvercles). */
  readonly stage: number;
}

export interface BlueprintDerived {
  readonly blankArea: number;
  readonly panelArea: number;
  readonly printableArea: number;
  readonly glueFlapWidth: number;
  readonly tuckLength: number;
  readonly dustFlapLength: number;
  readonly stageCount: number;
}

export interface StructureBlueprint {
  readonly structureId: StructureId;
  readonly parameters: BoxParameters;
  readonly rootPanelId: PanelId;
  readonly panels: readonly Panel[];
  readonly folds: readonly Fold[];
  /** Encombrement du patron à plat (mm). */
  readonly blank: Rect;
  readonly derived: BlueprintDerived;
  /** Hypothèses marquées PACKAGING_VALIDATION_REQUIRED. */
  readonly notes: readonly string[];
}

export interface Range {
  readonly min: number;
  readonly max: number;
}

export interface DimensionConstraints {
  readonly width: Range;
  readonly depth: Range;
  readonly height: Range;
  readonly boardThickness: Range;
}

export interface StructureModule {
  readonly id: StructureId;
  readonly name: string;
  readonly category: string;
  readonly description: string;
  readonly defaults: BoxParameters;
  readonly constraints: DimensionConstraints;
  build(params: BoxParameters): StructureBlueprint;
  /** Règles structurelles spécifiques (retourne des problèmes, vide si OK). */
  validate(params: BoxParameters): ValidationIssue[];
}

export type ValidationLevel = 'error' | 'warning';

export type ValidationField = DimensionKey | 'boardThickness' | 'structure';

export interface ValidationIssue {
  readonly level: ValidationLevel;
  readonly code: string;
  readonly message: string;
  readonly field: ValidationField;
}

export interface ValidationResult {
  readonly ok: boolean;
  readonly issues: readonly ValidationIssue[];
}
