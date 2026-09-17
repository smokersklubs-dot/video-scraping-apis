import { animateFold, cancelFoldAnimation } from '../state/fold-animation';
import { useConfiguratorStore } from '../state/store';

/** Pliage réel : slider + boutons « Voir le patron » / « Voir en 3D » (animation géométrique). */
export function FoldControl() {
  const progress = useConfiguratorStore((s) => s.foldProgress);
  const setFoldProgress = useConfiguratorStore((s) => s.setFoldProgress);
  const percent = Math.round(progress * 100);

  return (
    <div className="fold-control">
      <button type="button" className="btn btn-ghost" onClick={() => animateFold(0)} disabled={progress === 0}>
        Voir le patron
      </button>
      <label className="fold-slider">
        <span className="sr-only">Pliage</span>
        <input
          type="range"
          min={0}
          max={100}
          value={percent}
          onChange={(e) => {
            cancelFoldAnimation();
            setFoldProgress(Number(e.target.value) / 100);
          }}
          aria-valuetext={`${percent} %`}
        />
        <span className="fold-value">{percent} %</span>
      </label>
      <button type="button" className="btn btn-ghost" onClick={() => animateFold(1)} disabled={progress === 1}>
        Voir en 3D
      </button>
    </div>
  );
}
