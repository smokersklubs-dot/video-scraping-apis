import type { StructureId, StructureModule } from '../core/types';
import { box001TuckEnd } from './box-001-tuck-end';

/**
 * Catalogue des structures. Ajouter une structure = un module + une ligne ici.
 * Les entrées futures (BOX-002 … BOX-010) sont listées dans ROADMAP.md.
 */
const MODULES: readonly StructureModule[] = [box001TuckEnd];

const BY_ID = new Map<StructureId, StructureModule>(MODULES.map((m) => [m.id, m]));

export function listStructures(): readonly StructureModule[] {
  return MODULES;
}

export function getStructure(id: StructureId): StructureModule {
  const module = BY_ID.get(id);
  if (!module) throw new Error(`Structure inconnue : ${id}`);
  return module;
}

export function hasStructure(id: StructureId): boolean {
  return BY_ID.has(id);
}

export const DEFAULT_STRUCTURE_ID = box001TuckEnd.id;
