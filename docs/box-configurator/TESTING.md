# TESTING

## Lancer

```bash
cd box-configurator
npm install
npm test          # vitest run (Node, sans navigateur)
npm run typecheck # tsc --noEmit, TypeScript strict
npm run build     # vite build
```

## Ce qui est testé (`box-configurator/tests/`)

Jeux de dimensions du brief : `50×30×80`, `100×50×150`, `200×100×300`, `300×200×100` (+ cas limites).

| Fichier | Vérifie |
|---|---|
| `polygon.test.ts` | aire signée, offset (bleed/safe), chaînage de segments, arrondis sans NaN |
| `box-001.test.ts` | 13 panneaux présents, aucun NaN, polygones anti-horaires (aucune géométrie inversée), blank = `2W+2D+g` × `H+2·max(D+Lt, Ld)`, pattes anti-poussière sans chevauchement |
| `folding.test.ts` | à `progress=1` : boîte englobante ≈ W×H×D, normales extérieures (FRONT +z, BACK −z, LID +y…), `progress=0` = plat ; matrices finies à tout progress |
| `dieline.test.ts` | une seule boucle CUT, plis = charnières, bleed strictement extérieur, safe strictement intérieur, SVG bien formé avec unités mm |
| `validation.test.ts` | bornes, NaN, limites structurelles, avertissements |
| `box-model.test.ts` | 200 changements rapides de dimensions → sortie stable, déterministe, < budget temps |
| `panel-geometry.test.ts` | géométrie Three.js construite en Node : positions finies, 3 groupes, UV dans [0,1] |

## Vérification navigateur (faite pour le handoff, à automatiser en Phase 14)

Script Playwright (Chromium headless, WebGL via SwiftShader) : chargement, saisie `300×200×100` → `150×80×220`, kraft, « Voir le patron », slider 55 %, onglet Patron 2D, mode développeur, viewport mobile 390 px. Résultat : aucune erreur JavaScript, rendu conforme.

## Mode debug (manuel)

Bouton « Mode développeur » dans l'UI :
- IDs des panneaux, axes de charnière, normales, pivots, damier UV en 3D ;
- libellés, cotes, colorisation CUT/CREASE sur le patron.

## À venir (Phase 14)

Tests UI (React Testing Library), test e2e Playwright du critère §32 (saisie `300×200×100` puis `150×80×220`), test de resize viewport, test de fuite WebGL (compteur `renderer.info.memory`).
