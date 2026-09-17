import { FINISHES } from '../../engine/finishes';
import { useConfiguratorStore } from '../../state/store';
import { Step } from '../Step';

export function FinishStep() {
  const finishes = useConfiguratorStore((s) => s.finishes);
  const toggle = useConfiguratorStore((s) => s.toggleFinish);
  return (
    <Step index={5} title="Choisissez les finitions" hint="Mat et brillant sont visibles en 3D. Les autres finitions arrivent en phase 9.">
      <div className="chip-row">
        {FINISHES.map((f) => {
          const selected = finishes.includes(f.id);
          return (
            <button
              key={f.id}
              type="button"
              className={`chip ${selected ? 'is-selected' : ''}`}
              disabled={!f.available}
              aria-pressed={selected}
              onClick={() => toggle(f.id)}
              title={f.available ? undefined : 'Bientôt disponible'}
            >
              {f.name}
            </button>
          );
        })}
      </div>
    </Step>
  );
}
