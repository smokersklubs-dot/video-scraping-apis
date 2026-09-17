import { offsetPolygon, polygonCentroid, type Rect, type Segment } from '../core/polygon';
import type { PanelId, StructureBlueprint } from '../core/types';
import type { Vec2 } from '../core/vec2';
import { classifyEdges } from './classify-edges';
import { buildBleed, buildOutline } from './outline';

export interface DielineOptions {
  /** Fond perdu, mm. */
  readonly bleed?: number;
  /** Marge de sécurité intérieure des panneaux imprimables, mm. */
  readonly safe?: number;
}

export interface DielineZone {
  readonly panelId: PanelId;
  readonly polygon: Vec2[];
}

export interface DielinePanelInfo {
  readonly id: PanelId;
  readonly label: string;
  readonly role: string;
  readonly polygon: readonly Vec2[];
  readonly center: Vec2;
  readonly bounds: Rect;
}

export interface DielineModel {
  readonly blank: Rect;
  readonly bleed: number;
  readonly safe: number;
  /** Contours de découpe (une boucle attendue pour BOX-001). */
  readonly cut: Vec2[][];
  readonly crease: Segment[];
  readonly bleedOutline: Vec2[][];
  readonly safeZones: DielineZone[];
  readonly glueZones: DielineZone[];
  readonly panels: DielinePanelInfo[];
  /** Segments non chaînés (défaut de topologie). Doit être vide. */
  readonly openCuts: Vec2[][];
  /** Encombrement avec bleed. */
  readonly extent: Rect;
}

// PACKAGING_VALIDATION_REQUIRED : valeurs par défaut à confirmer avec le prépresse SKLUBS.
export const DEFAULT_BLEED_MM = 3;
export const DEFAULT_SAFE_MM = 3;

export function buildDielineModel(blueprint: StructureBlueprint, options: DielineOptions = {}): DielineModel {
  const bleed = options.bleed ?? DEFAULT_BLEED_MM;
  const safe = options.safe ?? DEFAULT_SAFE_MM;
  const { cuts, creases } = classifyEdges(blueprint);
  const outline = buildOutline(cuts);
  const bleedOutline = buildBleed(outline.loops, bleed);

  const safeZones: DielineZone[] = blueprint.panels
    .filter((p) => p.printable)
    .map((p) => ({ panelId: p.id, polygon: offsetPolygon(p.polygon, -safe) }))
    .filter((z) => z.polygon.length >= 3);

  const glueZones: DielineZone[] = blueprint.panels
    .filter((p) => p.role === 'glue')
    .map((p) => ({ panelId: p.id, polygon: [...p.polygon] }));

  const panels: DielinePanelInfo[] = blueprint.panels.map((p) => ({
    id: p.id,
    label: p.label,
    role: p.role,
    polygon: p.polygon,
    center: polygonCentroid(p.polygon),
    bounds: p.bounds,
  }));

  const b = blueprint.blank;
  const extent: Rect = {
    minX: b.minX - bleed,
    minY: b.minY - bleed,
    maxX: b.maxX + bleed,
    maxY: b.maxY + bleed,
    width: b.width + 2 * bleed,
    height: b.height + 2 * bleed,
  };

  return {
    blank: b,
    bleed,
    safe,
    cut: outline.loops,
    crease: creases,
    bleedOutline,
    safeZones,
    glueZones,
    panels,
    openCuts: outline.open,
    extent,
  };
}
