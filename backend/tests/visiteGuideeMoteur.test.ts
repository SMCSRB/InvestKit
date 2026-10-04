// Visite guidée : calculs purs du moteur (projecteur, bulle, étapes, repli) + cohérence des étapes avec le serveur.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { holeOf, placePopover, stepIndexFrom, progressOf, resolveTarget, pathMatches, resumeIndex, shouldInvite, isUsableRect, MOBILE_MAX } from '../../app/lib/tour/engine.js';
import { TOUR_STEPS, PAGE_TOURS, SECTIONS, stepsOf, stepById, pageTourFor } from '../../app/lib/tour/steps.js';
import { GUIDE_STEP_IDS, GUIDE_SECTIONS, GUIDE_TOURS } from '../src/config/guideRules';
import { MODE_AVAILABILITY } from '../src/config/clockRules';
import { glossaryById } from '../../app/lib/glossaire.js';

const root = path.join(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, height });

describe('projecteur : zone mise en lumière', () => {
  it('élargie de la marge, jamais hors de l\'écran', () => {
    expect(holeOf(rect(100, 100, 200, 50), 1000, 800)).toEqual({ left: 92, top: 92, width: 216, height: 66 });
    const h = holeOf(rect(-30, 780, 200, 100), 1000, 800);
    expect(h.left).toBe(0); expect(h.top).toBeLessThanOrEqual(800); expect(h.top + h.height).toBeLessThanOrEqual(800);
  });
  it('un rectangle vide ou absurde n\'est pas utilisable (l\'étape sera sautée)', () => {
    expect(isUsableRect(rect(0, 0, 0, 0))).toBe(false);
    expect(isUsableRect(null)).toBe(false);
    expect(isUsableRect(rect(0, 0, NaN, 10))).toBe(false);
    expect(isUsableRect(rect(10, 10, 80, 30))).toBe(true);
  });
});

describe('bulle : position', () => {
  const vp = { w: 1280, h: 800 }, size = { w: 340, h: 200 };
  it('du côté préféré quand il y a la place, avec la flèche sur le centre de l\'élément', () => {
    const hole = holeOf(rect(400, 100, 200, 50), vp.w, vp.h);
    const p = placePopover({ hole, size, viewport: vp, prefer: 'bottom' });
    expect(p.mode).toBe('bubble'); expect(p.placement).toBe('bottom');
    expect(p.top).toBeGreaterThanOrEqual(hole.top + hole.height);
    expect(p.left + p.arrow).toBeCloseTo(hole.left + hole.width / 2, -1);
  });
  it('bascule de l\'autre côté s\'il n\'y a pas la place, et reste toujours dans l\'écran', () => {
    const hole = holeOf(rect(400, 700, 200, 60), vp.w, vp.h);
    const p = placePopover({ hole, size, viewport: vp, prefer: 'bottom' });
    expect(p.placement).toBe('top');
    for (const r of [rect(0, 0, 50, 50), rect(1230, 0, 50, 50), rect(1230, 750, 50, 50), rect(600, 380, 80, 40)]) {
      const q = placePopover({ hole: holeOf(r, vp.w, vp.h), size, viewport: vp });
      expect(q.left).toBeGreaterThanOrEqual(0); expect(q.top).toBeGreaterThanOrEqual(0);
      expect(q.left + (q.width ?? size.w)).toBeLessThanOrEqual(vp.w); expect(q.top + size.h).toBeLessThanOrEqual(vp.h);
    }
  });
  it('téléphone : panneau fixé en bas ; sans élément visé : carte centrée', () => {
    expect(placePopover({ hole: holeOf(rect(10, 10, 100, 40), 390, 844), size, viewport: { w: 390, h: 844 } }).mode).toBe('sheet');
    expect(MOBILE_MAX).toBeGreaterThanOrEqual(390);
    const c = placePopover({ hole: null, size, viewport: vp });
    expect(c.mode).toBe('center'); expect(c.left).toBe(Math.round((vp.w - size.w) / 2));
  });
  it('écran très étroit pour une bulle (hors téléphone) : la largeur est ramenée à l\'écran', () => {
    const p = placePopover({ hole: holeOf(rect(5, 5, 20, 20), 700, 600), size: { w: 900, h: 200 }, viewport: { w: 700, h: 600 } });
    expect(p.width).toBeLessThanOrEqual(700 - 24);
  });
});

describe('étapes : navigation et compteur', () => {
  const steps = [{ id: 'a' }, { id: 'go', kind: 'travel' }, { id: 'b' }, { id: 'c' }];
  it('saute les étapes écartées, dans les deux sens, et rend null au bout', () => {
    expect(stepIndexFrom(steps, 0, 1)).toBe(1);
    expect(stepIndexFrom(steps, 0, 1, new Set(['go', 'b']))).toBe(3);
    expect(stepIndexFrom(steps, 3, 1)).toBeNull();
    expect(stepIndexFrom(steps, 2, -1, new Set(['go']))).toBe(0);
    expect(stepIndexFrom(steps, 0, -1)).toBeNull();
  });
  it('le compteur ignore les déplacements et les étapes écartées', () => {
    expect(progressOf(steps, 2)).toEqual({ n: 2, total: 3 });
    expect(progressOf(steps, 3, new Set(['b']))).toEqual({ n: 2, total: 2 });
    expect(progressOf(steps, 1).total).toBe(3);
  });
  it('reprise : l\'étape mémorisée, sinon le début ; une étape inconnue ne casse rien', () => {
    expect(resumeIndex(steps, 'c')).toBe(3); expect(resumeIndex(steps, 'zzz')).toBe(0); expect(resumeIndex(steps, null)).toBe(0);
  });
  it('page de l\'étape : sans page = partout ; sinon la page ou ses sous-pages', () => {
    expect(pathMatches(undefined, '/n-importe')).toBe(true);
    expect(pathMatches('/crypto', '/crypto')).toBe(true);
    expect(pathMatches('/crypto', '/crypto/x')).toBe(true);
    expect(pathMatches('/crypto', '/cryptos')).toBe(false);
  });
});

describe('élément visé : repli sans blocage', () => {
  const nodes: Record<string, string[]> = { '.a': ['hidden', 'ok1'], '.b': ['ok2'] };
  const q = (s: string) => { if (s === '??') throw new Error('invalide'); return nodes[s] ?? []; };
  const vis = (n: string) => n !== 'hidden';
  it('premier sélecteur qui donne un élément visible ; cache et inexistants ignorés ; sélecteur invalide ignoré', () => {
    expect(resolveTarget(['.zzz', '.a'], q, vis)).toBe('ok1');
    expect(resolveTarget(['??', '.b'], q, vis)).toBe('ok2');
    expect(resolveTarget('.zzz', q, vis)).toBeNull();
    expect(resolveTarget(undefined, q, vis)).toBeNull();
    expect(resolveTarget(['.a'], q, () => false)).toBeNull();
  });
});

describe('invitation à une mini-visite', () => {
  const base = { pageTour: 'bourse', tours: { main: { status: 'done' }, bourse: { status: 'new' } }, seen: [] as string[], running: false, section: 'bourse' };
  it('seulement si jamais lancée, sans visite en cours, et rubrique pas déjà vue', () => {
    expect(shouldInvite({ ...base, tours: { main: { status: 'new' }, bourse: { status: 'new' } } })).toBe(true);
    expect(shouldInvite({ ...base, running: true })).toBe(false);
    expect(shouldInvite({ ...base, tours: { main: { status: 'running' }, bourse: { status: 'new' } } })).toBe(false);
    expect(shouldInvite({ ...base, tours: { main: { status: 'done' }, bourse: { status: 'dismissed' } } })).toBe(false);
    expect(shouldInvite({ ...base, tours: { main: { status: 'done' }, bourse: { status: 'done' } } })).toBe(false);
    expect(shouldInvite({ ...base, seen: ['bourse'] })).toBe(false);
    expect(shouldInvite({ ...base, pageTour: null })).toBe(false);
  });
});

describe('étapes : cohérence avec le serveur et règles de rédaction', () => {
  it('mêmes identifiants d\'étapes, de rubriques et de visites que le serveur (liste fermée)', () => {
    expect(TOUR_STEPS.map((s: any) => s.id)).toEqual([...GUIDE_STEP_IDS]);
    expect(SECTIONS.map((s: any) => s.id)).toEqual([...GUIDE_SECTIONS]);
    expect(['main', ...Object.keys(PAGE_TOURS)]).toEqual([...GUIDE_TOURS]);
    for (const s of TOUR_STEPS as any[]) expect(GUIDE_SECTIONS).toContain(s.section);
  });
  it('le parcours suit l\'ordre demandé : tableau de bord, Bourse, Crypto, Immobilier, Banque, Éducation, Classements, Profil, Un retour ?', () => {
    const order = (TOUR_STEPS as any[]).map((s) => s.section).filter((x, i, a) => a.indexOf(x) === i);
    expect(order).toEqual(['dashboard', 'bourse', 'crypto', 'immobilier', 'banque', 'education', 'classements', 'profil', 'retour']);
    expect((TOUR_STEPS as any[])[0].id).toBe('welcome'); expect((TOUR_STEPS as any[]).at(-1).id).toBe('retour-bouton');
  });
  it('mini-visites : 3 à 4 étapes chacune, sur la bonne page, pour Bourse, Crypto, Immobilier et Banque', () => {
    for (const [tour, v] of Object.entries(PAGE_TOURS) as any) {
      const steps = stepsOf(tour);
      expect(steps.length, tour).toBeGreaterThanOrEqual(3); expect(steps.length, tour).toBeLessThanOrEqual(4);
      for (const s of steps) expect(s.page, `${tour}/${s.id}`).toBe(v.path);
    }
    expect(pageTourFor('/bourse')).toBe('bourse'); expect(pageTourFor('/crypto/x')).toBe('crypto'); expect(pageTourFor('/dashboard')).toBeNull();
  });
  it('les déplacements cliquent le menu : chacun vise un élément du menu et mène à une vraie page', () => {
    for (const s of (TOUR_STEPS as any[]).filter((x) => x.kind === 'travel')) {
      expect(s.via, s.id).toMatch(/data-tour="(nav-[a-z]+|account-menu)"/);
      expect(fs.existsSync(path.join(root, 'app', s.to.slice(1), 'page.jsx')), s.id).toBe(true);
    }
  });
  it('étapes actives : une attente claire, un message, et JAMAIS d\'action qui coûte des pièces', () => {
    const active = (TOUR_STEPS as any[]).filter((s) => s.action);
    expect(active.map((s) => s.id).sort()).toEqual(['crypto-depart', 'crypto-fiche', 'crypto-semaine', 'immo-depart']);
    for (const s of active) { expect(Object.keys(s.action.done).length).toBe(1); expect(s.action.hint.length).toBeGreaterThan(10); }
    const text = JSON.stringify(TOUR_STEPS);
    for (const bad of ['confirme l\'achat', 'Confirmer l', 'Emprunte maintenant']) expect(text).not.toContain(bad);
    const week = stepById('crypto-semaine') as any;
    expect(week.text).toMatch(/avancer le temps|avancer le temps/i); expect(week.text).toMatch(/ne revient pas en arrière/); expect(week.text).toMatch(/aucune pièce/);
    expect(stepById('bourse-temps')!.text).toMatch(/horloge de tout le jeu/);
    expect(stepById('immo-temps')!.text).toMatch(/horloge de tout le jeu/);
  });
  it('chaque action qui avance le temps ou dépense est annoncée comme telle', () => {
    expect(stepById('crypto-achat')!.text).toMatch(/dépense de vraies pièces du jeu/);
    expect(stepById('crypto-achat')!.text).toMatch(/jamais à ta place/);
  });
  it('modes : Histoire ouvert, Bac à sable et En ligne « plus tard » (comme le serveur)', () => {
    const t = stepById('crypto-modes')!.text;
    expect(MODE_AVAILABILITY).toEqual({ history: true, sandbox: false, live: false });
    expect(t).toMatch(/Histoire est ouvert aujourd'hui/); expect(t).toMatch(/Bac à sable/); expect(t).toMatch(/En ligne/); expect(t).toMatch(/plan Pro/); expect(t).toMatch(/arrivent plus tard/);
  });
  it('français simple : aucun emoji, aucun symbole d\'euro, aucun nombre écrit en dur, pas de formulation de cours réels', () => {
    const src = read('app/lib/tour/steps.js').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(/\p{Extended_Pictographic}/u.test(src)).toBe(false);
    expect(src.includes('€')).toBe(false);
    const texts = (TOUR_STEPS as any[]).flatMap((s) => [s.title, s.text, s.action?.hint ?? '', s.action?.success ?? '']).join(' ');
    expect(texts.match(/\d{2,}/g)).toBeNull();
    for (const re of [/cours réels?/i, /prix réels?/i, /en direct/i, /temps réel/i, /vrais (cours|prix)/i]) expect(texts).not.toMatch(re);
    for (const s of TOUR_STEPS as any[]) { expect(s.title.length).toBeLessThanOrEqual(48); expect(s.text.length).toBeLessThanOrEqual(420); }
  });
  it('chaque sélecteur d\'élément visé existe vraiment dans le code du site', () => {
    const code = ['app/components/shell/Sidebar.jsx', 'app/components/shell/Topbar.jsx', 'app/components/FeedbackWidget.jsx', 'app/dashboard/DashHero.jsx', 'app/dashboard/page.jsx', 'app/bourse/page.jsx', 'app/crypto/page.jsx',
      'app/immobilier/page.jsx', 'app/banque/page.jsx', 'app/education/page.jsx', 'app/classements/page.jsx', 'app/profile/page.jsx', 'app/components/OnboardingChecklist.jsx', 'app/components/profile/ProfileVisibility.jsx', 'app/components/shell/nav.js']
      .map(read).join('\n');
    const attrs = new Set<string>();
    for (const s of TOUR_STEPS as any[]) for (const sel of [].concat(s.target ?? [], s.via ?? [], s.prepare?.click ?? [], s.action?.done?.appears ?? [])) {
      for (const m of String(sel).matchAll(/\[data-(tour|testid)(\^?)="([^"]+)"\]/g)) attrs.add(`${m[1]}:${m[2]}:${m[3]}`);
    }
    for (const a of attrs) {
      const [kind, prefix, value] = a.split(':');
      if (kind === 'tour' && value.startsWith('nav-')) { expect(read('app/components/shell/Sidebar.jsx'), a).toContain("'data-tour': `nav-${item.id}`"); continue; }
      expect(code.includes(prefix ? value : `"${value}"`) || code.includes(`'${value}'`) || code.includes(value) || code.includes(`${value.replace(/[^-]*$/, '')}$` + '{'), a).toBe(true);
    }
  });
});
