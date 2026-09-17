import { describe, expect, it } from 'vitest';
import { isCounterClockwise, polygonArea, polygonIsFinite } from '../src/engine/core/polygon';
import { BOX_001_PANELS, box001TuckEnd, computeBox001Layout } from '../src/engine/structures/box-001-tuck-end';
import { ALL_DIMENSIONS, DEFAULT_THICKNESS, params } from './fixtures';

const EXPECTED_PANELS = Object.values(BOX_001_PANELS);

describe('BOX-001 blueprint', () => {
  for (const dims of ALL_DIMENSIONS) {
    const label = `${dims.width}×${dims.depth}×${dims.height}`;

    it(`${label}: all 13 panels present, finite, counter-clockwise`, () => {
      const bp = box001TuckEnd.build(params(dims));
      expect(bp.panels.map((p) => p.id).sort()).toEqual([...EXPECTED_PANELS].sort());
      for (const p of bp.panels) {
        expect(polygonIsFinite(p.polygon), p.id).toBe(true);
        expect(p.polygon.length, p.id).toBeGreaterThanOrEqual(4);
        expect(isCounterClockwise(p.polygon), `${p.id} inverted`).toBe(true);
        expect(polygonArea(p.polygon), p.id).toBeGreaterThan(0);
      }
    });

    it(`${label}: blank size follows the layout formulas`, () => {
      const bp = box001TuckEnd.build(params(dims));
      const L = computeBox001Layout(params(dims));
      const { width: W, depth: D, height: H } = dims;
      expect(bp.blank.width).toBeCloseTo(2 * W + 2 * D + L.glueFlapWidth);
      expect(bp.blank.height).toBeCloseTo(H + 2 * Math.max(D + L.tuckLength, L.dustFlapLength));
      for (const p of bp.panels) {
        expect(p.bounds.minX).toBeGreaterThanOrEqual(bp.blank.minX - 1e-9);
        expect(p.bounds.maxX).toBeLessThanOrEqual(bp.blank.maxX + 1e-9);
        expect(p.bounds.minY).toBeGreaterThanOrEqual(bp.blank.minY - 1e-9);
        expect(p.bounds.maxY).toBeLessThanOrEqual(bp.blank.maxY + 1e-9);
      }
    });

    it(`${label}: body panels have exact dimensions`, () => {
      const bp = box001TuckEnd.build(params(dims));
      const byId = new Map(bp.panels.map((p) => [p.id, p]));
      expect(byId.get('FRONT')?.bounds.width).toBeCloseTo(dims.width);
      expect(byId.get('FRONT')?.bounds.height).toBeCloseTo(dims.height);
      expect(byId.get('SIDE_R')?.bounds.width).toBeCloseTo(dims.depth);
      expect(byId.get('BACK')?.bounds.width).toBeCloseTo(dims.width);
      expect(byId.get('LID_TOP')?.bounds.height).toBeCloseTo(dims.depth);
      expect(byId.get('LID_BOT')?.bounds.height).toBeCloseTo(dims.depth);
    });

    it(`${label}: dust flaps never overlap once folded`, () => {
      const L = computeBox001Layout(params(dims));
      expect(2 * L.dustFlapLength + 2 * L.t).toBeLessThanOrEqual(dims.width + 1e-9);
    });

    it(`${label}: every panel except the root has exactly one parent fold`, () => {
      const bp = box001TuckEnd.build(params(dims));
      const children = bp.folds.map((f) => f.childId);
      expect(new Set(children).size).toBe(children.length);
      expect(children.sort()).toEqual(EXPECTED_PANELS.filter((id) => id !== bp.rootPanelId).sort());
    });
  }

  it('exposes derived measurements and PACKAGING_VALIDATION_REQUIRED notes', () => {
    const bp = box001TuckEnd.build(params({ width: 300, depth: 200, height: 100 }, DEFAULT_THICKNESS));
    expect(bp.derived.blankArea).toBeCloseTo(bp.blank.width * bp.blank.height);
    expect(bp.derived.printableArea).toBeLessThan(bp.derived.panelArea);
    expect(bp.derived.panelArea).toBeLessThan(bp.derived.blankArea);
    expect(bp.notes.some((n) => n.includes('PACKAGING_VALIDATION_REQUIRED'))).toBe(true);
  });

  it('structural validation rejects a width too small for dust flaps', () => {
    const issues = box001TuckEnd.validate(params({ width: 22, depth: 100, height: 100 }, 3));
    expect(issues.some((i) => i.code === 'BOX001_DUST_FLAP_TOO_SHORT')).toBe(true);
  });
});
