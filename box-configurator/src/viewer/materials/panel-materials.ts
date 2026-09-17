import * as THREE from 'three';
import { getFinish, type FinishId } from '../../engine/finishes';
import type { MaterialAppearance } from '../../engine/materials';

export interface PanelMaterialSet {
  readonly outer: THREE.MeshPhysicalMaterial;
  readonly inner: THREE.MeshStandardMaterial;
  readonly edge: THREE.MeshStandardMaterial;
  /** Tableau ordonné selon PANEL_GROUP (outer, inner, edge). */
  readonly list: THREE.Material[];
  dispose(): void;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Combine l'apparence du matériau et les indices de rendu des finitions de surface. */
export function resolveSurface(appearance: MaterialAppearance, finishes: readonly FinishId[]): { roughness: number; clearcoat: number } {
  let roughness = appearance.roughness;
  let clearcoat = 0;
  for (const id of finishes) {
    const f = getFinish(id);
    if (f.scope !== 'surface') continue;
    roughness += f.render.roughnessDelta ?? 0;
    clearcoat = Math.max(clearcoat, f.render.clearcoat ?? 0);
  }
  return { roughness: clamp01(roughness), clearcoat };
}

let checkerTexture: THREE.DataTexture | null = null;

/** Damier UV procédural (mode debug) : aucun asset externe. */
export function getUvCheckerTexture(): THREE.DataTexture {
  if (checkerTexture) return checkerTexture;
  const size = 512;
  const cells = 16;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const cx = Math.floor((x / size) * cells);
      const cy = Math.floor((y / size) * cells);
      const dark = (cx + cy) % 2 === 0;
      const i = (y * size + x) * 4;
      // Dégradé rouge (u) / vert (v) pour lire l'orientation des UV.
      data[i] = dark ? 40 + (x / size) * 180 : 230;
      data[i + 1] = dark ? 40 + (y / size) * 180 : 230;
      data[i + 2] = dark ? 60 : 230;
      data[i + 3] = 255;
    }
  }
  checkerTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  checkerTexture.colorSpace = THREE.SRGBColorSpace;
  checkerTexture.needsUpdate = true;
  return checkerTexture;
}

export function createPanelMaterials(
  appearance: MaterialAppearance,
  finishes: readonly FinishId[],
  options: { uvChecker?: boolean } = {},
): PanelMaterialSet {
  const { roughness, clearcoat } = resolveSurface(appearance, finishes);
  const outer = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(appearance.outerColor),
    roughness,
    metalness: appearance.metalness,
    clearcoat,
    clearcoatRoughness: 0.25,
    envMapIntensity: 0.9,
  });
  if (options.uvChecker) {
    outer.map = getUvCheckerTexture();
    outer.color.set('#ffffff');
  }
  const inner = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.innerColor),
    roughness: Math.min(1, appearance.roughness + 0.1),
    metalness: 0,
    envMapIntensity: 0.5,
  });
  const edge = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.edgeColor),
    roughness: 0.95,
    metalness: 0,
    envMapIntensity: 0.3,
  });
  return {
    outer,
    inner,
    edge,
    list: [outer, inner, edge],
    dispose() {
      outer.dispose();
      inner.dispose();
      edge.dispose();
    },
  };
}
