export type QualityLevel = 'high' | 'medium' | 'low';

export interface QualityProfile {
  readonly level: QualityLevel;
  readonly maxDpr: number;
  readonly shadows: boolean;
  readonly shadowMapSize: number;
  readonly envResolution: number;
  readonly contactShadowResolution: number;
}

export const QUALITY_PROFILES: Record<QualityLevel, QualityProfile> = {
  high: { level: 'high', maxDpr: 2, shadows: true, shadowMapSize: 2048, envResolution: 256, contactShadowResolution: 1024 },
  medium: { level: 'medium', maxDpr: 1.5, shadows: true, shadowMapSize: 1024, envResolution: 128, contactShadowResolution: 512 },
  low: { level: 'low', maxDpr: 1, shadows: false, shadowMapSize: 512, envResolution: 64, contactShadowResolution: 256 },
};

/** Heuristique simple : mobile → low, tablette / petit CPU → medium, sinon high. */
export function detectQuality(): QualityProfile {
  if (typeof window === 'undefined') return QUALITY_PROFILES.high;
  const width = window.innerWidth;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (coarse && width < 768) return QUALITY_PROFILES.low;
  if (width < 1200 || cores <= 4) return QUALITY_PROFILES.medium;
  return QUALITY_PROFILES.high;
}
