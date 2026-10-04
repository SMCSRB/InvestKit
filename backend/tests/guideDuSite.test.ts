// Guide du site (parcours du premier lancement + page d'aide complète) : contenu, exactitude des chiffres, liens qui existent, aucun emoji ni symbole d'euro.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { GUIDE_SECTIONS, GUIDE_MODES, GUIDE_DOMAINS, GUIDE_TOUR, GUIDE_SEEN_KEY, OPEN_GUIDE_EVENT } from '../../app/lib/guide.js';
import * as facts from '../../app/lib/siteFacts.js';
import { GLOSSARY } from '../../app/lib/glossaire.js';
import { educationDomains } from '../../data/education.js';
import { NAV_BOTTOM } from '../../app/components/shell/nav.js';
import { STARTING_CAPITAL, DAILY_REWARD_COINS, DAILY_REWARD_MAX_DAYS_PER_WEEK, RANKING_MIN_INVESTED, RANKING_MIN_ACTIVE_DAYS } from '../src/config/economy';
import { LEVEL_THRESHOLDS } from '../src/config/levelRules';
import { CATALOG } from '../src/data/crypto/catalog';
import { MODE_AVAILABILITY, GAME_MODES } from '../src/config/clockRules';

const root = path.join(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const allText = JSON.stringify({ GUIDE_SECTIONS, GUIDE_MODES, GUIDE_DOMAINS });

describe('guide : les rubriques demandées sont là', () => {
  it('six rubriques, dans l\'ordre, chacune avec un titre, un résumé et du texte', () => {
    expect(GUIDE_SECTIONS.map((s) => s.id)).toEqual(['quoi', 'temps', 'modes', 'domaines', 'progression', 'beta']);
    for (const s of GUIDE_SECTIONS) { expect(s.title.length).toBeGreaterThan(5); expect(s.short.length).toBeGreaterThan(20); expect(s.body.length).toBeGreaterThan(0); }
  });
  it('le parcours court reprend les rubriques et pointe vers la bonne ancre du guide', () => {
    expect(GUIDE_TOUR.map((t) => t.id)).toEqual(GUIDE_SECTIONS.map((s) => s.id));
    for (const t of GUIDE_TOUR) expect(t.href).toBe(`/guide#${t.id}`);
  });
  it('dit ce que le débutant doit savoir : jeu sans argent réel, 1 InvestCoin = 1 euro de jeu, boutons de temps, bêta, bouton « Un retour ? »', () => {
    const t = allText;
    expect(t).toMatch(/jeu de simulation/);
    expect(t).toMatch(/1 InvestCoin vaut 1 euro de jeu/);
    expect(t).toMatch(/aucune valeur réelle/);
    for (const b of ['+1 jour', '+1 semaine', '+1 mois']) expect(t).toContain(b);
    expect(t).toMatch(/une seule date de jeu/);
    expect(t).toMatch(/bêta/);
    expect(t).toContain('Un retour ?');
    expect(read('app/components/FeedbackWidget.jsx')).toContain('Un retour ?');       // le libellé cité existe vraiment
    for (const w of ['XP', 'niveau', 'badges', 'classements', 'Joueur anonyme']) expect(t, w).toContain(w);
  });
  it('les quatre domaines sont présents', () => {
    expect(GUIDE_DOMAINS.map((d) => d.name)).toEqual(['Bourse et PEA', 'Crypto', 'Immobilier', 'Banque']);
  });
});

describe('guide : modes de jeu conformes à la réalité', () => {
  it('Histoire disponible ; Bac à sable et En ligne présentés comme « pas encore disponibles » (comme le serveur)', () => {
    expect(GUIDE_MODES.map((m) => m.name)).toEqual(['Histoire', 'Bac à sable', 'En ligne']);
    for (const m of GUIDE_MODES) expect(m.available, m.id).toBe(MODE_AVAILABILITY[m.id as keyof typeof MODE_AVAILABILITY]);
    expect(GUIDE_MODES.map((m) => m.id)).toEqual([...GAME_MODES]);
    for (const m of GUIDE_MODES.filter((x) => !x.available)) expect(`${m.who} ${m.text}`).toMatch(/Prévu|prévu/);
  });
  it('les règles d\'accès décidées sont dites : En ligne réservé au Pro ; Bac à sable limité aux périodes jouées pour un compte gratuit', () => {
    const live = GUIDE_MODES.find((m) => m.id === 'live')!, sb = GUIDE_MODES.find((m) => m.id === 'sandbox')!;
    expect(live.who).toMatch(/Pro/);
    expect(sb.text).toMatch(/périodes déjà jouées/); expect(sb.text).toMatch(/plan Pro/);
  });
});

describe('guide : les chiffres cités sont ceux du serveur (jamais écrits en dur dans le texte)', () => {
  it('siteFacts = réglages du serveur', () => {
    expect(facts.STARTING_COINS).toBe(STARTING_CAPITAL);
    expect(facts.DAILY_REWARD_COINS).toBe(DAILY_REWARD_COINS);
    expect(facts.DAILY_REWARD_MAX_DAYS).toBe(DAILY_REWARD_MAX_DAYS_PER_WEEK);
    expect(facts.RANKING_MIN_INVESTED).toBe(RANKING_MIN_INVESTED);
    expect(facts.RANKING_MIN_ACTIVE_DAYS).toBe(RANKING_MIN_ACTIVE_DAYS);
    expect(facts.LEVEL_COUNT).toBe(LEVEL_THRESHOLDS.length);
    expect(facts.CRYPTO_ASSET_COUNT).toBe(CATALOG.length);
  });
  it('le texte du guide affiche bien ces chiffres', () => {
    const fr = (v: number) => v.toLocaleString('fr-FR');
    for (const v of [STARTING_CAPITAL, RANKING_MIN_INVESTED]) expect(allText).toContain(fr(v));
    expect(allText).toContain(`${DAILY_REWARD_COINS}`); expect(allText).toContain(`${LEVEL_THRESHOLDS.length} niveaux`);
  });
  it('aucun nombre à deux chiffres ou plus n\'est écrit en dur dans guide.js (tout vient de siteFacts)', () => {
    const src = read('app/lib/guide.js').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n').replace(/GUIDE_SEEN_KEY = '[^']*'/, '');
    expect(src.match(/\d{2,}/g)).toBeNull();
  });
  it('la liste des valeurs non sourcées signale ces chiffres', () => {
    const f = read('app/lib/siteFacts.js');
    expect(f).toContain('VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER');
  });
});

describe('guide : tous les liens existent', () => {
  const links = [...GUIDE_SECTIONS.flatMap((s) => s.links), ...GUIDE_DOMAINS.flatMap((d) => [{ href: d.href }, ...(d.course ? [{ href: `/education/${d.course}` }] : []), ...d.terms.map((t) => ({ href: `/glossaire#${t.id}` }))])];
  it('chaque lien interne mène à une vraie page, un vrai cours ou un vrai mot du glossaire', () => {
    const ids = new Set(GLOSSARY.map((g: any) => g.id)), courses = new Set(educationDomains.map((d: any) => d.id));
    expect(links.length).toBeGreaterThan(15);
    for (const { href } of links) {
      const [p, hash] = href.split('#');
      expect(href.startsWith('/'), href).toBe(true);
      if (p.startsWith('/education/')) expect(courses.has(p.slice('/education/'.length)), href).toBe(true);
      else expect(fs.existsSync(path.join(root, 'app', p.slice(1), 'page.jsx')), href).toBe(true);
      if (p === '/glossaire' && hash) expect(ids.has(hash), href).toBe(true);
    }
  });
  it('le guide est dans le menu, à côté de « Aide et support »', () => {
    expect(NAV_BOTTOM.map((n: any) => n.id)).toEqual(['settings', 'guide', 'support']);
    expect(NAV_BOTTOM.find((n: any) => n.id === 'guide')!.href).toBe('/guide');
  });
});

describe('guide : honnêteté et ton', () => {
  const files = ['app/lib/guide.js', 'app/guide/GuideContent.jsx', 'app/support/SupportContent.jsx', 'app/components/guide/GuideTour.jsx', 'app/components/guide/GuideText.jsx'];
  it('aucun emoji et aucun symbole d\'euro dans le guide (les montants du jeu portent l\'icône de pièce)', () => {
    for (const f of files) {
      const src = read(f).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
      expect(/\p{Extended_Pictographic}/u.test(src), `${f} : emoji`).toBe(false);
      expect(src.includes('€'), `${f} : symbole €`).toBe(false);
    }
  });
  it('les données simplifiées ou fictives sont dites comme telles', () => {
    expect(allText).toMatch(/séries annuelles simplifiées, pas de vrais cours/);
    expect(allText).toMatch(/fictives/);
  });
});

describe('guide : parcours du premier lancement', () => {
  const tour = read('app/components/guide/GuideTour.jsx');
  it('on peut le passer, il ne s\'ouvre qu\'une fois, pour un joueur connecté, hors pages de connexion et d\'administration', () => {
    expect(tour).toContain('Passer');
    expect(tour).toContain('isLoggedIn()');
    expect(tour).toContain('wasSeen()');
    for (const p of ["'/login'", "'/admin'", "'/signup'", "'/guide'"]) expect(tour).toContain(p);
    expect(tour).toContain('Modal');                                                  // Échap, focus piégé et rendu du focus : déjà gérés par la fenêtre commune
    expect(GUIDE_SEEN_KEY).toBe('ik-guide-seen-v1'); expect(OPEN_GUIDE_EVENT).toBe('ik:open-guide');
  });
  it('il est monté pour toutes les pages, et le test de connexion le passe pour ne pas gêner les autres parcours', () => {
    expect(read('app/components/ClientLayoutWrapper.jsx')).toContain('<GuideTour />');
    expect(read('e2e/auth.setup.ts')).toContain('guide-skip');
  });
  it('« Aide et support » le relance et pointe vers le guide, le glossaire, les cours et le contact (plus de redirection)', () => {
    const page = read('app/support/page.jsx'); expect(page).not.toContain('redirect(');
    const s = read('app/support/SupportContent.jsx');
    expect(s).toContain('OPEN_GUIDE_EVENT'); expect(s).toContain('relaunch-guide');
    for (const href of ['/guide', '/glossaire', '/education', '/contact']) expect(s).toContain(`"${href}"`);
    expect(read('app/guide/GuideContent.jsx')).toContain('OPEN_GUIDE_EVENT');
  });
});
