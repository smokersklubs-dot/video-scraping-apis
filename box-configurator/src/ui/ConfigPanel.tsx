import { ArtworkStep } from './steps/ArtworkStep';
import { DimensionsStep } from './steps/DimensionsStep';
import { FinishStep } from './steps/FinishStep';
import { MaterialStep } from './steps/MaterialStep';
import { PrintingStep } from './steps/PrintingStep';
import { QuantityStep } from './steps/QuantityStep';
import { StructureStep } from './steps/StructureStep';

/** Colonne de configuration : parcours en 7 étapes. */
export function ConfigPanel() {
  return (
    <aside className="panel panel-config" aria-label="Configuration">
      <StructureStep />
      <DimensionsStep />
      <MaterialStep />
      <PrintingStep />
      <FinishStep />
      <ArtworkStep />
      <QuantityStep />
    </aside>
  );
}
