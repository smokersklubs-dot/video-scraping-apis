import * as THREE from 'three';
import { dielineToUv } from '../../engine/artwork/types';
import type { Rect } from '../../engine/core/polygon';
import type { Panel } from '../../engine/core/types';
import { normalize, perpRight, sub } from '../../engine/core/vec2';

/** Indices de groupe de matériau d'un panneau. */
export const PANEL_GROUP = { OUTER: 0, INNER: 1, EDGE: 2 } as const;

function triangleIsCcw(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax) > 0;
}

/**
 * Construit la géométrie d'un panneau en mm, dans le repère patron : face extérieure en z = 0,
 * face intérieure en z = −t, chants tout autour. Les UV de la face extérieure sont les
 * coordonnées patron normalisées (atlas UV commun à tous les panneaux).
 */
export function buildPanelGeometry(panel: Panel, thickness: number, blank: Rect): THREE.BufferGeometry {
  const contour = panel.polygon;
  const n = contour.length;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const pushVertex = (x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, v: number): number => {
    positions.push(x, y, z);
    normals.push(nx, ny, nz);
    uvs.push(u, v);
    return positions.length / 3 - 1;
  };

  const shapePoints = contour.map((p) => new THREE.Vector2(p.x, p.y));
  const faces = THREE.ShapeUtils.triangulateShape(shapePoints, []);

  // Face extérieure (z = 0, normale +z).
  const outerStart = indices.length;
  const outerIndex: number[] = [];
  for (const p of contour) {
    const uv = dielineToUv(p, blank);
    outerIndex.push(pushVertex(p.x, p.y, 0, 0, 0, 1, uv.x, uv.y));
  }
  for (const face of faces) {
    const [a, b, c] = face;
    if (a === undefined || b === undefined || c === undefined) continue;
    const pa = contour[a];
    const pb = contour[b];
    const pc = contour[c];
    const ia = outerIndex[a];
    const ib = outerIndex[b];
    const ic = outerIndex[c];
    if (!pa || !pb || !pc || ia === undefined || ib === undefined || ic === undefined) continue;
    if (triangleIsCcw(pa.x, pa.y, pb.x, pb.y, pc.x, pc.y)) indices.push(ia, ib, ic);
    else indices.push(ia, ic, ib);
  }
  const outerCount = indices.length - outerStart;

  // Face intérieure (z = −t, normale −z), orientation inversée.
  const innerStart = indices.length;
  const innerIndex: number[] = [];
  for (const p of contour) {
    const uv = dielineToUv(p, blank);
    innerIndex.push(pushVertex(p.x, p.y, -thickness, 0, 0, -1, uv.x, uv.y));
  }
  for (const face of faces) {
    const [a, b, c] = face;
    if (a === undefined || b === undefined || c === undefined) continue;
    const pa = contour[a];
    const pb = contour[b];
    const pc = contour[c];
    const ia = innerIndex[a];
    const ib = innerIndex[b];
    const ic = innerIndex[c];
    if (!pa || !pb || !pc || ia === undefined || ib === undefined || ic === undefined) continue;
    if (triangleIsCcw(pa.x, pa.y, pb.x, pb.y, pc.x, pc.y)) indices.push(ia, ic, ib);
    else indices.push(ia, ib, ic);
  }
  const innerCount = indices.length - innerStart;

  // Chants : un quad par arête, normale sortante (polygone anti-horaire → perpendiculaire droite).
  const edgeStart = indices.length;
  for (let i = 0; i < n; i += 1) {
    const p = contour[i];
    const q = contour[(i + 1) % n];
    if (!p || !q) continue;
    const dir = normalize(sub(q, p));
    const nrm = perpRight(dir);
    const v0 = pushVertex(p.x, p.y, 0, nrm.x, nrm.y, 0, 0, 1);
    const v1 = pushVertex(q.x, q.y, 0, nrm.x, nrm.y, 0, 1, 1);
    const v2 = pushVertex(q.x, q.y, -thickness, nrm.x, nrm.y, 0, 1, 0);
    const v3 = pushVertex(p.x, p.y, -thickness, nrm.x, nrm.y, 0, 0, 0);
    indices.push(v0, v1, v2, v0, v2, v3);
  }
  const edgeCount = indices.length - edgeStart;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.addGroup(outerStart, outerCount, PANEL_GROUP.OUTER);
  geometry.addGroup(innerStart, innerCount, PANEL_GROUP.INNER);
  geometry.addGroup(edgeStart, edgeCount, PANEL_GROUP.EDGE);
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}
