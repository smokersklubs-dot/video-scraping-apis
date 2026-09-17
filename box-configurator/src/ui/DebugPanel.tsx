import type { DebugFlags } from '../viewer/debug/DebugOverlay';
import { useConfiguratorStore } from '../state/store';
import { fmtMm } from './format';

const FLAGS: { key: keyof DebugFlags; label: string }[] = [
  { key: 'panelIds', label: 'IDs panneaux' },
  { key: 'hinges', label: 'Axes de pliage' },
  { key: 'normals', label: 'Normales' },
  { key: 'pivots', label: 'Pivots' },
  { key: 'uvChecker', label: 'Damier UV' },
  { key: 'axes', label: 'Repère XYZ' },
];

/** Mode développeur : diagnostics de structure. */
export function DebugPanel() {
  const debug = useConfiguratorStore((s) => s.debug);
  const setDebugFlag = useConfiguratorStore((s) => s.setDebugFlag);
  const model = useConfiguratorStore((s) => s.model);
  if (!debug) return null;
  const bp = model.blueprint;
  return (
    <div className="debug-panel">
      <div className="chip-row">
        {FLAGS.map((f) => (
          <label key={f.key} className={`chip chip-check ${debug[f.key] ? 'is-selected' : ''}`}>
            <input type="checkbox" checked={debug[f.key]} onChange={(e) => setDebugFlag(f.key, e.target.checked)} />
            {f.label}
          </label>
        ))}
      </div>
      <dl className="debug-facts">
        <dt>Panneaux</dt>
        <dd>{bp.panels.length}</dd>
        <dt>Plis</dt>
        <dd>{bp.folds.length}</dd>
        <dt>Patron</dt>
        <dd>
          {fmtMm(bp.blank.width)} × {fmtMm(bp.blank.height)}
        </dd>
        <dt>Contours</dt>
        <dd>
          {model.dieline.cut.length} fermé(s), {model.dieline.openCuts.length} ouvert(s)
        </dd>
        <dt>Languette</dt>
        <dd>{fmtMm(bp.derived.tuckLength)}</dd>
        <dt>Patte anti-poussière</dt>
        <dd>{fmtMm(bp.derived.dustFlapLength)}</dd>
        <dt>Patte de collage</dt>
        <dd>{fmtMm(bp.derived.glueFlapWidth)}</dd>
      </dl>
      <details>
        <summary>PACKAGING_VALIDATION_REQUIRED ({bp.notes.length})</summary>
        <ul className="debug-notes">
          {bp.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
