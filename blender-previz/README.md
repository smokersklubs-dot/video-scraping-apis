# blender-previz — blockouts Blender pilotés par IA pour la vidéo générative

Chaîne complète pour reproduire le workflow de la vidéo de référence : un
**blockout gris animé dans Blender** qui sert de **piste de contrôle** à un
modèle vidéo IA, lequel n'invente que la matière, la lumière et le grain.

Tout tourne **sans interface graphique** (`bpy` en module Python), donc un
agent — Claude Code, Codex — peut construire, rendre et itérer seul.

---

## 1. Ce que fait vraiment la vidéo de référence

La capture montre deux fenêtres côte à côte : en haut un viewport Blender en
gris mat (pas une texture, pas un matériau), en bas le plan final
photoréaliste. Ce n'est pas « une IA qui génère de la 3D ». C'est l'inverse :

> **La 3D est l'entrée, pas la sortie.**

Le modèle vidéo reçoit le rendu gris et une consigne texte. Il conserve la
géométrie, le cadrage, le mouvement de caméra et les silhouettes ; il remplace
la surface. C'est ce qu'on appelle **render-to-video (R2V)** ou
*structure-conditioned generation*.

Pourquoi c'est ce qui distingue une vidéo IA « haut de gamme » d'un rendu
générique :

| Problème du texte-vers-vidéo pur | Ce que le blockout règle |
|---|---|
| Le cadrage change à chaque génération | La caméra est en millimètres et en mètres, identique à chaque relance |
| Impossible d'enchaîner deux plans cohérents | Le décor 3D est le même, on déplace la caméra |
| Les objets dérivent, apparaissent, disparaissent | L'occlusion et la parallaxe sont géométriquement exactes |
| Le timing est approximatif | Le pas, la vitesse, la durée sont des keyframes |
| Impossible de corriger un détail | On corrige le blockout et on relance à l'identique |

La 3D coûte la moitié du travail et achète la **répétabilité**. C'est la seule
chose que les modèles vidéo ne savent toujours pas fournir.

---

## 2. Comment brancher Claude / Codex sur Blender

Trois approches existent. Elles ne se valent pas.

### A. Blender MCP — l'agent pilote Blender en direct

[`ahujasid/blender-mcp`](https://github.com/ahujasid/blender-mcp) expose une
session Blender ouverte à l'agent : il lit la scène, crée de la géométrie,
exécute du Python dedans.

```bash
claude mcp add blender -- uvx blender-mcp
```

- ✅ Excellent pour explorer, corriger « à la voix », inspecter une scène existante.
- ❌ Nécessite Blender ouvert sur ta machine, l'état vit dans le `.blend`, rien
  n'est reproductible ni versionnable. Une session perdue = travail perdu.

**À utiliser pour :** le prototypage et le débogage d'une scène.

### B. `bpy` headless scripté — **l'approche recommandée, celle de ce dépôt**

Blender s'installe comme une simple dépendance Python :

```bash
pip install bpy==5.0.1        # ~1 Go, embarque tout Blender
```

L'agent n'écrit alors plus « des clics », il écrit **un fichier de plan JSON**.
La scène, le rendu et les passes de contrôle en découlent de façon déterministe.

- ✅ Reproductible, versionnable dans git, diffable, exécutable en CI ou sur un
  serveur sans écran.
- ✅ L'agent itère seul : il rend, **regarde l'image**, corrige, relance.
- ✅ Un plan = un fichier de 40 lignes qu'on peut décliner en 20 plans.
- ❌ La bibliothèque de formes est la tienne : pas de sculpture organique.

**À utiliser pour :** la production. C'est ce que ce dépôt implémente.

### C. Add-ons « previz copilot » (Higgsfield et similaires)

Des add-ons de blockout par prompt sont apparus mi-2026 (démo Higgsfield du
25 août 2026 : prompt → blockout, description → mouvement de caméra).

- ✅ Très rapide pour dégrossir.
- ❌ Boîte noire, non versionnable, dépendant d'un service tiers.

**À utiliser pour :** générer un premier jet à réimporter, jamais comme source
de vérité.

> **Recommandation.** B en socle de production, A pour le débogage interactif,
> C en appoint. Ce dépôt te donne B tout de suite.

---

## 3. Le pipeline en cinq étapes

```
1. SPEC        shots/mon_plan.json      décor, acteurs, caméra, prompt
2. BLOCKOUT    python -m previz ...     bpy construit la scène et l'anime
3. PASSES      clay / depth / edge …    les signaux de contrôle
4. R2V         modèle vidéo             la matière, la lumière, le grain
5. MONTAGE     étalonnage, son          la finition
```

Les étapes 1 à 3 sont automatisées ici. L'étape 4 dépend du modèle choisi
(§6). L'étape 5 reste du montage classique.

---

## 4. Utilisation

```bash
pip install -r requirements.txt

# Rendu du plan de démonstration (reproduit la vidéo de référence)
python -m previz shots/minimart_delivery.json --out out

# Itération rapide pendant qu'on règle le cadrage
python -m previz shots/minimart_delivery.json --res 480x270 --frames 3 --no-video

# Une passe précise, en pleine définition
python -m previz shots/minimart_delivery.json --passes clay --res 1920x1080

# Ouvrir le résultat dans Blender pour retoucher à la main
python -m previz shots/minimart_delivery.json --frames 1 --save-blend
```

Sortie dans `out/<shot_id>/` : une image par frame et par passe, un `.mp4` par
passe, et `<shot_id>_brief.md` — le prompt prêt à coller dans le modèle vidéo.

> Sur une machine sans GPU, exporte `LIBGL_ALWAYS_SOFTWARE=1` avant de lancer.

---

## 5. Le format de plan (`shots/*.json`)

```jsonc
{
  "shot_id": "minimart_delivery",
  "duration_s": 5.0, "fps": 24, "resolution": [1280, 720],
  "sun_elevation": 28, "sun_rotation": 145,   // degrés — pilote l'angle des ombres

  "props": [
    { "type": "storefront", "name": "minimart", "loc": [1, 6.5, 0], "rot_z": 0,
      "params": { "size": [17, 9, 4.2], "bays": 5, "sign": true } }
  ],

  "actors": [
    { "name": "worker", "height": 1.78, "anim": "push", "step_length": 0.78,
      "carries": "cart",
      "path": [[-6, 1.3, 1], [-1.5, 1.3, 55], [3.4, 1.3, 120]] }
  ],

  "camera": {
    "lens": 35, "loc": [-4, -6.2, 1.62], "look_at": [-4.6, 1.4, 1.15],
    "move": "dolly_side", "move_amount": 8.6,
    "track": "worker", "shake": 0.45, "dof_target": "worker", "fstop": 2.8
  },

  "passes": ["clay", "depth", "edge"],
  "prompt": { "subject": "...", "setting": "...", "action": "...",
              "lighting": "...", "style": "...", "grade": "...", "negative": "..." }
}
```

**Unités : mètres, degrés, millimètres de focale, numéros de frame.** Un
personnage fait 1,75 m, une porte 2,1 m, une voiture 4,8 m. Respecter l'échelle
réelle n'est pas du zèle : c'est ce qui produit une perspective que le modèle
vidéo lit correctement.

**Props disponibles** (`previz/library.py`) : `ground`, `storefront`, `sedan`,
`pallet_stack`, `shelf_row`, `wall`, `crate`, `pole`, `box`. En ajouter un = une
fonction qui empile des primitives, plus une entrée dans `BUILDERS`.

**Chemin d'acteur** : `[x, y, frame]`. La phase du cycle de marche est calculée
à partir de la **distance parcourue**, donc les pieds ne patinent jamais, quelle
que soit la vitesse.

**Mouvements de caméra** : `static`, `dolly_in`, `push_out`, `dolly_side`,
`orbit`, `crane`. `shake` de 0 (pied fixe) à 1 (épaule nerveuse). `track` garde
un acteur cadré, `dof_target` fait le point dessus.

---

## 6. Les passes, et qui les consomme

| Passe | Contenu | Destination |
|---|---|---|
| `clay` | Gris studio, ombres portées | **La piste de référence principale** pour un modèle R2V hébergé |
| `depth` | Profondeur normalisée, proche = blanc | ControlNet-Depth / VACE — la contrainte 3D la plus forte |
| `normal` | Normales **en espace caméra** | Garde les surfaces planes planes sous restylage lourd |
| `edge` | Lignes Freestyle blanches sur noir | Équivalent Canny — verrouille les silhouettes dures |
| `mask` | Un niveau de gris par acteur | Retouche localisée, inpainting régional |

En pratique : **`clay` pour les modèles hébergés**, **`depth` + `edge` pour une
chaîne ComfyUI locale**. `normal` et `mask` sont des renforts.

Le `depth` calibre automatiquement sa rampe sur les limites du décor (le sol
infini est exclu) ; `depth_near` / `depth_far` dans le spec permettent de forcer
les valeurs en mètres.

---

## 7. Étape 4 — le modèle vidéo

Deux familles, à choisir selon le curseur contrôle / confort.

### Hébergé (rapide, le plus haut de gamme aujourd'hui)

| Modèle | Ce qu'il apporte |
|---|---|
| **Seedance 2.x** (Dreamina, aussi via l'API Runway) | Le workflow R2V le plus direct : on charge le rendu gris comme référence multimodale, il conserve trajectoire caméra et composition |
| **Runway Aleph 2.0** | Édition *in-context* d'une vidéo existante par prompt — idéal pour repasser sur un plan déjà généré |
| **Kling 3.x / Veo / Hailuo** | Bons en video-to-video, contrôle de structure plus lâche |

Envoie la vidéo `clay`, le prompt, et surtout la consigne de structure :

> *Use the attached video as the structural reference. Preserve its camera path,
> framing, subject placement, timing and silhouettes exactly. Replace only
> surface: materials, texture, lighting quality and colour.*

Cette phrase est générée automatiquement dans `<shot_id>_brief.md`.

### Local (ComfyUI — contrôle maximal, coût nul, matériel exigeant)

Chaîne **Wan 2.x + VACE**, ou tout modèle vidéo acceptant des ControlNets :

```
depth.mp4  ──► ControlNet-Depth  ┐
edge.mp4   ──► ControlNet-Canny  ├──► modèle vidéo ──► plan final
prompt     ──────────────────────┘
mask.mp4   ──► retouche régionale
```

Poids de contrôle utiles au départ : depth 0,75 — canny 0,45. Au-delà, le rendu
reste « en carton » ; en-dessous, la géométrie décroche.

> Les modèles vidéo évoluent vite. Vérifie la disponibilité et les tarifs
> courants avant de t'engager sur un plan long.

---

## 8. Règles de prompt R2V

Le blockout **énonce déjà** la géométrie, le mouvement et le cadrage. Les
répéter en mots pousse le modèle à les réinterpréter — donc à les casser.

- ✅ Décris **la matière** : vêtement, âge, météo, heure, pellicule, étalonnage.
- ❌ Ne décris pas ce que la 3D dit déjà : « il marche de gauche à droite »,
  « la caméra suit ». C'est dans les pixels.
- ✅ Un seul plan par prompt. `no cuts` en négatif.
- ✅ Garde le bloc `style` + `grade` **identique sur tous les plans d'une
  séquence** — c'est ce qui fait tenir la continuité visuelle.

`previz/prompt.py` applique ces règles et assemble le prompt depuis le spec.

---

## 9. Cohérence sur plusieurs plans

C'est là que se joue le « haut de gamme », et c'est là que le tout-texte échoue.

1. **Un décor, plusieurs caméras.** Duplique le JSON, ne change que le bloc
   `camera`. Le décor et les acteurs restent au mètre près.
2. **Bloc de style figé.** Même `style` et `grade` partout.
3. **Soleil verrouillé.** `sun_elevation` / `sun_rotation` identiques : les
   ombres tombent dans le même sens, l'œil lit la même heure.
4. **Chaînage par image.** Prends la dernière frame du plan N comme image de
   référence du plan N+1 quand le modèle l'accepte.
5. **Franchis la ligne des 180° sciemment** — en 3D, c'est visible avant de
   générer.

---

## 10. Limites connues

- La bibliothèque produit des volumes durs. Pour de l'organique (visage,
  tissu, cheveux), importer un mesh externe reste nécessaire.
- Le cycle de marche est procédural et lisible, pas du mocap : il porte le
  timing et la silhouette, pas le jeu d'acteur.
- Freestyle coûte cher en temps de rendu : garde `edge` pour la passe finale.
- `normal` est converti en espace caméra par un handler de frame ; si tu rends
  la passe depuis un autre script, cette conversion n'est pas appliquée.

---

## Structure

```
blender-previz/
├── previz/
│   ├── spec.py       contrat JSON (dataclasses)
│   ├── library.py    primitives grises : décor et props
│   ├── actors.py     mannequins articulés + cycles de marche
│   ├── camera.py     focale, mouvements, caméra portée, mise au point
│   ├── build.py      assemblage de la scène
│   ├── render.py     passes de contrôle + encodage mp4
│   ├── prompt.py     génération du prompt et du brief R2V
│   ├── bcompat.py    compatibilité API Blender 4.x / 5.x
│   └── cli.py        interface en ligne de commande
├── shots/            plans versionnés
└── out/              rendus (ignoré par git)
```
