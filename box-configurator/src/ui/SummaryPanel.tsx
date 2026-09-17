import { getFinish } from '../engine/finishes';
import { getMaterial } from '../engine/materials';
import { computeQuote } from '../engine/pricing';
import { getStructure } from '../engine/structures/registry';
import { useConfiguratorStore } from '../state/store';
import { buildExportedConfiguration, downloadConfigurationJson, downloadDielineSvg } from './export';
import { fmtDims, fmtInt, fmtM2, fmtMm } from './format';
import { PRINTING_OPTIONS } from './steps/PrintingStep';

/** Récapitulatif + prix + exports. Aucun prix n'est calculé tant qu'aucune grille n'est chargée. */
export function SummaryPanel() {
  const model = useConfiguratorStore((s) => s.model);
  const structureId = useConfiguratorStore((s) => s.structureId);
  const materialId = useConfiguratorStore((s) => s.materialId);
  const printing = useConfiguratorStore((s) => s.printing);
  const finishes = useConfiguratorStore((s) => s.finishes);
  const quantity = useConfiguratorStore((s) => s.quantity);
  const toggleDebug = useConfiguratorStore((s) => s.toggleDebug);
  const debug = useConfiguratorStore((s) => s.debug);

  const { width, depth, height } = model.parameters.dimensions;
  const material = getMaterial(materialId);
  const structure = getStructure(structureId);
  const quote = computeQuote(
    {
      structureId,
      dimensions: model.parameters.dimensions,
      measurements: {
        blankWidth: model.measurements.blankWidth,
        blankHeight: model.measurements.blankHeight,
        blankArea: model.measurements.blankArea,
        printableArea: model.measurements.printableArea,
      },
      materialId,
      printing,
      finishes,
      quantity,
    },
    [],
  );
  const warnings = model.validation.issues.filter((i) => i.level === 'warning');

  return (
    <aside className="panel panel-summary" aria-label="Récapitulatif">
      <h2 className="panel-title">Récapitulatif</h2>
      <dl className="summary-list">
        <dt>Structure</dt>
        <dd>
          {structure.id} · {structure.name}
        </dd>
        <dt>Dimensions</dt>
        <dd>{fmtDims(width, depth, height)}</dd>
        <dt>Carton</dt>
        <dd>
          {material.name} · {material.boardThickness} mm
        </dd>
        <dt>Impression</dt>
        <dd>{PRINTING_OPTIONS.find((o) => o.id === printing)?.label}</dd>
        <dt>Finitions</dt>
        <dd>{finishes.length > 0 ? finishes.map((f) => getFinish(f).name).join(', ') : '—'}</dd>
        <dt>Quantité</dt>
        <dd>{fmtInt(quantity)} pcs</dd>
        <dt>Patron</dt>
        <dd>
          {fmtMm(model.measurements.blankWidth)} × {fmtMm(model.measurements.blankHeight)}
        </dd>
        <dt>Surface carton</dt>
        <dd>{fmtM2(model.measurements.blankAreaM2)} / pièce</dd>
      </dl>

      {warnings.map((w) => (
        <p key={w.code} className="notice notice-warning">
          {w.message}
        </p>
      ))}

      <div className="price-block">
        <span className="price-label">Prix</span>
        <span className="price-value">{quote.status === 'ok' && quote.unitPriceExVat !== undefined ? `${quote.unitPriceExVat.toFixed(3)} € HT / pièce` : 'Sur devis'}</span>
        <small>{quote.notes[0] ?? 'Moteur tarifaire : phase 10.'}</small>
      </div>

      <div className="actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => downloadConfigurationJson(buildExportedConfiguration(model, { materialId, printing, finishes, quantity }), model)}
        >
          Exporter la configuration (JSON)
        </button>
        <button type="button" className="btn" onClick={() => downloadDielineSvg(model)}>
          Télécharger le patron (SVG)
        </button>
        <small className="disclaimer">Aperçu technique : le patron n’est pas validé pour la production tant que les règles prépresse et structurelles SKLUBS ne sont pas confirmées.</small>
        <button type="button" className="btn-link" onClick={toggleDebug} aria-pressed={debug !== null}>
          {debug ? 'Quitter le mode développeur' : 'Mode développeur'}
        </button>
      </div>
    </aside>
  );
}
