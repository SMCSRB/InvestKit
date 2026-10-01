import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

// Retours du propriétaire sur le test du nouveau design (PR #80). Contrôles statiques : ils lisent le code de l'interface.
const ROOT = join(__dirname, '../..');
const APP = join(ROOT, 'app');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const full = join(dir, f);
  return statSync(full).isDirectory() ? walk(full) : /\.(jsx?|css)$/.test(f) ? [full] : [];
});

describe('Éducation : la page d\'accueil de l\'académie est accessible', () => {
  it('plus de redirection /education → /dashboard', () => {
    expect(read('next.config.js')).not.toMatch(/source:\s*'\/education'/);
  });
  it('aucun texte espagnol dans les parcours', () => {
    const t = read('app/education/[domain]/page.jsx');
    expect(t).not.toMatch(/Continuar|Mejorar|aquí|puntuación/);
  });
});

describe('Badges : une annonce, une seule fois', () => {
  const dash = read('app/dashboard/page.jsx');
  it('l\'état enregistré est relu avant toute attribution ou annonce', () => {
    expect(dash).toContain('badgesHydrated');
    expect(dash).toMatch(/if \(!badgesHydrated\) return;/);
  });
  it('un badge annoncé est mémorisé (et enregistré) pour ne plus jamais être ré-annoncé', () => {
    expect(dash).toContain('announcedRef');
    expect(dash).toContain("investkit_badges_announced");
    expect(dash).toMatch(/fresh\.forEach\(\(id\) => showBadgeToast\(id\)\)/);
  });
  it('unlockBadge n\'annonce plus lui-même (seul l\'effet d\'annonce le fait)', () => {
    const m = dash.match(/const unlockBadge = useCallback\(\(badgeId\) => \{([\s\S]*?)\}, \[\]\);/);
    expect(m).toBeTruthy();
    expect(m![1]).not.toContain('showBadgeToast');
  });
});

describe('Navigation : une seule, le menu principal', () => {
  it('plus de barre d\'onglets en doublon sur le tableau de bord', () => {
    expect(read('app/dashboard/page.jsx')).not.toContain('Sections du tableau de bord');
  });
  it('le menu principal mène au Marché ; les notifications restent accessibles depuis la cloche', () => {
    expect(read('app/components/shell/nav.js')).toContain("/dashboard?tab=market");
    expect(read('app/components/shell/Topbar.jsx')).toContain('/dashboard?tab=notifications');
  });
});

describe('Mentions « fictif / exemple / simulation » : une seule mention discrète', () => {
  // Lieux où la mention est voulue : pied de page, conditions et pages légales, accueil, premier usage (inscription guidée).
  const ALLOWED = [
    /^app\/(legal|conditions|privacy|cookies)\//, /components\/TestPhaseNotice/, /landing\/PublicFooter/, /landing\/LandingSections/,
    /^app\/page\.jsx$/, /^app\/onboarding\//, /^app\/design-system\//, /^app\/lib\/siteInfo/, /^app\/lib\/changelog/, /^app\/layout\.jsx$/,
  ];
  const BANNED = [/ANNONCE FICTIVE/i, /Annonces? fictives?/i, /données d['’]exemple/i, /Exemple de quiz/, /Exemple illustratif/, /Simulation pédagogique/,
    /Marché simulé/, /catalogue fictif/i, /pas un cours réel/i, /pas des cours réels/i, /villes fictives/i, /Illustration fictive/i, /Aucun profil d['’]exemple/i];
  it('aucune autre étiquette ni bannière de ce type dans l\'application', () => {
    const hits: string[] = [];
    for (const f of walk(APP)) {
      const rel = relative(ROOT, f);
      if (ALLOWED.some((r) => r.test(rel))) continue;
      // Seuls les textes affichés comptent : les commentaires du code sont ignorés.
      const text = readFileSync(f, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join('\n');
      for (const b of BANNED) if (b.test(text)) hits.push(`${rel} : ${b}`);
    }
    expect(hits).toEqual([]);
  });
  it('la mention reste présente aux endroits prévus (pied de page, accueil, premier usage)', () => {
    expect(read('app/components/landing/PublicFooter.jsx')).toMatch(/aucun argent réel/);
    expect(read('app/page.jsx')).toMatch(/aucun argent réel/);
    expect(read('app/onboarding/page.jsx')).toMatch(/aucun argent réel/);
  });
});

describe('Photo de profil : modifiable dans la page Profil', () => {
  const profile = read('app/profile/page.jsx');
  it('la page Profil permet de choisir et de retirer une photo', () => {
    expect(profile).toContain('savePhotoFromFile');
    expect(profile).toContain('clearPhoto');
    expect(profile).toContain('data-testid="photo-input"');
  });
  it('le contrôle du fichier refuse les formats et poids non prévus ; la photo est réduite avant d\'être enregistrée', () => {
    const lib = read('app/lib/profilePhoto.js');
    expect(lib).toMatch(/image\/jpeg/);
    expect(lib).toMatch(/PHOTO_MAX_BYTES/);
    expect(lib).toContain('canvas');
    expect(existsSync(join(APP, 'lib/profilePhoto.js'))).toBe(true);
  });
  it('le menu du haut affiche la photo quand elle existe', () => {
    expect(read('app/components/shell/Topbar.jsx')).toContain('readPhoto');
  });
});
