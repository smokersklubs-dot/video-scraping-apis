import type { BoxModel } from '../engine/box-model';
import { dielineToSvg } from '../engine/dieline/svg';
import type { FinishId } from '../engine/finishes';
import type { MaterialId } from '../engine/materials';
import type { PrintingId } from '../engine/pricing';

export interface ExportedConfiguration {
  readonly version: 1;
  readonly generatedAt: string;
  readonly status: 'preview-not-validated-for-production';
  readonly structureId: string;
  readonly dimensionsMm: { width: number; depth: number; height: number };
  readonly boardThicknessMm: number;
  readonly materialId: MaterialId;
  readonly printing: PrintingId;
  readonly finishes: readonly FinishId[];
  readonly quantity: number;
  readonly measurements: BoxModel['measurements'];
  readonly packagingValidationRequired: readonly string[];
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slug(model: BoxModel): string {
  const { width, depth, height } = model.parameters.dimensions;
  return `${model.blueprint.structureId}_${width}x${depth}x${height}`;
}

/** Télécharge le patron SVG (aperçu technique, non validé pour production). */
export function downloadDielineSvg(model: BoxModel): void {
  const svg = dielineToSvg(model.dieline, { showLabels: true });
  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `sklubs_dieline_${slug(model)}.svg`);
}

export function buildExportedConfiguration(
  model: BoxModel,
  selection: { materialId: MaterialId; printing: PrintingId; finishes: readonly FinishId[]; quantity: number },
): ExportedConfiguration {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    status: 'preview-not-validated-for-production',
    structureId: model.blueprint.structureId,
    dimensionsMm: { ...model.parameters.dimensions },
    boardThicknessMm: model.parameters.boardThickness,
    materialId: selection.materialId,
    printing: selection.printing,
    finishes: selection.finishes,
    quantity: selection.quantity,
    measurements: model.measurements,
    packagingValidationRequired: model.blueprint.notes,
  };
}

export function downloadConfigurationJson(config: ExportedConfiguration, model: BoxModel): void {
  downloadBlob(new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' }), `sklubs_box_${slug(model)}.json`);
}
