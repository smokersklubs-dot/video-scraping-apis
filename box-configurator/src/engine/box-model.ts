import type { BoxParameters, StructureBlueprint, ValidationResult } from './core/types';
import { mm2ToM2 } from './core/units';
import { buildDielineModel, type DielineModel, type DielineOptions } from './dieline/dieline-model';
import { getStructure } from './structures/registry';
import { sanitizeParameters, validateParameters } from './validation/dimensions';

export interface BoxMeasurements {
  readonly blankWidth: number;
  readonly blankHeight: number;
  readonly blankArea: number;
  readonly blankAreaM2: number;
  readonly printableArea: number;
  /** Volume extérieur, mm³. */
  readonly outerVolume: number;
}

export interface BoxModel {
  /** Paramètres effectivement utilisés (assainis si les paramètres demandés étaient invalides). */
  readonly parameters: BoxParameters;
  readonly blueprint: StructureBlueprint;
  readonly dieline: DielineModel;
  readonly validation: ValidationResult;
  readonly measurements: BoxMeasurements;
}

/**
 * Point d'entrée unique du moteur : paramètres → structure + patron + validation + mesures.
 * Pur et déterministe. Ne produit jamais de NaN : des paramètres invalides sont assainis
 * et l'erreur est remontée dans `validation`.
 */
export function computeBoxModel(requested: BoxParameters, dielineOptions: DielineOptions = {}): BoxModel {
  const structure = getStructure(requested.structureId);
  const validation = validateParameters(requested, structure);
  const parameters = validation.ok ? requested : sanitizeParameters(requested, structure.constraints, structure.defaults);
  const blueprint = structure.build(parameters);
  const dieline = buildDielineModel(blueprint, dielineOptions);
  const { width, depth, height } = parameters.dimensions;

  return {
    parameters,
    blueprint,
    dieline,
    validation,
    measurements: {
      blankWidth: blueprint.blank.width,
      blankHeight: blueprint.blank.height,
      blankArea: blueprint.derived.blankArea,
      blankAreaM2: mm2ToM2(blueprint.derived.blankArea),
      printableArea: blueprint.derived.printableArea,
      outerVolume: width * depth * height,
    },
  };
}
