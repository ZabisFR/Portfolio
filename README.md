# EvanOS — portfolio d'Evan Pouteau

Portfolio interactif présenté sous la forme d'un système d'exploitation :
fenêtres déplaçables et redimensionnables, barre des tâches, menu Démarrer,
terminal interactif, thèmes clair et sombre, français et anglais.

Site statique, **sans framework ni étape de build**. Ouvrir `index.html` suffit
presque ; un serveur local est nécessaire uniquement parce que le JavaScript est
découpé en modules ES.

## Démarrer

```bash
node tools/dev-server.mjs    # http://localhost:3021
```

## Structure

```
index.html          Toute la structure et le contenu français (c'est lui qui est indexé)
styles.css          Feuille unique, organisée en 18 sections numérotées
js/
  main.js           Démarrage, préférences, panneaux, explorateur, liens profonds
  wm.js             Gestionnaire de fenêtres (déplacement, ancrage, barre des tâches)
  data.js           Les projets — le seul fichier à toucher pour en ajouter un
  i18n.js           Traduction anglaise (le français vit dans index.html)
  terminal.js       Le terminal interactif et ses commandes
  bg.js             Fond animé, shader WebGL écrit à la main
  sfx.js            Sons d'interface synthétisés (désactivés par défaut)
assets/
  shots/            Captures des applications
  docs/             CV et documents de projet
tools/              Serveur local et génération du CV (non déployés)
```

## Tâches courantes

**Ajouter un projet** — un objet à copier dans `js/data.js`. L'explorateur, la
recherche, le menu Démarrer et le terminal se mettent à jour tout seuls.

**Mettre à jour le CV** — le PDF en ligne (`assets/docs/CV-Evan-Pouteau.pdf`) est
fait à la main : il suffit de remplacer le fichier. `tools/cv.html` n'est qu'un
modèle de secours ; le script de génération refuse d'écraser un CV existant sans
`--force`.

**Traduire un nouveau texte** — ajouter `data-i18n="ma.cle"` sur le nœud français
dans `index.html`, puis la clé correspondante dans `js/i18n.js`.

**Rafraîchir les captures d'écran** — les fichiers de `assets/shots/` viennent des
deux applications en production. Les reprendre en 1200×750, thème sombre, format
WebP.

## Déploiement

```bash
npx vercel --prod
```

`vercel.json` gère les en-têtes de sécurité et la mise en cache ; `.vercelignore`
exclut `tools/` et `.claude/`.

## À compléter

- `js/data.js` : les quatre projets universitaires reprennent les descriptions de
  l'ancien portfolio. Ils méritent d'être enrichis (contexte, rôle exact,
  captures).
- `assets/docs/projet-fillia-etude-ux.pdf` pèse 19 Mo. Il n'est chargé qu'à
  l'ouverture de la visionneuse, mais une version compressée serait préférable.

## Accessibilité

Navigation clavier complète (Alt+Tab, Échap, Ctrl+flèches, touche Windows),
indicateurs de focus visibles, rôles ARIA sur les fenêtres, `prefers-reduced-motion`
respecté, contenu lisible sans JavaScript via le bloc `<noscript>`.
