import { describe, expect, it } from 'vitest';
import {
  chainSegments,
  collinearOverlap,
  ensureCounterClockwise,
  offsetPolygon,
  polygonArea,
  polygonBounds,
  polygonIsFinite,
  roundCorners,
  signedArea,
  subtractIntervals,
  type Segment,
} from '../src/engine/core/polygon';
import { v2 } from '../src/engine/core/vec2';

const square = [v2(0, 0), v2(10, 0), v2(10, 10), v2(0, 10)];

describe('polygon', () => {
  it('computes signed area and orientation', () => {
    expect(signedArea(square)).toBeCloseTo(100);
    expect(signedArea([...square].reverse())).toBeCloseTo(-100);
    expect(polygonArea([...square].reverse())).toBeCloseTo(100);
    expect(signedArea(ensureCounterClockwise([...square].reverse()))).toBeGreaterThan(0);
  });

  it('offsets outward and inward with miter joins', () => {
    const out = offsetPolygon(square, 3);
    expect(polygonBounds(out)).toMatchObject({ minX: -3, minY: -3, maxX: 13, maxY: 13 });
    const inset = offsetPolygon(square, -2);
    expect(polygonBounds(inset)).toMatchObject({ minX: 2, minY: 2, maxX: 8, maxY: 8 });
    expect(polygonIsFinite(out)).toBe(true);
  });

  it('rounds corners without NaN and reduces the area', () => {
    const rounded = roundCorners(square, [0, 0, 4, 4], 8);
    expect(polygonIsFinite(rounded)).toBe(true);
    expect(rounded.length).toBeGreaterThan(square.length);
    expect(polygonArea(rounded)).toBeLessThan(100);
    expect(polygonArea(rounded)).toBeGreaterThan(90);
    const b = polygonBounds(rounded);
    expect(b.maxX).toBeCloseTo(10);
    expect(b.maxY).toBeCloseTo(10);
  });

  it('clamps too-large radii', () => {
    const rounded = roundCorners(square, 100, 4);
    expect(polygonIsFinite(rounded)).toBe(true);
    expect(polygonArea(rounded)).toBeGreaterThan(0);
  });

  it('chains segments into a closed loop regardless of orientation', () => {
    const segs: Segment[] = [
      { a: v2(0, 0), b: v2(10, 0) },
      { a: v2(10, 10), b: v2(10, 0) },
      { a: v2(0, 10), b: v2(10, 10) },
      { a: v2(0, 0), b: v2(0, 10) },
    ];
    const chains = chainSegments(segs);
    expect(chains).toHaveLength(1);
    expect(chains[0]?.closed).toBe(true);
    expect(chains[0]?.points).toHaveLength(4);
  });

  it('reports open chains', () => {
    const chains = chainSegments([
      { a: v2(0, 0), b: v2(1, 0) },
      { a: v2(1, 0), b: v2(2, 0) },
    ]);
    expect(chains).toHaveLength(1);
    expect(chains[0]?.closed).toBe(false);
  });

  it('detects collinear overlap and subtracts intervals', () => {
    const edge: Segment = { a: v2(0, 5), b: v2(10, 5) };
    expect(collinearOverlap(edge, { a: v2(2, 5), b: v2(6, 5) })).toEqual([0.2, 0.6]);
    expect(collinearOverlap(edge, { a: v2(2, 6), b: v2(6, 6) })).toBeNull();
    expect(collinearOverlap(edge, { a: v2(20, 5), b: v2(30, 5) })).toBeNull();
    expect(subtractIntervals([[0.2, 0.6]])).toEqual([
      [0, 0.2],
      [0.6, 1],
    ]);
    expect(subtractIntervals([[0, 1]])).toEqual([]);
    expect(subtractIntervals([])).toEqual([[0, 1]]);
  });
});
