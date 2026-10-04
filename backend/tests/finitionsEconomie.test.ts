// Finitions de l'économie : petits défauts constatés pendant les tests d'Andreja.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { databaseNameFromUrl } from '../src/config/env';

const root = join(__dirname, '../..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('finitions de l\'économie', () => {
  it('bannière de l\'API : le vrai nom de la base (celui de DATABASE_URL), jamais le mot de passe', () => {
    expect(databaseNameFromUrl('postgresql://u:SECRET@h:5432/investkit_design_test', 'investkit')).toBe('investkit_design_test');
    expect(databaseNameFromUrl('postgresql://u:SECRET@h:5432/investkit_design_test?sslmode=require', 'investkit')).toBe('investkit_design_test');
    expect(databaseNameFromUrl(undefined, 'investkit')).toBe('investkit');
    expect(databaseNameFromUrl('pas une adresse', 'investkit')).toBe('investkit');
    expect(databaseNameFromUrl('postgresql://u:p@h:5432/', 'investkit')).toBe('investkit');
    expect(read('backend/src/index.ts')).toContain('databaseNameFromUrl(env.database.url, env.database.name)');
    expect(read('backend/src/index.ts')).not.toMatch(/Database: \$\{env\.database\.name\}/);
  });
  it('titre d\'onglet : « simulation », plus « Investissez Intelligemment »', () => {
    const layout = read('app/layout.jsx');
    expect(layout).not.toContain('Investissez Intelligemment');
    expect(layout).toMatch(/title: 'InvestKit - Simulation d\\'investissement'/);
  });
  it('Bourse : plus d\'onglets Crypto ni Immobilier en doublon, prix avec la pièce', () => {
    const page = read('app/dashboard/page.jsx');
    expect(page).not.toContain('> Immobilier →');
    expect(page).not.toContain('Marché Crypto →');
    expect(page).not.toMatch(/\d\s?€|\} €/);
    expect(page).not.toMatch(/tradingPortfolio|loadTradingData/);   // l'ancien onglet Bourse du tableau de bord est supprimé (page /bourse)
    expect(read('app/bourse/page.jsx')).toMatch(/label="Solde" value=\{p\.cashBalance\} unit=\{<Coin/);
  });
  it('marché Crypto : la colonne « Capi. » (et le tri) disparaît quand aucune capitalisation n\'est importée', () => {
    const page = read('app/crypto/page.jsx');
    expect(page).toContain('const hasCap = assets.some((a) => a.marketCap != null);');
    expect(page).toContain('{hasCap && <th');
    expect(page).toContain('{hasCap && <td');
    expect(page).toContain("a.marketCap == null ? 'non importée'");
  });
  it('fiche d\'un bien : un seul message quand la banque accepte mais que les pièces manquent ; avertissement affiché une seule fois', () => {
    const d = read('app/components/immo/Detail.jsx');
    expect(d).toContain('La banque accepte ton dossier, mais il te manque des pièces');
    expect(d).not.toContain('Solde InvestCoins insuffisant pour cet apport');
    expect(d.split('data-testid="bank-warning"').length - 1).toBe(1);
    expect(d).toContain('data-testid="missing-coins"');
  });
  it('Performance Immobilier : le calcul est expliqué avec les chiffres du joueur', () => {
    const b = read('app/components/immo/Bilan.jsx');
    expect(b).toContain('data-testid="perf-explain"');
    expect(b).toContain('Comment est calculée cette performance ?');
    expect(b).toContain('gainLiquidationEuros');
    expect(b).toContain('startingCapitalCoins');
  });
  it('tableau de bord : « Actuellement investi » (compte pour le classement) distinct du « Total acheté (cumul) »', () => {
    const t = read('app/dashboard/OverviewTab.jsx');
    expect(t).toContain('Actuellement investi');
    expect(t).toContain('Total acheté (cumul)');
    expect(t).not.toContain('"Capital investi"');
  });
});
