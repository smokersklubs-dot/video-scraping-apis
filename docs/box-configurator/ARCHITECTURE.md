# SKLUBS BOX CONFIGURATOR — Architecture

> Statut : PHASE 0 (audit) terminée, PHASE 1+ en cours.
> Toutes les décisions ci-dessous s'appuient sur le code réellement présent, pas sur des hypothèses.

## 1. Résultat de l'audit (PHASE 0)

### 1.1 Ce repository (`smokersklubs-dot/video-scraping-apis`)

| Point audité | Constat |
|---|---|
| Nature | Fork de `cporter202/video-scraping-apis` : une **liste Markdown d'APIs Apify** (README de 979 liens + 2 scripts Node de génération de README). |
| Stack applicative | **Aucune.** Pas de `package.json` racine, pas de framework, pas de build. |
| React / Three.js / R3F | Absents. |
| Supabase | Absent. |
| Pricing | Absent. |
| Configurateurs SKLUBS existants | Absents. Il n'y a **rien à casser** ici. |
| Modèles 3D | Aucun (GLB / FBX / OBJ / Blender). Conforme au brief. |

Conclusion : le configurateur est construit comme une **application autonome** dans `box-configurator/`, sans toucher aux fichiers existants du repo. Elle est conçue pour être déplacée telle quelle (ou importée comme package) dans le repo SKLUBS cible plus tard.

### 1.2 Repos SKLUBS de référence (lus en lecture seule pour identifier les conventions)

| Repo | Stack | Ce qu'on en retient |
|---|---|---|
| `smokersklubs-dot/3d-visualisateur` (configurateur Mylar en prod) | Vite 7 · Three.js r183 · GSAP · vanilla ES modules · Supabase JS · Vercel | Palette et typographies SKLUBS client (`--primary #1F2A36`, `--accent #FF6A00`, `Syne` + `DM Sans`), éclairage studio, `MeshPhysicalMaterial`, pattern « session viewer » Supabase (`viewer_sessions`, bucket `textures`, vue `v_tarifs_actifs` pour les paliers de prix). **Dépend d'un GLB statique** (8,7 Mo) : c'est exactement l'architecture que le brief interdit pour les boîtes. |
| `smokersklubs-dot/sklubs-os` (OS interne) | Next.js 14 · React 18 · TypeScript strict · Tailwind · Zustand · Supabase (RLS, `user_id` auto) · Jest | Conventions TS strict, Zustand pour l'état, Supabase avec RLS systématique, module `devis`. Thème sombre interne (tokens Stitch), **différent** de l'identité client. |

Décisions dérivées :

- **React + React Three Fiber** : React est déjà la base de SKLUBS OS ; R3F donne des panneaux déclaratifs et un cycle de vie WebGL propre (dispose automatique).
- **Zustand** pour l'état central (déjà utilisé chez SKLUBS).
- **Identité visuelle client** = celle du configurateur Mylar (palette SKLUBS + Syne/DM Sans), pas le thème sombre de l'OS interne.
- **Supabase** : réutilisable plus tard (Phase 11) sur le modèle `viewer_sessions` + bucket, avec RLS. Aucune dépendance Supabase n'est introduite avant cette phase.
- **Pricing** : le pattern `v_tarifs_actifs` (paliers par quantité) inspirera le moteur de règles (Phase 10), mais les prix boîtes ne sont pas connus : aucun chiffre n'est codé.

## 2. Stack retenue

| Couche | Choix | Justification |
|---|---|---|
| Langage | TypeScript **strict** (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) | Exigence du brief. |
| Build / dev | Vite 7 | Même outil que le configurateur Mylar SKLUBS. |
| UI | React 19 | Requis par R3F 9. |
| 3D | Three.js r186 + `@react-three/fiber` 9 + `@react-three/drei` 10 | Stack recommandée par le brief. Drei utilisé uniquement pour `OrbitControls`, `Environment` (procédural, sans HDR externe), `ContactShadows`, `Html` (debug). |
| État | Zustand 5 | Convention SKLUBS OS. |
| Tests | Vitest | Tests purs Node sur le moteur, sans renderer. |
| CSS | CSS natif + tokens SKLUBS | Zéro dépendance UI supplémentaire. |

Aucune autre dépendance. Pas de Tailwind, pas de GSAP, pas de post-processing en V1.

Installation : `box-configurator/.npmrc` active `legacy-peer-deps` (contournement d'un bug npm 10.9 / Arborist « edgesOut » déclenché par les peers optionnels de Vitest 4). Sans lui, `npm install` échoue ; avec, l'arbre est identique.

## 3. Principe fondateur : le modèle 3D est une conséquence des paramètres

```
BoxParameters (mm)
      │
      ▼
STRUCTURE MODULE (ex. structures/box-001-tuck-end.ts)
      │  produit une StructureBlueprint : panneaux (polygones 2D en mm, coordonnées patron)
      │  + plis (parent → enfant, charnière, angle cible, retrait d'épaisseur, étape de pliage)
      ▼
┌──────────────────────┬──────────────────────────────┐
│ DIELINE ENGINE       │ FOLDING ENGINE               │
│ classification       │ matrices 4×4 par panneau     │
│ CUT / CREASE,        │ pour un progress ∈ [0,1]     │
│ contour, bleed,      │ (math pure, sans Three)      │
│ safe, glue → SVG     │                              │
└──────────┬───────────┴──────────────┬───────────────┘
           │                          │
           ▼                          ▼
     <DielineView/>            <BoxViewer/> (R3F)
     (SVG React)               panneaux extrudés + matrices
           │                          │
           └───── UV atlas commun ────┘  (coordonnées patron normalisées)
```

Un seul jeu de coordonnées (le patron, en mm) alimente la 2D et la 3D. Il est donc impossible que le patron et la boîte divergent.

## 4. Arborescence

```
box-configurator/
  package.json, vite.config.ts, tsconfig.json, index.html
  src/
    engine/                 # 100 % pur TypeScript, aucune dépendance Three/React
      core/
        units.ts            # mm ↔ unités scène : UNE seule fonction de conversion
        vec2.ts, mat4.ts    # utilitaires math minimaux
        polygon.ts          # aire signée, offset, chaînage de segments, arrondis
        types.ts            # BoxParameters, Panel, Fold, StructureBlueprint, …
      structures/
        registry.ts         # catalogue des structures (BOX-001, …)
        box-001-tuck-end/   # BOX-001 : définition paramétrique
      folding/
        fold-transforms.ts  # matrices par panneau selon progress
        stages.ts           # séquencement du pliage
      dieline/
        classify-edges.ts   # CUT vs CREASE
        outline.ts          # contour continu, bleed
        dieline-model.ts    # modèle de patron (calques)
        svg.ts              # sérialisation SVG (mm)
      validation/
        dimensions.ts       # min/max/avertissements/limites structurelles
      materials/            # définitions matériaux (épaisseur, couleur, roughness, commercial)
      finishes/             # définitions finitions (architecture seulement en V1)
      artwork/              # types + mapping atlas (Phase 7)
      pricing/              # moteur de règles (Phase 10), séparé de la géométrie
      box-model.ts          # computeBoxModel(params) → tout ce que l'UI consomme
    viewer/                 # React Three Fiber
      BoxViewer.tsx, scene/, meshes/, materials/, debug/
      units.ts              # mmToScene / sceneToMm (réexporte engine/core/units)
    dieline-view/           # rendu SVG React du patron + zoom/pan
    state/                  # store Zustand + sélecteurs mémoïsés
    ui/                     # panneaux de configuration, récapitulatif, layout
    styles/                 # tokens SKLUBS
  tests/                    # Vitest (engine + viewer geometry en Node)
```

## 5. Unités

- **Packaging : millimètres**, partout dans `engine/`.
- **Scène Three.js : mètres** (`1 unité = 1 m`), pour rester dans les conventions d'éclairage physique de Three.js.
- Conversion : **uniquement** `mmToScene()` / `sceneToMm()` dans `engine/core/units.ts`. Aucun `/1000` ailleurs.
- Repère patron : origine en bas à gauche du blank, `x` vers la droite, `y` vers le haut, face imprimée vers `+z`. Le SVG applique une transformation `y` inversée à la sérialisation, jamais dans le moteur.
- Repère boîte pliée : `width` sur X, `height` sur Y, `depth` sur Z, boîte centrée à l'origine à `progress = 1`.

## 6. Séparation stricte

| Couche | Peut importer | Ne peut pas importer |
|---|---|---|
| `engine/` | rien d'externe | `three`, `react`, `zustand`, DOM |
| `viewer/`, `dieline-view/` | `engine/`, `three`, R3F | `ui/` |
| `state/` | `engine/` | `viewer/` |
| `ui/` | `state/`, `viewer/`, `dieline-view/` | math CAD directe |

Le pricing (`engine/pricing`) consomme des **mesures** produites par la géométrie (surface du blank, dimensions), jamais l'inverse.

## 7. Ce qui n'est PAS fait volontairement en V1

- Pas de modèles GLB, pas de Blender.
- Une seule structure (BOX-001) tant qu'elle n'est pas validée.
- Pas de simulation physique des finitions.
- Pas de Supabase tant que la Phase 11 n'est pas ouverte.
- Aucun chiffre de prix.
