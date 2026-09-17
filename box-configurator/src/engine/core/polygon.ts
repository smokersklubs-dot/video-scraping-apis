import {
  add,
  angleOf,
  approxEqual,
  cross,
  distance,
  dot,
  fromAngle,
  isFiniteVec2,
  normalize,
  perpRight,
  scale,
  sub,
  v2,
  type Vec2,
} from './vec2';

export type Polygon = readonly Vec2[];

export interface Segment {
  readonly a: Vec2;
  readonly b: Vec2;
}

export interface Rect {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly width: number;
  readonly height: number;
}

export function rect(minX: number, minY: number, maxX: number, maxY: number): Rect {
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function rectCenter(r: Rect): Vec2 {
  return v2((r.minX + r.maxX) / 2, (r.minY + r.maxY) / 2);
}

export function rectPolygon(r: Rect): Vec2[] {
  return [v2(r.minX, r.minY), v2(r.maxX, r.minY), v2(r.maxX, r.maxY), v2(r.minX, r.maxY)];
}

export function polygonBounds(poly: Polygon): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return rect(minX, minY, maxX, maxY);
}

export function unionBounds(rects: readonly Rect[]): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    if (r.minX < minX) minX = r.minX;
    if (r.minY < minY) minY = r.minY;
    if (r.maxX > maxX) maxX = r.maxX;
    if (r.maxY > maxY) maxY = r.maxY;
  }
  return rect(minX, minY, maxX, maxY);
}

/** Aire signée (shoelace). Positive si le polygone est anti-horaire. */
export function signedArea(poly: Polygon): number {
  let area = 0;
  const n = poly.length;
  for (let i = 0; i < n; i += 1) {
    const p = poly[i];
    const q = poly[(i + 1) % n];
    if (!p || !q) continue;
    area += cross(p, q);
  }
  return area / 2;
}

export function polygonArea(poly: Polygon): number {
  return Math.abs(signedArea(poly));
}

export function isCounterClockwise(poly: Polygon): boolean {
  return signedArea(poly) > 0;
}

export function ensureCounterClockwise(poly: Polygon): Vec2[] {
  return isCounterClockwise(poly) ? [...poly] : [...poly].reverse();
}

/** Centroïde géométrique (pondéré par l'aire). */
export function polygonCentroid(poly: Polygon): Vec2 {
  const area = signedArea(poly);
  if (Math.abs(area) < 1e-12) {
    const b = polygonBounds(poly);
    return rectCenter(b);
  }
  let cx = 0;
  let cy = 0;
  const n = poly.length;
  for (let i = 0; i < n; i += 1) {
    const p = poly[i];
    const q = poly[(i + 1) % n];
    if (!p || !q) continue;
    const f = cross(p, q);
    cx += (p.x + q.x) * f;
    cy += (p.y + q.y) * f;
  }
  return v2(cx / (6 * area), cy / (6 * area));
}

export function polygonIsFinite(poly: Polygon): boolean {
  return poly.every(isFiniteVec2);
}

/** Supprime les points consécutifs confondus (et le dernier s'il égale le premier). */
export function dedupePolygon(poly: Polygon, eps = 1e-6): Vec2[] {
  const out: Vec2[] = [];
  for (const p of poly) {
    const last = out[out.length - 1];
    if (!last || !approxEqual(last, p, eps)) out.push(p);
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (out.length > 1 && first && last && approxEqual(first, last, eps)) out.pop();
  return out;
}

/** Arêtes d'un polygone fermé. */
export function polygonEdges(poly: Polygon): Segment[] {
  const edges: Segment[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    if (a && b) edges.push({ a, b });
  }
  return edges;
}

/**
 * Décale un polygone anti-horaire : distance > 0 vers l'extérieur, < 0 vers l'intérieur.
 * Joints en onglet avec limite (repli en biseau au-delà).
 */
export function offsetPolygon(input: Polygon, distanceMm: number, miterLimit = 4): Vec2[] {
  const poly = dedupePolygon(ensureCounterClockwise(input));
  const n = poly.length;
  if (n < 3 || distanceMm === 0) return [...poly];
  const out: Vec2[] = [];
  for (let i = 0; i < n; i += 1) {
    const prev = poly[(i - 1 + n) % n];
    const cur = poly[i];
    const next = poly[(i + 1) % n];
    if (!prev || !cur || !next) continue;
    const d0 = normalize(sub(cur, prev));
    const d1 = normalize(sub(next, cur));
    const n0 = perpRight(d0); // normale sortante pour un polygone anti-horaire
    const n1 = perpRight(d1);
    const bis = add(n0, n1);
    const bisLen = Math.hypot(bis.x, bis.y);
    if (bisLen < 1e-9) {
      // Demi-tour : biseau.
      out.push(add(cur, scale(n0, distanceMm)), add(cur, scale(n1, distanceMm)));
      continue;
    }
    const m = scale(bis, 1 / bisLen);
    const cosHalf = dot(m, n0);
    if (cosHalf < 1e-9) {
      out.push(add(cur, scale(n0, distanceMm)), add(cur, scale(n1, distanceMm)));
      continue;
    }
    const miterLen = distanceMm / cosHalf;
    if (Math.abs(miterLen) > miterLimit * Math.abs(distanceMm)) {
      out.push(add(cur, scale(n0, distanceMm)), add(cur, scale(n1, distanceMm)));
    } else {
      out.push(add(cur, scale(m, miterLen)));
    }
  }
  return dedupePolygon(out);
}

/**
 * Remplace les sommets par des arcs (congés). `radii` : rayon par sommet (0 = angle vif).
 * Les rayons trop grands sont réduits pour ne jamais dépasser la moitié des arêtes adjacentes.
 */
export function roundCorners(
  input: Polygon,
  radii: readonly number[] | number,
  segmentsPerCorner = 6,
): Vec2[] {
  const poly = dedupePolygon(input);
  const n = poly.length;
  if (n < 3) return [...poly];
  const out: Vec2[] = [];
  for (let i = 0; i < n; i += 1) {
    const prev = poly[(i - 1 + n) % n];
    const cur = poly[i];
    const next = poly[(i + 1) % n];
    if (!prev || !cur || !next) continue;
    const requested = typeof radii === 'number' ? radii : (radii[i] ?? 0);
    if (requested <= 0) {
      out.push(cur);
      continue;
    }
    const toPrev = sub(prev, cur);
    const toNext = sub(next, cur);
    const lenPrev = Math.hypot(toPrev.x, toPrev.y);
    const lenNext = Math.hypot(toNext.x, toNext.y);
    const uPrev = normalize(toPrev);
    const uNext = normalize(toNext);
    const cosPhi = Math.max(-1, Math.min(1, dot(uPrev, uNext)));
    const phi = Math.acos(cosPhi); // angle intérieur au sommet
    if (phi < 1e-6 || Math.PI - phi < 1e-6) {
      out.push(cur);
      continue;
    }
    const halfPhi = phi / 2;
    const maxTangent = Math.min(lenPrev, lenNext) / 2;
    let r = requested;
    let tangentLen = r / Math.tan(halfPhi);
    if (tangentLen > maxTangent) {
      tangentLen = maxTangent;
      r = tangentLen * Math.tan(halfPhi);
    }
    const bis = normalize(add(uPrev, uNext));
    const center = add(cur, scale(bis, r / Math.sin(halfPhi)));
    const a = add(cur, scale(uPrev, tangentLen));
    const b = add(cur, scale(uNext, tangentLen));
    const a0 = angleOf(sub(a, center));
    let sweep = angleOf(sub(b, center)) - a0;
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    while (sweep < -Math.PI) sweep += 2 * Math.PI;
    const steps = Math.max(1, segmentsPerCorner);
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      out.push(add(center, fromAngle(a0 + sweep * t, r)));
    }
  }
  return dedupePolygon(out);
}

export interface Chain {
  readonly points: Vec2[];
  readonly closed: boolean;
}

function pointKey(p: Vec2, eps: number): string {
  return `${Math.round(p.x / eps)}:${Math.round(p.y / eps)}`;
}

/**
 * Chaîne des segments par extrémités en polylignes. Une boucle fermée est renvoyée sans
 * répéter son premier point. Les chaînes ouvertes (défaut de topologie) sont signalées.
 */
export function chainSegments(segments: readonly Segment[], eps = 1e-3): Chain[] {
  const byKey = new Map<string, number[]>();
  segments.forEach((s, i) => {
    for (const p of [s.a, s.b]) {
      const key = pointKey(p, eps);
      const list = byKey.get(key);
      if (list) list.push(i);
      else byKey.set(key, [i]);
    }
  });
  const used = new Array<boolean>(segments.length).fill(false);
  const chains: Chain[] = [];

  for (let start = 0; start < segments.length; start += 1) {
    if (used[start]) continue;
    const first = segments[start];
    if (!first) continue;
    used[start] = true;
    const points: Vec2[] = [first.a, first.b];
    const startKey = pointKey(first.a, eps);
    let cur = first.b;
    let closed = false;
    for (let guard = 0; guard < segments.length + 1; guard += 1) {
      if (pointKey(cur, eps) === startKey) {
        closed = true;
        break;
      }
      const candidates = byKey.get(pointKey(cur, eps)) ?? [];
      const nextIndex = candidates.find((i) => !used[i]);
      if (nextIndex === undefined) break;
      const seg = segments[nextIndex];
      if (!seg) break;
      used[nextIndex] = true;
      const far = pointKey(seg.a, eps) === pointKey(cur, eps) ? seg.b : seg.a;
      points.push(far);
      cur = far;
    }
    if (closed) points.pop();
    chains.push({ points: dedupePolygon(points, eps), closed });
  }
  return chains;
}

/** Longueur d'un segment. */
export function segmentLength(s: Segment): number {
  return distance(s.a, s.b);
}

/** Intervalle 1D [t0, t1] (paramètre le long de `edge`) couvert par `other` si colinéaire, sinon null. */
export function collinearOverlap(edge: Segment, other: Segment, eps = 1e-6): [number, number] | null {
  const d = sub(edge.b, edge.a);
  const len2 = dot(d, d);
  if (len2 < eps * eps) return null;
  const distToLine = (p: Vec2): number => Math.abs(cross(d, sub(p, edge.a))) / Math.sqrt(len2);
  if (distToLine(other.a) > eps || distToLine(other.b) > eps) return null;
  const ta = dot(sub(other.a, edge.a), d) / len2;
  const tb = dot(sub(other.b, edge.a), d) / len2;
  const t0 = Math.max(0, Math.min(ta, tb));
  const t1 = Math.min(1, Math.max(ta, tb));
  if (t1 - t0 <= eps) return null;
  return [t0, t1];
}

/** Soustrait des intervalles fermés à [0, 1]. */
export function subtractIntervals(
  covered: readonly (readonly [number, number])[],
  eps = 1e-9,
): [number, number][] {
  const sorted = [...covered].sort((a, b) => a[0] - b[0]);
  const remaining: [number, number][] = [];
  let cursor = 0;
  for (const [s, e] of sorted) {
    if (s - cursor > eps) remaining.push([cursor, s]);
    cursor = Math.max(cursor, e);
  }
  if (1 - cursor > eps) remaining.push([cursor, 1]);
  return remaining;
}
