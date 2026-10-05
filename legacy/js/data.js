/* Données des projets.
   ---------------------------------------------------------------------------
   Pour ajouter un projet : copiez un objet, changez `id`, et c'est tout —
   l'explorateur, le menu Démarrer, la recherche et le terminal se mettent à
   jour tout seuls.

   `win`    : id d'une fenêtre déjà écrite dans index.html (études de cas).
   `detail` : contenu d'une fenêtre générée automatiquement.

   TODO Evan : les quatre projets MMI reprennent mot pour mot les descriptions
   de l'ancien portfolio. Enrichis-les (contexte, ton rôle exact, ce que tu as
   appris, captures) quand tu as cinq minutes — les blocs `detail` sont faits
   pour ça.
*/

export const PROJECTS = [
  {
    id: 'arabe',
    icon: 'i-apps',
    star: true,
    cat: 'app',
    year: '2026',
    name: 'Arabe égyptien',
    name_en: 'Egyptian Arabic',
    type: 'Application web',
    type_en: 'Web app',
    tags: ['Next.js', 'React', 'TypeScript', 'Supabase', 'PostgreSQL'],
    desc: 'Parcours complet pour apprendre le dialecte cairote : 30 modules, 141 leçons, quiz et suivi de progression.',
    desc_en: 'A full course for learning Cairene Arabic: 30 modules, 141 lessons, quizzes and progress tracking.',
    win: 'win-p-arabe'
  },
  {
    id: 'muscu',
    icon: 'i-apps',
    star: true,
    cat: 'app',
    year: '2026',
    name: 'Muscu',
    type: 'Application web',
    type_en: 'Web app',
    tags: ['Next.js', 'React', 'TypeScript', 'Supabase', 'Recharts'],
    desc: 'Carnet d’entraînement personnel : programme en base, validation série par série, minuteur et courbes de progression.',
    desc_en: 'A personal training log: database-driven program, set-by-set logging, rest timer and progress charts.',
    win: 'win-p-muscu'
  },
  {
    id: 'urbex',
    icon: 'i-folder',
    cat: 'dev',
    year: '2026',
    name: 'Lobby de l’urbex',
    type: 'Site dynamique',
    type_en: 'Dynamic website',
    tags: ['PHP', 'SQL', 'JavaScript'],
    desc: 'Plateforme dynamique de référencement de lieux d’exploration urbaine.',
    desc_en: 'A dynamic platform cataloguing urban exploration sites.',
    detail: {
      role: 'Développement', role_en: 'Development',
      ctx: 'Projet MMI', ctx_en: 'MMI coursework',
      blocks: [
        ['Le projet', 'The project', 'Une plateforme de référencement de lieux d’exploration urbaine : chaque lieu a sa fiche, les pages sont générées côté serveur et les contenus vivent dans une base de données relationnelle.'],
        ['Ce que j’y ai appris', 'What I learned', 'C’est le projet où j’ai relié pour la première fois un formulaire, une requête SQL et une page rendue — la chaîne complète d’un site dynamique, sans framework pour la masquer.']
      ],
      links: [['Ouvrir le site', 'Open the site', 'https://lobbyurbex.infinityfreeapp.com/index.php']]
    }
  },
  {
    id: 'gestuel',
    icon: 'i-play',
    cat: 'dev',
    year: '2026',
    name: 'Expérience gestuelle',
    name_en: 'Gestural experiment',
    type: 'Expérimentation',
    type_en: 'Experiment',
    tags: ['MediaPipe', 'Canvas API', 'JavaScript'],
    desc: 'Manipulation d’une interface par le mouvement de la main, directement dans le navigateur.',
    desc_en: 'Driving an interface with hand movement, straight from the browser.',
    detail: {
      role: 'Conception et développement', role_en: 'Design and development',
      ctx: 'Expérimentation personnelle', ctx_en: 'Personal experiment',
      blocks: [
        ['Le projet', 'The project', 'Une page qui suit la main par la webcam avec MediaPipe et laisse manipuler des éléments dessinés au Canvas — sans capteur, sans installation, dans un onglet.'],
        ['Pourquoi', 'Why', 'Pour voir jusqu’où va une interface sans clic ni clavier, et ce que ça coûte en confort réel. La réponse courte : c’est impressionnant trente secondes et fatigant au bout de deux minutes — ce qui est en soi un résultat intéressant.']
      ],
      note: 'L’expérience demande l’accès à la webcam. Rien n’est enregistré ni envoyé : tout le traitement se fait dans le navigateur.',
      note_en: 'The experiment needs webcam access. Nothing is recorded or sent: everything runs in the browser.',
      links: [['Lancer l’expérience', 'Launch the experiment', '/gestural-lab/']]
    }
  },
  {
    id: 'portfolio',
    icon: 'i-terminal',
    cat: 'dev',
    year: '2026',
    name: 'EvanOS',
    type: 'Portfolio',
    type_en: 'Portfolio',
    tags: ['JavaScript', 'WebGL', 'CSS', 'Accessibilité'],
    desc: 'Le site que vous êtes en train de lire : un bureau complet en JavaScript, sans framework.',
    desc_en: 'The site you are reading: a full desktop environment in JavaScript, no framework.',
    detail: {
      role: 'Conception et développement', role_en: 'Design and development',
      ctx: 'Projet personnel', ctx_en: 'Personal project',
      blocks: [
        ['Le projet', 'The project', 'Un gestionnaire de fenêtres écrit à la main : déplacement, redimensionnement, ancrage sur les bords, barre des tâches, menu Démarrer, paramètres rapides et terminal interactif. Aucun framework, aucune étape de build — trois fichiers JavaScript et une feuille de style.'],
        ['Le point technique', 'The technical bit', 'Le fond animé est un shader WebGL écrit directement en GLSL. L’ancienne version chargeait Three.js — environ 600 Ko — pour afficher un seul rectangle : le remplacer par du WebGL brut a supprimé la totalité de cette dépendance.'],
        ['Accessibilité', 'Accessibility', 'Chaque fenêtre est un dialogue étiqueté, chaque icône un vrai bouton, le focus reste visible au clavier, et les animations se coupent si le système le demande. Alt+Tab, Échap et la touche Windows fonctionnent comme attendu.']
      ],
      links: [['Voir les raccourcis clavier', 'See keyboard shortcuts', '#shortcuts']]
    }
  },
  {
    id: 'crozatier',
    icon: 'i-grid',
    cat: 'design',
    year: '2026',
    name: 'Musée Crozatier',
    type: 'Identité visuelle',
    type_en: 'Visual identity',
    tags: ['Illustrator', 'InDesign', 'Charte graphique'],
    desc: 'Modernisation de l’image du musée : charte graphique et logo, en équipe.',
    desc_en: 'Refreshing the museum’s image: brand guidelines and logo, as a team.',
    detail: {
      role: 'Direction artistique, en équipe', role_en: 'Art direction, team project',
      ctx: 'Projet MMI', ctx_en: 'MMI coursework',
      blocks: [
        ['Le projet', 'The project', 'Modernisation de l’image du musée Crozatier : création de la charte graphique et du logo, puis déclinaison sur une affiche A3.'],
        ['Mon rôle', 'My role', 'Travail d’équipe. J’ai participé à la recherche graphique, à la construction de la charte et à la mise en page finale sous InDesign.']
      ],
      links: [['Voir l’affiche A3', 'View the A3 poster', 'view:image:/assets/docs/crozatier-affiche-a3.webp']]
    }
  },
  {
    id: 'fillia',
    icon: 'i-user',
    cat: 'ux',
    year: '2026',
    name: 'Projet Fillia',
    type: 'Étude UX',
    type_en: 'UX research',
    tags: ['UX', 'Entretiens', 'Recherche utilisateur'],
    desc: 'Étude UX d’une application de soin de la peau assistée par IA, avec entretiens sur le terrain.',
    desc_en: 'UX study of an AI-assisted skincare app, with field interviews.',
    detail: {
      role: 'Recherche utilisateur', role_en: 'User research',
      ctx: 'Projet MMI', ctx_en: 'MMI coursework',
      blocks: [
        ['Le projet', 'The project', 'Évaluer une application de soin de la peau assistée par IA du point de vue de ses utilisatrices et utilisateurs, plutôt que de ses fonctionnalités.'],
        ['La méthode', 'The method', 'Entretiens menés sur le terrain, puis synthèse des résultats dans un rapport écrit. Aller parler aux gens plutôt que supposer à leur place : c’est la partie du BUT MMI qui a le plus changé ma façon de concevoir une interface.']
      ],
      links: [['Lire le rapport', 'Read the report', 'view:pdf:/assets/docs/projet-fillia-etude-ux.pdf']]
    }
  },
  {
    id: 'fracture',
    icon: 'i-play',
    cat: 'game',
    year: '2026',
    name: 'FRACTURE',
    type: 'Game design document',
    type_en: 'Game design document',
    tags: ['Game design', 'Narration', 'Arborescence'],
    desc: 'Document de game design narratif inspiré de Detroit: Become Human — mécaniques et arborescence de choix.',
    desc_en: 'A narrative game design document inspired by Detroit: Become Human — mechanics and choice tree.',
    detail: {
      role: 'Game design et écriture', role_en: 'Game design and writing',
      ctx: 'Projet MMI', ctx_en: 'MMI coursework',
      blocks: [
        ['Le projet', 'The project', 'Un document de game design complet pour un jeu narratif à embranchements, inspiré de Detroit: Become Human : univers, mécaniques et arborescence des choix.'],
        ['Ce qui était dur', 'The hard part', 'Tenir une arborescence lisible. Chaque choix double le nombre de branches, et un document de game design ne sert à rien si l’équipe qui le lit s’y perd.']
      ],
      links: [['Ouvrir le document', 'Open the document', 'view:pdf:/assets/docs/fracture-gdd.pdf']]
    }
  }
];

export const CATS = {
  all: { fr: 'Tous les projets', en: 'All projects' },
  app: { fr: 'Applications web', en: 'Web apps' },
  dev: { fr: 'Développement', en: 'Development' },
  design: { fr: 'Design graphique', en: 'Graphic design' },
  ux: { fr: 'UX & recherche', en: 'UX & research' },
  game: { fr: 'Game design', en: 'Game design' }
};

/* Compétences, affichées par le terminal. */
export const SKILLS = [
  ['DÉVELOPPEMENT WEB', 'WEB DEVELOPMENT', [
    ['HTML / CSS', 'Avancé', 'Advanced'],
    ['JavaScript', 'Avancé', 'Advanced'],
    ['React / Next.js', 'Intermédiaire', 'Intermediate'],
    ['TypeScript', 'Intermédiaire', 'Intermediate'],
    ['Tailwind CSS', 'Intermédiaire', 'Intermediate'],
    ['PHP', 'Notions', 'Basics'],
    ['Python', 'Intermédiaire', 'Intermediate'],
    ['C++', 'Notions', 'Basics']
  ]],
  ['DONNÉES & OUTILS', 'DATA & TOOLING', [
    ['PostgreSQL / SQL', 'Intermédiaire', 'Intermediate'],
    ['Supabase (Auth, RLS)', 'Intermédiaire', 'Intermediate'],
    ['Git', 'Intermédiaire', 'Intermediate'],
    ['Vercel', 'Intermédiaire', 'Intermediate'],
    ['WebGL / GLSL', 'Notions', 'Basics']
  ]],
  ['DESIGN', 'DESIGN', [
    ['Adobe Photoshop', 'Intermédiaire', 'Intermediate'],
    ['Adobe Illustrator', 'Intermédiaire', 'Intermediate'],
    ['Adobe InDesign', 'Intermédiaire', 'Intermediate'],
    ['UX / recherche utilisateur', 'Intermédiaire', 'Intermediate']
  ]],
  ['LANGUES', 'LANGUAGES', [
    ['Français', 'Langue maternelle (C2)', 'Native (C2)'],
    ['Anglais', 'B1', 'B1'],
    ['Arabe égyptien', 'En cours d’apprentissage', 'Currently learning']
  ]]
];
