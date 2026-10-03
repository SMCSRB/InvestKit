// Les descriptions des biens ne doivent jamais contenir « undefined », « NaN » ou « null » (bug : un décalage de bits signé donnait un indice négatif).
import { describe, it, expect } from 'vitest';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { describeListing, hash } from '../../app/components/immo/describe.js';

const BAD = /undefined|NaN|null|\[object/;

describe('descriptions des biens', () => {
  it('aucune annonce du catalogue (toutes les années, tous les biens) ne contient « undefined »', async () => {
    let n = 0;
    for (let y = src.minYear; y <= src.maxYear; y++) {
      for (const l of await src.listListings(y)) {
        for (const city of [{ name: 'Lyon' }, undefined]) for (const nbh of [{ name: 'Centre' }, { name: 'Péricentre' }, { name: 'Périphérie' }, undefined]) {
          const d = describeListing(l as any, city as any, nbh as any);
          expect(d, `${l.id} (${y})`).not.toMatch(BAD);
          expect(d.length).toBeGreaterThan(60);
          n++;
        }
      }
    }
    expect(n).toBeGreaterThan(500);
  });
  it('identifiants au hachage négatif en décalage signé : cas qui produisaient « undefined »', () => {
    // un hachage dont le bit de poids fort est 1 devient négatif avec « >> 3 » : on en cherche et on vérifie que la description reste propre
    let found = 0;
    for (let i = 0; i < 3000 && found < 25; i++) {
      const id = `bien-${i}`;
      if (((hash(id) >> 3) < 0)) {
        found++;
        const d = describeListing({ id, type: 'apartment', rooms: 2, surfaceSqm: 40, condition: 'good', energyClass: 'C', rentalTension: 0.3 } as any, { name: 'Lyon' }, { name: 'Centre' });
        expect(d, id).not.toMatch(BAD);
      }
    }
    expect(found).toBeGreaterThan(5);
  });
  it('la description reste stable pour un même bien', () => {
    const l = { id: 'x-1', type: 'house', rooms: 4, surfaceSqm: 90, condition: 'to_refresh', energyClass: 'F', rentalTension: 0.8, urgentSale: true } as any;
    expect(describeListing(l, { name: 'Lyon' }, { name: 'Centre' })).toBe(describeListing(l, { name: 'Lyon' }, { name: 'Centre' }));
  });
});
