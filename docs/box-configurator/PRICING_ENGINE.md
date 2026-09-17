# PRICING ENGINE — Moteur de règles (Phase 10, interfaces préparées)

## Principe

`GEOMETRY` et `PRICING` sont totalement séparés. Le pricing ne reçoit que des **mesures** :

```ts
interface PricingInput {
  structureId: StructureId
  dimensions: { width; depth; height }        // mm
  measurements: { blankWidth; blankHeight; blankArea; printableArea }  // mm / mm²
  materialId: MaterialId
  printing: PrintingId
  finishes: FinishId[]
  quantity: number
}
```

et renvoie :

```ts
interface Quote {
  status: 'ok' | 'unavailable' | 'on-request'
  currency: 'EUR'
  unitPriceExVat?: number
  totalExVat?: number
  breakdown: QuoteLine[]      // une ligne par règle appliquée
  notes: string[]
}
```

## Pipeline de règles

```ts
interface PricingRule {
  id: string
  applies(input: PricingInput): boolean
  apply(input: PricingInput, ctx: QuoteContext): QuoteLine | null
}
computeQuote(input, rules: PricingRule[]): Quote
```

Règles prévues : `material-per-m2`, `structure-base`, `printing`, `finish-*`, `quantity-tiers`, `tooling` (forme de découpe), `production`, `shipping`, `margin`. Les paliers de quantité (100 / 250 / 500 / 1000 / 2500 / 5000 / 10000 + personnalisé) sont des données, pas du code.

## Source des tarifs

Le configurateur Mylar SKLUBS utilise une vue Supabase `v_tarifs_actifs` (modèle, taille, finition, `quantite_min/max` → prix unitaire). Le même pattern (table `box_tarifs` + vue active) est recommandé pour alimenter `quantity-tiers`. **Aucun prix n'est codé dans le front.**

## État V1

`computeQuote` existe, sans règles chargées : il renvoie `status: 'unavailable'` et l'UI affiche « Prix sur devis ». Aucun chiffre inventé.
