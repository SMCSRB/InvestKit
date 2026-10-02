// Génère src/data/educationCatalog.ts depuis le contenu pédagogique (data/education.js) : le serveur ne récompense QUE des chapitres qui existent.
// Usage : node scripts/gen-education-catalog.mjs          (écrit le fichier)
//         node scripts/gen-education-catalog.mjs --check  (code 1 si le fichier est périmé : utilisé par les tests)
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'backend', 'src', 'data', 'educationCatalog.ts');
const outQuiz = join(root, 'backend', 'src', 'data', 'educationQuizzes.ts');
const { educationDomains } = await import(join(root, 'data', 'education.js'));
const { optionId } = await import(join(root, 'data', 'quizIds.js'));
const catalog = Object.fromEntries(educationDomains.map((d) => [d.id, d.chapters.map((c) => String(c.id))]));
const text = `// GÉNÉRÉ par scripts/gen-education-catalog.mjs depuis data/education.js : ne pas modifier à la main.
// Domaines et chapitres qui existent : le serveur refuse toute autre complétion (pas de pièces ni d'XP pour des identifiants inventés).
export const EDUCATION_CATALOG: Record<string, string[]> = ${JSON.stringify(catalog, null, 2)};
`;

// Quiz : pour chaque question, les identifiants des options et celui de la BONNE réponse. Le serveur corrige avec ça (par identifiant, jamais par position).
const spec = (quiz, domainId, scope) => {
  if (!quiz || !Array.isArray(quiz.questions) || !quiz.questions.length) throw new Error(`${domainId}/${scope} : quiz absent ou vide`);
  if (!Number.isInteger(quiz.passingScore) || quiz.passingScore < 1 || quiz.passingScore > 100) throw new Error(`${domainId}/${scope} : passingScore invalide`);
  const seenQ = new Set();
  return {
    passingScore: quiz.passingScore,
    questions: quiz.questions.map((q) => {
      const qid = String(q.id);
      if (seenQ.has(qid)) throw new Error(`${domainId}/${scope} : question ${qid} en double`);
      seenQ.add(qid);
      if (!Array.isArray(q.options) || q.options.length < 2) throw new Error(`${domainId}/${scope}/${qid} : au moins 2 options`);
      if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length) throw new Error(`${domainId}/${scope}/${qid} : bonne réponse hors des options`);
      const options = q.options.map((t) => optionId(domainId, scope, qid, t));
      if (new Set(options).size !== options.length) throw new Error(`${domainId}/${scope}/${qid} : deux options identiques`);
      return { id: qid, options, correct: options[q.correct] };
    }),
  };
};
const quizzes = Object.fromEntries(educationDomains.map((d) => [d.id, {
  chapters: Object.fromEntries(d.chapters.map((c) => [String(c.id), spec(c.quiz, d.id, String(c.id))])),
  final: spec(d.finalQuiz, d.id, 'final'),
}]));
const textQuiz = `// GÉNÉRÉ par scripts/gen-education-catalog.mjs depuis data/education.js : ne pas modifier à la main.
// Quiz corrigés PAR LE SERVEUR : identifiants d'options (stables, voir data/quizIds.js) et identifiant de la bonne réponse.
export interface QuizQuestionSpec { id: string; options: string[]; correct: string }
export interface QuizSpec { passingScore: number; questions: QuizQuestionSpec[] }
export const EDUCATION_QUIZZES: Record<string, { chapters: Record<string, QuizSpec>; final: QuizSpec }> = ${JSON.stringify(quizzes, null, 2)};
`;
if (process.argv.includes('--check')) process.exit(readFileSync(out, 'utf8') === text && existsSync(outQuiz) && readFileSync(outQuiz, 'utf8') === textQuiz ? 0 : 1);
writeFileSync(out, text);
writeFileSync(outQuiz, textQuiz);
console.log('catalogue :', Object.entries(catalog).map(([k, v]) => `${k}=${v.length}`).join(', '));
console.log('quiz :', Object.entries(quizzes).map(([k, v]) => `${k}=${Object.keys(v.chapters).length} chapitres + final`).join(', '));
