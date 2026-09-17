# HANDOFF — SKLUBS Box Configurator

## État au 2026-09-17

**PROTOTYPE BOX-001 livré et validé** (brief §31 et §32) : boîte générée par code, dimensions W/D/H dynamiques, rotation 360°, zoom, carton blanc / kraft, dieline SVG, correspondance patron ↔ panneaux, recalcul temps réel, responsive, TypeScript strict. En plus : pliage animé réel (Phase 6, base), mode développeur (§27), export SVG/JSON.

Vérification effectuée en Chromium headless (WebGL SwiftShader) : saisie `300 × 200 × 100` puis `150 × 80 × 220` → la boîte 3D et le patron se recalculent sans chargement de modèle. Aucune erreur JavaScript.

## Lancer

```bash
cd box-configurator
npm install        # .npmrc force legacy-peer-deps (bug npm/Arborist sur les peers optionnels de Vitest)
npm run dev        # http://localhost:5173
npm test           # 129 tests Vitest (moteur + géométrie Three.js en Node)
npm run typecheck  # tsc strict
npm run build      # typecheck + vite build → dist/
```

Aucune variable d'environnement, aucun asset externe (pas de HDR, pas de GLB). Seules les polices Google (Syne, DM Sans) sont chargées en ligne, avec fallback système.

## Ce qui existe

| Zone | Fichiers clés |
|---|---|
| Moteur pur (mm, sans Three) | `src/engine/**` — `box-model.ts` est le point d'entrée unique |
| BOX-001 | `src/engine/structures/box-001-tuck-end/` (`layout.ts` = toutes les formules) |
| Pliage | `src/engine/folding/fold-transforms.ts` (matrices 4×4 hiérarchiques, retrait d'épaisseur, étapes) |
| Dieline | `src/engine/dieline/` (classification CUT/CREASE, contour continu, bleed, safe, glue, SVG mm) |
| Viewer | `src/viewer/` (R3F, géométrie de panneau à 3 groupes de matériaux, atlas UV, studio procédural, qualité adaptative, debug) |
| Patron 2D interactif | `src/dieline-view/DielineView.tsx` |
| État | `src/state/store.ts` (Zustand), `fold-animation.ts` |
| UI | `src/ui/**` (7 étapes, stage, récapitulatif, exports) |
| Tests | `tests/**` |

## Décisions à connaître

1. **Dimensions extérieures** en V1. Le passage aux dimensions intérieures est un pré-traitement de `BoxParameters`.
2. **Repère patron unique** : la 3D extrude les mêmes polygones que la 2D. Il n'existe aucune seconde source de vérité.
3. **`hingeInset` + `lift`** : petits décalages d'empilement (multiples de l'épaisseur, 0,1 mm pour les couvercles) qui évitent interpénétrations et z-fighting. Ce ne sont pas des allowances de fabrication.
4. **UV atlas** déjà en place : la Phase 7 n'a qu'à produire une texture du patron complet.
5. **Aucun prix** : `computeQuote` renvoie `unavailable` tant qu'aucune règle n'est chargée.
6. La caméra se recadre en douceur quand l'encombrement change (dimensions ou dépliage) sans écraser l'orbite de l'utilisateur.

## Known issues

- Les overlaps internes (chants coplanaires à l'intérieur de la boîte fermée) sont invisibles de l'extérieur mais existent ; un rendu « boîte ouverte » demandera de les traiter.
- Le trapèze des pattes anti-poussière et la languette sans épaulement sont des formes simplifiées.
- Le dépliage animé est séquentiel (corps → pattes → languettes → couvercles) et linéaire par étape ; les collisions ne sont pas simulées.
- Le mode développeur affiche les libellés en HTML (drei `Html`) : coût DOM à surveiller si le nombre de panneaux explose.
- Pas encore de tests UI ni e2e automatisés (Phase 14) ; la vérification navigateur a été faite par script Playwright hors dépôt.
- Warnings console `THREE.Clock deprecated` : proviennent de R3F/drei, sans effet.

## PACKAGING_VALIDATION_REQUIRED (à confirmer avec la production SKLUBS)

1. Mode de cotation (intérieur vs extérieur) et allowances d'épaisseur par pli.
2. Longueur de languette `min(clamp(0.7·D, 12, 30), H − 2t − 1)` et épaulements de verrouillage.
3. Pattes anti-poussière : longueur `min(0.7·D, W/2 − 2t − 1)`, dégagement `1.5 + 2t`, rétrécissement 15 %.
4. Patte de collage `clamp(0.12·D, 12, 20)`, chanfreins 45°, côté de collage (actuellement à droite, collée sous FRONT).
5. Couvercle = `D` exactement.
6. Bleed 3 mm, safe zone 3 mm, format de feuille d'alerte 1000 × 700 mm.
7. Bornes 20–600 mm, épaisseur 0,3–3 mm, épaisseurs par matériau (0,5 / 0,6 / 0,8 / 1,5 mm).
8. Grammages indicatifs des matériaux.

## Prochaine phase

**Phase 7 — Artwork Engine** : import PNG/JPG, éditeur sur le patron, atlas `CanvasTexture`, mapping instantané sur la 3D. Puis Phase 8 (grain kraft via bump), Phase 10 (règles de prix via table Supabase `box_tarifs`), Phase 11 (sessions Supabase sur le modèle `viewer_sessions` + RLS), Phase 15 (BOX-002 : un nouveau dossier `structures/box-002-reverse-tuck-end/` réutilisant `layout.ts` avec les languettes réparties FRONT/BACK).

## Intégration dans le repo SKLUBS cible

Ce dépôt ne contient pas de site SKLUBS. Le package `box-configurator/` est autonome : le déplacer dans le monorepo cible (ou l'importer comme package) ne demande que de conserver les alias Vite/TS. Le moteur (`src/engine`) est utilisable côté serveur (Node) tel quel, par exemple pour générer le SVG d'un devis.
