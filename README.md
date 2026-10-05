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
  screen/os-desktop.webp    Capture du bureau affichée sur le moniteur 3D
  docs/                     CV et documents de projet
legacy/                     L'ancienne version statique, gardée pour mémoire (non déployée)
```

## Tâches courantes

**Ajouter un projet** — un objet dans `content/projects.ts`, plus sa couverture
dans `public/assets/covers/<slug>.webp` (1600×1000) et sa version 3D dans
`public/assets/covers/3d/<slug>.webp` (1024×640). La page indexable, l'explorateur,
l'étagère, le carrousel, le menu Démarrer et le terminal suivent tout seuls.

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
- **Fenêtres opaques en mode relief** : Chrome n'applique pas `backdrop-filter`
  aux éléments placés en 3D, on lirait sinon le texte des fenêtres de derrière.

## Poids mesuré (build de production)

| Parcours | Transféré |
|---|---|
| Accueil avec scène 3D | ≈ 820 Ko |
| OS + galerie 3D | ≈ 710 Ko |
| OS sans 3D | ≈ 290 Ko |
| Page projet | ≈ 320 Ko |

## À compléter

- **Lobby de l'Urbex** : l'ancienne adresse InfinityFree ne répond plus depuis
  la migration vers Render. Ajouter la nouvelle adresse dans `links` du projet.
- `public/assets/docs/projet-fillia-etude-ux.pdf` pèse 19 Mo ; une version
  compressée serait préférable.
