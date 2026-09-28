// Informations publiques du site affichées dans les pages légales et de contact.
// UN SEUL endroit à compléter : tant qu'une valeur est null, les pages
// affichent « [à compléter] » au lieu d'inventer une information.
// Ne rien mettre ici que tu ne veuilles pas rendre public.
export const SITE_INFO = {
  publisherName: null,      // nom de l'éditeur (toi, ou la société)
  publisherStatus: null,    // ex : « particulier » ou forme juridique + SIRET + adresse
  publicationDirector: null, // responsable de la publication
  contactEmail: null,       // adresse e-mail de contact
  discordUrl: null,         // lien d'invitation Discord
  hostName: null,           // nom de l'hébergeur
  hostAddress: null,        // adresse / contact de l'hébergeur
};

export const TODO = '[à compléter]';
export const val = (v) => v || TODO;
