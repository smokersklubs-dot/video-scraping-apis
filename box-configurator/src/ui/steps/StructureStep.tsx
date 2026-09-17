import { listStructures } from '../../engine/structures/registry';
import { useConfiguratorStore } from '../../state/store';
import { Step } from '../Step';

/** Structures annoncées (ROADMAP) mais non disponibles : affichées grisées. */
const UPCOMING = [
  { id: 'BOX-002', name: 'Reverse Tuck End' },
  { id: 'BOX-004', name: 'Fond automatique' },
  { id: 'BOX-005', name: 'Boîte mailer' },
  { id: 'BOX-006', name: 'Tiroir' },
];

export function StructureStep() {
  const structureId = useConfiguratorStore((s) => s.structureId);
  const setStructure = useConfiguratorStore((s) => s.setStructure);
  return (
    <Step index={1} title="Choisissez votre boîte">
      <div className="card-grid">
        {listStructures().map((s) => (
          <button
            key={s.id}
            type="button"
            className={`card ${structureId === s.id ? 'is-selected' : ''}`}
            onClick={() => setStructure(s.id)}
            aria-pressed={structureId === s.id}
          >
            <span className="card-kicker">{s.id}</span>
            <span className="card-title">{s.name}</span>
            <span className="card-desc">{s.description}</span>
          </button>
        ))}
        {UPCOMING.map((u) => (
          <div key={u.id} className="card is-disabled" aria-disabled="true">
            <span className="card-kicker">{u.id}</span>
            <span className="card-title">{u.name}</span>
            <span className="card-desc">Bientôt disponible</span>
          </div>
        ))}
      </div>
    </Step>
  );
}
