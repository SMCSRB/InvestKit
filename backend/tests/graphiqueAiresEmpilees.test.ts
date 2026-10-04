// Graphique en aires empilées (6g, G2) : règle d'empilement pure + composant branché dans la démo du design system.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { stackSeries, stackTotals } from '../../app/lib/stack.js';

const root = path.join(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('empilement des séries', () => {
  it('chaque série part du haut de la précédente ; le total est la somme', () => {
    const s = [{ data: [10, 20, 30] }, { data: [1, 2, 3] }, { data: [5, 5, 5] }];
    const st = stackSeries(s, 3);
    expect(st[0].lo).toEqual([0, 0, 0]); expect(st[0].hi).toEqual([10, 20, 30]);
    expect(st[1].lo).toEqual([10, 20, 30]); expect(st[1].hi).toEqual([11, 22, 33]);
    expect(st[2].hi).toEqual([16, 27, 38]);
    expect(stackTotals(s, 3)).toEqual([16, 27, 38]);
  });
  it('négatifs, valeurs absentes ou non numériques comptent pour 0 (le graphique ne se casse pas)', () => {
    const st = stackSeries([{ data: [5, -3, NaN, undefined as any] }, { data: [1, 1, 1, 1] }], 4);
    expect(st[0].hi).toEqual([5, 0, 0, 0]);
    expect(st[1].hi).toEqual([6, 1, 1, 1]);
  });
  it('aucune série ou aucun point : totaux nuls, pas d\'erreur', () => {
    expect(stackTotals([], 3)).toEqual([0, 0, 0]);
    expect(stackSeries([{ data: [] }], 0)[0].hi).toEqual([]);
  });
  it('ne modifie pas les données reçues', () => {
    const s = [{ data: [1, 2] }]; stackSeries(s, 2);
    expect(s[0].data).toEqual([1, 2]);
  });
});

describe('composant StackedArea', () => {
  const src = read('app/components/ui/charts.jsx');
  it('une seule échelle, tableau pour lecteurs d\'écran, clavier, légende, séparation des aires', () => {
    const body = src.slice(src.indexOf('export function StackedArea'), src.indexOf('export function StackedBars'));
    expect(body).toContain('<DataTable');
    expect(body).toContain('<Legend');
    expect(body).toContain('onKeyDown');
    expect(body).toContain('tabIndex={0}');
    expect(body).toContain('var(--ik-surface-1)');           // espace entre aires
    expect(body).not.toMatch(/yRight|secondAxis|dual/i);     // jamais de double axe
    expect(body).not.toContain('dangerouslySetInnerHTML');
  });
  it('couleurs = variables de série dans l\'ordre, démo présente dans le design system', () => {
    const demo = read('app/design-system/DesignSystemClient.jsx');
    expect(demo).toContain('<StackedArea');
    expect(demo).toContain('stacked-area-demo');
    expect(demo).toMatch(/--ik-series-1[\s\S]*--ik-series-2[\s\S]*--ik-series-3/);
  });
});
