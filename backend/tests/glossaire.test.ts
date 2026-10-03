import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { GLOSSARY, glossaryById } from '../../app/lib/glossaire.js';
import { FICHES } from '../../app/lib/glossaireFiches.js';
import {
  DOMAINS_BY_CATEGORY, DOMAINS_OVERRIDE, GLOSSARY_DOMAINS, GLOSSARY_LEVELS, GLOSSARY_TOOLS, LEVEL_1, LEVEL_3, SOURCES,
  SOURCE_CHECKED_ON, SOURCE_STATUS, TOOLS_BY_ID,
} from '../../app/lib/glossaireMeta.js';

const root = path.join(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const ids = GLOSSARY.map((g: any) => g.id);

describe('Glossaire refait : fiches, filtres, sources', () => {
  it('chaque mot a un exemple concret et au moins un « à ne pas confondre avec » valide', () => {
    for (const g of GLOSSARY as any[]) {
      const f = (FICHES as any)[g.id];
      expect(f, `fiche manquante : ${g.id}`).toBeTruthy();
      expect(f.ex.length, `exemple trop court : ${g.id}`).toBeGreaterThan(30);
      expect(f.vs.length, `aucune confusion : ${g.id}`).toBeGreaterThan(0);
      for (const v of f.vs) {
        if (v[0]) {
          expect(glossaryById[v[0]], `${g.id} renvoie vers un mot inconnu : ${v[0]}`).toBeTruthy();
          expect(v[0], `${g.id} se renvoie à lui-même`).not.toBe(g.id);
          expect(v[1].length).toBeGreaterThan(10);
        } else {
          expect(v[1] && v[2], `${g.id} : libellé et explication attendus`).toBeTruthy();
        }
      }
    }
    expect(Object.keys(FICHES).filter((k) => !ids.includes(k))).toEqual([]);
  });

  it('domaines et niveaux : valeurs connues, chaque filtre donne des résultats', () => {
    const domains = (g: any) => (DOMAINS_OVERRIDE as any)[g.id] || (DOMAINS_BY_CATEGORY as any)[g.category];
    for (const g of GLOSSARY as any[]) {
      expect(domains(g)?.length, `aucun domaine : ${g.id}`).toBeGreaterThan(0);
      for (const d of domains(g)) expect(GLOSSARY_DOMAINS, `${g.id} : domaine ${d}`).toHaveProperty(d);
    }
    for (const k of Object.keys(GLOSSARY_DOMAINS)) expect(GLOSSARY.some((g: any) => domains(g).includes(k)), `domaine vide : ${k}`).toBe(true);
    for (const id of [...LEVEL_1, ...LEVEL_3]) expect(ids, `niveau sur un mot inconnu : ${id}`).toContain(id);
    expect(LEVEL_1.filter((i: string) => LEVEL_3.includes(i))).toEqual([]);
    expect(Object.keys(GLOSSARY_LEVELS)).toEqual(['1', '2', '3']);
    const lvl = (id: string) => (LEVEL_1.includes(id) ? 1 : LEVEL_3.includes(id) ? 3 : 2);
    for (const n of [1, 2, 3]) expect(ids.filter((i: string) => lvl(i) === n).length, `niveau ${n} vide`).toBeGreaterThan(5);
    for (const k of Object.keys(DOMAINS_OVERRIDE)) expect(ids).toContain(k);
  });

  it('liens vers les simulateurs : mots et outils existent, les routes existent', () => {
    for (const [id, tools] of Object.entries(TOOLS_BY_ID as Record<string, string[]>)) {
      expect(ids, id).toContain(id);
      for (const t of tools) expect(GLOSSARY_TOOLS, `${id} : outil ${t}`).toHaveProperty(t);
    }
    for (const t of Object.values(GLOSSARY_TOOLS) as any[]) {
      const route = t.href.split('?')[0].replace(/^\//, '');
      expect(fs.existsSync(path.join(root, 'app', route, 'page.jsx')), `route absente : ${t.href}`).toBe(true);
    }
  });

  it('définitions sensibles : source ou mention « non sourcé » avec date de contrôle', () => {
    expect(SOURCE_CHECKED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const sensibles = ['pea', 'compte-titres', 'flat-tax', 'impot-crypto', 'prelevements-sociaux', 'endettement', 'frais-notaire', 'gli',
      'treve-hivernale', 'plus-value', 'abattement', 'surtaxe', 'ira', 'dpe', 'audit-energetique', 'courtage'];
    for (const id of sensibles) expect((SOURCES as any)[id], `source manquante : ${id}`).toBeTruthy();
    for (const [id, s] of Object.entries(SOURCES as Record<string, any>)) {
      expect(ids, id).toContain(id);
      expect(Object.keys(SOURCE_STATUS)).toContain(s.statut);
      expect(s.points.length).toBeGreaterThan(10);
      for (const r of s.refs) expect(r.url, `${id} : lien non sécurisé`).toMatch(/^https:\/\//);
      if (s.statut === 'verifie-recherche') expect(s.refs.length, `${id} : aucune référence`).toBeGreaterThan(0);
    }
    expect((SOURCES as any).gli.statut).toBe('non-source');
  });

  it('corrections d\'exactitude : plafond de courtage inventé retiré, clôture du PEA, 35 % d\'endettement, deux taux de prélèvements sociaux', () => {
    const t = (id: string) => `${glossaryById[id].short} ${glossaryById[id].long} ${glossaryById[id].inGame || ''}`;
    expect(t('courtage')).not.toMatch(/ne peut pas dépasser 0,5/);
    expect(t('pea')).toMatch(/clôture/);
    expect(t('endettement')).toMatch(/35 %/);
    expect(t('prelevements-sociaux')).toMatch(/18,6 %/);
    expect(t('prelevements-sociaux')).toMatch(/17,2 %/);
    expect(t('gli')).toMatch(/indicatif/);
  });

  it('la page : recherche instantanée, index A-Z, filtres, fiches repliables, icônes sans emoji', () => {
    const page = read('app/glossaire/page.jsx');
    for (const needle of ['type="search"', 'aria-label="Rechercher dans le glossaire"', 'Index alphabétique', 'Filtrer par domaine', 'Filtrer par niveau',
      'aria-expanded', 'À ne pas confondre avec', 'Exemple concret', 'hashchange', 'Tout réinitialiser']) {
      expect(page, needle).toContain(needle);
    }
    const css = read('app/styles/glossaire.css');
    expect(css).toMatch(/@media \(max-width: 520px\)/);
    expect(read('app/globals.css')).toContain('glossaire.css');
  });
});
