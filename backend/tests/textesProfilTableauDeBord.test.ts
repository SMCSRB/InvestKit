import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const dash = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'dashboard', 'page.jsx'), 'utf8');

describe('Paramètres > Profil du tableau de bord : la visibilité du profil n\'est plus « bientôt »', () => {
  it('le texte renvoie vers Profil complet > Paramètres > Compte (où se trouve le réglage serveur)', () => {
    expect(dash).not.toContain('arriveront bientôt');
    expect(dash).toContain('Profil complet</a> &gt; Paramètres &gt; Compte');
    const profile = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'profile', 'page.jsx'), 'utf8');
    expect(profile).toContain('<ProfileVisibility />');              // le réglage existe bien à l'endroit annoncé
    expect(profile).toMatch(/id: 'account', label: 'Compte'/);
  });
});
