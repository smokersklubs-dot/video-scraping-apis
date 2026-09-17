# SKLUBS BOX CONFIGURATOR — Roadmap

Méthode par phase : ANALYSE → PLAN → IMPLEMENTATION → TEST → CORRECTION → DOCUMENTATION → HANDOFF.
Une phase n'ouvre que si la précédente est stable.

| Phase | Objectif | Statut |
|---|---|---|
| 0 | Audit repository, documentation initiale | ✅ terminée |
| 1 | Architecture Box Engine (types, unités, registre de structures, validation) | ✅ terminée |
| 2 | BOX-001 geometry (panneaux, plis, hiérarchie) | ✅ terminée |
| 3 | Dieline SVG (CUT / CREASE / BLEED / SAFE / GLUE) | ✅ terminée |
| 4 | Viewer Three.js (R3F, épaisseur, orbit, zoom, studio) | ✅ terminée |
| 5 | Synchronisation dimensions 2D ↔ 3D temps réel + UI configurateur | ✅ terminée |
| 6 | Folding Engine (dieline → boîte, animation géométrique réelle) | ✅ base terminée (progress 0→1, étapes séquencées) |
| 7 | Artwork Engine (upload, atlas, mapping UV, éditeur 2D) | ⏳ architecture préparée (UV atlas en place), non implémenté |
| 8 | Matériaux avancés (normal/bump, chants) | ⏳ architecture préparée (WHITE_BOARD, KRAFT actifs) |
| 9 | Finitions | ⏳ types préparés, aucune simulation |
| 10 | Pricing (moteur de règles) | ⏳ interfaces préparées, aucune règle chiffrée |
| 11 | Sauvegarde / projets (Supabase) | ⏳ non commencé |
| 12 | Export (PNG, JSON, SVG, PDF) | ⏳ export SVG du patron disponible côté client, PNG/JSON/PDF non commencés |
| 13 | Responsive + performance (DPR, ombres, qualité) | ✅ base (niveaux de qualité, DPR borné) — à durcir |
| 14 | Tests complets | ⏳ tests moteur en place, tests UI/e2e non commencés |
| 15 | BOX-002 Reverse Tuck End | ⏳ non commencé (le registre est prêt) |

## Critère de validation Phase 1 (brief §32)

Saisir `300 × 200 × 100` puis `150 × 80 × 220` : la boîte 3D **et** le patron se recalculent sans charger de modèle. → Couvert par l'implémentation + test `box-model.test.ts` (changements rapides de dimensions).

## Bibliothèque future

BOX-001 Tuck End (référence) → BOX-002 Reverse Tuck End → BOX-003 Straight Tuck End (variante de 001) → BOX-004 Auto Lock Bottom → BOX-005 Mailer → BOX-006 Drawer → BOX-007 Sleeve → BOX-008 Shipping Box → BOX-009 Cosmetic Box → BOX-010 Display Box.

Chaque structure = un module `engine/structures/<id>/` exposant `StructureModule` (voir BOX_ENGINE.md), enregistré dans `registry.ts`.
