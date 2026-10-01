import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
// @ts-expect-error module JavaScript du frontend
import { PLANS, PRICES, yearlySavingPct } from '../../app/lib/plans.js';
// @ts-expect-error module JavaScript du frontend
import { AVAILABLE_DOMAINS, CRYPTO_ASSET_COUNT, STARTING_COINS } from '../../app/lib/siteFacts.js';
import { CATALOG } from '../src/data/crypto/catalog';
import { STARTING_CAPITAL } from '../src/config/game';

const APP = join(__dirname, '../../app');
const read = (p: string) => readFileSync(join(APP, p), 'utf8');
const publicFiles = ['page.jsx', 'login/page.jsx', 'signup/page.jsx', 'verify-email/page.jsx', 'forgot-password/page.jsx', 'reset-password/page.jsx',
  ...readdirSync(join(APP, 'components/landing')).filter((f) => f.endsWith('.jsx')).map((f) => `components/landing/${f}`)];

describe('accueil et pages de compte : honnêteté et liens', () => {
  it('aucun faux chiffre ni promesse de gains', () => {
    const interdits = [/10\s?K\+/i, /99[.,]9\s?%/, /milliers d'investisseurs/i, /investisseurs actifs/i, /gains? garantis?/i, /rendement garanti/i];
    for (const f of publicFiles) for (const re of interdits) expect(read(f), `${f} contient ${re}`).not.toMatch(re);
  });

  it('chaque lien interne pointe vers une vraie page (zéro lien mort)', () => {
    const routes = new Set<string>();
    const walk = (dir: string, prefix: string) => {
      for (const e of readdirSync(join(APP, dir), { withFileTypes: true })) {
        if (e.isDirectory()) walk(join(dir, e.name), `${prefix}/${e.name}`);
        else if (e.name === 'page.jsx') routes.add(prefix || '/');
      }
    };
    walk('.', '');
    const morts: string[] = [];
    for (const f of publicFiles) {
      for (const m of read(f).matchAll(/(?:href|Link href)=["'{`]+(\/[^"'`}#?\s]*)/g)) {
        const path = m[1] === '/' ? '/' : m[1].replace(/\/$/, '');
        if (path.startsWith('/_next') || path.startsWith('/api')) continue;
        const dyn = [...routes].some((r) => r.includes('[') && new RegExp(`^${r.replace(/\[[^\]]+\]/g, '[^/]+')}$`).test(path));
        if (!routes.has(path) && !dyn) morts.push(`${f} → ${path}`);
      }
    }
    expect(morts).toEqual([]);
  });

  it('les anciens liens morts (/outils, /pricing) ont disparu', () => {
    for (const f of publicFiles) expect(read(f)).not.toMatch(/["'`]\/(outils|pricing)["'`]/);
  });
});

describe('offres : source unique', () => {
  it('prix et économie annuelle cohérents avec Stripe (7,99 €/mois, 79 €/an)', () => {
    expect(PRICES).toEqual({ monthly: 7.99, yearly: 79 });
    expect(yearlySavingPct()).toBeGreaterThanOrEqual(15);
    expect(yearlySavingPct()).toBeLessThanOrEqual(20);
  });
  it('deux offres, Pro plus complet que Gratuit', () => {
    expect(PLANS.map((p: any) => p.id)).toEqual(['free', 'pro']);
    expect(PLANS[1].features.length).toBeGreaterThan(PLANS[0].features.length);
  });
  it('le paiement n\'est pas annoncé comme ouvert par défaut', () => {
    expect(read('lib/plans.js')).toMatch(/NEXT_PUBLIC_BILLING_ENABLED === 'true'/);
    expect(existsSync(join(APP, 'lib/plans.js'))).toBe(true);
  });
});

describe('chiffres affichés : jamais recopiés à la main', () => {
  it('le nombre d\'actifs crypto annoncé est celui du catalogue réel', () => {
    expect(CRYPTO_ASSET_COUNT).toBe(CATALOG.length);
  });
  it('les domaines annoncés « disponibles » existent vraiment (une page chacun)', () => {
    const pages: Record<string, string> = { Immobilier: 'immobilier', Crypto: 'crypto', 'Bourse et PEA': 'dashboard' };
    for (const d of AVAILABLE_DOMAINS) expect(existsSync(join(APP, pages[d.name], 'page.jsx')), d.name).toBe(true);
  });
  it('le tableau de bord lit les prix dans app/lib/plans.js (pas de prix recopiés)', () => {
    const dash = read('dashboard/page.jsx');
    expect(dash).toMatch(/from '@\/app\/lib\/plans'/);
    expect(dash).not.toMatch(/>7,99€</);
    expect(dash).not.toMatch(/>79€</);
  });
});


describe('capital de départ affiché à l\'inscription', () => {
  it('correspond à la valeur du serveur', () => { expect(STARTING_COINS).toBe(STARTING_CAPITAL); });
});
