import { describe, expect, it } from 'vitest';
import { box001TuckEnd } from '../src/engine/structures/box-001-tuck-end';
import { buildPanelGeometry, PANEL_GROUP } from '../src/viewer/meshes/panel-geometry';
import { createPanelMaterials, resolveSurface } from '../src/viewer/materials/panel-materials';
import { getMaterial } from '../src/engine/materials';
import { BRIEF_DIMENSIONS, params } from './fixtures';

describe('panel geometry (Three.js in Node)', () => {
  for (const dims of BRIEF_DIMENSIONS) {
    it(`${dims.width}×${dims.depth}×${dims.height}: every panel builds a finite 3-group geometry with UVs in [0,1]`, () => {
      const bp = box001TuckEnd.build(params(dims));
      for (const panel of bp.panels) {
        const geometry = buildPanelGeometry(panel, bp.parameters.boardThickness, bp.blank);
        const pos = geometry.getAttribute('position');
        const uv = geometry.getAttribute('uv');
        const index = geometry.getIndex();
        expect(index, panel.id).not.toBeNull();
        expect(pos.count).toBe(panel.polygon.length * 2 + panel.polygon.length * 4);
        for (let i = 0; i < pos.count; i += 1) {
          expect(Number.isFinite(pos.getX(i)) && Number.isFinite(pos.getY(i)) && Number.isFinite(pos.getZ(i)), panel.id).toBe(true);
          expect(uv.getX(i)).toBeGreaterThanOrEqual(0);
          expect(uv.getX(i)).toBeLessThanOrEqual(1);
          expect(uv.getY(i)).toBeGreaterThanOrEqual(0);
          expect(uv.getY(i)).toBeLessThanOrEqual(1);
        }
        expect(geometry.groups.map((g) => g.materialIndex)).toEqual([PANEL_GROUP.OUTER, PANEL_GROUP.INNER, PANEL_GROUP.EDGE]);
        const total = geometry.groups.reduce((s, g) => s + g.count, 0);
        expect(total).toBe(index!.count);
        expect(geometry.boundingBox?.min.z).toBeCloseTo(-bp.parameters.boardThickness);
        expect(geometry.boundingBox?.max.z).toBeCloseTo(0);
        geometry.dispose();
      }
    });
  }

  it('materials follow the material appearance and surface finishes', () => {
    const kraft = getMaterial('KRAFT').appearance;
    expect(resolveSurface(kraft, []).roughness).toBeCloseTo(kraft.roughness);
    expect(resolveSurface(kraft, ['GLOSS']).clearcoat).toBe(1);
    expect(resolveSurface(kraft, ['GLOSS']).roughness).toBeLessThan(kraft.roughness);
    const set = createPanelMaterials(kraft, ['MATTE']);
    expect(set.list).toHaveLength(3);
    expect(set.outer.color.getHexString()).toBe(kraft.outerColor.slice(1).toLowerCase());
    set.dispose();
  });
});
