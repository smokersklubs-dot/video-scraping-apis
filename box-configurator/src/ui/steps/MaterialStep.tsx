import { MATERIALS } from '../../engine/materials';
import { useConfiguratorStore } from '../../state/store';
import { Step } from '../Step';

export function MaterialStep() {
  const materialId = useConfiguratorStore((s) => s.materialId);
  const setMaterial = useConfiguratorStore((s) => s.setMaterial);
  return (
    <Step index={3} title="Choisissez le carton">
      <div className="card-grid">
        {MATERIALS.map((m) => {
          const disabled = !m.commercial.available;
          return (
            <button
              key={m.id}
              type="button"
              className={`card card-material ${materialId === m.id ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`}
              onClick={() => !disabled && setMaterial(m.id)}
              disabled={disabled}
              aria-pressed={materialId === m.id}
            >
              <span className="swatch" style={{ background: m.appearance.outerColor }} aria-hidden="true" />
              <span className="card-title">{m.name}</span>
              <span className="card-desc">{disabled ? m.commercial.note : `${m.boardThickness} mm · ${m.description}`}</span>
            </button>
          );
        })}
      </div>
    </Step>
  );
}
