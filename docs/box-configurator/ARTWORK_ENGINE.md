# ARTWORK ENGINE — Design du client (Phase 7, préparé, non implémenté)

## Décision d'architecture : atlas UV dynamique

Plutôt qu'une texture par face, **une seule texture** représente tout le patron :

```
Artwork (PNG/JPG/SVG…) ──▶ Éditeur 2D (position/scale/rotation sur le patron)
                                   │
                                   ▼
                     Canvas atlas (résolution bornée, ex. 2048 px max côté long)
                     = fond matériau + artwork composité + (option) calques finitions
                                   │
                                   ▼
                     THREE.CanvasTexture ──▶ matériau `outer` de tous les panneaux
```

Chaque panneau porte déjà des UV = coordonnées patron normalisées (voir THREE_ENGINE.md §2). Un artwork déplacé sur le patron apparaît donc au bon endroit sur la 3D **sans aucun code spécifique par face**.

## Types préparés (`engine/artwork/types.ts`)

```ts
interface ArtworkAsset { id; kind: 'raster' | 'svg' | 'pdf'; name; width; height; source }
interface ArtworkPlacement { assetId; x; y; width; height; rotation; locked; panelHint?: PanelId }
interface ArtworkLayer { placements: ArtworkPlacement[] }
```

Le mapping patron → UV est une fonction pure `dielineToUv(point, blank)` déjà utilisée par le viewer.

## Éditeur 2D (Phase 7)

Sur `DielineView` (SVG) : import (PNG/JPG d'abord, SVG ensuite, PDF via rasterisation plus tard), drag, scale, rotation, guides safe/bleed, zones non imprimables (pattes de collage, languettes intérieures). Pas d'Illustrator : quelques poignées, un snapping aux panneaux.

## Contraintes

- Résolution de l'atlas bornée (mobile : 1024).
- Régénération de la texture throttlée (rAF), pas à chaque événement pointer.
- L'atlas est recalculé si le blank change de taille (les UV restent valides car normalisés).
