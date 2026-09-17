# BOX ENGINE — Modèle paramétrique

Tout ce document décrit `box-configurator/src/engine/`. Ce code est **pur TypeScript** : aucune dépendance Three.js, React ou DOM. Il est testable en Node.

## 1. Entrée : `BoxParameters`

```ts
interface BoxParameters {
  structureId: StructureId        // 'BOX-001'
  dimensions: { width: number; depth: number; height: number }  // mm, dimensions EXTÉRIEURES en V1
  boardThickness: number          // mm (dérivé du matériau par défaut)
  options?: Record<string, number | string | boolean>  // options spécifiques à la structure
}
```

`PACKAGING_VALIDATION_REQUIRED` : l'industrie spécifie généralement les dimensions **intérieures** puis ajoute des allowances d'épaisseur. En V1 les dimensions saisies sont traitées comme extérieures (le rendu correspond exactement à W×D×H). La bascule intérieur/extérieur est un simple pré-traitement des paramètres (`dimensionMode`) à ajouter quand la règle SKLUBS sera connue.

## 2. Sortie : `StructureBlueprint`

```ts
interface Panel {
  id: PanelId                     // 'FRONT', 'SIDE_R', 'LID_TOP', 'TUCK_TOP', 'DUST_TOP_R', 'GLUE', …
  role: 'body' | 'closure' | 'tuck' | 'dust' | 'glue'
  label: string                   // libellé humain
  polygon: Vec2[]                 // contour dans le repère patron (mm), sens anti-horaire
  bounds: Rect                    // bbox du polygone
  printable: boolean              // participe à la surface imprimable / safe zone
  artworkRegion: Rect             // zone artwork (bbox du panneau) — Phase 7
}

interface Fold {
  id: string
  parentId: PanelId
  childId: PanelId
  hinge: { a: Vec2; b: Vec2 }     // segment charnière dans le repère patron (bord partagé)
  targetAngle: number             // radians, 90° pour tous les plis de BOX-001
  direction: 'inward'             // rotation vers -z (intérieur, face non imprimée)
  hingeInset: number              // retrait de la charnière dans le parent, en multiples d'épaisseur
  lift: number                    // décalage le long de la normale de l'enfant (mm), anti z-fighting des couvercles
  stage: number                   // ordre de pliage (0 = corps, 1 = pattes anti-poussière, 2 = languette, 3 = couvercle)
}

interface StructureBlueprint {
  structureId: StructureId
  parameters: BoxParameters
  rootPanelId: PanelId            // 'FRONT'
  panels: Panel[]
  folds: Fold[]
  blank: Rect                     // encombrement du patron à plat (mm)
  derived: { blankArea: number; panelArea: number; glueFlapWidth: number; … }
  notes: string[]                 // hypothèses marquées PACKAGING_VALIDATION_REQUIRED
}
```

Une structure est un module :

```ts
interface StructureModule {
  id: StructureId
  name: string
  category: string
  defaults: BoxParameters
  constraints: DimensionConstraints   // min / max / règles
  build(params: BoxParameters): StructureBlueprint
}
```

et est enregistrée dans `structures/registry.ts`. Ajouter BOX-002 = ajouter un dossier + une ligne dans le registre.

## 3. Convention géométrique

- Repère patron : origine en bas à gauche, `x` → droite, `y` → haut, face imprimée vers `+z`.
- Chaque panneau est **défini une seule fois** dans ce repère. La 2D dessine le polygone tel quel ; la 3D extrude ce même polygone de `−t` (épaisseur) vers l'intérieur puis applique la matrice de pliage.
- Les plis sont **hiérarchiques** : `M_child = M_parent × R(charnière, θ)`, où `R` est la rotation autour de la charnière exprimée dans le repère patron (le parent est plat dans ce repère par construction).
- `θ = signe(côté enfant) × targetAngle × progressÉtape`. Le signe garantit que l'enfant tourne vers `−z` (intérieur).
- `hingeInset` décale la charnière **dans** le parent de `k × t` pour empiler proprement (pattes sous le couvercle, languette contre le dos, patte de collage contre l'intérieur du devant). Sans ce décalage, les faces coplanaires se superposent (z-fighting) et les volumes s'interpénètrent.

## 4. BOX-001 — Tuck End (référence)

Boîte pliante à languettes rentrantes (« straight tuck end » : les deux languettes sont sur le panneau FRONT). BOX-002 (reverse) ne changera que la répartition des languettes.

Patron (vue face imprimée) :

```
                LID_TOP+TUCK_TOP
        ┌──────────┐ DUST  ┌──────────┐ DUST
        │ TUCK_TOP │ ┌──┐  │          │ ┌──┐
        │ LID_TOP  │ │  │  │          │ │  │
┌───────┼──────────┼─┴──┴──┼──────────┼─┴──┴─┐
│       │  FRONT   │SIDE_R │   BACK   │SIDE_L│ GLUE
│  H    │   W×H    │  D×H  │   W×H    │ D×H  │
└───────┼──────────┼─┬──┬──┼──────────┼─┬──┬─┘
        │ LID_BOT  │ │  │  │          │ │  │
        │ TUCK_BOT │ └──┘  │          │ └──┘
        └──────────┘       └──────────┘
   x :  0        W      W+D      2W+D   2W+2D  2W+2D+g
```

Hiérarchie de pliage (toutes charnières à 90°, direction `inward`) :

```
FRONT (racine)
├── SIDE_R      (charnière x = W)          stage 0
│   ├── BACK    (charnière x = W+D)        stage 0
│   │   └── SIDE_L (charnière x = 2W+D)    stage 0
│   │       └── GLUE (x = 2W+2D)  inset 1  stage 0
│   ├── DUST_TOP_R (y = haut)     inset 1  stage 1
│   └── DUST_BOT_R (y = bas)      inset 1  stage 1
├── LID_TOP     (y = haut)                 stage 3
│   └── TUCK_TOP (y = haut + D)  inset 1   stage 2
└── LID_BOT     (y = bas)                  stage 3
    └── TUCK_BOT (y = bas − D)   inset 1   stage 2
```

(`DUST_TOP_L` / `DUST_BOT_L` sont enfants de `SIDE_L`.)

### Formules (mm) — toutes marquées `PACKAGING_VALIDATION_REQUIRED` sauf mention contraire

| Élément | Formule V1 | Statut |
|---|---|---|
| Blank largeur | `2W + 2D + g` | géométrique, sûr |
| Blank hauteur | `H + 2·max(D + Lt, Ld)` | géométrique, sûr |
| Couvercle `LID` | rectangle `W × D` | sûr pour la géométrie ; l'allowance d'épaisseur réelle (`D + t`…) est à valider |
| Languette `TUCK` longueur `Lt` | `min(clamp(0.7·D, 12, 30), H − 2t − 1)` (ne peut pas dépasser la hauteur utile) | PACKAGING_VALIDATION_REQUIRED |
| Languette largeur | `W − 2·(t + 1.5)` avec coins arrondis `r = min(0.35·Lt, 8)` | PACKAGING_VALIDATION_REQUIRED (épaulements réels non modélisés) |
| Patte anti-poussière `DUST` longueur `Ld` | `min(0.7·D, W/2 − 2·t − 1)` | PACKAGING_VALIDATION_REQUIRED |
| Patte anti-poussière forme | trapèze, base `D − 2·c` avec dégagement `c = 1.5 + 2t` (évite la languette une fois pliée), sommet rétréci de 15 % par côté | PACKAGING_VALIDATION_REQUIRED |
| Patte de collage `g` | `clamp(0.12·D, 12, 20)`, trapèze chanfreiné à 45° aux extrémités | PACKAGING_VALIDATION_REQUIRED |
| Bleed | 3 mm | standard courant, à confirmer avec le prépresse SKLUBS |
| Safe zone | 3 mm à l'intérieur de chaque panneau imprimable | à confirmer |

## 5. Validation des dimensions (`engine/validation/dimensions.ts`)

- Erreurs bloquantes : hors bornes (20–600 mm en V1, `PACKAGING_VALIDATION_REQUIRED`), `NaN`, non fini, épaisseur hors 0.3–3 mm, `W/2 − 2t − 1 < 6` (pattes anti-poussière impossibles).
- Avertissements : blank > 700 × 1000 mm (format de feuille courant, à confirmer), ratio extrême (> 12:1).
- Une dimension invalide **ne casse jamais le mesh** : le moteur reçoit les derniers paramètres valides ; l'UI affiche l'erreur.

## 6. `computeBoxModel(params)`

Point d'entrée unique consommé par l'état : renvoie `{ blueprint, dieline, validation, measurements }`. Pur et déterministe → mémoïsé dans le store ; un changement de dimension recalcule tout en < 1 ms (tests de rapidité de changement inclus).
