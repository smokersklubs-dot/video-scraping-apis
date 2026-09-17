import { create } from 'zustand';
import { computeBoxModel, type BoxModel } from '../engine/box-model';
import type { BoxParameters, DimensionKey, Dimensions, StructureId, ValidationResult } from '../engine/core/types';
import { toggleFinish, type FinishId } from '../engine/finishes';
import { DEFAULT_MATERIAL_ID, getMaterial, type MaterialId } from '../engine/materials';
import { QUANTITY_TIERS, type PrintingId } from '../engine/pricing';
import { DEFAULT_STRUCTURE_ID, getStructure } from '../engine/structures/registry';
import { validateParameters } from '../engine/validation/dimensions';
import { DEFAULT_DEBUG_FLAGS, type DebugFlags } from '../viewer/debug/DebugOverlay';

export type ViewMode = '3d' | 'dieline';

export type DimensionDraft = Record<DimensionKey, string>;

export interface ConfiguratorState {
  readonly structureId: StructureId;
  /** Dernières dimensions valides : alimentent toujours le moteur. */
  readonly dimensions: Dimensions;
  /** Saisie brute de l'utilisateur (peut être invalide). */
  readonly draft: DimensionDraft;
  /** Validation de la saisie brute (messages UI). */
  readonly draftValidation: ValidationResult;
  readonly materialId: MaterialId;
  readonly printing: PrintingId;
  readonly finishes: readonly FinishId[];
  readonly quantity: number;
  readonly foldProgress: number;
  readonly viewMode: ViewMode;
  readonly debug: DebugFlags | null;
  /** Modèle dérivé (structure + patron + mesures), recalculé à chaque changement de paramètre. */
  readonly model: BoxModel;

  setDimension(key: DimensionKey, raw: string): void;
  resetDimensions(): void;
  setStructure(id: StructureId): void;
  setMaterial(id: MaterialId): void;
  setPrinting(id: PrintingId): void;
  toggleFinish(id: FinishId): void;
  setQuantity(quantity: number): void;
  setFoldProgress(progress: number): void;
  setViewMode(mode: ViewMode): void;
  toggleDebug(): void;
  setDebugFlag(flag: keyof DebugFlags, value: boolean): void;
}

function toDraft(d: Dimensions): DimensionDraft {
  return { width: String(d.width), depth: String(d.depth), height: String(d.height) };
}

function buildParams(structureId: StructureId, dimensions: Dimensions, materialId: MaterialId): BoxParameters {
  return { structureId, dimensions, boardThickness: getMaterial(materialId).boardThickness };
}

function parseDimension(raw: string): number {
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '') return Number.NaN;
  return Number(normalized);
}

const initialStructure = getStructure(DEFAULT_STRUCTURE_ID);
const initialDimensions = initialStructure.defaults.dimensions;
const initialParams = buildParams(DEFAULT_STRUCTURE_ID, initialDimensions, DEFAULT_MATERIAL_ID);

export const useConfiguratorStore = create<ConfiguratorState>()((set, get) => ({
  structureId: DEFAULT_STRUCTURE_ID,
  dimensions: initialDimensions,
  draft: toDraft(initialDimensions),
  draftValidation: validateParameters(initialParams, initialStructure),
  materialId: DEFAULT_MATERIAL_ID,
  printing: 'CMYK_OUTSIDE',
  finishes: [],
  quantity: QUANTITY_TIERS[2] ?? 500,
  foldProgress: 1,
  viewMode: '3d',
  debug: null,
  model: computeBoxModel(initialParams),

  setDimension(key, raw) {
    const state = get();
    const draft = { ...state.draft, [key]: raw };
    const requested: Dimensions = { ...state.dimensions, [key]: parseDimension(raw) };
    const structure = getStructure(state.structureId);
    const params = buildParams(state.structureId, requested, state.materialId);
    const draftValidation = validateParameters(params, structure);
    if (draftValidation.ok) {
      set({ draft, draftValidation, dimensions: requested, model: computeBoxModel(params) });
    } else {
      set({ draft, draftValidation });
    }
  },

  resetDimensions() {
    const state = get();
    const structure = getStructure(state.structureId);
    const dimensions = structure.defaults.dimensions;
    const params = buildParams(state.structureId, dimensions, state.materialId);
    set({ dimensions, draft: toDraft(dimensions), draftValidation: validateParameters(params, structure), model: computeBoxModel(params) });
  },

  setStructure(id) {
    const state = get();
    const structure = getStructure(id);
    const params = buildParams(id, state.dimensions, state.materialId);
    const validation = validateParameters(params, structure);
    const dimensions = validation.ok ? state.dimensions : structure.defaults.dimensions;
    const effective = buildParams(id, dimensions, state.materialId);
    set({
      structureId: id,
      dimensions,
      draft: toDraft(dimensions),
      draftValidation: validateParameters(effective, structure),
      model: computeBoxModel(effective),
    });
  },

  setMaterial(id) {
    const state = get();
    const structure = getStructure(state.structureId);
    const params = buildParams(state.structureId, state.dimensions, id);
    set({ materialId: id, draftValidation: validateParameters(params, structure), model: computeBoxModel(params) });
  },

  setPrinting(id) {
    set({ printing: id });
  },

  toggleFinish(id) {
    set({ finishes: toggleFinish(get().finishes, id) });
  },

  setQuantity(quantity) {
    if (!Number.isFinite(quantity) || quantity < 1) return;
    set({ quantity: Math.round(quantity) });
  },

  setFoldProgress(progress) {
    set({ foldProgress: Math.min(1, Math.max(0, progress)) });
  },

  setViewMode(mode) {
    set({ viewMode: mode });
  },

  toggleDebug() {
    set({ debug: get().debug ? null : DEFAULT_DEBUG_FLAGS });
  },

  setDebugFlag(flag, value) {
    const current = get().debug ?? DEFAULT_DEBUG_FLAGS;
    set({ debug: { ...current, [flag]: value } });
  },
}));
