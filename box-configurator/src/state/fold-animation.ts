import { smoothstep } from '../engine/folding/stages';
import { useConfiguratorStore } from './store';

let frame: number | null = null;

/**
 * Anime le pliage réel (aucune vidéo) : interpole le progress du store vers la cible.
 * Une seule animation à la fois ; un nouvel appel remplace la précédente.
 */
export function animateFold(target: number, durationMs = 1400): void {
  if (frame !== null) cancelAnimationFrame(frame);
  const store = useConfiguratorStore.getState();
  const from = store.foldProgress;
  const to = Math.min(1, Math.max(0, target));
  if (Math.abs(to - from) < 1e-4) return;
  const start = performance.now();
  const step = (now: number): void => {
    const t = Math.min(1, (now - start) / durationMs);
    useConfiguratorStore.getState().setFoldProgress(from + (to - from) * smoothstep(t));
    if (t < 1) frame = requestAnimationFrame(step);
    else frame = null;
  };
  frame = requestAnimationFrame(step);
}

export function cancelFoldAnimation(): void {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
}
