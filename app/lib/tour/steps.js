// Visite guidée interactive : UNE source pour la visite complète et les mini-visites de chaque page.
// Chaque étape désigne un VRAI élément de l'écran (target : sélecteur, ou liste de sélecteurs essayés dans l'ordre) :
// - kind 'center'  : carte au milieu de l'écran (pas d'élément visé) ;
// - kind 'travel'  : le guide clique lui-même le menu (via) pour emmener le joueur sur la page (to) ;
// - action         : étape ACTIVE : le guide attend une vraie action du joueur (done : event / click / appears) avant de continuer ;
// - optional       : si l'élément n'existe pas ou est caché, l'étape est sautée sans bloquer ;
// - prepare        : un clic inoffensif (changer d'onglet) pour rendre l'élément visible.
// Règles de rédaction : français simple, aucun emoji, aucun symbole d'euro, aucun nombre écrit en dur ; une étape ne demande JAMAIS une action qui coûte des pièces,
// et dit clairement quand une action avance le temps (irréversible, gratuit). Les identifiants sont comparés par un test à backend/src/config/guideRules.ts.

export const TOUR_STEPS = [
  // ── Tableau de bord ───────────────────────────────────────────────────────────
  { id: 'welcome', section: 'dashboard', kind: 'center', title: 'Bienvenue sur InvestKit',
    text: 'Un jeu pour apprendre à investir, avec des InvestCoins : 1 InvestCoin vaut 1 euro de jeu, sans aucune valeur réelle. Je te fais faire le tour du site en le pratiquant, en quelques minutes. Tu peux quitter quand tu veux et reprendre plus tard.' },
  { id: 'dash-patrimoine', section: 'dashboard', page: '/dashboard', target: ['[data-tour="dash-patrimoine"]', '[data-tour="dash-hero"]'], placement: 'bottom',
    title: 'Ton patrimoine', text: 'Tout ce que tu possèdes, converti en InvestCoins : liquidités, placements, immobilier, moins tes dettes.' },
  { id: 'dash-liquidites', section: 'dashboard', page: '/dashboard', target: '[data-tour="coins-balance"]', placement: 'bottom', optional: true,
    title: 'Tes liquidités', text: 'Ton solde de pièces, toujours visible en haut de l\'écran. C\'est avec lui que tu achètes.' },
  { id: 'dash-recompense', section: 'dashboard', page: '/dashboard', target: '[data-tour="reward-btn"]', placement: 'bottom', optional: true,
    title: 'Ta récompense du jour', text: 'Ce bouton cadeau te donne une petite récompense chaque jour où tu viens, sans série à protéger : si tu t\'absentes, tu ne perds rien. Je ne le clique pas à ta place.' },
  { id: 'dash-prochaine', section: 'dashboard', page: '/dashboard', target: '[data-tour="dash-next-step"]', placement: 'top', optional: true,
    title: 'Ta prochaine étape', text: 'Cette carte te propose les premiers pas à faire. Chaque étape réussie peut te rapporter des pièces.' },

  // ── Bourse et PEA ────────────────────────────────────────────────────────────
  { id: 'go-bourse', section: 'bourse', kind: 'travel', via: '[data-tour="nav-bourse"]', to: '/bourse', title: 'Direction : Bourse et PEA', text: 'Je clique sur « Bourse et PEA » dans le menu pour t\'y emmener.' },
  { id: 'bourse-temps', section: 'bourse', page: '/bourse', target: '[data-testid="advance-year"]', placement: 'bottom', mini: 'bourse',
    title: 'Faire avancer le temps', text: 'Ce bouton avance le temps d\'un an. Attention : il avance l\'horloge de tout le jeu (Bourse, Crypto et Immobilier ensemble), on ne revient jamais en arrière, mais ça ne coûte aucune pièce. Je ne le clique pas pour toi.' },
  { id: 'bourse-apercu', section: 'bourse', page: '/bourse', target: '[data-testid="preview-buy"]', placement: 'top', optional: true, mini: 'bourse',
    title: 'Voir le coût avant d\'acheter', text: 'Choisis un titre et une quantité, puis « Voir le coût » : tu vois le prix, les frais et le total sans rien dépenser. L\'achat n\'a lieu que si tu le confirmes.' },
  { id: 'bourse-onglets', section: 'bourse', page: '/bourse', target: '[role="tablist"][aria-label="Sections de la Bourse"]', placement: 'bottom', mini: 'bourse',
    title: 'Marché, portefeuille, ordres, classement', text: 'Retrouve ici tes positions, tes ordres passés et ton classement dans ce domaine.' },

  // ── Crypto ───────────────────────────────────────────────────────────────────
  { id: 'go-crypto', section: 'crypto', kind: 'travel', via: '[data-tour="nav-crypto"]', to: '/crypto', title: 'Direction : Crypto', text: 'Je clique sur « Crypto » dans le menu.' },
  { id: 'crypto-depart', section: 'crypto', page: '/crypto', target: '[data-tour="crypto-start"]', placement: 'top', optional: true,
    action: { done: { appears: '[data-testid="sim-date"]' }, hint: 'Clique sur « Démarrer à cette date » pour continuer.' },
    title: 'Choisis ta date de départ', text: 'Une seule fois pour tout le jeu : à partir de ce jour, tu verras l\'histoire du marché défiler, jamais plus loin. Clique sur « Démarrer à cette date » quand tu es prêt.' },
  { id: 'crypto-date', section: 'crypto', page: '/crypto', target: ['[data-tour="crypto-clock"]', '[data-testid="sim-date"]'], placement: 'bottom', mini: 'crypto',
    title: 'Ta date de jeu', text: 'C\'est LA date du jeu : une seule horloge pour tous les domaines. Le site ne te montre jamais ce qui se passe après.' },
  { id: 'crypto-semaine', section: 'crypto', page: '/crypto', target: '[data-testid="adv-week"]', placement: 'bottom', optional: true, mini: 'crypto',
    action: { done: { event: 'ik:clock-advanced' }, hint: 'Clique sur « +1 semaine » pour continuer.', success: 'Bien joué : une semaine a passé.' },
    title: 'Avance d\'une semaine', text: 'Clique sur « +1 semaine ». Ça fait avancer le temps de sept jours pour tout le jeu (on ne revient pas en arrière), mais ça ne coûte aucune pièce. Les boutons +1 jour et +1 mois font pareil.' },
  { id: 'crypto-modes', section: 'crypto', page: '/crypto', kind: 'center',
    title: 'Les trois modes de jeu', text: 'Histoire est ouvert aujourd\'hui : tu rejoues le passé à ton rythme. Le Bac à sable (s\'entraîner sans enjeu) et le mode En ligne (jouer au présent, réservé au plan Pro) arrivent plus tard.' },
  { id: 'crypto-fiche', section: 'crypto', page: '/crypto', target: ['[data-testid="row-BTC"]', '[data-testid^="row-"]'], placement: 'bottom', optional: true, mini: 'crypto',
    action: { done: { appears: '[data-tour="asset-sheet"]' }, hint: 'Clique sur la ligne de Bitcoin pour ouvrir sa fiche.' },
    title: 'Ouvre la fiche Bitcoin', text: 'Clique sur la ligne de Bitcoin (ou d\'un autre actif) pour ouvrir sa fiche : graphique, prix, risque. Ça ne coûte rien.' },
  { id: 'crypto-achat', section: 'crypto', page: '/crypto', target: '[data-tour="order-ticket"]', placement: 'top', optional: true, mini: 'crypto',
    title: 'Ton premier achat', text: 'C\'est ici que tu passes un ordre. Acheter dépense de vraies pièces du jeu : je ne le ferai jamais à ta place. Ton premier investissement te rapporte même un petit bonus.' },

  // ── Immobilier ───────────────────────────────────────────────────────────────
  { id: 'go-immobilier', section: 'immobilier', kind: 'travel', via: '[data-tour="nav-immobilier"]', to: '/immobilier', title: 'Direction : Immobilier', text: 'Je clique sur « Immobilier » dans le menu.' },
  { id: 'immo-depart', section: 'immobilier', page: '/immobilier', target: '[data-tour="immo-start"]', placement: 'top', optional: true, mini: 'immobilier',
    action: { done: { appears: '[data-tour="immo-advance"]' }, hint: 'Choisis ton profil pour continuer.' },
    title: 'Choisis ton profil', text: 'Étudiant, salarié ou cadre : ça fixe tes revenus, donc ce que la banque accepte de te prêter. Tu le choisis une seule fois.' },
  { id: 'immo-onglets', section: 'immobilier', page: '/immobilier', target: '[role="tablist"][aria-label^="Sections de l"]', placement: 'bottom', optional: true, mini: 'immobilier',
    title: 'Chercher, gérer, suivre', text: 'Cherche une annonce, gère tes biens, lis ton bilan du mois et ton classement.' },
  { id: 'immo-temps', section: 'immobilier', page: '/immobilier', target: '[data-tour="immo-advance"]', placement: 'bottom', optional: true, mini: 'immobilier',
    title: 'Faire passer les mois', text: 'Avancer d\'un mois règle tes loyers, ton crédit et tes charges : ça peut te rapporter ou te coûter des pièces, c\'est normal. Comme partout, ça avance l\'horloge de tout le jeu, sans retour en arrière. Je ne le clique pas pour toi.' },

  // ── Banque ───────────────────────────────────────────────────────────────────
  { id: 'go-banque', section: 'banque', kind: 'travel', via: '[data-tour="nav-banque"]', to: '/banque', title: 'Direction : la Banque', text: 'Je clique sur « Banque et InvestCoins » dans le menu.' },
  { id: 'banque-intro', section: 'banque', page: '/banque', target: '[data-tour="bank-head"]', placement: 'bottom', mini: 'banque',
    title: 'Ta banque', text: 'Les pièces ne servent que dans le jeu : ni achat, ni retrait, ni échange entre joueurs. Ici, tu gères tes dettes.' },
  { id: 'banque-chiffres', section: 'banque', page: '/banque', target: '[data-tour="bank-stats"]', placement: 'bottom', optional: true, mini: 'banque',
    title: 'Dette et crédit fléché', text: 'Ta dette en cours, et le crédit non dépensé : des pièces empruntées ne se dépensent que dans le domaine du prêt.' },
  { id: 'banque-prets', section: 'banque', page: '/banque', target: '[data-tour="bank-loans"]', placement: 'top', optional: true, mini: 'banque',
    title: 'Emprunter, rembourser', text: 'Prêt personnel (pour l\'immobilier) ou prêt sur portefeuille (Bourse, Crypto). Un prêt se rembourse, et un défaut a des conséquences. Je ne te fais rien emprunter.' },

  // ── Éducation, classements, profil, retour ────────────────────────────────────
  { id: 'go-education', section: 'education', kind: 'travel', via: '[data-tour="nav-education"]', to: '/education', title: 'Direction : Éducation', text: 'Je clique sur « Éducation » dans le menu.' },
  { id: 'education-cours', section: 'education', page: '/education', target: 'a[href^="/education/"]', placement: 'bottom', optional: true,
    title: 'Apprendre en jouant', text: 'Un cours et un quiz par domaine : tu gagnes de l\'XP, des niveaux, des badges et des pièces, et chaque mot technique renvoie au glossaire.' },
  { id: 'go-classements', section: 'classements', kind: 'travel', via: '[data-tour="nav-classements"]', to: '/classements', title: 'Direction : Classements', text: 'Je clique sur « Classements » dans le menu.' },
  { id: 'classements-domaine', section: 'classements', page: '/classements', target: '[role="tablist"][aria-label="Domaine du classement"]', placement: 'bottom', optional: true,
    title: 'Se comparer aux autres', text: 'Choisis un domaine : les joueurs sont comparés à la même année de jeu.' },
  { id: 'classements-rang', section: 'classements', page: '/classements', target: '[data-testid="mon-rang"]', placement: 'bottom', optional: true,
    title: 'Ton rang', text: 'Ton rang apparaît ici. Pour entrer dans un classement, il faut avoir assez investi dans le domaine et avoir été actif quelques jours.' },
  { id: 'go-profil', section: 'profil', kind: 'travel', via: '[data-tour="account-menu"]', to: '/profile', click: false, title: 'Direction : ton profil', text: 'Ton profil et tes réglages se trouvent dans le menu de ton compte, en haut à droite. Je t\'y emmène.' },
  { id: 'profil-confidentialite', section: 'profil', page: '/profile', prepare: { click: '[data-tour="settings-tab-account"]' }, target: '[data-testid="profile-visibility"]', placement: 'top', optional: true,
    title: 'Ta vie privée', text: 'Public, amis ou privé : tu décides qui te voit dans les classements (« Joueur anonyme » si tu ne veux pas apparaître). Le serveur applique ton choix. Les autres réglages (affichage, abonnement) sont dans « Paramètres », dans le menu.' },
  { id: 'retour-bouton', section: 'retour', target: '[data-tour="feedback"]', placement: 'top', last: true,
    title: 'Un retour ?', text: 'Le site est en bêta : il peut contenir des bugs. Ce bouton te permet d\'envoyer un avis, un bug ou une idée à tout moment. Bonne découverte !' },
];

// Mini-visites : courtes (3 à 4 étapes), proposées au premier passage sur la page et relançables par « Guide de cette page ».
export const PAGE_TOURS = {
  bourse: { path: '/bourse', label: 'la Bourse' },
  crypto: { path: '/crypto', label: 'la Crypto' },
  immobilier: { path: '/immobilier', label: 'l\'Immobilier' },
  banque: { path: '/banque', label: 'la Banque' },
};

// Rubriques du panneau « Mon parcours de découverte ».
export const SECTIONS = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'bourse', label: 'Bourse et PEA' },
  { id: 'crypto', label: 'Crypto et le temps' },
  { id: 'immobilier', label: 'Immobilier' },
  { id: 'banque', label: 'Banque' },
  { id: 'education', label: 'Éducation' },
  { id: 'classements', label: 'Classements' },
  { id: 'profil', label: 'Profil et vie privée' },
  { id: 'retour', label: 'Un retour ?' },
];

export const MAIN_TOUR = 'main';
export const TOUR_EVENT_OPEN = 'ik:tour-open';     // detail : { tour: 'main' | 'bourse' | …, restart?: boolean }
export const TOUR_EVENT_MENU = 'ik:tour-menu';     // detail : { open: boolean }  (le menu latéral du téléphone)
export const CLOCK_EVENT = 'ik:clock-advanced';

export const stepsOf = (tour) => (tour === MAIN_TOUR ? TOUR_STEPS : TOUR_STEPS.filter((s) => s.mini === tour));
export const stepById = (id) => TOUR_STEPS.find((s) => s.id === id) ?? null;
export const pageTourFor = (pathname) => Object.entries(PAGE_TOURS).find(([, v]) => pathname === v.path || pathname.startsWith(`${v.path}/`))?.[0] ?? null;
