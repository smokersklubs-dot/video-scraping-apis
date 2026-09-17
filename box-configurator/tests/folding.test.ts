import { describe, expect, it } from 'vitest';
import { isFiniteMat4, transformPoint, v3 } from '../src/engine/core/mat4';
import { computeFoldTransforms, foldedBoxCenter } from '../src/engine/folding/fold-transforms';
import { stageProgress } from '../src/engine/folding/stages';
import { box001TuckEnd } from '../src/engine/structures/box-001-tuck-end';
import { ALL_DIMENSIONS, params } from './fixtures';

const LIFT_TOLERANCE = 0.2; // mm : décalage anti z-fighting des couvercles

function expectNormal(actual: { x: number; y: number; z: number }, expected: { x: number; y: number; z: number }, id: string): void {
  expect(actual.x, `${id} normal.x`).toBeCloseTo(expected.x, 5);
  expect(actual.y, `${id} normal.y`).toBeCloseTo(expected.y, 5);
  expect(actual.z, `${id} normal.z`).toBeCloseTo(expected.z, 5);
}

describe('folding engine', () => {
  it('stage progress is sequential', () => {
    expect(stageProgress(0, 0, 4)).toBe(0);
    expect(stageProgress(0.25, 0, 4)).toBeCloseTo(1);
    expect(stageProgress(0.25, 1, 4)).toBeCloseTo(0);
    expect(stageProgress(0.5, 1, 4)).toBeCloseTo(1);
    expect(stageProgress(1, 3, 4)).toBeCloseTo(1);
    expect(stageProgress(0.5, 3, 4, 'simultaneous')).toBeCloseTo(0.5);
    expect(stageProgress(Number.NaN, 0, 4)).toBe(0);
  });

  for (const dims of ALL_DIMENSIONS) {
    const label = `${dims.width}×${dims.depth}×${dims.height}`;
    const bp = box001TuckEnd.build(params(dims));

    it(`${label}: flat at progress 0`, () => {
      const sol = computeFoldTransforms(bp, 0);
      for (const panel of bp.panels) {
        const tr = sol.transforms.get(panel.id);
        expect(tr).toBeDefined();
        for (const p of panel.polygon) {
          const w = transformPoint(tr!.matrix, v3(p.x, p.y, 0));
          expect(w.x).toBeCloseTo(p.x);
          expect(w.y).toBeCloseTo(p.y);
          expect(w.z).toBeCloseTo(0);
        }
      }
      expect(sol.bounds.size.x).toBeCloseTo(bp.blank.width);
      expect(sol.bounds.size.y).toBeCloseTo(bp.blank.height);
    });

    it(`${label}: closed box has the requested outer dimensions`, () => {
      const sol = computeFoldTransforms(bp, 1);
      expect(sol.bounds.size.x).toBeCloseTo(dims.width, 6);
      expect(Math.abs(sol.bounds.size.y - dims.height)).toBeLessThanOrEqual(LIFT_TOLERANCE + 1e-6);
      expect(sol.bounds.size.z).toBeCloseTo(dims.depth, 6);
    });

    it(`${label}: outward normals point away from the box`, () => {
      const sol = computeFoldTransforms(bp, 1);
      const n = (id: string) => sol.transforms.get(id)!.normal;
      expectNormal(n('FRONT'), v3(0, 0, 1), 'FRONT');
      expectNormal(n('BACK'), v3(0, 0, -1), 'BACK');
      expectNormal(n('SIDE_R'), v3(1, 0, 0), 'SIDE_R');
      expectNormal(n('SIDE_L'), v3(-1, 0, 0), 'SIDE_L');
      expectNormal(n('LID_TOP'), v3(0, 1, 0), 'LID_TOP');
      expectNormal(n('LID_BOT'), v3(0, -1, 0), 'LID_BOT');
      // Languettes : rabattues à l'intérieur, face imprimée vers le dos.
      expectNormal(n('TUCK_TOP'), v3(0, 0, -1), 'TUCK_TOP');
      expectNormal(n('TUCK_BOT'), v3(0, 0, -1), 'TUCK_BOT');
      // Pattes anti-poussière : horizontales sous les couvercles.
      expectNormal(n('DUST_TOP_R'), v3(0, 1, 0), 'DUST_TOP_R');
      expectNormal(n('DUST_BOT_L'), v3(0, -1, 0), 'DUST_BOT_L');
      // Patte de collage : plaquée contre l'intérieur du devant.
      expectNormal(n('GLUE'), v3(0, 0, 1), 'GLUE');
    });

    it(`${label}: inner elements stay inside the outer shell`, () => {
      const sol = computeFoldTransforms(bp, 1);
      const t = bp.parameters.boardThickness;
      const inside = (id: string) => {
        const panel = bp.panels.find((p) => p.id === id)!;
        const tr = sol.transforms.get(id)!;
        for (const p of panel.polygon) {
          for (const z of [0, -t]) {
            const w = transformPoint(tr.matrix, v3(p.x, p.y, z));
            expect(w.x, `${id} x`).toBeGreaterThanOrEqual(sol.bounds.min.x + t - 1e-6);
            expect(w.x, `${id} x`).toBeLessThanOrEqual(sol.bounds.max.x - t + 1e-6);
            expect(w.z, `${id} z`).toBeGreaterThanOrEqual(sol.bounds.min.z + t - 1e-6);
            expect(w.z, `${id} z`).toBeLessThanOrEqual(sol.bounds.max.z - t + 1e-6);
          }
        }
      };
      for (const id of ['TUCK_TOP', 'TUCK_BOT', 'DUST_TOP_R', 'DUST_TOP_L', 'DUST_BOT_R', 'DUST_BOT_L', 'GLUE']) inside(id);
    });

    it(`${label}: matrices are finite for every progress`, () => {
      for (let i = 0; i <= 20; i += 1) {
        const sol = computeFoldTransforms(bp, i / 20);
        for (const tr of sol.transforms.values()) expect(isFiniteMat4(tr.matrix)).toBe(true);
        expect(Number.isFinite(sol.bounds.size.x)).toBe(true);
      }
    });
  }

  it('folded box center is stable and near the front panel', () => {
    const bp = box001TuckEnd.build(params({ width: 300, depth: 200, height: 100 }));
    const c = foldedBoxCenter(bp);
    expect(c.x).toBeCloseTo(150);
    expect(c.z).toBeCloseTo(-100);
  });
});
