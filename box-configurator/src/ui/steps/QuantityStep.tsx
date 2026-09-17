import { useState } from 'react';
import { QUANTITY_TIERS } from '../../engine/pricing';
import { useConfiguratorStore } from '../../state/store';
import { fmtInt } from '../format';
import { Step } from '../Step';

export function QuantityStep() {
  const quantity = useConfiguratorStore((s) => s.quantity);
  const setQuantity = useConfiguratorStore((s) => s.setQuantity);
  const isTier = QUANTITY_TIERS.includes(quantity);
  const [custom, setCustom] = useState<string>(isTier ? '' : String(quantity));

  return (
    <Step index={7} title="Choisissez la quantité">
      <div className="chip-row">
        {QUANTITY_TIERS.map((q) => (
          <button
            key={q}
            type="button"
            className={`chip ${quantity === q ? 'is-selected' : ''}`}
            aria-pressed={quantity === q}
            onClick={() => {
              setCustom('');
              setQuantity(q);
            }}
          >
            {fmtInt(q)}
          </button>
        ))}
      </div>
      <label className="field field-inline">
        <span className="field-label">Quantité personnalisée</span>
        <span className="field-input">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="ex. 750"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n >= 1) setQuantity(n);
            }}
          />
          <span className="field-unit">pcs</span>
        </span>
      </label>
    </Step>
  );
}
