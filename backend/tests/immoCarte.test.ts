import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseSearch, searchListings, toStoredFilters, SearchInputError, pricePerSqm } from '../src/engine/immo';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';

const root = path.join(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const YEAR = 2010;
let all: Awaited<ReturnType<typeof src.listListings>>;

describe('Immobilier : Acheter / Louer et filtres complets (moteur pur)', () => {
  beforeAll(async () => { all = await src.listListings(YEAR); });

  it('valide le mode, les loyers, le prix au m² et l\'âge du bien', () => {
    for (const bad of [{ mode: 'sell' }, { mode: 1 }, { minRent: -1 }, { maxRent: 'abc' }, { minRent: 900, maxRent: 100 }, { maxPricePerSqm: 0 }, { maxPricePerSqm: 'x' }, { ages: 'ancient' }, { ages: 'new,old,x' }, { sort: 'rent_up' }]) {
      expect(() => parseSearch(bad as any), JSON.stringify(bad)).toThrow(SearchInputError);
    }
    expect(parseSearch({ mode: 'rent' }).mode).toBe('rent');
    expect(parseSearch({ mode: 'buy' }).mode).toBeUndefined();   // « acheter » est le mode par défaut
    expect(parseSearch({ ages: 'new,old,new' }).ages).toEqual(['new', 'old']);
    expect(parseSearch({ ages: [] } as any).ages).toBeUndefined();
  });

  it('chaque nouveau filtre ne garde que des annonces qui le respectent', () => {
    const rents = all.map((l) => l.marketRentMonthly).sort((a, b) => a - b);
    const mid = rents[Math.floor(rents.length / 2)];
    const a = searchListings(all, parseSearch({ minRent: mid }));
    expect(a.length).toBeGreaterThan(0); expect(a.length).toBeLessThan(all.length);
    expect(a.every((l) => l.marketRentMonthly >= mid)).toBe(true);
    const b = searchListings(all, parseSearch({ maxRent: mid }));
    expect(b.every((l) => l.marketRentMonthly <= mid)).toBe(true);
    const sqm = all.map(pricePerSqm).sort((x, y) => x - y)[Math.floor(all.length / 3)];
    const c = searchListings(all, parseSearch({ maxPricePerSqm: sqm }));
    expect(c.length).toBeGreaterThan(0); expect(c.every((l) => pricePerSqm(l) <= sqm)).toBe(true);
    const d = searchListings(all, parseSearch({ ages: 'new' }));
    expect(d.every((l) => l.age === 'new')).toBe(true);
    const e = searchListings(all, parseSearch({ ages: 'new,old' }));
    expect(e).toHaveLength(all.length);
  });

  it('tri par loyer : croissant, décroissant, loyer au m²', () => {
    const up = searchListings(all, parseSearch({ sort: 'rent_asc' }));
    for (let i = 1; i < up.length; i += 1) expect(up[i].marketRentMonthly).toBeGreaterThanOrEqual(up[i - 1].marketRentMonthly);
    const down = searchListings(all, parseSearch({ sort: 'rent_desc' }));
    for (let i = 1; i < down.length; i += 1) expect(down[i].marketRentMonthly).toBeLessThanOrEqual(down[i - 1].marketRentMonthly);
    const m2 = searchListings(all, parseSearch({ sort: 'rentsqm_asc' }));
    for (let i = 1; i < m2.length; i += 1) expect(m2[i].rentPerSqm).toBeGreaterThanOrEqual(m2[i - 1].rentPerSqm);
  });

  it('le mode « Louer » et les nouveaux filtres se mémorisent dans une recherche enregistrée', () => {
    const p = parseSearch({ mode: 'rent', maxRent: '800', ages: 'old', sort: 'rent_asc' });
    const stored = toStoredFilters(p);
    expect(stored).toMatchObject({ mode: 'rent', maxRent: 800, ages: ['old'], sort: 'rent_asc' });
    expect(parseSearch(stored as any)).toEqual(p);   // relire une recherche enregistrée redonne la même recherche
  });
});

describe('Immobilier : carte interactive, cartes d\'annonces, fiche (interface)', () => {
  const map = read('app/components/immo/ListingMap.jsx');
  const search = read('app/components/immo/Search.jsx');
  const detail = read('app/components/immo/Detail.jsx');
  const css = read('app/styles/immo.css');

  it('la carte est accessible : groupe nommé, pastilles et bulles = vrais boutons, clavier, boutons de zoom', () => {
    expect(map).toMatch(/role="group"/); expect(map).toMatch(/aria-roledescription="carte interactive"/);
    expect(map).toMatch(/<button key=\{c\.key\} type="button" className=\{`rp-pin rp-pin2/);
    expect(map).toMatch(/<button key=\{c\.key\} type="button" className="rp-cluster"/);
    for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', "'Escape'"]) expect(map).toContain(k);
    for (const l of ['aria-label="Zoomer"', 'aria-label="Dézoomer"', 'Tout voir']) expect(map).toContain(l);
    expect(map).toMatch(/aria-live="polite"/);
    expect(map).toMatch(/Zoomer sur ce groupe/);
  });
  it('la carte gère glisser, molette, pincement (deux doigts), double-clic et respecte « réduire les animations »', () => {
    for (const s of ['onPointerDown', 'onPointerMove', 'pinchView', "addEventListener('wheel'", 'onDoubleClick', 'prefers-reduced-motion: reduce']) expect(map).toContain(s);
    expect(css).toMatch(/\.rp-map2__box \{[^}]*touch-action: none/);
  });
  it('aucune bibliothèque de carte : SVG maison seulement', () => {
    expect(read('package.json')).not.toMatch(/leaflet|maplibre|mapbox|openlayers|google-maps/i);
    expect(map).not.toMatch(/from '(leaflet|maplibre-gl|react-leaflet)/);
  });
  it('onglets Acheter / Louer (rôle tab), tri par loyer, filtres de loyer et de construction', () => {
    expect(search).toMatch(/role="tablist" aria-label="Acheter ou louer"/);
    expect(search).toContain('Acheter'); expect(search).toContain('Louer');
    for (const s of ['RENT_SORTS', 'minRent', 'maxRent', 'maxPricePerSqm', 'AGE_LABEL', 'Prix au m² maximum']) expect(search).toContain(s);
  });
  it('les cartes d\'annonces montrent illustration, prix (ou loyer), surface, DPE et rendement estimé', () => {
    for (const s of ['LazyListingArt', '<Dpe cls={l.energyClass} />', 'Rendement brut estimé', 'name="ruler"', 'name="doorOpen"']) expect(search).toContain(s);
  });
  it('la fiche : image plein cadre, chiffres clés, curseurs de prêt, louer ou acheter, liens discrets vers les explications', () => {
    for (const s of ['rp-hero__info', 'rp-keyfacts', 'type="range"', 'RentVsBuy', 'LessonLinks', 'rentMode', 'Voir ce bien à l’achat']) expect(detail).toContain(s);
    expect(read('app/immobilier/page.jsx')).toContain("params.get('mode') === 'louer'");
  });
  it('chaque lien « pour aller plus loin » mène à un terme qui existe dans le glossaire', () => {
    const ids = [...detail.matchAll(/^\s{2}(?:'([a-z-]+)'|([a-z]+)): '/gm)].map((m) => m[1] ?? m[2]);
    const gloss = read('app/lib/glossaire.js');
    const lessons = detail.slice(detail.indexOf('const LESSONS'), detail.indexOf('function LessonLinks'));
    const used = [...lessons.matchAll(/(?:'([a-z-]+)'|\b([a-z]+)): '/g)].map((m) => m[1] ?? m[2]).filter(Boolean);
    expect(used.length).toBeGreaterThanOrEqual(8);
    for (const id of used) expect(gloss, id).toMatch(new RegExp(`id: '${id}'`));
    expect(ids.length).toBeGreaterThan(0);
  });
  it('la liste à côté de la carte ne s\'écrase plus (non-régression : lignes de 2 px)', () => {
    expect(css).toMatch(/\.rp-split__list \{[^}]*grid-auto-rows: max-content/);
  });
});
