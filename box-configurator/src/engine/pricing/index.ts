import type { Dimensions, StructureId } from '../core/types';
import type { FinishId } from '../finishes';
import type { MaterialId } from '../materials';

/**
 * Pricing Engine — moteur de règles (Phase 10). Totalement séparé de la géométrie :
 * il ne reçoit que des mesures. Aucun prix n'est codé ici.
 */
export type PrintingId = 'NONE' | 'CMYK_OUTSIDE' | 'CMYK_BOTH_SIDES';

export const QUANTITY_TIERS: readonly number[] = [100, 250, 500, 1000, 2500, 5000, 10000];

export interface PricingMeasurements {
  readonly blankWidth: number;
  readonly blankHeight: number;
  /** mm² */
  readonly blankArea: number;
  readonly printableArea: number;
}

export interface PricingInput {
  readonly structureId: StructureId;
  readonly dimensions: Dimensions;
  readonly measurements: PricingMeasurements;
  readonly materialId: MaterialId;
  readonly printing: PrintingId;
  readonly finishes: readonly FinishId[];
  readonly quantity: number;
}

export interface QuoteLine {
  readonly ruleId: string;
  readonly label: string;
  /** Montant HT en euros pour la quantité totale. */
  readonly amount: number;
}

export interface QuoteContext {
  readonly lines: readonly QuoteLine[];
  readonly subtotal: number;
}

export interface PricingRule {
  readonly id: string;
  applies(input: PricingInput): boolean;
  apply(input: PricingInput, ctx: QuoteContext): QuoteLine | null;
}

export type QuoteStatus = 'ok' | 'unavailable' | 'on-request';

export interface Quote {
  readonly status: QuoteStatus;
  readonly currency: 'EUR';
  readonly unitPriceExVat?: number;
  readonly totalExVat?: number;
  readonly breakdown: readonly QuoteLine[];
  readonly notes: readonly string[];
}

export function computeQuote(input: PricingInput, rules: readonly PricingRule[]): Quote {
  if (rules.length === 0 || input.quantity <= 0) {
    return {
      status: 'unavailable',
      currency: 'EUR',
      breakdown: [],
      notes: ['Aucune grille tarifaire chargée : prix sur devis.'],
    };
  }
  const lines: QuoteLine[] = [];
  for (const rule of rules) {
    if (!rule.applies(input)) continue;
    const subtotal = lines.reduce((s, l) => s + l.amount, 0);
    const line = rule.apply(input, { lines, subtotal });
    if (line) lines.push(line);
  }
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return {
    status: 'ok',
    currency: 'EUR',
    totalExVat: total,
    unitPriceExVat: total / input.quantity,
    breakdown: lines,
    notes: [],
  };
}
