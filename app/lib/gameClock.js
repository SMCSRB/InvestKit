// Signal « la date de jeu a changé » : le bandeau des prix (affiché sur toutes les pages) l'écoute pour se mettre à jour tout de suite.
// À envoyer après toute avance du temps (Bourse, Crypto, Immobilier : une seule horloge pour les trois).
export const CLOCK_EVENT = 'ik:clock-advanced';
export const notifyClockAdvanced = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CLOCK_EVENT));
};
