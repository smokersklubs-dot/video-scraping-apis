import { polygonArea, polygonBounds, rect, roundCorners, type Rect } from '../../core/polygon';
import type {
  BoxParameters,
  DimensionConstraints,
  Fold,
  Panel,
  PanelRole,
  StructureBlueprint,
  StructureModule,
  ValidationIssue,
} from '../../core/types';
import { v2, type Vec2 } from '../../core/vec2';
import { BOX_001_NOTES, computeBox001Layout, type Box001Layout } from './layout';

export const BOX_001_ID = 'BOX-001';

export const BOX_001_PANELS = {
  FRONT: 'FRONT',
  SIDE_R: 'SIDE_R',
  BACK: 'BACK',
  SIDE_L: 'SIDE_L',
  GLUE: 'GLUE',
  LID_TOP: 'LID_TOP',
  TUCK_TOP: 'TUCK_TOP',
  LID_BOT: 'LID_BOT',
  TUCK_BOT: 'TUCK_BOT',
  DUST_TOP_R: 'DUST_TOP_R',
  DUST_BOT_R: 'DUST_BOT_R',
  DUST_TOP_L: 'DUST_TOP_L',
  DUST_BOT_L: 'DUST_BOT_L',
} as const;

export type Box001PanelId = (typeof BOX_001_PANELS)[keyof typeof BOX_001_PANELS];

/** Ordre de pliage : corps → pattes anti-poussière → languettes → couvercles. */
export const BOX_001_STAGES = { BODY: 0, DUST: 1, TUCK: 2, LID: 3 } as const;
const STAGE_COUNT = 4;

const RIGHT_ANGLE = Math.PI / 2;
/** Décalage anti z-fighting des couvercles (mm), invisible à l'œil. */
const LID_LIFT = 0.1;

const CONSTRAINTS: DimensionConstraints = {
  // PACKAGING_VALIDATION_REQUIRED : bornes V1 provisoires.
  width: { min: 20, max: 600 },
  depth: { min: 20, max: 600 },
  height: { min: 20, max: 600 },
  boardThickness: { min: 0.3, max: 3 },
};

const DEFAULTS: BoxParameters = {
  structureId: BOX_001_ID,
  dimensions: { width: 300, depth: 200, height: 100 },
  boardThickness: 0.6,
};

function makePanel(
  id: Box001PanelId,
  role: PanelRole,
  label: string,
  polygon: Vec2[],
  printable: boolean,
): Panel {
  const bounds = polygonBounds(polygon);
  return { id, role, label, polygon, bounds, printable, artworkRegion: bounds };
}

function rectPoly(minX: number, minY: number, maxX: number, maxY: number): Vec2[] {
  return [v2(minX, minY), v2(maxX, minY), v2(maxX, maxY), v2(minX, maxY)];
}

function buildPanels(L: Box001Layout): Panel[] {
  const { bodyBottom: y0, bodyTop: y1 } = L;
  const ti = L.tuckInset;
  const r = L.tuckRadius;
  const c = L.dustClearance;
  const taper = L.dustTaper;

  const lidTopEdge = y1 + L.lidDepth;
  const lidBotEdge = y0 - L.lidDepth;

  const dustFlapTop = (x0: number): Vec2[] => [
    v2(x0 + c, y1),
    v2(x0 + L.D - c, y1),
    v2(x0 + L.D - c - taper, y1 + L.dustFlapLength),
    v2(x0 + c + taper, y1 + L.dustFlapLength),
  ];
  const dustFlapBottom = (x0: number): Vec2[] => [
    v2(x0 + c + taper, y0 - L.dustFlapLength),
    v2(x0 + L.D - c - taper, y0 - L.dustFlapLength),
    v2(x0 + L.D - c, y0),
    v2(x0 + c, y0),
  ];

  return [
    makePanel('FRONT', 'body', 'Face avant', rectPoly(L.xFront, y0, L.xSideR, y1), true),
    makePanel('SIDE_R', 'body', 'Côté droit', rectPoly(L.xSideR, y0, L.xBack, y1), true),
    makePanel('BACK', 'body', 'Face arrière', rectPoly(L.xBack, y0, L.xSideL, y1), true),
    makePanel('SIDE_L', 'body', 'Côté gauche', rectPoly(L.xSideL, y0, L.xGlue, y1), true),
    makePanel(
      'GLUE',
      'glue',
      'Patte de collage',
      [
        v2(L.xGlue, y0),
        v2(L.xEnd, y0 + L.glueChamfer),
        v2(L.xEnd, y1 - L.glueChamfer),
        v2(L.xGlue, y1),
      ],
      false,
    ),
    makePanel('LID_TOP', 'closure', 'Couvercle haut', rectPoly(L.xFront, y1, L.xSideR, lidTopEdge), true),
    makePanel(
      'TUCK_TOP',
      'tuck',
      'Languette haute',
      roundCorners(
        [v2(ti, lidTopEdge), v2(L.W - ti, lidTopEdge), v2(L.W - ti, lidTopEdge + L.tuckLength), v2(ti, lidTopEdge + L.tuckLength)],
        [0, 0, r, r],
      ),
      false,
    ),
    makePanel('LID_BOT', 'closure', 'Couvercle bas', rectPoly(L.xFront, lidBotEdge, L.xSideR, y0), true),
    makePanel(
      'TUCK_BOT',
      'tuck',
      'Languette basse',
      roundCorners(
        [v2(ti, lidBotEdge - L.tuckLength), v2(L.W - ti, lidBotEdge - L.tuckLength), v2(L.W - ti, lidBotEdge), v2(ti, lidBotEdge)],
        [r, r, 0, 0],
      ),
      false,
    ),
    makePanel('DUST_TOP_R', 'dust', 'Patte haute droite', dustFlapTop(L.xSideR), false),
    makePanel('DUST_BOT_R', 'dust', 'Patte basse droite', dustFlapBottom(L.xSideR), false),
    makePanel('DUST_TOP_L', 'dust', 'Patte haute gauche', dustFlapTop(L.xSideL), false),
    makePanel('DUST_BOT_L', 'dust', 'Patte basse gauche', dustFlapBottom(L.xSideL), false),
  ];
}

interface FoldSpec {
  parent: Box001PanelId;
  child: Box001PanelId;
  a: Vec2;
  b: Vec2;
  inset: number;
  stage: number;
  lift?: number;
}

function buildFolds(L: Box001Layout): Fold[] {
  const { bodyBottom: y0, bodyTop: y1 } = L;
  const ti = L.tuckInset;
  const c = L.dustClearance;
  const lidTopEdge = y1 + L.lidDepth;
  const lidBotEdge = y0 - L.lidDepth;
  const S = BOX_001_STAGES;

  const specs: FoldSpec[] = [
    { parent: 'FRONT', child: 'SIDE_R', a: v2(L.xSideR, y0), b: v2(L.xSideR, y1), inset: 0, stage: S.BODY },
    { parent: 'SIDE_R', child: 'BACK', a: v2(L.xBack, y0), b: v2(L.xBack, y1), inset: 0, stage: S.BODY },
    { parent: 'BACK', child: 'SIDE_L', a: v2(L.xSideL, y0), b: v2(L.xSideL, y1), inset: 0, stage: S.BODY },
    { parent: 'SIDE_L', child: 'GLUE', a: v2(L.xGlue, y0), b: v2(L.xGlue, y1), inset: 1, stage: S.BODY },
    { parent: 'FRONT', child: 'LID_TOP', a: v2(L.xFront, y1), b: v2(L.xSideR, y1), inset: 0, stage: S.LID, lift: LID_LIFT },
    { parent: 'LID_TOP', child: 'TUCK_TOP', a: v2(ti, lidTopEdge), b: v2(L.W - ti, lidTopEdge), inset: 1, stage: S.TUCK },
    { parent: 'FRONT', child: 'LID_BOT', a: v2(L.xFront, y0), b: v2(L.xSideR, y0), inset: 0, stage: S.LID, lift: LID_LIFT },
    { parent: 'LID_BOT', child: 'TUCK_BOT', a: v2(ti, lidBotEdge), b: v2(L.W - ti, lidBotEdge), inset: 1, stage: S.TUCK },
    { parent: 'SIDE_R', child: 'DUST_TOP_R', a: v2(L.xSideR + c, y1), b: v2(L.xBack - c, y1), inset: 1, stage: S.DUST },
    { parent: 'SIDE_R', child: 'DUST_BOT_R', a: v2(L.xSideR + c, y0), b: v2(L.xBack - c, y0), inset: 1, stage: S.DUST },
    { parent: 'SIDE_L', child: 'DUST_TOP_L', a: v2(L.xSideL + c, y1), b: v2(L.xGlue - c, y1), inset: 1, stage: S.DUST },
    { parent: 'SIDE_L', child: 'DUST_BOT_L', a: v2(L.xSideL + c, y0), b: v2(L.xGlue - c, y0), inset: 1, stage: S.DUST },
  ];

  return specs.map((s) => ({
    id: `${s.parent}>${s.child}`,
    parentId: s.parent,
    childId: s.child,
    hinge: { a: s.a, b: s.b },
    targetAngle: RIGHT_ANGLE,
    direction: 'inward',
    hingeInset: s.inset,
    lift: s.lift ?? 0,
    stage: s.stage,
  }));
}

function build(params: BoxParameters): StructureBlueprint {
  const L = computeBox001Layout(params);
  const panels = buildPanels(L);
  const folds = buildFolds(L);
  const blank: Rect = rect(0, 0, L.blankWidth, L.blankHeight);
  const panelArea = panels.reduce((sum, p) => sum + polygonArea(p.polygon), 0);
  const printableArea = panels.filter((p) => p.printable).reduce((sum, p) => sum + polygonArea(p.polygon), 0);

  return {
    structureId: BOX_001_ID,
    parameters: params,
    rootPanelId: 'FRONT',
    panels,
    folds,
    blank,
    derived: {
      blankArea: blank.width * blank.height,
      panelArea,
      printableArea,
      glueFlapWidth: L.glueFlapWidth,
      tuckLength: L.tuckLength,
      dustFlapLength: L.dustFlapLength,
      stageCount: STAGE_COUNT,
    },
    notes: BOX_001_NOTES,
  };
}

function validate(params: BoxParameters): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const L = computeBox001Layout(params);
  if (L.dustFlapLength < 6) {
    issues.push({
      level: 'error',
      code: 'BOX001_DUST_FLAP_TOO_SHORT',
      field: 'width',
      message: `Largeur insuffisante pour les pattes anti-poussière (minimum ≈ ${Math.ceil(14 + 4 * L.t)} mm avec ce carton).`,
    });
  }
  if (L.tuckWidth < 8) {
    issues.push({
      level: 'error',
      code: 'BOX001_TUCK_TOO_NARROW',
      field: 'width',
      message: 'Largeur insuffisante pour la languette de fermeture.',
    });
  }
  if (L.dustBaseWidth < 4) {
    issues.push({
      level: 'error',
      code: 'BOX001_DEPTH_TOO_SMALL',
      field: 'depth',
      message: `Profondeur insuffisante pour ce carton (minimum ≈ ${Math.ceil(4 + 2 * L.dustClearance)} mm).`,
    });
  }
  return issues;
}

export const box001TuckEnd: StructureModule = {
  id: BOX_001_ID,
  name: 'Boîte pliante à languettes (Tuck End)',
  category: 'folding-carton',
  description:
    'Boîte carton pliante de référence : corps à quatre faces collé par une patte, fermeture haute et basse par couvercle et languette rentrante, pattes anti-poussière.',
  defaults: DEFAULTS,
  constraints: CONSTRAINTS,
  build,
  validate,
};

export { computeBox001Layout } from './layout';
