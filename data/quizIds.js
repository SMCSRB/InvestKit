// Identifiants d'options de quiz, partagés par le site, le serveur (catalogue généré) et le générateur.
// Ils sont STABLES : calculés à partir du texte de l'option, jamais de sa position. On peut donc mélanger l'ordre d'affichage
// sans rien casser, et le serveur vérifie une réponse par son identifiant (« o1x2y3… »), pas par « la 1re ou la 3e option ».
// Si le texte d'une option change, son identifiant change : le catalogue serveur doit alors être regénéré
// (node backend/scripts/gen-education-catalog.mjs) ; un test le vérifie.

// Fonction de hachage « cyrb53 » (rapide, sans dépendance, identique dans le navigateur et dans Node). Pas de sécurité cryptographique ici :
// l'identifiant ne sert qu'à désigner une option, il ne cache pas la bonne réponse (le contenu pédagogique est public).
const cyrb53 = (str, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

// scope = identifiant du chapitre (« 3 ») ou « final » pour le quiz final du domaine.
export const optionId = (domainId, scope, questionId, text) => `o${cyrb53(`${domainId}|${scope}|${questionId}|${text}`).toString(36)}`;
