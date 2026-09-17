import type { Rect } from '../core/polygon';
import type { PanelId } from '../core/types';
import type { Vec2 } from '../core/vec2';

/**
 * Artwork Engine — types préparés pour la Phase 7 (voir ARTWORK_ENGINE.md).
 * Le mapping patron → UV est déjà utilisé par le viewer (atlas UV).
 */
export type ArtworkKind = 'raster' | 'svg' | 'pdf';

export interface ArtworkAsset {
  readonly id: string;
  readonly kind: ArtworkKind;
  readonly name: string;
  /** Dimensions natives en pixels (raster) ou en mm (vecteur). */
  readonly width: number;
  readonly height: number;
  readonly source: string;
}

export interface ArtworkPlacement {
  readonly assetId: string;
  /** Position/taille dans le repère patron (mm). */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
  readonly locked: boolean;
  readonly panelHint?: PanelId;
}

export interface ArtworkLayer {
  readonly placements: readonly ArtworkPlacement[];
}

/** Coordonnées patron (mm) → UV normalisées dans le bbox du blank. */
export function dielineToUv(point: Vec2, blank: Rect): Vec2 {
  return {
    x: blank.width === 0 ? 0 : (point.x - blank.minX) / blank.width,
    y: blank.height === 0 ? 0 : (point.y - blank.minY) / blank.height,
  };
}
