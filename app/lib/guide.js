// Guide du site : UNE seule source pour le parcours du premier lancement ET la page d'aide complète (/guide).
// Règle : le guide explique et PIONTE (glossaire, cours, pages) ; il ne recopie pas les règles. Les chiffres viennent de siteFacts.js
// (comparés par un test aux réglages du serveur). Aucun emoji ; « [[coin]] » est remplacé par l'icône de pièce (jamais le symbole de l'euro).
import {
  STARTING_COINS, CRYPTO_ASSET_COUNT, DAILY_REWARD_COINS, DAILY_REWARD_MAX_DAYS, RANKING_MIN_INVESTED, RANKING_MIN_ACTIVE_DAYS, LEVEL_COUNT,
} from './siteFacts';

const n = (v) => Number(v).toLocaleString('fr-FR');

export const GUIDE_SECTIONS = [
  {
    id: 'quoi', icon: 'sparkles', title: 'InvestKit, c\'est quoi ?',
    short: 'Un jeu pour apprendre à investir, avec de la monnaie du jeu : aucun argent réel.',
    body: [
      'InvestKit est un jeu de simulation. Tu investis en Bourse, en Crypto et en Immobilier, et tu empruntes à la Banque, pour apprendre sans rien risquer.',
      'Tout se joue en InvestCoins ([[coin]]). 1 InvestCoin vaut 1 euro de jeu : ce sont des pièces pour de faux, sans aucune valeur réelle. On ne peut ni les acheter, ni les retirer, ni les échanger entre joueurs.',
      `Tu démarres avec ${n(STARTING_COINS)} [[coin]]. Les cours viennent de l'histoire des marchés quand c'est possible ; les données simplifiées ou fictives sont signalées sur la page concernée.`,
    ],
    links: [{ label: 'Mot du glossaire : InvestCoin', href: '/glossaire#investcoin' }, { label: 'Apprendre : les cours', href: '/education' }],
  },
  {
    id: 'temps', icon: 'clock', title: 'Le temps : une seule horloge',
    short: 'Tu fais avancer le temps toi-même, et il avance pour tous les domaines à la fois.',
    body: [
      'Chaque joueur a une seule date de jeu. Tu choisis ta date de départ une seule fois, dans une liste proposée.',
      'Pour avancer : « +1 jour », « +1 semaine », « +1 mois » sur la page Crypto, « année suivante » sur la page Bourse, « +1 mois » ou « +1 an » sur la page Immobilier. Quel que soit le bouton, Bourse, Crypto et Immobilier avancent ensemble.',
      'On ne revient jamais en arrière, et le site ne te montre jamais ce qui se passe après ta date. Quand quelque chose d\'important arrive (ordre exécuté, appel de marge, loyer impayé…), l\'avance s\'arrête d\'elle-même avec un résumé.',
      'Les prêts de la Banque suivent l\'horloge du domaine pour lequel tu les as pris.',
    ],
    links: [{ label: 'Mot du glossaire : année simulée', href: '/glossaire#annee-simulee' }, { label: 'Mot du glossaire : mode accéléré', href: '/glossaire#mode-accelere' }],
  },
  {
    id: 'modes', icon: 'layout', title: 'Les trois modes de jeu',
    short: 'Histoire est ouvert aujourd\'hui. Bac à sable et En ligne arrivent plus tard.',
    body: ['Il y a trois modes. Un seul est jouable aujourd\'hui : Histoire. Les deux autres sont prévus, leurs règles d\'accès sont décidées, mais on ne peut pas encore y jouer.'],
    links: [],
  },
  {
    id: 'domaines', icon: 'candles', title: 'Les domaines',
    short: 'Bourse et PEA, Crypto, Immobilier, et la Banque qui prête pour chacun.',
    body: ['Un compte gratuit ouvre un domaine à choisir ; le plan Pro les ouvre tous. Chaque domaine a son cours pour apprendre, avec un quiz.'],
    links: [],
  },
  {
    id: 'progression', icon: 'trophy', title: 'Récompenses, XP, niveaux, badges et classements',
    short: 'Tu gagnes des pièces et de l\'XP en jouant et en apprenant, sans pression : aucune série à protéger.',
    body: [
      `Récompense du jour : ${n(DAILY_REWARD_COINS)} [[coin]] par jour réclamé (bouton cadeau de la barre du haut), au plus ${DAILY_REWARD_MAX_DAYS} jours par semaine. Si tu t'absentes, tu ne perds rien.`,
      'Premiers pas : quelques bonus uniques (premier investissement, premier cours, premier quiz). Les chapitres et quiz validés par le serveur donnent des pièces et de l\'XP.',
      `L'XP fait monter ton niveau (${LEVEL_COUNT} niveaux, avec des titres). Les badges sont attribués par le serveur quand tu remplis une vraie condition : ils donnent de l'XP, jamais de pièces.`,
      `Classements : pour apparaître dans celui d'un domaine, il faut y avoir investi au moins ${n(RANKING_MIN_INVESTED)} [[coin]] et avoir au moins ${RANKING_MIN_ACTIVE_DAYS} jours actifs. Les joueurs sont comparés à la même année de jeu.`,
      'Ta vie privée : dans ton profil, tu choisis d\'être visible (public, amis ou privé). Un profil non public apparaît comme « Joueur anonyme » dans les classements.',
    ],
    links: [{ label: 'Voir les classements', href: '/classements' }, { label: 'Régler la visibilité de mon profil', href: '/profile' }, { label: 'Apprendre : les cours', href: '/education' }],
  },
  {
    id: 'beta', icon: 'info', title: 'Un site en bêta',
    short: 'Le site est en test : il peut contenir des bugs. Le bouton « Un retour ? » sert à nous les dire.',
    body: [
      'InvestKit est en bêta (test fermé, sur invitation). Il peut contenir des bugs, et certains chiffres du jeu peuvent encore changer.',
      'Un problème, une idée, ou juste un avis ? Utilise le bouton « Un retour ? » en bas à droite de l\'écran : choisis Avis, Bug ou Idée, et explique sur quelle page et ce qui s\'est passé. N\'écris jamais de mot de passe ni de code dans ton message.',
    ],
    links: [{ label: 'Nous contacter', href: '/contact' }],
  },
];

// Modes de jeu. `available` est comparé par un test à backend/src/config/clockRules.ts (MODE_AVAILABILITY).
export const GUIDE_MODES = [
  { id: 'history', name: 'Histoire', available: true, who: 'Ouvert à tous',
    text: 'Tu rejoues le passé à ton rythme, avec classements, XP et badges. C\'est le mode de base, jouable dès aujourd\'hui.' },
  { id: 'sandbox', name: 'Bac à sable', available: false, who: 'Prévu : ouvert à tous',
    text: 'Pour s\'entraîner sans enjeu : ni classement, ni badge, ni récompense. Prévu : un compte gratuit pourra rejouer les périodes déjà jouées en Histoire (une période se débloque en jouant son scénario) ; le plan Pro pourra choisir librement la période et la date de départ.' },
  { id: 'live', name: 'En ligne', available: false, who: 'Prévu : réservé au plan Pro',
    text: 'Jouer au présent, sur Bourse et Crypto, avec portefeuille et classement séparés. Il arrivera en dernier, une fois la source des cours du jour choisie.' },
];

// Domaines. `course` = identifiant du cours (data/education.js) ; `terms` = mots du glossaire.
export const GUIDE_DOMAINS = [
  { id: 'bourse', name: 'Bourse et PEA', href: '/bourse', icon: 'chart', course: 'stocks',
    text: 'Achète et vends des actions et des ETF, avec les frais et la fiscalité du PEA. Les cours sont des séries annuelles simplifiées, pas de vrais cours.',
    terms: [{ label: 'PEA', id: 'pea' }, { label: 'ETF', id: 'etf' }] },
  { id: 'crypto', name: 'Crypto', href: '/crypto', icon: 'coins', course: 'crypto_market',
    text: `Un marché de ${CRYPTO_ASSET_COUNT} cryptomonnaies rejoué jour après jour, avec ordres au marché, à cours limité, stop-loss, frais et glissement. Tant que l\'historique n\'est pas importé, les données sont fictives et marquées comme telles.`,
    terms: [{ label: 'Ordre limite', id: 'ordre-limite' }, { label: 'Stop-loss', id: 'stop-loss' }] },
  { id: 'immobilier', name: 'Immobilier', href: '/immobilier', icon: 'building', course: 'real_estate',
    text: 'Achète un bien à crédit, loue-le, gère les travaux et les loyers, puis revends. Les annonces et les villes sont fictives pour l\'instant.',
    terms: [{ label: 'Rendement net', id: 'rendement-net' }, { label: 'Cash-flow', id: 'cash-flow' }] },
  { id: 'banque', name: 'Banque', href: '/banque', icon: 'bank', course: null,
    text: 'Emprunte des InvestCoins (prêt personnel ou prêt sur portefeuille). Chaque prêt est lié à un domaine, il faut le rembourser, et un défaut a des conséquences.',
    terms: [{ label: 'Prêt sur portefeuille', id: 'pret-portefeuille' }, { label: 'Appel de marge', id: 'appel-de-marge' }] },
];

// Parcours court du premier lancement : mêmes textes courts que le guide complet, une carte par rubrique.
export const GUIDE_TOUR = GUIDE_SECTIONS.map((s) => ({ id: s.id, icon: s.icon, title: s.title, text: s.short, href: `/guide#${s.id}` }));

export const GUIDE_SEEN_KEY = 'ik-guide-seen-v1';
export const OPEN_GUIDE_EVENT = 'ik:open-guide';
