import { useState } from 'react';
import { DEFAULT_DIELINE_LAYERS, DielineView, type DielineLayers } from '../dieline-view/DielineView';
import { getMaterial } from '../engine/materials';
import { useConfiguratorStore } from '../state/store';
import { BoxViewer } from '../viewer/BoxViewer';
import { DebugPanel } from './DebugPanel';
import { FoldControl } from './FoldControl';
import { fmtMm } from './format';

const LAYER_LABELS: { key: keyof DielineLayers; label: string }[] = [
  { key: 'bleed', label: 'Fond perdu' },
  { key: 'safe', label: 'Zone de sécurité' },
  { key: 'glue', label: 'Collage' },
  { key: 'labels', label: 'Libellés' },
];

/** Zone centrale : onglets 3D / Patron, viewer, contrôle de pliage. */
export function Stage() {
  const viewMode = useConfiguratorStore((s) => s.viewMode);
  const setViewMode = useConfiguratorStore((s) => s.setViewMode);
  const model = useConfiguratorStore((s) => s.model);
  const foldProgress = useConfiguratorStore((s) => s.foldProgress);
  const materialId = useConfiguratorStore((s) => s.materialId);
  const finishes = useConfiguratorStore((s) => s.finishes);
  const debug = useConfiguratorStore((s) => s.debug);
  const [layers, setLayers] = useState<DielineLayers>(DEFAULT_DIELINE_LAYERS);
  const appearance = getMaterial(materialId).appearance;

  return (
    <section className="stage" aria-label="Aperçu">
      <div className="stage-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={viewMode === '3d'} className={viewMode === '3d' ? 'is-active' : ''} onClick={() => setViewMode('3d')}>
          Aperçu 3D
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'dieline'}
          className={viewMode === 'dieline' ? 'is-active' : ''}
          onClick={() => setViewMode('dieline')}
        >
          Patron 2D
        </button>
        <span className="stage-meta">
          Patron : {fmtMm(model.blueprint.blank.width)} × {fmtMm(model.blueprint.blank.height)}
        </span>
      </div>

      <div className="stage-canvas">
        <div className="stage-canvas-inner">
          {viewMode === '3d' ? (
            <BoxViewer blueprint={model.blueprint} foldProgress={foldProgress} appearance={appearance} finishes={finishes} debug={debug} />
          ) : (
            <DielineView model={model.dieline} layers={layers} />
          )}
        </div>
      </div>

      {viewMode === '3d' ? (
        <FoldControl />
      ) : (
        <div className="layer-toggles">
          {LAYER_LABELS.map((l) => (
            <label key={l.key} className={`chip chip-check ${layers[l.key] ? 'is-selected' : ''}`}>
              <input type="checkbox" checked={layers[l.key]} onChange={(e) => setLayers({ ...layers, [l.key]: e.target.checked })} />
              {l.label}
            </label>
          ))}
          <span className="legend">
            <i style={{ borderColor: '#1F2A36' }} /> Découpe
            <i style={{ borderColor: '#1E90FF', borderStyle: 'dashed' }} /> Pli
            <i style={{ borderColor: '#FF6A00' }} /> Fond perdu
            <i style={{ borderColor: '#00B25A', borderStyle: 'dashed' }} /> Sécurité
          </span>
        </div>
      )}
      <DebugPanel />
    </section>
  );
}
