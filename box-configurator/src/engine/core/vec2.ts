export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const EPSILON = 1e-9;

export function v2(x: number, y: number): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

/** Produit vectoriel 2D (composante z). Positif si b est à gauche de a. */
export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

export function length(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Retourne le vecteur nul si la longueur est négligeable. */
export function normalize(a: Vec2): Vec2 {
  const len = length(a);
  if (len < EPSILON) return { x: 0, y: 0 };
  return { x: a.x / len, y: a.y / len };
}

/** Perpendiculaire à gauche (rotation de +90°). */
export function perpLeft(a: Vec2): Vec2 {
  return { x: -a.y, y: a.x };
}

/** Perpendiculaire à droite (rotation de −90°). */
export function perpRight(a: Vec2): Vec2 {
  return { x: a.y, y: -a.x };
}

export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function approxEqual(a: Vec2, b: Vec2, eps = 1e-6): boolean {
  return Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps;
}

export function isFiniteVec2(a: Vec2): boolean {
  return Number.isFinite(a.x) && Number.isFinite(a.y);
}

export function angleOf(a: Vec2): number {
  return Math.atan2(a.y, a.x);
}

export function fromAngle(angle: number, radius = 1): Vec2 {
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}
