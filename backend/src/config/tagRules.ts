// Règles de l'identifiant « Pseudo#tag » (partie après le #). Toutes ces valeurs sont des choix de produit, pas des faits :
// VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER.
export const TAG = {
  min: 3,                    // longueur minimale d'un # choisi (lettres et chiffres)
  max: 12,                   // longueur maximale
  autoDigits: 4,             // # automatique : 4 chiffres (ex. Camille#4821)
  changeIntervalDays: 30,    // un changement de # par mois
  holdDays: 30,              // un ancien # reste réservé à son ancien propriétaire pendant ce délai, puis il est libéré
  graceDays: 30,             // après la fin du Pro : le # choisi est gardé ce nombre de jours, puis retour à un # automatique
  restoreDays: 90,           // après le retour à l'automatique : un re-abonnement dans ce délai rend le # choisi (s'il est encore libre)
  // Mots réservés (comparés après « pliage » des ressemblances : 0→o, 1/i/l→l, 5→s, etc.). Un # qui CONTIENT l'un d'eux est refusé.
  reserved: ['admin', 'administrateur', 'administrator', 'support', 'investkit', 'moderateur', 'moderator', 'modo', 'staff', 'officiel', 'official',
    'equipe', 'system', 'systeme', 'root', 'null', 'undefined', 'anonymous', 'anonyme', 'bot', 'discord', 'stripe', 'pro'],
  // Insultes sans ambiguïté (liste volontairement courte et à compléter par la modération).
  insults: ['connard', 'connasse', 'salope', 'pute', 'encule', 'merde', 'nazi', 'hitler', 'pedo', 'viol', 'nigger', 'fdp', 'ntm'],
};
