/**
 * Unités du projet.
 *
 * - Packaging : millimètres, partout dans `engine/`.
 * - Scène Three.js : mètres (1 unité = 1 m), conventions d'éclairage physique.
 *
 * C'est LE seul endroit où la conversion existe. Interdiction de disperser
 * des `/1000` ou `*0.001` ailleurs dans le code.
 */

export const SCENE_UNITS_PER_MM = 0.001;

export function mmToScene(mm: number): number {
  return mm * SCENE_UNITS_PER_MM;
}

export function sceneToMm(sceneUnits: number): number {
  return sceneUnits / SCENE_UNITS_PER_MM;
}

export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

export function degToRad(deg: number): number {
  return deg * DEG_TO_RAD;
}

export function radToDeg(rad: number): number {
  return rad * RAD_TO_DEG;
}

export function mm2ToM2(mm2: number): number {
  return mm2 * 1e-6;
}

export function mm3ToCm3(mm3: number): number {
  return mm3 * 1e-3;
}
