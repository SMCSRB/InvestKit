// Retours de test sur la copie de test : explication de la performance Immobilier, étape « domaine gratuit » (Pro), lien retour de la Banque,
// mention « Données illustratives » discrète.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { hasDb, setupDb, teardownDb, createUser, minDownCoins } from './helpers';
import { realEstateService as svc } from '../src/services/realEstateService';
import { realEstateLifeService as life } from '../src/services/realEstateLifeService';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { overviewService } from '../src/services/overviewService';
import { onboardingService } from '../src/services/onboardingService';
// @ts-expect-error module JavaScript du frontend
import { trackPage, backTarget } from '../../app/lib/backLink.js';

const root = join(__dirname, '../..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe.skipIf(!hasDb)('1) tableau de bord : la performance Immobilier est expliquée avec les chiffres du joueur', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  const cleanListing = async (type: string) => {
    for (const l of await src.listListings(2010)) {
      if (l.type === type && l.condition === 'good' && l.advertisedWorks === 0 && (await src.getExpertise(l.id, 2010))!.hiddenDefects.length === 0) return l;
    }
    throw new Error('annonce introuvable');
  };

  for (const rented of [false, true]) {
    it(`${rented ? 'bien loué' : 'bien non loué'} : gain = revente nette + loyers + ventes − investi − intérêts, performance = gain ÷ capital de départ`, async () => {
      const uid = await createUser({ balance: 100000, tier: 'pro', freeDomain: 'real_estate' });
      await svc.startGame(uid, 'executive');
      const l = await cleanListing('apartment');
      await svc.purchase(uid, { listingId: l.id, downPaymentCoins: minDownCoins(l), months: 240 });
      if (rented) {
        const p = (await svc.listProperties(uid)).properties[0];
        await life.listForRent(uid, p.id, 1);
        for (let i = 0; i < 4; i++) await life.advanceTime(uid, 1);
      }
      const ov: any = await overviewService.get(uid);
      const re = ov.realEstate;
      const e = re.performanceExplain;
      expect(e).toBeTruthy();
      // Le gain s'explique par ses éléments (à l'arrondi près : chaque terme est arrondi à la pièce).
      const recomputed = re.netLiquidationCoins + e.rentCollectedCoins + e.salesAlreadyDoneCoins - e.investedTotalCoins - e.personalLoanInterestCoins;
      expect(Math.abs(e.gainCoins - recomputed)).toBeLessThanOrEqual(3);
      // La performance est le gain rapporté au capital de départ du compte (Pro : environ le double d'un compte gratuit).
      expect(e.startingCapitalCoins).toBeGreaterThan(10000 - 1);
      expect(Math.abs(re.performancePct - (e.gainCoins / e.startingCapitalCoins) * 100)).toBeLessThan(0.5);
      // Ce que le joueur a mis = apport + frais de dossier + travaux ; l'apport comprend les frais de notaire.
      expect(Math.abs(e.investedTotalCoins - (e.downPaymentCoins + e.loanFeesCoins + e.worksCoins))).toBeLessThanOrEqual(2);
      expect(e.notaryFeesCoins).toBeGreaterThan(0);
      expect(e.notaryFeesCoins).toBeLessThanOrEqual(e.downPaymentCoins);
      expect(e.purchasePriceCoins).toBe(l.price);
      // Coûts d'une revente immédiate : tous positifs ou nuls ; la décote d'un bien loué n'existe que s'il est loué.
      for (const k of ['occupiedDiscountCoins', 'agencyFeesCoins', 'diagnosticsCoins', 'earlyRepaymentCoins', 'taxesCoins', 'depositCoins']) expect(e[k], k).toBeGreaterThanOrEqual(0);
      expect(e.agencyFeesCoins).toBeGreaterThan(0);
      // La décote ne s'applique que si le bien est réellement occupé à cet instant (la recherche d'un locataire est aléatoire : on lit le vrai statut).
      const status = (await svc.listProperties(uid)).properties[0].status;
      if (status === 'let') expect(e.occupiedDiscountCoins).toBeGreaterThan(0); else expect(e.occupiedDiscountCoins).toBe(0);
      if (!rented) expect(status).not.toBe('let');
    });
  }

  it('la carte affiche un libellé clair et le bloc « Comment est calculé ce pourcentage ? »', () => {
    const t = read('app/dashboard/OverviewTab.jsx');
    expect(t).toContain('Résultat si tu revendais aujourd’hui');
    expect(t).toContain('data-testid="dash-re-explain"');
    for (const mot of ['frais de notaire', 'apport', 'décote d’un bien loué', 'prix d’achat', 'capital de départ']) expect(t).toContain(mot);
    expect(t).not.toMatch(/label="Performance"/);
    // Deux lignes séparées : la valeur du bien (marché) et le résultat d'une revente, pour ne pas lire le pourcentage comme la valeur du bien.
    expect(t).toContain('label="Valeur de tes biens"');
    expect(t).toContain('data-testid="dash-re-values-note"');
  });
});

describe.skipIf(!hasDb)('2) « Tes premiers pas » : pas d\'étape « domaine gratuit » pour un compte Pro', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);
  const keys = async (uid: string) => (await onboardingService.get(uid)).steps.map((s) => s.key);

  it('compte Pro (abonnement) : l\'étape n\'est ni montrée, ni comptée', async () => {
    const free = await createUser({ tier: 'free' });
    const pro = await createUser({ tier: 'pro' });
    expect(await keys(free)).toContain('free_domain');
    expect(await keys(pro)).not.toContain('free_domain');
    const a = await onboardingService.get(free);
    const b = await onboardingService.get(pro);
    expect(b.total).toBe(a.total - 1);
    expect(b.nextStep?.key).not.toBe('free_domain');
  });
  it('compte Pro accordé à la main (pro_override) : même chose', async () => {
    const pro = await createUser({ tier: 'free', proOverride: true });
    expect(await keys(pro)).not.toContain('free_domain');
  });
  it('compte gratuit : l\'étape est cochée seulement après avoir choisi son domaine', async () => {
    const free = await createUser({ tier: 'free' });
    expect((await onboardingService.get(free)).steps.find((s) => s.key === 'free_domain')!.done).toBe(false);
    const chosen = await createUser({ tier: 'free', freeDomain: 'stocks' });
    expect((await onboardingService.get(chosen)).steps.find((s) => s.key === 'free_domain')!.done).toBe(true);
  });
  it('un compte Pro ne reçoit aucune récompense pour cette étape', async () => {
    const pro = await createUser({ tier: 'pro' });
    const state = await onboardingService.get(pro);
    expect(state.claimableSteps).not.toContain('free_domain');
  });
});

describe('3) Banque : le lien « retour » mène à la page d\'où l\'on vient, sinon au tableau de bord', () => {
  const store: Record<string, string> = {};
  (globalThis as any).sessionStorage = { getItem: (k: string) => (k in store ? store[k] : null), setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } };
  const reset = () => { for (const k of Object.keys(store)) delete store[k]; };

  it('depuis la Bourse, l\'Immobilier, la Crypto : retour vers cette page', () => {
    for (const [path, label] of [['/bourse', 'Bourse et PEA'], ['/immobilier', 'Immobilier'], ['/crypto', 'Crypto']] as const) {
      reset(); trackPage(path); trackPage('/banque');
      expect(backTarget('/banque')).toEqual({ href: path, label });
    }
  });
  it('fonctionne quel que soit l\'ordre de montage (la Banque lit avant ou après le suivi de page)', () => {
    reset(); trackPage('/immobilier');
    expect(backTarget('/banque')).toEqual({ href: '/immobilier', label: 'Immobilier' });   // la Banque lit AVANT d'être notée
    trackPage('/banque');
    expect(backTarget('/banque')).toEqual({ href: '/immobilier', label: 'Immobilier' });   // puis APRÈS
  });
  it('arrivée directe, page inconnue ou rechargement : tableau de bord', () => {
    reset();
    expect(backTarget('/banque')).toEqual({ href: '/dashboard', label: 'Tableau de bord' });
    trackPage('/login'); trackPage('/banque');
    expect(backTarget('/banque')).toEqual({ href: '/dashboard', label: 'Tableau de bord' });
    reset(); trackPage('/banque'); trackPage('/banque');
    expect(backTarget('/banque').href).toBe('/dashboard');
  });
  it('un stockage indisponible ne casse rien', () => {
    const saved = (globalThis as any).sessionStorage;
    (globalThis as any).sessionStorage = { getItem() { throw new Error('bloqué'); }, setItem() { throw new Error('bloqué'); } };
    expect(() => trackPage('/bourse')).not.toThrow();
    expect(backTarget('/banque').href).toBe('/dashboard');
    (globalThis as any).sessionStorage = saved;
  });
  it('la page Banque n\'a plus de lien « ← Immobilier » en dur', () => {
    const b = read('app/banque/page.jsx');
    expect(b).not.toContain('← Immobilier');
    expect(b).toContain('data-testid="bank-back"');
    expect(read('app/components/shell/AppShell.jsx')).toContain('trackPage(pathname)');
  });
});

describe('4) Bourse : « Données illustratives » n\'est plus un badge, mais une mention discrète', () => {
  const h = read('app/components/HistoryChart.jsx');
  it('plus de badge en tête du graphique', () => {
    expect(h).not.toContain('ik-chip--example');
    expect(h).not.toMatch(/<span className="ik-chip[^>]*>Données illustratives/);
  });
  it('une mention en pied de graphique et une note à la première utilisation seulement', () => {
    expect(h).toContain('Données illustratives : cours de clôture annuels');
    expect(h).toContain('data-testid="hist-first-note"');
    expect(h).toContain("localStorage.setItem(NOTE_KEY, '1')");
    expect(h.split('Données illustratives').length - 1).toBe(1);   // une seule fois dans le texte affiché
  });
});
