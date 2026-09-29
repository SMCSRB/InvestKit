// Informations publiques du site affichées dans les pages légales et de contact.
// UN SEUL endroit à compléter : tant qu'une valeur est null, les pages
// affichent « [à compléter] » au lieu d'inventer une information.
// Ne rien mettre ici que tu ne veuilles pas rendre public.
export const SITE_INFO = {
  publisherName: 'SMC',       // nom de l'éditeur (toi, ou la société)
  publisherStatus: 'particulier', // ex : « particulier » ou forme juridique + SIRET + adresse
  publicationDirector: 'SMC', // responsable de la publication
  // ⚠️ EXEMPLE PROVISOIRE : contact@example.com n'est PAS une vraie adresse. À REMPLACER par une vraie
  // adresse avant l'ouverture au public (`npm run check:site-info` le rappelle tant que ce n'est pas fait).
  contactEmail: 'contact@example.com',
  discordUrl: 'https://discord.gg/rXxZB3mfG6', // lien d'invitation Discord
  // ⚠️ À RENSEIGNER avant l'ouverture au public : tant que c'est null, les pages légales affichent « [à compléter] ».
  hostName: null,           // nom de l'hébergeur
  hostAddress: null,        // adresse / contact de l'hébergeur
};

export const TODO = '[à compléter]';
export const val = (v) => v || TODO;
