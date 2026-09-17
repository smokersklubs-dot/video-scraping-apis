import {
  IDENTITY,
  isFiniteMat4,
  multiplyAll,
  rotationAroundLine,
  transformDirection,
  transformPoint,
  translation,
  v3,
  type Mat4,
  type Vec3,
} from '../core/mat4';
import { polygonCentroid } from '../core/polygon';
import type { Fold, Panel, PanelId, StructureBlueprint } from '../core/types';
import { cross, normalize, perpLeft, scale, sub } from '../core/vec2';
import { stageProgress, type FoldingMode } from './stages';

export interface FoldTransformOptions {
  readonly mode?: FoldingMode;
}

export interface PanelTransform {
  readonly panelId: PanelId;
  /** Matrice monde (repère patron mm → repère boîte mm), column-major. */
  readonly matrix: Mat4;
  /** Normale extérieure (face imprimée) après pliage. */
  readonly normal: Vec3;
}

export interface Bounds3 {
  readonly min: Vec3;
  readonly max: Vec3;
  readonly center: Vec3;
  readonly size: Vec3;
}

export interface FoldSolution {
  readonly progress: number;
  readonly transforms: ReadonlyMap<PanelId, PanelTransform>;
  /** Boîte englobante des panneaux (avec épaisseur), repère boîte mm. */
  readonly bounds: Bounds3;
}

/**
 * Matrice locale d'un pli : rotation de l'enfant autour de sa charnière (décalée dans le
 * parent de `hingeInset × t`), du côté intérieur (−z), puis décalage `lift` le long de la
 * normale de l'enfant.
 */
export function foldMatrix(fold: Fold, child: Panel, boardThickness: number, stageP: number): Mat4 {
  const dir = normalize(sub(fold.hinge.b, fold.hinge.a));
  if (dir.x === 0 && dir.y === 0) return IDENTITY;
  const centroid = polygonCentroid(child.polygon);
  const side = cross(dir, sub(centroid, fold.hinge.a)) >= 0 ? 1 : -1;
  const towardChild = scale(perpLeft(dir), side);
  const insetMm = fold.hingeInset * boardThickness;
  const pivot = sub(fold.hinge.a, scale(towardChild, insetMm));
  const sign = fold.direction === 'inward' ? -side : side;
  const angle = sign * fold.targetAngle * stageP;
  const rotation = rotationAroundLine(v3(pivot.x, pivot.y, 0), v3(dir.x, dir.y, 0), angle);
  if (fold.lift === 0) return rotation;
  return multiplyAll(rotation, translation(0, 0, fold.lift * stageP));
}

function indexPanels(blueprint: StructureBlueprint): Map<PanelId, Panel> {
  return new Map(blueprint.panels.map((p) => [p.id, p]));
}

function foldsByChild(blueprint: StructureBlueprint): Map<PanelId, Fold> {
  const map = new Map<PanelId, Fold>();
  for (const f of blueprint.folds) {
    if (map.has(f.childId)) throw new Error(`Le panneau ${f.childId} a plusieurs parents.`);
    map.set(f.childId, f);
  }
  return map;
}

/**
 * Calcule la matrice de chaque panneau pour un progress global ∈ [0, 1].
 * 0 = patron à plat, 1 = boîte fermée. Math pure, aucune dépendance de rendu.
 */
export function computeFoldTransforms(
  blueprint: StructureBlueprint,
  progress: number,
  options: FoldTransformOptions = {},
): FoldSolution {
  const mode = options.mode ?? 'sequential';
  const panels = indexPanels(blueprint);
  const parentFold = foldsByChild(blueprint);
  const t = blueprint.parameters.boardThickness;
  const stageCount = blueprint.derived.stageCount;
  const cache = new Map<PanelId, Mat4>();

  const resolve = (panelId: PanelId, depth = 0): Mat4 => {
    const cached = cache.get(panelId);
    if (cached) return cached;
    if (depth > panels.size) throw new Error(`Cycle de pliage détecté autour de ${panelId}.`);
    const fold = parentFold.get(panelId);
    let matrix: Mat4;
    if (!fold) {
      if (panelId !== blueprint.rootPanelId) {
        throw new Error(`Le panneau ${panelId} n'est ni racine ni relié par un pli.`);
      }
      matrix = IDENTITY;
    } else {
      const child = panels.get(panelId);
      if (!child) throw new Error(`Panneau inconnu : ${panelId}`);
      const parentMatrix = resolve(fold.parentId, depth + 1);
      const local = foldMatrix(fold, child, t, stageProgress(progress, fold.stage, stageCount, mode));
      matrix = multiplyAll(parentMatrix, local);
    }
    cache.set(panelId, matrix);
    return matrix;
  };

  const transforms = new Map<PanelId, PanelTransform>();
  for (const panel of blueprint.panels) {
    const matrix = resolve(panel.id);
    if (!isFiniteMat4(matrix)) throw new Error(`Matrice non finie pour ${panel.id}`);
    transforms.set(panel.id, { panelId: panel.id, matrix, normal: transformDirection(matrix, v3(0, 0, 1)) });
  }

  return { progress, transforms, bounds: computeBounds(blueprint, transforms) };
}

function computeBounds(blueprint: StructureBlueprint, transforms: ReadonlyMap<PanelId, PanelTransform>): Bounds3 {
  const t = blueprint.parameters.boardThickness;
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const panel of blueprint.panels) {
    const tr = transforms.get(panel.id);
    if (!tr) continue;
    for (const p of panel.polygon) {
      for (const z of [0, -t]) {
        const w = transformPoint(tr.matrix, v3(p.x, p.y, z));
        if (w.x < minX) minX = w.x;
        if (w.y < minY) minY = w.y;
        if (w.z < minZ) minZ = w.z;
        if (w.x > maxX) maxX = w.x;
        if (w.y > maxY) maxY = w.y;
        if (w.z > maxZ) maxZ = w.z;
      }
    }
  }
  return {
    min: v3(minX, minY, minZ),
    max: v3(maxX, maxY, maxZ),
    center: v3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2),
    size: v3(maxX - minX, maxY - minY, maxZ - minZ),
  };
}

/** Centre de la boîte fermée : sert à centrer la scène sans que la boîte saute pendant l'animation. */
export function foldedBoxCenter(blueprint: StructureBlueprint): Vec3 {
  return computeFoldTransforms(blueprint, 1).bounds.center;
}
