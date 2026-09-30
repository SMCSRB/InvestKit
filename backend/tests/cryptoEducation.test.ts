import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
// @ts-ignore — modules ESM du frontend (données pures)
import { GLOSSARY, GLOSSARY_CATEGORIES, glossaryById } from '../../app/lib/glossaire.js';
// @ts-ignore
import { educationDomains } from '../../data/education.js';

const root = path.resolve(__dirname, '../..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');
const CRYPTO_TERMS = ['blockchain', 'wallet', 'cle-privee', 'frais-reseau', 'stablecoin', 'depeg', 'levier', 'liquidation', 'appel-de-marge', 'ltv', 'volume', 'capitalisation', 'liquidite', 'glissement', 'ecart-achat-vente', 'stop-loss', 'take-profit', 'ordre-limite', 'ordre-marche'];

describe('glossaire Crypto et parcours pédagogique', () => {
  it('glossaire : identifiants uniques, catégories connues, textes rédigés, termes crypto demandés présents', () => {
    const ids = GLOSSARY.map((g: any) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of GLOSSARY) { expect(GLOSSARY_CATEGORIES[g.category], g.id).toBeTruthy(); expect(g.short.length, g.id).toBeGreaterThan(15); expect(g.long.length, g.id).toBeGreaterThan(40); }
    for (const t of CRYPTO_TERMS) expect(glossaryById[t], t).toBeTruthy();
    expect(GLOSSARY.filter((g: any) => g.category === 'crypto').length).toBeGreaterThanOrEqual(30);
  });

  it('chaque entrée crypto renvoie vers un chapitre de quiz qui existe', () => {
    const dom = educationDomains.find((d: any) => d.id === 'crypto_market');
    expect(dom).toBeTruthy();
    for (const g of GLOSSARY.filter((x: any) => x.quiz)) {
      expect(g.quiz.domain, g.id).toBe('crypto_market');
      expect(dom.chapters.find((c: any) => c.id === g.quiz.chapter), g.id).toBeTruthy();
    }
  });

  it('parcours : chapitres numérotés, quiz bien formés (4 choix, bonne réponse valide, explication), vocabulaire relié au glossaire, quiz final', () => {
    const dom = educationDomains.find((d: any) => d.id === 'crypto_market');
    expect(dom.totalChapters).toBe(dom.chapters.length);
    dom.chapters.forEach((c: any, i: number) => {
      expect(c.id).toBe(i + 1);
      expect(c.content.length).toBeGreaterThan(400);
      expect(c.quiz.questions.length).toBeGreaterThanOrEqual(5);
      for (const q of c.quiz.questions) { expect(q.options).toHaveLength(4); expect(q.correct).toBeGreaterThanOrEqual(0); expect(q.correct).toBeLessThan(4); expect(q.explanation.length).toBeGreaterThan(20); }
      for (const v of c.vocabulary) if (v.glossaryId) expect(glossaryById[v.glossaryId], v.glossaryId).toBeTruthy();
    });
    expect(dom.finalQuiz.questions.length).toBeGreaterThanOrEqual(8);
    for (const q of dom.finalQuiz.questions) { expect(q.options).toHaveLength(4); expect(q.correct).toBeLessThan(4); }
    expect(new Set(educationDomains.map((d: any) => d.id)).size).toBe(educationDomains.length);
  });

  it('toutes les icônes « ? » du domaine Crypto pointent vers un terme existant, et les principales notions y sont expliquées', () => {
    const used = new Set<string>();
    for (const f of ['app/crypto/page.jsx', 'app/crypto/PriceChart.jsx']) for (const m of read(f).matchAll(/term="([a-z0-9-]+)"/g)) used.add(m[1]);
    for (const m of read('app/crypto/PriceChart.jsx').matchAll(/: '([a-z-]+)'[,}]/g)) if (glossaryById[m[1]]) used.add(m[1]);
    for (const t of used) expect(glossaryById[t], `terme inconnu : ${t}`).toBeTruthy();
    for (const t of ['volume', 'capitalisation', 'palier-liquidite', 'glissement', 'ecart-achat-vente', 'stop-loss', 'take-profit', 'ordre-limite', 'ltv', 'appel-de-marge', 'liquidation', 'echange-crypto', 'echelle-log', 'base-100']) expect(used.has(t), `pas de « ? » pour ${t}`).toBe(true);
    expect(read('app/crypto/page.jsx')).toContain('/education/crypto_market');
  });

  it('honnêteté : aucun texte du parcours ne promet un gain et le rappel « pas un conseil » figure dans le domaine', () => {
    const all = JSON.stringify(educationDomains.find((d: any) => d.id === 'crypto_market')).toLowerCase();
    for (const banned of ['gain garanti', 'rendement garanti est', 'vous allez devenir riche', 'investissez maintenant']) expect(all.includes(banned), banned).toBe(false);
    expect(read('backend/src/config/cryptoMarketRules.ts')).toContain('pas un conseil en investissement');
  });
});
