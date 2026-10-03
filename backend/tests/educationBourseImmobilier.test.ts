// Parcours Bourse et Immobilier : présents (plus de « manquants »), complets, sans cadenas, liés au glossaire, corrigés par le serveur.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { educationDomains } from '../../data/education.js';
import { glossaryById } from '../../app/lib/glossaire.js';
import { EDUCATION_CATALOG } from '../src/data/educationCatalog';
import { EDUCATION_QUIZZES } from '../src/data/educationQuizzes';

const root = join(__dirname, '../..');
const byId = (id: string) => (educationDomains as any[]).find((d) => d.id === id);

describe('parcours d\'éducation Bourse et Immobilier', () => {
  it('les 4 parcours existent : Bourse, Immobilier, Crypto, Crypto marché', () => {
    expect((educationDomains as any[]).map((d) => d.id).sort()).toEqual(['crypto', 'crypto_market', 'real_estate', 'stocks']);
  });
  for (const id of ['stocks', 'real_estate']) {
    it(`${id} : 5 chapitres rédigés, quiz de 5 questions chacun, quiz final, termes du glossaire existants`, () => {
      const d = byId(id);
      expect(d.chapters).toHaveLength(5);
      expect(d.totalChapters).toBe(5);
      expect(d.locked).toBeUndefined();                                         // jamais de cadenas : l'éducation est ouverte à tous les comptes
      for (const c of d.chapters) {
        expect(c.content.length, `${id}/${c.id}`).toBeGreaterThan(400);
        expect(c.content).not.toMatch(/undefined|€|TODO/);
        expect(c.quiz.questions).toHaveLength(5);
        for (const v of c.vocabulary) expect(glossaryById[v.glossaryId], `${id}/${c.id} : ${v.glossaryId}`).toBeTruthy();
        for (const q of c.quiz.questions) { expect(q.options).toHaveLength(4); expect(q.correct).toBeGreaterThanOrEqual(0); expect(q.correct).toBeLessThan(4); expect(q.explanation.length).toBeGreaterThan(10); }
      }
      expect(d.finalQuiz.questions.length).toBeGreaterThanOrEqual(8);
    });
    it(`${id} : le serveur connaît les chapitres et corrige les quiz (catalogue généré à jour)`, () => {
      expect(EDUCATION_CATALOG[id]).toEqual(['1', '2', '3', '4', '5']);
      expect(Object.keys(EDUCATION_QUIZZES[id].chapters)).toEqual(['1', '2', '3', '4', '5']);
      expect(EDUCATION_QUIZZES[id].final.questions.length).toBeGreaterThanOrEqual(8);
    });
  }
  it('la page Éducation ne dessine plus de cadenas sur un parcours non terminé (seulement s\'il est réellement verrouillé)', () => {
    const page = readFileSync(join(root, 'app/education/page.jsx'), 'utf8');
    expect(page).toContain("isLocked ? 'lock' : domain.badge");
    expect(page).not.toContain("isCompleted ? domain.badge : 'lock'");
  });
});
