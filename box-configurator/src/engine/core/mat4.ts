/**
 * Matrices 4×4 minimales, stockage column-major (compatible `THREE.Matrix4.fromArray`).
 * Le moteur ne dépend pas de Three.js : ces utilitaires suffisent au pliage.
 */

export type Mat4 = readonly number[];

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function v3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export const IDENTITY: Mat4 = Object.freeze([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

function el(m: Mat4, col: number, row: number): number {
  const value = m[col * 4 + row];
  if (value === undefined) throw new Error(`Mat4 index out of range: col=${col} row=${row}`);
  return value;
}

/** Produit a × b (applique b d'abord, puis a). */
export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) {
        sum += el(a, k, row) * el(b, col, k);
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

export function multiplyAll(...ms: Mat4[]): Mat4 {
  return ms.reduce<Mat4>((acc, m) => multiply(acc, m), IDENTITY);
}

export function translation(x: number, y: number, z: number): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
}

export function scaling(s: number): Mat4 {
  return [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1];
}

/** Rotation de Rodrigues autour d'un axe unitaire passant par l'origine. */
export function rotationAroundAxis(axis: Vec3, angle: number): Mat4 {
  const len = Math.hypot(axis.x, axis.y, axis.z);
  if (len < 1e-12) return IDENTITY;
  const x = axis.x / len;
  const y = axis.y / len;
  const z = axis.z / len;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    t * x * x + c,
    t * x * y + s * z,
    t * x * z - s * y,
    0,
    t * x * y - s * z,
    t * y * y + c,
    t * y * z + s * x,
    0,
    t * x * z + s * y,
    t * y * z - s * x,
    t * z * z + c,
    0,
    0,
    0,
    0,
    1,
  ];
}

/** Rotation autour d'une droite (point + direction). */
export function rotationAroundLine(point: Vec3, direction: Vec3, angle: number): Mat4 {
  return multiplyAll(
    translation(point.x, point.y, point.z),
    rotationAroundAxis(direction, angle),
    translation(-point.x, -point.y, -point.z),
  );
}

export function transformPoint(m: Mat4, p: Vec3): Vec3 {
  const x = el(m, 0, 0) * p.x + el(m, 1, 0) * p.y + el(m, 2, 0) * p.z + el(m, 3, 0);
  const y = el(m, 0, 1) * p.x + el(m, 1, 1) * p.y + el(m, 2, 1) * p.z + el(m, 3, 1);
  const z = el(m, 0, 2) * p.x + el(m, 1, 2) * p.y + el(m, 2, 2) * p.z + el(m, 3, 2);
  const w = el(m, 0, 3) * p.x + el(m, 1, 3) * p.y + el(m, 2, 3) * p.z + el(m, 3, 3);
  return w === 1 || w === 0 ? { x, y, z } : { x: x / w, y: y / w, z: z / w };
}

/** Transforme une direction (ignore la translation). */
export function transformDirection(m: Mat4, d: Vec3): Vec3 {
  const x = el(m, 0, 0) * d.x + el(m, 1, 0) * d.y + el(m, 2, 0) * d.z;
  const y = el(m, 0, 1) * d.x + el(m, 1, 1) * d.y + el(m, 2, 1) * d.z;
  const z = el(m, 0, 2) * d.x + el(m, 1, 2) * d.y + el(m, 2, 2) * d.z;
  const len = Math.hypot(x, y, z);
  return len < 1e-12 ? { x: 0, y: 0, z: 0 } : { x: x / len, y: y / len, z: z / len };
}

export function isFiniteMat4(m: Mat4): boolean {
  return m.length === 16 && m.every((v) => Number.isFinite(v));
}
