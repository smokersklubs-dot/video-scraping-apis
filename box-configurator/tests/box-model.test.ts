import { describe, expect, it } from 'vitest';
import { computeBoxModel } from '../src/engine/box-model';
import { computeFoldTransforms } from '../src/engine/folding/fold-transforms';
import { params } from './fixtures';

describe('computeBoxModel', () => {
  it('validation criterion §32: 300×200×100 then 150×80×220 recompute both 2D and 3D', () => {
    const a = computeBoxModel(params({ width: 300, depth: 200, height: 100 }));
    const b = computeBoxModel(params({ width: 150, depth: 80, height: 220 }));
    expect(a.validation.ok).toBe(true);
    expect(b.validation.ok).toBe(true);
    expect(a.blueprint.blank.width).not.toBeCloseTo(b.blueprint.blank.width);
    expect(a.dieline.cut[0]!.length).toBeGreaterThan(0);
    expect(b.dieline.cut[0]!.length).toBeGreaterThan(0);
    const fa = computeFoldTransforms(a.blueprint, 1).bounds.size;
    const fb = computeFoldTransforms(b.blueprint, 1).bounds.size;
    expect(fa.x).toBeCloseTo(300);
    expect(fa.z).toBeCloseTo(200);
    expect(fb.x).toBeCloseTo(150);
    expect(fb.z).toBeCloseTo(80);
    expect(Math.abs(fb.y - 220)).toBeLessThan(0.3);
  });

  it('never throws nor produces NaN on invalid input (sanitized + reported)', () => {
    const m = computeBoxModel(params({ width: Number.NaN, depth: 0, height: -10 }, Number.NaN));
    expect(m.validation.ok).toBe(false);
    expect(Number.isFinite(m.blueprint.blank.width)).toBe(true);
    expect(m.dieline.openCuts).toHaveLength(0);
    expect(JSON.stringify(m.dieline)).not.toContain('null');
  });

  it('is deterministic and fast under rapid dimension changes', () => {
    const start = performance.now();
    let last = '';
    for (let i = 0; i < 200; i += 1) {
      const dims = { width: 50 + (i * 7) % 400, depth: 30 + (i * 11) % 300, height: 40 + (i * 13) % 350 };
      const m = computeBoxModel(params(dims));
      expect(m.validation.ok).toBe(true);
      expect(m.dieline.cut).toHaveLength(1);
      last = JSON.stringify(m.blueprint.blank);
    }
    const elapsed = performance.now() - start;
    expect(elapsed, `200 recomputes took ${elapsed.toFixed(0)} ms`).toBeLessThan(2000);
    const again = computeBoxModel(params({ width: 50 + (199 * 7) % 400, depth: 30 + (199 * 11) % 300, height: 40 + (199 * 13) % 350 }));
    expect(JSON.stringify(again.blueprint.blank)).toBe(last);
  });

  it('exposes measurements used by pricing without leaking geometry', () => {
    const m = computeBoxModel(params({ width: 300, depth: 200, height: 100 }));
    expect(m.measurements.blankAreaM2).toBeCloseTo(m.measurements.blankArea / 1e6);
    expect(m.measurements.outerVolume).toBe(300 * 200 * 100);
    expect(m.measurements.printableArea).toBeGreaterThan(0);
  });
});
