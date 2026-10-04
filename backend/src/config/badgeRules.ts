import type { XpDomain } from './levelRules';

// Règles des badges (6a). Chaque badge a une CONDITION PURE qui ne lit que des faits connus du serveur (jamais le navigateur).
// Aucun badge « promis » sans règle codée et testée : les badges de saison, d'événement et secrets n'existent pas encore.
// Récompenses : de l'XP seulement (journal d'XP). Aucune pièce : `coins` reste à 0 tant que l'équilibrage n'est pas décidé.
// VALEURS DE JEU, NON SOURCÉES, À RECONFIRMER : montants d'XP et seuils.

export type BadgeCategory = 'apprentissage' | 'pratique' | 'regularite' | 'prudence' | 'domaine' | 'communaute';
export type BadgeRarity = 'commun' | 'rare' | 'epique' | 'legendaire';

// Faits du serveur dont dépendent les badges (une seule lecture par évaluation).
export interface BadgeFacts {
  chaptersDone: number;                 // chapitres d'éducation validés (hors quiz finaux)
  domainsCompleted: string[];           // domaines d'éducation dont le quiz final est validé
  tradedStocks: boolean;                // au moins un achat en Bourse
  tradedCrypto: boolean;                // au moins un achat en Crypto (ancien ou nouveau marché)
  boughtProperty: boolean;              // au moins un bien immobilier acheté
  activeDays: number;                   // jours actifs (compteur du serveur)
  loansRepaid: number;                  // prêts de la banque entièrement remboursés
  friends: number;                      // amitiés acceptées
  inGuild: boolean;
  level: number;                        // niveau global d'XP (avant les récompenses de badges de cette évaluation)
}

export interface BadgeDef {
  id: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  title: string;
  description: string;
  xp: number;                           // XP accordée une seule fois
  coins: 0;                             // pas de pièces pour l'instant
  xpDomain: XpDomain;                   // domaine du journal d'XP
  condition: (f: BadgeFacts) => boolean;
  factRef: (f: BadgeFacts) => string;   // référence du fait déclencheur, gardée avec le badge
}

const XP_BY_RARITY: Record<BadgeRarity, number> = { commun: 20, rare: 50, epique: 100, legendaire: 250 };

const def = (d: Omit<BadgeDef, 'xp' | 'coins'>): BadgeDef => ({ ...d, xp: XP_BY_RARITY[d.rarity], coins: 0 });

const DOMAIN_BADGES: { domain: string; title: string }[] = [
  { domain: 'stocks', title: 'Bourse et PEA' }, { domain: 'real_estate', title: 'Immobilier' },
  { domain: 'crypto', title: 'Cryptomonnaies' }, { domain: 'crypto_market', title: 'Marché Crypto simulé' },
];

export const BADGES: readonly BadgeDef[] = [
  def({ id: 'first_lesson', category: 'apprentissage', rarity: 'commun', title: 'Première leçon', description: 'Valide ton premier chapitre d\'éducation.', xpDomain: 'education',
    condition: (f) => f.chaptersDone >= 1, factRef: (f) => `chapitres:${f.chaptersDone}` }),
  def({ id: 'five_lessons', category: 'apprentissage', rarity: 'commun', title: 'En route', description: 'Valide 5 chapitres d\'éducation.', xpDomain: 'education',
    condition: (f) => f.chaptersDone >= 5, factRef: (f) => `chapitres:${f.chaptersDone}` }),
  def({ id: 'ten_lessons', category: 'apprentissage', rarity: 'rare', title: 'Studieux', description: 'Valide 10 chapitres d\'éducation.', xpDomain: 'education',
    condition: (f) => f.chaptersDone >= 10, factRef: (f) => `chapitres:${f.chaptersDone}` }),
  ...DOMAIN_BADGES.map((d) => def({ id: `domain_${d.domain}`, category: 'domaine', rarity: 'rare', title: `Parcours terminé : ${d.title}`,
    description: `Réussis le quiz final du parcours « ${d.title} ».`, xpDomain: 'education',
    condition: (f) => f.domainsCompleted.includes(d.domain), factRef: () => `final:${d.domain}` })),
  def({ id: 'first_stock_trade', category: 'pratique', rarity: 'commun', title: 'Premier achat en Bourse', description: 'Passe ton premier achat en Bourse.', xpDomain: 'bourse',
    condition: (f) => f.tradedStocks, factRef: () => 'achat:bourse' }),
  def({ id: 'first_crypto_trade', category: 'pratique', rarity: 'commun', title: 'Premier achat en Crypto', description: 'Passe ton premier achat en Crypto.', xpDomain: 'crypto',
    condition: (f) => f.tradedCrypto, factRef: () => 'achat:crypto' }),
  def({ id: 'first_property', category: 'pratique', rarity: 'rare', title: 'Propriétaire', description: 'Achète ton premier bien immobilier.', xpDomain: 'immobilier',
    condition: (f) => f.boughtProperty, factRef: () => 'achat:immobilier' }),
  def({ id: 'three_domains', category: 'pratique', rarity: 'epique', title: 'Touche-à-tout', description: 'Investis en Bourse, en Crypto et en Immobilier.', xpDomain: 'bourse',
    condition: (f) => f.tradedStocks && f.tradedCrypto && f.boughtProperty, factRef: () => 'domaines:3' }),
  def({ id: 'active_5', category: 'regularite', rarity: 'commun', title: '5 jours de jeu', description: 'Joue pendant 5 jours différents, sans obligation d\'enchaîner.', xpDomain: 'communaute',
    condition: (f) => f.activeDays >= 5, factRef: (f) => `jours_actifs:${f.activeDays}` }),
  def({ id: 'active_30', category: 'regularite', rarity: 'rare', title: '30 jours de jeu', description: 'Joue pendant 30 jours différents.', xpDomain: 'communaute',
    condition: (f) => f.activeDays >= 30, factRef: (f) => `jours_actifs:${f.activeDays}` }),
  def({ id: 'active_100', category: 'regularite', rarity: 'epique', title: '100 jours de jeu', description: 'Joue pendant 100 jours différents.', xpDomain: 'communaute',
    condition: (f) => f.activeDays >= 100, factRef: (f) => `jours_actifs:${f.activeDays}` }),
  def({ id: 'first_loan_repaid', category: 'prudence', rarity: 'rare', title: 'Dette soldée', description: 'Rembourse entièrement un prêt de la banque.', xpDomain: 'banque',
    condition: (f) => f.loansRepaid >= 1, factRef: (f) => `prets_rembourses:${f.loansRepaid}` }),
  def({ id: 'first_friend', category: 'communaute', rarity: 'commun', title: 'Premier ami', description: 'Ajoute un ami.', xpDomain: 'communaute',
    condition: (f) => f.friends >= 1, factRef: (f) => `amis:${f.friends}` }),
  def({ id: 'guild_member', category: 'communaute', rarity: 'commun', title: 'Membre d\'une guilde', description: 'Rejoins une guilde.', xpDomain: 'communaute',
    condition: (f) => f.inGuild, factRef: () => 'guilde' }),
  def({ id: 'level_5', category: 'apprentissage', rarity: 'commun', title: 'Niveau 5', description: 'Atteins le niveau 5 (Initié).', xpDomain: 'education',
    condition: (f) => f.level >= 5, factRef: (f) => `niveau:${f.level}` }),
  def({ id: 'level_9', category: 'apprentissage', rarity: 'rare', title: 'Niveau 9', description: 'Atteins le niveau 9 (Investisseur).', xpDomain: 'education',
    condition: (f) => f.level >= 9, factRef: (f) => `niveau:${f.level}` }),
];

export const BADGE_BY_ID: Readonly<Record<string, BadgeDef>> = Object.fromEntries(BADGES.map((b) => [b.id, b]));

// La rareté affichée vient des VRAIS joueurs : masquée tant qu'il y a moins de joueurs que ce seuil (on n'affiche plus de faux pourcentages).
export const RARITY_MIN_PLAYERS = 50;
