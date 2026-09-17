import type {
  BoxParameters,
  DimensionConstraints,
  DimensionKey,
  Range,
  StructureModule,
  ValidationIssue,
  ValidationResult,
} from '../core/types';

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  width: 'Largeur',
  depth: 'Profondeur',
  height: 'Hauteur',
};

// PACKAGING_VALIDATION_REQUIRED : format de feuille courant à confirmer.
const SHEET_WARNING = { width: 1000, height: 700 };
const EXTREME_RATIO = 12;

function checkRange(field: DimensionKey | 'boardThickness', value: number, range: Range, label: string): ValidationIssue | null {
  if (!Number.isFinite(value)) {
    return { level: 'error', code: `${field.toUpperCase()}_NOT_A_NUMBER`, field, message: `${label} : valeur invalide.` };
  }
  if (value < range.min) {
    return { level: 'error', code: `${field.toUpperCase()}_TOO_SMALL`, field, message: `${label} : minimum ${range.min} mm.` };
  }
  if (value > range.max) {
    return { level: 'error', code: `${field.toUpperCase()}_TOO_LARGE`, field, message: `${label} : maximum ${range.max} mm.` };
  }
  return null;
}

/** Validation générique (bornes, NaN) + règles structurelles du module. */
export function validateParameters(params: BoxParameters, structure: StructureModule): ValidationResult {
  const issues: ValidationIssue[] = [];
  const c = structure.constraints;

  for (const key of ['width', 'depth', 'height'] as const) {
    const issue = checkRange(key, params.dimensions[key], c[key], DIMENSION_LABELS[key]);
    if (issue) issues.push(issue);
  }
  const thickness = checkRange('boardThickness', params.boardThickness, c.boardThickness, 'Épaisseur du carton');
  if (thickness) issues.push(thickness);

  if (issues.length === 0) {
    issues.push(...structure.validate(params));
  }

  if (issues.every((i) => i.level !== 'error')) {
    const { width, depth, height } = params.dimensions;
    const values = [width, depth, height];
    const ratio = Math.max(...values) / Math.min(...values);
    if (ratio > EXTREME_RATIO) {
      issues.push({
        level: 'warning',
        code: 'EXTREME_ASPECT_RATIO',
        field: 'structure',
        message: 'Proportions extrêmes : la tenue de la boîte doit être vérifiée en production.',
      });
    }
    const blueprint = structure.build(params);
    const blankW = blueprint.blank.width;
    const blankH = blueprint.blank.height;
    const fits =
      (blankW <= SHEET_WARNING.width && blankH <= SHEET_WARNING.height) ||
      (blankW <= SHEET_WARNING.height && blankH <= SHEET_WARNING.width);
    if (!fits) {
      issues.push({
        level: 'warning',
        code: 'BLANK_EXCEEDS_SHEET',
        field: 'structure',
        message: `Patron de ${Math.round(blankW)} × ${Math.round(blankH)} mm : dépasse le format de feuille courant (${SHEET_WARNING.width} × ${SHEET_WARNING.height} mm). Devis spécifique.`,
      });
    }
  }

  return { ok: issues.every((i) => i.level !== 'error'), issues };
}

function clampTo(value: number, range: Range, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(range.max, Math.max(range.min, value));
}

/** Ramène des paramètres dans les bornes (jamais de NaN en sortie). */
export function sanitizeParameters(params: BoxParameters, constraints: DimensionConstraints, defaults: BoxParameters): BoxParameters {
  return {
    ...params,
    dimensions: {
      width: clampTo(params.dimensions.width, constraints.width, defaults.dimensions.width),
      depth: clampTo(params.dimensions.depth, constraints.depth, defaults.dimensions.depth),
      height: clampTo(params.dimensions.height, constraints.height, defaults.dimensions.height),
    },
    boardThickness: clampTo(params.boardThickness, constraints.boardThickness, defaults.boardThickness),
  };
}
