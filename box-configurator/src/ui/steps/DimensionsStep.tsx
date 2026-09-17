import type { DimensionKey } from '../../engine/core/types';
import { getStructure } from '../../engine/structures/registry';
import { useConfiguratorStore } from '../../state/store';
import { Step } from '../Step';
import { DimensionDiagram } from './DimensionDiagram';

const FIELDS: { key: DimensionKey; label: string; short: string }[] = [
  { key: 'width', label: 'Largeur', short: 'W' },
  { key: 'depth', label: 'Profondeur', short: 'D' },
  { key: 'height', label: 'Hauteur', short: 'H' },
];

export function DimensionsStep() {
  const draft = useConfiguratorStore((s) => s.draft);
  const validation = useConfiguratorStore((s) => s.draftValidation);
  const structureId = useConfiguratorStore((s) => s.structureId);
  const setDimension = useConfiguratorStore((s) => s.setDimension);
  const resetDimensions = useConfiguratorStore((s) => s.resetDimensions);
  const constraints = getStructure(structureId).constraints;

  const errorsFor = (key: DimensionKey) => validation.issues.filter((i) => i.field === key && i.level === 'error');
  const globalIssues = validation.issues.filter((i) => i.field === 'structure' || i.field === 'boardThickness');

  return (
    <Step index={2} title="Entrez vos dimensions" hint="Dimensions extérieures, en millimètres. La 3D et le patron se recalculent instantanément.">
      <div className="dims-layout">
        <DimensionDiagram />
        <div className="dims-fields">
          {FIELDS.map(({ key, label, short }) => {
            const errors = errorsFor(key);
            const range = constraints[key];
            return (
              <label key={key} className={`field ${errors.length > 0 ? 'has-error' : ''}`}>
                <span className="field-label">
                  <b>{short}</b> {label}
                </span>
                <span className="field-input">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={range.min}
                    max={range.max}
                    step={1}
                    value={draft[key]}
                    onChange={(e) => setDimension(key, e.target.value)}
                    aria-invalid={errors.length > 0}
                    aria-describedby={errors.length > 0 ? `${key}-error` : undefined}
                  />
                  <span className="field-unit">mm</span>
                </span>
                {errors.length > 0 ? (
                  <span id={`${key}-error`} className="field-error">
                    {errors[0]?.message}
                  </span>
                ) : (
                  <span className="field-help">
                    {range.min} – {range.max} mm
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>
      {globalIssues.map((i) => (
        <p key={i.code} className={`notice notice-${i.level}`}>
          {i.message}
        </p>
      ))}
      <button type="button" className="btn-link" onClick={resetDimensions}>
        Réinitialiser (300 × 200 × 100)
      </button>
    </Step>
  );
}
