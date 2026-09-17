import type { PrintingId } from '../../engine/pricing';
import { useConfiguratorStore } from '../../state/store';
import { Step } from '../Step';

export const PRINTING_OPTIONS: { id: PrintingId; label: string; desc: string }[] = [
  { id: 'NONE', label: 'Sans impression', desc: 'Carton nu' },
  { id: 'CMYK_OUTSIDE', label: 'Quadri extérieur', desc: 'CMJN sur la face imprimée' },
  { id: 'CMYK_BOTH_SIDES', label: 'Quadri recto / verso', desc: 'CMJN extérieur + intérieur' },
];

export function PrintingStep() {
  const printing = useConfiguratorStore((s) => s.printing);
  const setPrinting = useConfiguratorStore((s) => s.setPrinting);
  return (
    <Step index={4} title="Choisissez l’impression">
      <div className="option-list" role="radiogroup" aria-label="Impression">
        {PRINTING_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={printing === o.id}
            className={`option ${printing === o.id ? 'is-selected' : ''}`}
            onClick={() => setPrinting(o.id)}
          >
            <span className="option-title">{o.label}</span>
            <span className="option-desc">{o.desc}</span>
          </button>
        ))}
      </div>
    </Step>
  );
}
