import type { BoxParameters } from '../../core/types';

/**
 * Cotes dérivées de BOX-001. Toutes les formules non purement géométriques sont des
 * hypothèses V1 marquées PACKAGING_VALIDATION_REQUIRED dans `NOTES`.
 */
export interface Box001Layout {
  readonly W: number;
  readonly D: number;
  readonly H: number;
  readonly t: number;
  /** Largeur de la patte de collage. */
  readonly glueFlapWidth: number;
  /** Chanfrein à 45° aux extrémités de la patte de collage. */
  readonly glueChamfer: number;
  /** Profondeur du couvercle (= D en V1). */
  readonly lidDepth: number;
  /** Longueur de la languette. */
  readonly tuckLength: number;
  /** Retrait latéral de la languette par rapport à W. */
  readonly tuckInset: number;
  readonly tuckWidth: number;
  readonly tuckRadius: number;
  /** Longueur de la patte anti-poussière. */
  readonly dustFlapLength: number;
  /** Dégagement de la patte anti-poussière par rapport aux bords du panneau latéral. */
  readonly dustClearance: number;
  readonly dustBaseWidth: number;
  readonly dustTaper: number;
  /** Extension verticale du patron au-dessus et en dessous du corps. */
  readonly verticalExtension: number;
  /** y du bas du corps. */
  readonly bodyBottom: number;
  /** y du haut du corps. */
  readonly bodyTop: number;
  /** Abscisses des panneaux du corps. */
  readonly xFront: number;
  readonly xSideR: number;
  readonly xBack: number;
  readonly xSideL: number;
  readonly xGlue: number;
  readonly xEnd: number;
  readonly blankWidth: number;
  readonly blankHeight: number;
}

export const BOX_001_NOTES: readonly string[] = [
  'PACKAGING_VALIDATION_REQUIRED: dimensions traitées comme extérieures (pas d’allowance intérieur/extérieur).',
  'PACKAGING_VALIDATION_REQUIRED: longueur de languette = min(clamp(0.7·D, 12, 30), H − 2t − 1) mm, sans épaulements de verrouillage.',
  'PACKAGING_VALIDATION_REQUIRED: patte anti-poussière = min(0.7·D, W/2 − 2t − 1), trapèze rétréci de 15 % par côté.',
  'PACKAGING_VALIDATION_REQUIRED: patte de collage = clamp(0.12·D, 12, 20) mm, chanfreins 45°.',
  'PACKAGING_VALIDATION_REQUIRED: couvercle = D exactement (aucune allowance d’épaisseur au pli).',
  'PACKAGING_VALIDATION_REQUIRED: bleed 3 mm et safe zone 3 mm à confirmer avec le prépresse SKLUBS.',
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeBox001Layout(params: BoxParameters): Box001Layout {
  const { width: W, depth: D, height: H } = params.dimensions;
  const t = params.boardThickness;

  const glueFlapWidth = clamp(0.12 * D, 12, 20);
  const glueChamfer = Math.min(glueFlapWidth, H / 3);
  const lidDepth = D;
  // La languette pend à l'intérieur le long du dos : elle ne peut pas dépasser la hauteur utile.
  const tuckLength = Math.min(clamp(0.7 * D, 12, 30), H - 2 * t - 1);
  const tuckInset = t + 1.5;
  const tuckWidth = W - 2 * tuckInset;
  const tuckRadius = Math.min(0.35 * tuckLength, 8);
  const dustFlapLength = Math.min(0.7 * D, W / 2 - 2 * t - 1);
  const dustClearance = 1.5 + 2 * t;
  const dustBaseWidth = D - 2 * dustClearance;
  const dustTaper = 0.15 * dustBaseWidth;
  const verticalExtension = Math.max(lidDepth + tuckLength, dustFlapLength);

  const bodyBottom = verticalExtension;
  const bodyTop = bodyBottom + H;
  const xFront = 0;
  const xSideR = W;
  const xBack = W + D;
  const xSideL = 2 * W + D;
  const xGlue = 2 * W + 2 * D;
  const xEnd = xGlue + glueFlapWidth;

  return {
    W,
    D,
    H,
    t,
    glueFlapWidth,
    glueChamfer,
    lidDepth,
    tuckLength,
    tuckInset,
    tuckWidth,
    tuckRadius,
    dustFlapLength,
    dustClearance,
    dustBaseWidth,
    dustTaper,
    verticalExtension,
    bodyBottom,
    bodyTop,
    xFront,
    xSideR,
    xBack,
    xSideL,
    xGlue,
    xEnd,
    blankWidth: xEnd,
    blankHeight: H + 2 * verticalExtension,
  };
}
