import type { Segment } from '../core/polygon';
import type { Vec2 } from '../core/vec2';
import type { DielineModel } from './dieline-model';

export interface SvgOptions {
  readonly showBleed?: boolean;
  readonly showSafe?: boolean;
  readonly showGlue?: boolean;
  readonly showLabels?: boolean;
  /** Marge autour du patron, mm. */
  readonly margin?: number;
  readonly title?: string;
}

/** Couleurs des calques (identité SKLUBS). */
export const DIELINE_COLORS = {
  cut: '#1F2A36',
  crease: '#1E90FF',
  bleed: '#FF6A00',
  safe: '#00B25A',
  glue: '#9AA3AD',
  label: '#6B7280',
} as const;

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/\.?0+$/, '');
}

/** Données de chemin SVG pour une polyligne (fermée ou non). */
export function polylinePath(points: readonly Vec2[], closed: boolean): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  if (!first) return '';
  const parts = [`M${fmt(first.x)} ${fmt(first.y)}`, ...rest.map((p) => `L${fmt(p.x)} ${fmt(p.y)}`)];
  if (closed) parts.push('Z');
  return parts.join(' ');
}

export function segmentsPath(segments: readonly Segment[]): string {
  return segments.map((s) => `M${fmt(s.a.x)} ${fmt(s.a.y)} L${fmt(s.b.x)} ${fmt(s.b.y)}`).join(' ');
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Sérialise le patron en SVG à l'échelle 1:1 (unités mm). Le repère patron a `y` vers le haut :
 * une seule transformation inverse l'axe pour le SVG.
 */
export function dielineToSvg(model: DielineModel, options: SvgOptions = {}): string {
  const margin = options.margin ?? 5;
  const showBleed = options.showBleed ?? true;
  const showSafe = options.showSafe ?? true;
  const showGlue = options.showGlue ?? true;
  const showLabels = options.showLabels ?? false;

  const minX = model.extent.minX - margin;
  const minY = model.extent.minY - margin;
  const width = model.extent.width + 2 * margin;
  const height = model.extent.height + 2 * margin;
  // Inversion de y : y_svg = (minY + height) - y_patron.
  const flip = `translate(0 ${fmt(minY + height + minY)}) scale(1 -1)`;

  const layers: string[] = [];

  if (showBleed && model.bleedOutline.length > 0) {
    layers.push(
      `<g id="bleed" fill="none" stroke="${DIELINE_COLORS.bleed}" stroke-width="0.2">` +
        model.bleedOutline.map((loop) => `<path d="${polylinePath(loop, true)}"/>`).join('') +
        '</g>',
    );
  }
  if (showGlue && model.glueZones.length > 0) {
    layers.push(
      `<g id="glue" fill="url(#glue-hatch)" stroke="none">` +
        model.glueZones.map((z) => `<path d="${polylinePath(z.polygon, true)}"/>`).join('') +
        '</g>',
    );
  }
  if (showSafe && model.safeZones.length > 0) {
    layers.push(
      `<g id="safe" fill="none" stroke="${DIELINE_COLORS.safe}" stroke-width="0.15" stroke-dasharray="1 1">` +
        model.safeZones.map((z) => `<path d="${polylinePath(z.polygon, true)}"/>`).join('') +
        '</g>',
    );
  }
  layers.push(
    `<g id="crease" fill="none" stroke="${DIELINE_COLORS.crease}" stroke-width="0.25" stroke-dasharray="3 1.5">` +
      `<path d="${segmentsPath(model.crease)}"/>` +
      '</g>',
  );
  layers.push(
    `<g id="cut" fill="none" stroke="${DIELINE_COLORS.cut}" stroke-width="0.3" stroke-linejoin="round">` +
      model.cut.map((loop) => `<path d="${polylinePath(loop, true)}"/>`).join('') +
      model.openCuts.map((chain) => `<path d="${polylinePath(chain, false)}" stroke="#E11D48"/>`).join('') +
      '</g>',
  );
  if (showLabels) {
    layers.push(
      `<g id="labels" font-family="DM Sans, Arial, sans-serif" font-size="4" fill="${DIELINE_COLORS.label}" text-anchor="middle">` +
        model.panels
          .map(
            (p) =>
              `<text transform="translate(${fmt(p.center.x)} ${fmt(p.center.y)}) scale(1 -1)">${escapeXml(p.id)}</text>`,
          )
          .join('') +
        '</g>',
    );
  }

  const title = options.title ?? 'SKLUBS dieline — aperçu technique, non validé pour production';

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width)}mm" height="${fmt(height)}mm" ` +
    `viewBox="${fmt(minX)} ${fmt(minY)} ${fmt(width)} ${fmt(height)}">` +
    `<title>${escapeXml(title)}</title>` +
    `<defs><pattern id="glue-hatch" patternUnits="userSpaceOnUse" width="2" height="2" patternTransform="rotate(45)">` +
    `<line x1="0" y1="0" x2="0" y2="2" stroke="${DIELINE_COLORS.glue}" stroke-width="0.4"/></pattern></defs>` +
    `<g transform="${flip}">${layers.join('')}</g>` +
    `</svg>`
  );
}
