# EvanOS — portfolio d'Evan Pouteau

Un bureau en 3D : la caméra part d'une pièce vue de loin, plonge dans l'écran
du moniteur, et l'on se retrouve dans un système d'exploitation complet —
fenêtres en relief, barre des tâches, menu Démarrer, terminal, et une galerie
où l'on choisit un projet dans un carrousel 3D.

**Stack** : Next.js 16 (App Router) · React 19 · TypeScript · Three.js via
React Three Fiber et drei. Tout le mobilier 3D est généré par du code : aucun
modèle importé.

## Démarrer

```bash
npm install
npm run dev -- -p 3022   # http://localhost:3022 (3000 et 3010 sont pris par l'app d'arabe et Muscu)
npm run build      # build de production
npm run lint       # vérification des types
```

## Structure

```
app/
  page.tsx                  Accueil : scène 3D puis OS (entièrement statique)
  projets/[slug]/page.tsx   Une page indexable par projet — c'est elle que Google référence
  mentions-legales/         Mentions légales, confidentialité, crédits
  sitemap.ts, robots.ts, manifest.ts
content/
  projects.ts               LES PROJETS — le seul fichier à toucher pour en ajouter un
  site.ts                   Profil : formation, expériences, compétences, CV
components/
  home.tsx                  Orchestration scène 3D ⇄ OS
  os/                       Le système : gestionnaire de fenêtres, fenêtres, terminal, galerie
  three/                    Les scènes : bureau, étagères, carrousel, matières procédurales
public/assets/
  covers/                   Couverture 1600×1000 de chaque projet (+ covers/3d/ en 1024 px)
  shots/                    Captures d'écran des applications
  screen/os-desktop.webp    Capture du bureau affichée sur le moniteur 3D (à refaire si le bureau change)
  wallpaper/leaves.svg      Feuillage du fond d'écran (généré par tools/build-wallpaper.mjs)
  docs/                     CV et documents de projet
legacy/                     L'ancienne version statique, gardée pour mémoire (non déployée)
```

## Tâches courantes

**Ajouter un projet** — un objet dans `content/projects.ts`, plus sa couverture
dans `public/assets/covers/<slug>.webp` (1600×1000) et sa version 3D dans
`public/assets/covers/3d/<slug>.webp` (1024×640). La page indexable, l'explorateur,
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

```bash
npx vercel --scope zabis          # preview, ne touche pas la production
npx vercel --prod --scope zabis   # production
```

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
