import { describe, it, expect } from 'vitest';
// @ts-expect-error module JS hors du projet TypeScript
import { findProblems } from '../../scripts/check-site-info.mjs';
// @ts-expect-error module JS hors du projet TypeScript
import { SITE_INFO } from '../../app/lib/siteInfo.js';

const complete = { publisherName: 'A', publisherStatus: 'particulier', publicationDirector: 'A', contactEmail: 'a@vrai-domaine.fr', hostName: 'H', hostAddress: 'adresse' };

describe('pages légales : informations du site (app/lib/siteInfo.js)', () => {
  it('le vérificateur signale un e-mail « example.com » et un hébergeur vide', () => {
    expect(findProblems(complete)).toEqual([]);
    expect(findProblems({ ...complete, contactEmail: 'contact@example.com' }).join(' ')).toContain('provisoire');
    expect(findProblems({ ...complete, hostName: null }).join(' ')).toContain('hébergeur');
    expect(findProblems({ ...complete, hostAddress: '  ' }).join(' ')).toContain('hébergeur');
    expect(findProblems({ ...complete, contactEmail: null }).join(' ')).toContain('vide');
  });

  // Ne fait PAS échouer les tests (phase sur invitation) : affiche un rappel visible tant que ce n'est pas réglé.
  it('RAPPEL avant ouverture au public : valeurs provisoires restantes', () => {
    const problems: string[] = findProblems(SITE_INFO);
    if (problems.length > 0) {
      console.warn('\n⚠️  AVANT L\'OUVERTURE AU PUBLIC — siteInfo.js incomplet :\n   • ' + problems.join('\n   • ') + '\n');
    }
    expect(Array.isArray(problems)).toBe(true);
  });
});
