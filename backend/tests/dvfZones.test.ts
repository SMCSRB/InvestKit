// Zones fines : chaque ville hors Paris, Lyon et Marseille est découpée par CODE POSTAL ; le prix d'une zone n'utilise que SES ventes (au moins 10), sinon la ville.
// Jamais de rue, de numéro ni de coordonnées dans ce qui sort du pipeline : seulement « Bordeaux 33100 », le type, le mois, le nombre de ventes et le prix au m².
import { describe, it, expect } from 'vitest';
import { DVF_CITIES, allZones, cityOfZone, zoneLabel, zoneOf } from '../src/data/realEstate/dvf/cities';
import { cleanRows, readDvfText, sectionOf, DvfSale } from '../src/data/realEstate/dvf/clean';
import { monthlyMarket, MIN_SALES } from '../src/data/realEstate/dvf/aggregate';
import { parseMarketFile } from '../src/data/realEstate/dvf/marketFile';
import { zoningReport, renderZoning } from '../src/data/realEstate/dvf/zoning';
import { postal } from '../src/data/realEstate/dvf/format';

const HEAD = 'id_mutation,date_mutation,numero_disposition,nature_mutation,valeur_fonciere,adresse_numero,adresse_nom_voie,code_postal,code_commune,nom_commune,code_departement,id_parcelle,nombre_lots,code_type_local,type_local,surface_reelle_bati,nombre_pieces_principales,longitude,latitude';
const row = (id: string, code: string, cp: string, parcel: string) => [id, '2022-03-10', '000001', 'Vente', '250000', '12', 'Rue Sainte-Catherine', cp, code, 'Bordeaux', code.slice(0, 2), parcel, '1', '2', 'Appartement', '50', '2', '-0.57', '44.84'].join(',');

const sale = (code: string, postalCode: string, date: string, p: number, section = 'AB'): DvfSale => ({ id: `${code}${postalCode}${date}${p}${Math.random()}`, date, code, zone: zoneOf(code, postalCode), postal: postalCode, section, type: 'appartement', surface: 50, price: p * 50, pricePerM2: p, rooms: 2, lon: null, lat: null });
const many = (code: string, cp: string, ym: string, n: number, p: number, section = 'AB') => Array.from({ length: n }, (_, i) => sale(code, cp, `${ym}-${String(1 + (i % 27)).padStart(2, '0')}`, p + i, section));

describe('les zones de chaque ville', () => {
  it('Paris, Lyon, Marseille : un arrondissement = une zone ; les neuf autres : un code postal = une zone', () => {
    const n = (id: string) => DVF_CITIES.find((c) => c.id === id)!.zones.length;
    expect([n('paris'), n('lyon'), n('marseille')]).toEqual([20, 9, 16]);
    expect(DVF_CITIES.filter((c) => !c.districts).every((c) => c.zones.every((z) => /^\d{5}$/.test(z) && z.startsWith(c.department)))).toBe(true);
    expect(n('bordeaux')).toBeGreaterThan(1); expect(n('toulouse')).toBeGreaterThan(1); expect(n('saint-etienne')).toBeGreaterThan(1);
    expect(new Set(allZones()).size).toBe(allZones().length);                                   // aucune zone en double d'une ville à l'autre
  });
  it('nom lisible : « Bordeaux 33000 », « Paris 11e » ; jamais une rue ni un numéro ; la zone retrouve sa ville', () => {
    expect(zoneLabel('33000')).toBe('Bordeaux 33000');
    expect(zoneLabel('75111')).toBe('Paris 11e');
    expect(cityOfZone('33100')?.id).toBe('bordeaux');
    expect(allZones().every((z) => /^[A-Za-zÀ-ÿ' -]+ (\d{5}|\d{1,2}(er|e))$/.test(zoneLabel(z)!))).toBe(true);
  });
  it('zoneOf : arrondissement tel quel ; code postal connu de la ville ; sinon aucune zone', () => {
    expect(zoneOf('75111', '75011')).toBe('75111');
    expect(zoneOf('33063', '33100')).toBe('33100');
    expect(zoneOf('33063', '99999')).toBe('');
    expect(zoneOf('33063', '')).toBe('');
    expect(zoneOf('99999', '33000')).toBe('');
  });
});

describe('lecture du code postal et de la section', () => {
  it('fichier étalab : zone = code postal, section tirée de l\'identifiant de parcelle', () => {
    const text = [HEAD, row('A', '33063', '33100', '33063000KT0012'), row('B', '33063', '99999', '33063000AB0003'), row('C', '33063', '', '33063000AB0004')].join('\n') + '\n';
    const r = cleanRows(readDvfText(text).rows).sales;
    expect(r.map((s) => [s.zone, s.section])).toEqual([['33100', 'KT'], ['', 'AB'], ['', 'AB']]);
    expect(r[0].postal).toBe('33100');
  });
  it('fichier brut : « Code postal » et « Section » sont lus ; code postal à 4 chiffres complété', () => {
    const head = ['Identifiant de document', 'No disposition', 'Date mutation', 'Nature mutation', 'Valeur fonciere', 'Code postal', 'Commune', 'Code departement', 'Code commune', 'Prefixe de section', 'Section', 'No plan', 'Nombre de lots', 'Code type local', 'Type local', 'Surface reelle bati', 'Nombre pieces principales'].join('|');
    const line = ['', '1', '10/03/2019', 'Vente', '250000,00', '6100', 'NICE', '06', '088', '', 'KT', '12', '1', '2', 'Appartement', '50', '2'].join('|');
    const s = cleanRows(readDvfText(`${head}\n${line}\n`).rows).sales[0];
    expect(s).toMatchObject({ code: '06088', zone: '06100', section: 'KT' });
    expect(postal('6100')).toBe('06100'); expect(postal('abc')).toBe(''); expect(postal('33000.0')).toBe('33000');
  });
  it('sectionOf', () => { expect(sectionOf('33063000KT0012')).toBe('KT'); expect(sectionOf('2A004000AB0001')).toBe('AB'); expect(sectionOf('')).toBe(''); expect(sectionOf('33063|000|KT|12')).toBe('KT'); });
});

describe('chaque zone a SON prix', () => {
  it('deux codes postaux de Bordeaux, deux prix ; une zone avec moins de 10 ventes prend la médiane de la ville', () => {
    const s = [...many('33063', '33000', '2022-01', 15, 5000), ...many('33063', '33100', '2022-01', 15, 3500), ...many('33063', '33200', '2022-01', 4, 9999)];
    const rows = monthlyMarket(s, { from: '2022-02', to: '2022-02' });
    const get = (z: string) => rows.find((r) => r.key === z && r.type === 'appartement')!;
    expect(get('33000')).toMatchObject({ fallback: null, n: 15 });
    expect(get('33100')).toMatchObject({ fallback: null, n: 15 });
    expect(get('33000').median!).toBeGreaterThan(get('33100').median! + 1000);
    expect(get('33200')).toMatchObject({ fallback: 'ville' });                                    // 4 ventes : sous le seuil
    expect(get('33200').n).toBeGreaterThanOrEqual(MIN_SALES);                                     // …donc médiane de la ville entière (34 ventes)
    expect(get('33300')).toMatchObject({ fallback: 'ville' });                                    // zone sans aucune vente : la ville
  });
  it('les ventes sans zone connue servent à la ville, jamais à une zone', () => {
    const s = [...many('33063', '', '2022-01', 30, 4000)];
    const rows = monthlyMarket(s, { from: '2022-02', to: '2022-02' });
    expect(rows.filter((r) => cityOfZone(r.key)?.id === 'bordeaux' && r.type === 'appartement').every((r) => r.fallback === 'ville' && r.n === 30)).toBe(true);
  });
  it('AUCUNE FUITE DU FUTUR par zone : des ventes ajoutées plus tard ne changent aucun mois antérieur', () => {
    const base = [...many('33063', '33000', '2021-03', 15, 5000), ...many('33063', '33100', '2021-04', 14, 3500)];
    const future = [...many('33063', '33000', '2022-02', 40, 9999), ...many('33063', '33100', '2022-02', 40, 1500)];
    const a = monthlyMarket(base, { from: '2021-01', to: '2022-01' });
    expect(monthlyMarket([...base, ...future], { from: '2021-01', to: '2022-01' })).toEqual(a);
  });
  it('le fichier de médianes accepte une zone (code postal), refuse un code commune ou une zone inconnue ; 8 colonnes, ni rue ni coordonnées', () => {
    const mk = (z: string) => ({ source: 'DVF', windowMonths: 12, minSales: 10, range: { from: '2022-01', to: '2022-03' }, rows: [[z, '2022-02', 'a', 20, 4000, 3800, 4300, null]] });
    const now = new Date('2026-10-04T00:00:00Z');
    expect(parseMarketFile(mk('33100'), now).ok).toBe(true);
    expect(parseMarketFile(mk('33063'), now).ok).toBe(false);
    expect(parseMarketFile(mk('12345'), now).ok).toBe(false);
  });
});

describe('rapport de découpage', () => {
  const sales = [
    ...many('33063', '33000', '2021-06', 30, 5000, 'AA'), ...many('33063', '33000', '2022-06', 30, 5200, 'AA'),
    ...many('33063', '33100', '2022-06', 12, 3500, 'BB'), ...many('33063', '33200', '2022-06', 3, 4000, 'CC'),
    ...many('33063', '33999', '2022-06', 5, 4000, 'DD'), ...many('33063', '', '2022-06', 2, 4000, 'EE'),
  ];
  it('ventes par zone et par année, zones fiables, codes postaux inattendus, ventes sans code postal', () => {
    const r = zoningReport(sales);
    const b = r.cities.find((c) => c.id === 'bordeaux')!;
    expect(r.years).toEqual([2021, 2022]);
    expect(b.postal.zones).toBe(5);
    expect(b.postal.perZone.find((z) => z.unit === '33000')!.byYear).toEqual({ 2021: 30, 2022: 30 });
    expect(b.postal.reliable).toBe(2);                                                         // 33000 et 33100 (au moins 10 appartements sur les 12 derniers mois)
    expect(b.unknownPostal).toEqual([{ postal: '33999', sales: 5 }]);
    expect(b.withoutPostal).toBe(2);
    expect(b.section.units).toBe(5);
    const text = renderZoning(r);
    expect(text).toContain('Bordeaux — 82 ventes retenues');
    expect(text).toContain('33999 (5)');
    expect(text).not.toMatch(/rue|avenue/i);
  });
  it('fichiers sans code postal : le rapport le dit clairement', () => {
    const old = many('33063', '', '2022-06', 30, 4000);
    expect(renderZoning(zoningReport(old))).toContain('fichiers téléchargés avant l\'ajout du code postal');
  });
});
