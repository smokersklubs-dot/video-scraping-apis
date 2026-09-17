import { describe, expect, it } from 'vitest';
import { box001TuckEnd } from '../src/engine/structures/box-001-tuck-end';
import { sanitizeParameters, validateParameters } from '../src/engine/validation/dimensions';
import { params } from './fixtures';

describe('validation', () => {
  it('accepts the brief dimensions', () => {
    const r = validateParameters(params({ width: 300, depth: 200, height: 100 }), box001TuckEnd);
    expect(r.ok).toBe(true);
    expect(r.issues.filter((i) => i.level === 'error')).toHaveLength(0);
  });

  it('rejects NaN and out-of-range values with field information', () => {
    const r = validateParameters(params({ width: Number.NaN, depth: 5, height: 5000 }), box001TuckEnd);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(['WIDTH_NOT_A_NUMBER', 'DEPTH_TOO_SMALL', 'HEIGHT_TOO_LARGE']),
    );
    expect(r.issues.find((i) => i.code === 'DEPTH_TOO_SMALL')?.field).toBe('depth');
  });

  it('rejects an impossible board thickness', () => {
    const r = validateParameters(params({ width: 100, depth: 100, height: 100 }, 12), box001TuckEnd);
    expect(r.ok).toBe(false);
    expect(r.issues[0]?.field).toBe('boardThickness');
  });

  it('warns on extreme proportions and oversized blanks', () => {
    const extreme = validateParameters(params({ width: 600, depth: 40, height: 40 }), box001TuckEnd);
    expect(extreme.ok).toBe(true);
    expect(extreme.issues.map((i) => i.code)).toContain('EXTREME_ASPECT_RATIO');
    const big = validateParameters(params({ width: 500, depth: 400, height: 500 }), box001TuckEnd);
    expect(big.ok).toBe(true);
    expect(big.issues.map((i) => i.code)).toContain('BLANK_EXCEEDS_SHEET');
  });

  it('sanitizes invalid parameters into the constraints', () => {
    const s = sanitizeParameters(
      params({ width: Number.NaN, depth: -4, height: 9999 }, Number.POSITIVE_INFINITY),
      box001TuckEnd.constraints,
      box001TuckEnd.defaults,
    );
    expect(s.dimensions.width).toBe(box001TuckEnd.defaults.dimensions.width);
    expect(s.dimensions.depth).toBe(box001TuckEnd.constraints.depth.min);
    expect(s.dimensions.height).toBe(box001TuckEnd.constraints.height.max);
    expect(s.boardThickness).toBe(box001TuckEnd.defaults.boardThickness);
  });
});
