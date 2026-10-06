# Notes de maintenance

Ce qu'il faut savoir pour faire évoluer le site sans le casser.
Le [README](../README.md) présente le projet.

## Serveur de développement

```bash
npm run dev -- -p 3022   # 3000 et 3010 sont pris par les apps d'arabe et Muscu
```

## Tâches courantes

**Ajouter un projet** — un objet dans `content/projects.ts`, plus sa couverture
en trois tailles : `public/assets/covers/<slug>.webp` (1600×1000, pages et
fenêtres), `covers/3d/<slug>.webp` (1024×640, carrousel) et
`covers/shelf/<slug>.webp` (512×320, cadres de l'étagère). La page indexable, l'explorateur,
l'étagère, le carrousel, le menu Démarrer et le terminal suivent tout seuls.

**Modifier les textes personnels du bureau** — la phrase d'accueil, le widget
« En ce moment » et le post-it sont dans `content/site.ts` (`GREETING`, `PITCH`,
`NOW`, `STICKY_NOTE`).

**Mettre à jour le CV** — remplacer `public/assets/docs/CV-Evan-Pouteau-FR.pdf`
ou `-EN.pdf` en gardant le nom exact. Le site sert la version qui correspond à
la langue de l'interface.

**Mettre à jour une couverture ou la capture du moniteur** — remplacer le
fichier sous le même nom. Les ressources sont mises en cache un jour : un
visiteur régulier peut voir l'ancienne version jusqu'au lendemain.

## Déploiement

Le dépôt GitHub est relié au projet Vercel `zabis/evanpouteau` :

- un `git push` sur `master` met le site en production (≈ 30 s) ;
- un push sur une autre branche crée une préversion, sans toucher la production ;
- revenir à la version précédente : `npx vercel rollback --scope zabis`.

Le déploiement manuel reste possible : `npx vercel deploy --prod --yes --scope zabis`.

Les en-têtes de sécurité sont dans `next.config.ts`. `vercel.json` force le
framework Next.js (le projet Vercel a été créé à l'époque du site statique).

## Choix à ne pas défaire sans raison

- **La 3D ne bloque jamais l'accès au contenu.** Elle se saute, se souvient
  d'avoir été vue pendant la session, et n'est pas chargée du tout si le
  système demande moins d'animations ou ne sait pas faire de WebGL. Chaque
  projet existe aussi comme page classique, lisible sans WebGL.
- **Pas de `<Html>` de drei** : il crée une racine React par étiquette et
  plante sous React 19 en mode strict. Les étiquettes 3D passent par
  `components/three/projected-labels.tsx`.
- **Pas d'`<Environment>` de drei** : il embarque des chargeurs HDR inutiles.
  L'éclairage d'environnement est construit par `components/three/studio-env.tsx`.
- **Shaders compilés avant la première image** (`components/three/warmup.tsx`) :
  le `<Canvas>` reste en `frameloop="never"` pendant que `compileAsync` compile
  tout en parallèle, puis la pièce apparaît en fondu. Sans cela, la première
  image gelait la page 3 à 5 s. Pour garder ce gain :
  - toute nouvelle scène 3D passe par `useWarmup()` + `<Warmup>` ;
  - pas de `meshPhysicalMaterial` (vernis, verre) : deux fois plus long à
    compiler que `meshStandardMaterial`, pour une différence invisible ici ;
  - chaque combinaison de réglages d'un matériau (carte, rugosité, instances…)
    est un shader de plus : réutiliser les mêmes réglages quand c'est possible ;
  - mesurer avec un navigateur neuf (cache de shaders vide) : c'est ce que vit
    un visiteur qui découvre le site.
- **Ombres figées** (`StaticShadows` dans `desk-scene.tsx`) : calculées sur
  les trois premières images puis gelées. Les recalculer à chaque image
  faisait tomber la scène de 60 à 30 images/seconde sur une carte graphique
  intégrée.
- **Polices secondaires non préchargées** (`app/layout.tsx`) : la manuscrite et
  la chasse fixe ne se téléchargent que si un texte les utilise.
- **Fenêtres opaques en mode relief** : Chrome n'applique pas `backdrop-filter`
  aux éléments placés en 3D, on lirait sinon le texte des fenêtres de derrière.

## Poids mesuré (build de production)

| Parcours | Transféré |
|---|---|
| Accueil avec scène 3D | ≈ 725 Ko |
| OS + galerie 3D | ≈ 885 Ko |
| OS sans 3D | ≈ 380 Ko |
| Page projet | ≈ 325 Ko |

Fluidité mesurée sur une carte graphique Intel intégrée : 60 images/seconde
(30 sur batterie, Windows bridant alors la carte graphique).

Temps d'apparition de la pièce 3D, premier chargement, même PC :
≈ 1,8 s sur fibre, ≈ 3,7 s en 4G avec un processeur 4 fois plus lent
(simulation d'un mobile moyen). Avant le préchauffage des shaders : 4,5 s et 7,2 s.

## À compléter

- `public/assets/docs/projet-fillia-etude-ux.pdf` pèse 19 Mo ; une version
  compressée serait préférable.
