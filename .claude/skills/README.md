# Chaîne cinéma — quatre skills, un pipeline

Quatre skills installés ici couvrent la chaîne complète, de l'idée publicitaire
au plan final. Ils se recouvrent partiellement : cette page dit **lequel prend
la main à quel moment**, pour qu'ils ne se marchent pas dessus.

```
IDÉE ──────────► DIRECTION ─────────► BLOCAGE 3D ────────► PROMPT MODÈLE
creative-director  cinematic-director   blender-previz      video / image
Big Idea, insight  découpage, blocking  caméra verrouillée  syntaxe exacte
concept de pub     lumière, continuité  passes de contrôle  Seedance / Kling / Veo
```

## Qui fait quoi

| Skill | Prend la main quand | Livre |
|---|---|---|
| **creative-director** | Pas encore de script. « Trouve-moi un concept », brief client, campagne, activation | Big Idea notée sur 6 critères, calibrée Cannes / D&AD, contre une base de 569 campagnes |
| **cinematic-director** | Un script ou une scène existe | Beat sheet, director's book, blocking, shot list avec fonction / focale / angle / mouvement, bible de continuité, QC. 20 grilles de réalisateurs en surcouche optionnelle |
| **blender-previz** | Le découpage est arrêté, il faut verrouiller la caméra et le timing | Blockout gris animé + passes `clay` / `depth` / `edge` / `normal` / `mask` |
| **video** | Il faut le prompt final pour un modèle vidéo | Syntaxe native Seedance 1.0-2.5, Kling 1.6-Omni, Veo 3-3.1, avec dramaturgie Murch en amont |
| **image** | Keyframes, planches perso, storyboard, still produit | Prompts Nano Banana 2 / GPT Image 2, continuité de personnage |

## L'ordre qui marche

1. **creative-director** → le concept. Sauter cette étape donne de beaux plans qui ne racontent rien.
2. **cinematic-director** → le découpage. C'est ici que se décide la focale, la
   taille de plan et le blocking. « Une fonction avant une taille : si tu ne
   peux pas nommer la fonction du plan, tu n'as pas de plan. »
3. **blender-previz** → le blockout. Le découpage devient des mètres et des
   keyframes. C'est ce qui rend deux plans raccordables.
4. **video** → le prompt, avec la piste `clay` en référence de structure.
   `references/seedance-25.md` documente le pipeline blockout côté ByteDance
   (formule officielle, système de 50 références, marqueurs de dialogue).

Les étapes 3 et 4 se répondent : le blockout dit la géométrie, le prompt dit la
matière. Ne jamais redire dans le prompt ce que le gris montre déjà.

## Publicité vs film

- **Publicité** : `creative-director` porte l'essentiel du travail. Le produit
  doit être lisible en 3 secondes — c'est une contrainte de cadrage, donc de
  `cinematic-director`, pas de prompt.
- **Film / narratif** : `cinematic-director` porte l'essentiel.
  `creative-director` ne sert que si le point de départ est un concept à trouver.

## Mise à jour

```bash
scripts/update-cinema-skills.sh
```

## Attribution

Ces skills sont des travaux tiers, redistribués ici avec leurs licences.

| Skill | Auteur | Source | Licence |
|---|---|---|---|
| `cinematic-director` | wangzhang-wu | [wuwangzhang1216/DirectorSKILL](https://github.com/wuwangzhang1216/DirectorSKILL) | MIT |
| `video`, `image` | Serge Shima | [smixs/visual-skills](https://github.com/smixs/visual-skills) | CC BY 4.0 |
| `creative-director` | Serge Shima | [smixs/creative-director-skill](https://github.com/smixs/creative-director-skill) | CC BY 4.0 |
| `blender-previz` | ce dépôt | `blender-previz/` | — |

CC BY 4.0 autorise l'usage commercial ; l'attribution ci-dessus doit être
conservée.
