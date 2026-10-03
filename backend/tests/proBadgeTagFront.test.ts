import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('badge Pro et # : interface', () => {
  it('la couronne est accessible : nom « Membre Pro », info-bulle souris et clavier', () => {
    const src = read('app/components/plan/ProMark.jsx');
    expect(src).toMatch(/Membre Pro/);
    expect(src).toMatch(/role="img"/);
    expect(src).toMatch(/aria-label=\{label\}/);
    expect(src).toMatch(/tabIndex=\{0\}/);
    expect(src).toMatch(/aria-hidden="true"/);
    expect(read('app/styles/social.css')).toMatch(/\.ik-promark\[data-tip\]:focus-visible::after/);
  });
  it('le badge ne vient jamais du navigateur : aucun stockage local, uniquement la valeur « pro » envoyée par le serveur', () => {
    for (const f of ['app/components/plan/ProMark.jsx', 'app/components/social/PlayerName.jsx']) expect(read(f)).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
  });
  it('le pseudo, le # et la couronne sont affichés partout où un joueur apparaît', () => {
    expect(read('app/components/social/SocialHub.jsx')).toMatch(/<PlayerName name=\{p\.name\} avatarId=\{p\.avatarId \?\? null\} tag=\{p\.tag\} pro=\{p\.pro\}/);
    const cl = read('app/classements/page.jsx');
    expect((cl.match(/<PlayerName /g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
  it('le champ « Pseudo#tag » est accepté pour ajouter un ami', () => {
    expect(read('app/components/social/SocialHub.jsx')).toMatch(/Pseudo#1234\) ou code ami/);
  });
  it('Pro accordé à la main : le bouton est remplacé par un message clair', () => {
    const d = read('app/dashboard/page.jsx');
    expect(d).toMatch(/plan\?\.source === 'manual'/);
    expect(d).toMatch(/Accès Pro offert, aucun abonnement à gérer\./);
    expect(d).toMatch(/data-testid="manage-subscription"/);
  });
  it('menu du profil : « Gérer mon abonnement » (Pro) ou « Voir les offres » (gratuit)', () => {
    const t = read('app/components/shell/Topbar.jsx');
    expect(t).toMatch(/Gérer mon abonnement/);
    expect(t).toMatch(/Voir les offres/);
  });
  it('option de confidentialité pour masquer la couronne, dans Paramètres', () => {
    expect(read('app/components/plan/ProBadgePrivacy.jsx')).toMatch(/role="switch"/);
    expect(read('app/dashboard/page.jsx')).toMatch(/<ProBadgePrivacy \/>/);
  });

  it('non-régression : la page du tableau de bord ne lit pas le statut Pro via useShell (AppShell est rendu plus bas, donc la valeur serait toujours vide)', () => {
    const d = read('app/dashboard/page.jsx');
    expect(d).not.toMatch(/useShell\(\)/);
    expect(d).toMatch(/d\?\.user\?\.plan/);
  });
});
