# THREE ENGINE — Viewer 3D

`box-configurator/src/viewer/`. React Three Fiber 9 + Three.js r186 + drei 10.

## 1. Pipeline

```
StructureBlueprint ──▶ computeFoldTransforms(blueprint, progress)  (engine, mat4 pures)
        │                              │
        ▼                              ▼
buildPanelGeometry(panel, t) ──▶ <mesh matrix={…} matrixAutoUpdate={false}>
```

- Un `<PanelMesh>` par panneau. La géométrie ne dépend que du polygone + épaisseur : elle est mémoïsée par panneau et reconstruite uniquement si le polygone change (changement de dimension).
- La matrice de pliage ne dépend que de `progress` : le slider de pliage ne reconstruit **aucune** géométrie.
- Les matrices sont calculées en mm puis converties par `mmToScene()` (mètres) via une matrice d'échelle unique sur le groupe racine. Aucun `/1000` dans le viewer.

## 2. Géométrie d'un panneau (`meshes/panel-geometry.ts`)

Construite à la main (pas `ExtrudeGeometry`) pour avoir trois groupes de matériau :

| Groupe | Faces | Matériau |
|---|---|---|
| 0 | face extérieure (z = 0), imprimée | `outer` (couleur/texture/finition) |
| 1 | face intérieure (z = −t) | `inner` (couleur du dos du carton) |
| 2 | chants (tour du polygone) | `edge` (tranche du carton) |

Triangulation par `THREE.ShapeUtils.triangulateShape` (earcut). UV de la face extérieure = coordonnées patron normalisées dans le bbox du blank → **UV atlas** : une seule texture (le patron complet) habillera toutes les faces (Phase 7). La face intérieure reçoit les mêmes UV (miroir) pour un futur imprimé intérieur.

## 3. Scène

- `Canvas` : `dpr` borné selon le niveau de qualité, `antialias`, `toneMapping: ACESFilmic`, `outputColorSpace: sRGB`.
- Éclairage studio : `Environment` **procédural** (drei `Lightformer`, aucun HDR téléchargé), lumière clé directionnelle avec ombres (désactivées en qualité basse), `ContactShadows` au sol.
- `OrbitControls` (rotation 360°, zoom, damping, pas de pan par défaut, limites de distance calculées depuis la diagonale de la boîte).
- Caméra recadrée automatiquement quand la diagonale change (`useFitCamera`).

## 4. Niveaux de qualité (`quality.ts`)

| Niveau | DPR max | Ombres | Résolution env |
|---|---|---|---|
| `high` (desktop) | 2 | oui | 256 |
| `medium` (tablette) | 1.5 | oui | 128 |
| `low` (mobile / GPU faible) | 1 | non | 64 |

Détection : largeur viewport + `navigator.hardwareConcurrency` + `matchMedia(pointer: coarse)`.

## 5. Matériaux (`materials/`)

`MeshStandardMaterial` paramétré depuis `engine/materials` (couleur, roughness, couleur intérieure, couleur de tranche). Le viewer ne connaît pas les identifiants commerciaux : il reçoit une `MaterialAppearance`.

## 6. Mémoire

- R3F dispose automatiquement les géométries/matériaux démontés. Les géométries mémoïsées sont libérées via `useEffect` cleanup.
- Une seule instance de matériau par (matériau, groupe), partagée entre panneaux.

## 7. Debug (`debug/`)

Activable dans l'UI (« Mode développeur ») : identifiants de panneaux (`Html`), axes de charnière (lignes), normales (flèches), points de pivot, texture damier UV, `axesHelper`. Voir TESTING.md.
