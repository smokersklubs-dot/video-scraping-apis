# DIELINE ENGINE — Patron 2D

`box-configurator/src/engine/dieline/`. Entrée : un `StructureBlueprint`. Sortie : un `DielineModel` (calques vectoriels en mm) puis un SVG.

Le dieline **n'est pas une illustration** : chaque trait est dérivé des mêmes polygones que la 3D.

## 1. Calques (concepts distincts)

| Calque | Contenu | Rendu SVG par défaut |
|---|---|---|
| `CUT` | contour extérieur continu du blank (une boucle fermée pour BOX-001) | trait plein, `#1F2A36` |
| `CREASE` | charnières de pliage (segments) | pointillés, `#1E90FF` |
| `BLEED` | contour `CUT` décalé de +3 mm vers l'extérieur | trait fin, `#FF6A00` |
| `SAFE` | chaque panneau imprimable rétréci de 3 mm | pointillés fins, `#00E676` |
| `GLUE` | polygone de la patte de collage | hachures grises |
| `PANELS` | polygones + libellés (mode debug uniquement) | texte |

## 2. Classification des bords (`classify-edges.ts`)

Pour chaque bord de chaque polygone de panneau :
1. On cherche les charnières colinéaires qui le recouvrent (test de colinéarité + projection 1D).
2. La partie recouverte devient `CREASE` (émise une seule fois, via la charnière).
3. Le reste (soustraction d'intervalles 1D) devient `CUT`.

Cela gère les cas où la base d'un rabat est plus étroite que le bord du parent (languette avec épaulement, patte anti-poussière avec dégagement) : le bord du parent est alors coupé pour partie, plié pour l'autre.

## 3. Contour continu (`outline.ts`)

Les segments `CUT` sont chaînés par extrémités (tolérance 1e-3 mm) en boucles fermées. BOX-001 doit produire **exactement une** boucle (test). Les boucles sont orientées anti-horaire.

Le `BLEED` est l'offset polygonal du contour (normales sortantes, joints en onglet avec limite → biseau). Les coins arrondis étant déjà discrétisés en polylignes, l'offset reste une polyligne.

## 4. Sérialisation SVG (`svg.ts`)

- Unités : `width="…mm" height="…mm"`, `viewBox` en mm (échelle 1:1 à l'impression).
- `y` inversé par une seule transformation `translate(0, H) scale(1, -1)` sur le groupe racine.
- Un `<g id="cut">`, `<g id="crease">`, … par calque, avec classes CSS pour recolorer.
- Marge = bleed + 5 mm.

## 5. Ce qui manque avant qu'un SVG soit un fichier de production (Phase 12)

`PACKAGING_VALIDATION_REQUIRED` :
- Allowances d'épaisseur réelles par pli (« fold factor »).
- Épaulements de languette et encoches de verrouillage.
- Dégagements de patte anti-poussière normalisés.
- Couleurs spot / calques nommés selon le prépresse SKLUBS (ex. `CutContour`, `Crease`).
- Repères de coupe, registre, informations de job.

Tant que ces points ne sont pas validés, l'export est libellé « aperçu technique — non validé pour production ».
