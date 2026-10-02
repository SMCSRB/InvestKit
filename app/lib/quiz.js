// Quiz : mélange de l'ordre des réponses (à chaque ouverture et à chaque nouvelle tentative) et identifiants d'options.
// Le navigateur ne corrige PAS : il envoie au serveur l'identifiant de l'option choisie ; le serveur répond avec le score et les bonnes réponses.
import { optionId } from '@/data/quizIds';

// Mélange de Fisher-Yates (copie : le tableau d'origine n'est jamais modifié).
export const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// { [idQuestion]: [{ id, text }, …] } avec les options dans un ordre aléatoire. `scope` = numéro du chapitre ou « final ».
export const shuffleOptions = (domainId, scope, questions) => Object.fromEntries(
  questions.map((q) => [q.id, shuffle(q.options.map((text) => ({ id: optionId(domainId, String(scope), String(q.id), text), text })))]),
);
