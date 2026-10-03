// Glossaire : informations de présentation (domaines, niveaux, outils, sources).
// Le texte des définitions reste dans glossaire.js ; les exemples et les « à ne pas confondre avec » sont dans glossaireFiches.js.

export const GLOSSARY_DOMAINS = {
  immobilier: { label: 'Immobilier', icon: 'house' },
  bourse: { label: 'Bourse et PEA', icon: 'trendingUp' },
  crypto: { label: 'Crypto', icon: 'bitcoin' },
  banque: { label: 'Banque et crédit', icon: 'landmark' },
  jeu: { label: 'Dans le jeu', icon: 'coins' },
};

export const GLOSSARY_LEVELS = {
  1: { label: 'Débutant', hint: 'Les mots de base' },
  2: { label: 'Intermédiaire', hint: 'Pour aller un cran plus loin' },
  3: { label: 'Avancé', hint: 'Mécanismes plus fins' },
};

// Domaines par défaut selon la catégorie du glossaire.
export const DOMAINS_BY_CATEGORY = {
  credit: ['banque', 'immobilier'],
  achat: ['immobilier'],
  location: ['immobilier'],
  impots: ['immobilier'],
  vente: ['immobilier'],
  bourse: ['bourse'],
  jeu: ['jeu'],
  crypto: ['crypto'],
};

// Exceptions : domaines différents du défaut de la catégorie.
export const DOMAINS_OVERRIDE = {
  'flat-tax': ['bourse', 'crypto'],
  'impot-crypto': ['crypto', 'bourse'],
  crypto: ['crypto', 'bourse'],
  'prelevements-sociaux': ['immobilier', 'bourse'],
  'pret-portefeuille': ['banque', 'bourse', 'crypto'],
  'appel-de-marge': ['banque', 'bourse', 'crypto'],
  'pret-personnel': ['banque'],
  'credit-fleche': ['banque', 'jeu'],
  'taux-base': ['banque'],
  retablissement: ['banque'],
  'defaut-paiement': ['banque', 'immobilier'],
  levier: ['banque', 'immobilier', 'crypto'],
  liquidation: ['crypto', 'banque'],
  ltv: ['crypto', 'banque'],
  volatilite: ['bourse', 'crypto'],
  diversification: ['bourse', 'crypto'],
  liquidite: ['crypto', 'bourse'],
  drawdown: ['bourse', 'crypto'],
  correlation: ['bourse', 'crypto'],
  'echelle-log': ['bourse', 'crypto'],
  'base-100': ['bourse', 'crypto'],
  'moyenne-mobile': ['bourse', 'crypto'],
  bougie: ['bourse', 'crypto'],
  rsi: ['bourse', 'crypto'],
  macd: ['bourse', 'crypto'],
  bollinger: ['bourse', 'crypto'],
  'ordre-marche': ['bourse', 'crypto'],
  'ordre-limite': ['bourse', 'crypto'],
  'stop-loss': ['bourse', 'crypto'],
  'take-profit': ['bourse', 'crypto'],
  'plus-haut-historique': ['bourse', 'crypto'],
  'annee-simulee': ['jeu', 'bourse'],
  'mode-accelere': ['jeu', 'immobilier'],
  'remboursement-anticipe': ['banque', 'immobilier'],
};

// Niveaux : 1 débutant, 2 intermédiaire, 3 avancé. Tout mot absent de ces listes est intermédiaire.
export const LEVEL_1 = [
  'courtage', 'pea', 'action', 'etf', 'crypto', 'volatilite', 'diversification', 'credit', 'mensualite', 'interets', 'taux',
  'apport', 'frais-notaire', 'cash-flow', 'loyer', 'rendement-brut', 'vacance', 'depot-garantie', 'preavis', 'taxe-fonciere',
  'impot-loyers', 'investcoin', 'patrimoine-net', 'blockchain', 'wallet', 'cle-privee', 'stablecoin', 'capitalisation',
  'bougie', 'flat-tax', 'compte-titres', 'capital-rembourse', 'capital-restant', 'reste-a-vivre', 'plus-value', 'dpe',
  'ordre-marche', 'annee-simulee', 'valeur-positions', 'performance', 'obligation', 'pret-personnel',
];
export const LEVEL_3 = [
  'taeg', 'levier', 'credit-fleche', 'taux-base', 'retablissement', 'pret-portefeuille', 'appel-de-marge', 'surtaxe', 'abattement',
  'revenus-fonciers', 'ira', 'decote', 'vente-forcee', 'audit-energetique', 'valeur-verte', 'gli', 'gli-etudiants', 'carence',
  'palier-liquidite', 'glissement', 'liquidation', 'ltv', 'risque-plateforme', 'rug-pull', 'defi', 'consensus', 'halving', 'fork',
  'drawdown', 'correlation', 'echelle-log', 'base-100', 'moyenne-mobile', 'bollinger', 'rsi', 'macd', 'depeg', 'ico',
  'echange-crypto', 'rendement-metropole', 'charges-recuperables', 'charges-non-recuperables', 'impaye', 'treve-hivernale',
  'prelevements-sociaux', 'mode-accelere', 'defaut-paiement', 'remboursement-anticipe', 'performance-portefeuille', 'cours-cloture',
];

// Outils et leçons vers lesquels une fiche peut renvoyer.
export const GLOSSARY_TOOLS = {
  loan1: { label: 'Simulateur de crédit immobilier', href: '/simulateurs/loan1', icon: 'calculator' },
  loan2: { label: 'Simulateur d\'investissement locatif', href: '/simulateurs/loan2', icon: 'calculator' },
  pea: { label: 'Simulateur PEA', href: '/simulateurs/pea', icon: 'calculator' },
  immo: { label: 'Immobilier du jeu', href: '/immobilier', icon: 'house' },
  bourse: { label: 'Bourse du jeu', href: '/dashboard?tab=trading', icon: 'trendingUp' },
  crypto: { label: 'Crypto du jeu', href: '/crypto', icon: 'bitcoin' },
  banque: { label: 'Banque du jeu', href: '/banque', icon: 'landmark' },
  education: { label: 'Tous les cours', href: '/education', icon: 'graduationCap' },
};

// Outils par mot (le lien vers la leçon vient du champ `quiz` de glossaire.js).
export const TOOLS_BY_ID = {
  credit: ['loan1', 'banque'], mensualite: ['loan1'], 'capital-rembourse': ['loan1'], interets: ['loan1'], taux: ['loan1'],
  taeg: ['loan1'], 'assurance-emprunteur': ['loan1'], apport: ['loan1'], endettement: ['loan1'], 'capital-restant': ['loan1'],
  levier: ['loan2'], 'reste-a-vivre': ['loan1'], 'remboursement-anticipe': ['loan1'], ira: ['loan1'], 'frais-notaire': ['loan1', 'immo'],
  'frais-dossier': ['loan1'], 'pret-personnel': ['banque'], 'credit-fleche': ['banque'], 'taux-base': ['banque'], retablissement: ['banque'],
  'pret-portefeuille': ['banque'], 'appel-de-marge': ['banque'], 'defaut-paiement': ['banque'],
  'cash-flow': ['loan2', 'immo'], 'effort-epargne': ['loan2', 'immo'], loyer: ['loan2'], 'rendement-brut': ['loan2'],
  'rendement-metropole': ['loan2'], vacance: ['loan2'], 'revenus-fonciers': ['loan2'], 'impot-loyers': ['loan2'],
  'taxe-fonciere': ['loan2'], 'charges-recuperables': ['loan2'], 'charges-non-recuperables': ['loan2'],
  courtage: ['pea', 'bourse'], pea: ['pea'], 'compte-titres': ['pea'], 'flat-tax': ['pea'], 'impot-crypto': ['crypto'],
  action: ['bourse'], etf: ['bourse'], obligation: ['bourse'], volatilite: ['pea'], diversification: ['pea'],
  'cours-cloture': ['bourse'], 'annee-simulee': ['bourse'], 'valeur-positions': ['bourse'], 'performance-portefeuille': ['bourse'],
  crypto: ['crypto'], stablecoin: ['crypto'], liquidite: ['crypto'], 'palier-liquidite': ['crypto'], 'ecart-achat-vente': ['crypto'],
  glissement: ['crypto'], 'ordre-marche': ['crypto'], 'ordre-limite': ['crypto'], 'stop-loss': ['crypto'], 'take-profit': ['crypto'],
  liquidation: ['crypto'], ltv: ['crypto'], 'echange-crypto': ['crypto'], bougie: ['crypto'], rsi: ['crypto'], macd: ['crypto'],
  'moyenne-mobile': ['crypto'], bollinger: ['crypto'], 'echelle-log': ['crypto'], 'base-100': ['crypto'], drawdown: ['crypto'],
};

// Sources des définitions sensibles (impôts, plafonds, taux).
// statut : « verifie-recherche » = confirmé par des extraits de pages officielles ou de notaires trouvés par recherche web,
//          mais la page officielle n'a pas pu être relue en direct depuis l'environnement de développement ;
//          « non-source » = ordre de grandeur sans source officielle ;
//          « jeu » = règle propre au jeu.
// Date de vérification : 2026-10-03. À refaire avant l'ouverture au public (les taux changent chaque année).
export const SOURCE_CHECKED_ON = '2026-10-03';

export const SOURCE_STATUS = {
  'verifie-recherche': 'Vérifié par recherche web (texte officiel à relire avant l\'ouverture au public)',
  'non-source': 'Non sourcé : ordre de grandeur indicatif',
  jeu: 'Règle du jeu, pas une règle réelle',
};

const IMPOTS = 'https://www.impots.gouv.fr';
const SP = 'https://www.service-public.gouv.fr';
const ECO = 'https://www.economie.gouv.fr';

export const SOURCES = {
  pea: { statut: 'verifie-recherche', points: 'Plafond de versements 150 000 €, durée de 5 ans, retrait avant 5 ans', refs: [
    { label: 'economie.gouv.fr : Plan d\'épargne en actions', url: `${ECO}/particuliers/plan-epargne-actions-pea` }] },
  'compte-titres': { statut: 'verifie-recherche', points: 'Flat tax 12,8 % + prélèvements sociaux', refs: [
    { label: 'impots.gouv.fr : plus-values imposées', url: `${IMPOTS}/particulier/plus-values-imposees` },
    { label: 'service-public.gouv.fr : plus-values sur valeurs mobilières', url: `${SP}/particuliers/vosdroits/F21618` }] },
  'flat-tax': { statut: 'verifie-recherche', points: '12,8 % d\'impôt ; prélèvements sociaux 18,6 % en 2026 (à relire sur un texte officiel)', refs: [
    { label: 'impots.gouv.fr : plus-values imposées', url: `${IMPOTS}/particulier/plus-values-imposees` }] },
  'impot-crypto': { statut: 'verifie-recherche', points: 'Seuil de 305 € de cessions par an, échange crypto contre crypto non imposé', refs: [
    { label: 'impots.gouv.fr : actifs numériques', url: `${IMPOTS}/particulier/questions/comment-declarer-les-plus-ou-moins-values-sur-cessions-dactifs-numeriques` },
    { label: 'economie.gouv.fr : cryptomonnaies', url: `${ECO}/particuliers/gerer-mon-argent/investissement-dans-les-cryptomonnaies-ce-quil-faut-savoir` }] },
  'prelevements-sociaux': { statut: 'verifie-recherche', points: '17,2 % sur l\'immobilier ; 18,6 % sur les placements financiers depuis 2026 : sources de presse et de conseil, à confirmer auprès de l\'Urssaf ou de impots.gouv.fr', refs: [
    { label: 'service-public.gouv.fr : prélèvements sociaux (CSG, CRDS…)', url: `${SP}/particuliers/vosdroits/F2329` }] },
  courtage: { statut: 'jeu', points: 'Taux de jeu inspirés de courtiers réels, non sourcés', refs: [] },
  endettement: { statut: 'verifie-recherche', points: 'Plafond de 35 % assurance comprise (HCSF), marge de souplesse limitée', refs: [
    { label: 'Direction générale du Trésor : mesures macroprudentielles', url: 'https://www.tresor.economie.gouv.fr/Articles/2021/02/23/les-mesures-macroprudentielles-sur-les-emprunts-immobiliers' }] },
  'frais-notaire': { statut: 'verifie-recherche', points: 'Environ 7 à 8 % dans l\'ancien, 2 à 3 % dans le neuf ; l\'essentiel est constitué de taxes', refs: [
    { label: 'economie.gouv.fr : frais de notaire', url: `${ECO}/particuliers/gerer-mon-argent/investir-dans-limmobilier/achat-dun-bien-immobilier-quels-frais-de-notaire-devez-vous-payer` }] },
  gli: { statut: 'non-source', points: 'La fourchette de 2 à 4 % n\'est pas une donnée officielle : elle varie selon l\'assureur', refs: [] },
  'treve-hivernale': { statut: 'verifie-recherche', points: 'Du 1er novembre au 31 mars', refs: [
    { label: 'ANIL : la trêve hivernale', url: 'https://www.anil.org/parole-expert-logement-c-est-quoi-treve-hivernale/' }] },
  'plus-value': { statut: 'verifie-recherche', points: 'Principe de calcul et exonération de la résidence principale', refs: [
    { label: 'impots.gouv.fr : plus-value immobilière', url: `${IMPOTS}/particulier/questions/je-vends-mon-bien-immobilier-vais-je-payer-de-la-plus-value-immobiliere` },
    { label: 'service-public.gouv.fr : plus-value immobilière', url: `${SP}/particuliers/vosdroits/F10864` }] },
  abattement: { statut: 'verifie-recherche', points: 'Impôt sur le revenu : exonération à 22 ans ; prélèvements sociaux : exonération à 30 ans', refs: [
    { label: 'impots.gouv.fr : abattement pour durée de détention', url: `${IMPOTS}/particulier/questions/jai-realise-des-plus-values-ai-je-droit-un-abattement-pour-duree-de-detention` }] },
  surtaxe: { statut: 'verifie-recherche', points: 'Seuil de 50 000 € confirmé ; le lissage entre les paliers n\'a pas été relu dans un texte officiel', refs: [
    { label: 'Notaires de Paris : surtaxe', url: 'https://paris.notaires.fr/fr/actualites/surtaxe-sur-les-plus-values-immobilieres' }] },
  ira: { statut: 'verifie-recherche', points: 'Plafond : six mois d\'intérêts ou 3 % du capital restant dû, le plus faible des deux', refs: [
    { label: 'service-public.gouv.fr : remboursement anticipé', url: `${SP}/particuliers/vosdroits/F1669` }] },
  dpe: { statut: 'verifie-recherche', points: 'Calendrier d\'interdiction de location selon la classe (G, puis F, puis E)', refs: [
    { label: 'economie.gouv.fr : le DPE', url: `${ECO}/particuliers/gerer-mon-argent/investir-dans-limmobilier/ce-quil-faut-savoir-sur-le-diagnostic-de-performance-energetique-dpe` }] },
  'audit-energetique': { statut: 'verifie-recherche', points: 'Maisons et immeubles entiers, pas les appartements en copropriété ; classes F et G puis E', refs: [
    { label: 'ANIL : audit énergétique', url: 'https://www.anil.org/aj-audit-energetique/' },
    { label: 'service-public.gouv.fr : audit énergétique à la vente', url: `${SP}/particuliers/vosdroits/F37110` }] },
  'valeur-verte': { statut: 'verifie-recherche', points: 'Écart de prix selon la note énergétique, observé par les notaires', refs: [
    { label: 'Notaires de France : valeur verte', url: 'https://www.notaires.fr/fr/article/la-valeur-verte-des-logements-en-2023-etudes-statistiques-immobilieres' }] },
  'impot-loyers': { statut: 'verifie-recherche', points: 'Barème de l\'impôt sur le revenu 2026 (service-public.gouv.fr)', refs: [
    { label: 'service-public.gouv.fr : barème', url: `${SP}/particuliers/vosdroits/F1419` }] },
  'depot-garantie': { statut: 'non-source', points: 'Règle générale : un mois de loyer pour une location vide ; non relue ici', refs: [] },
  preavis: { statut: 'non-source', points: 'Délais de préavis non relus dans un texte officiel', refs: [] },
};
