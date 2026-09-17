import { describe, expect, it } from 'vitest';
import { polygonArea, polygonBounds, polygonIsFinite } from '../src/engine/core/polygon';
import { classifyEdges } from '../src/engine/dieline/classify-edges';
import { buildDielineModel } from '../src/engine/dieline/dieline-model';
import { dielineToSvg } from '../src/engine/dieline/svg';
import { box001TuckEnd } from '../src/engine/structures/box-001-tuck-end';
import { ALL_DIMENSIONS, params } from './fixtures';

describe('dieline engine', () => {
  for (const dims of ALL_DIMENSIONS) {
    const label = `${dims.width}×${dims.depth}×${dims.height}`;
    const bp = box001TuckEnd.build(params(dims));

    it(`${label}: one crease per fold, cuts form a single closed outline`, () => {
      const { cuts, creases } = classifyEdges(bp);
      expect(creases).toHaveLength(bp.folds.length);
      expect(cuts.length).toBeGreaterThan(20);
      const model = buildDielineModel(bp);
      expect(model.openCuts, 'open cut chains').toHaveLength(0);
      expect(model.cut).toHaveLength(1);
      const loop = model.cut[0]!;
      expect(polygonIsFinite(loop)).toBe(true);
      const b = polygonBounds(loop);
      expect(b.width).toBeCloseTo(bp.blank.width, 6);
      expect(b.height).toBeCloseTo(bp.blank.height, 6);
      // Le contour englobe exactement la somme des panneaux.
      expect(polygonArea(loop)).toBeCloseTo(bp.derived.panelArea, 3);
    });

    it(`${label}: bleed is outside and safe zones inside`, () => {
      const model = buildDielineModel(bp, { bleed: 3, safe: 3 });
      expect(model.bleedOutline).toHaveLength(1);
      const bb = polygonBounds(model.bleedOutline[0]!);
      expect(bb.minX).toBeCloseTo(bp.blank.minX - 3, 6);
      expect(bb.maxY).toBeCloseTo(bp.blank.maxY + 3, 6);
      expect(model.safeZones.length).toBe(bp.panels.filter((p) => p.printable).length);
      for (const zone of model.safeZones) {
        const panel = bp.panels.find((p) => p.id === zone.panelId)!;
        const zb = polygonBounds(zone.polygon);
        expect(zb.minX).toBeCloseTo(panel.bounds.minX + 3, 6);
        expect(zb.maxX).toBeCloseTo(panel.bounds.maxX - 3, 6);
      }
      expect(model.glueZones.map((g) => g.panelId)).toEqual(['GLUE']);
    });

    it(`${label}: SVG is well formed and in millimetres`, () => {
      const model = buildDielineModel(bp);
      const svg = dielineToSvg(model, { showLabels: true });
      expect(svg.startsWith('<?xml')).toBe(true);
      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toMatch(/width="[\d.]+mm" height="[\d.]+mm"/);
      expect(svg).toContain('id="cut"');
      expect(svg).toContain('id="crease"');
      expect(svg).toContain('id="bleed"');
      expect(svg).toContain('id="safe"');
      expect(svg).toContain('id="glue"');
      expect(svg).toContain('>FRONT<');
      expect(svg).not.toContain('NaN');
      expect(svg.endsWith('</svg>')).toBe(true);
    });
  }
});
