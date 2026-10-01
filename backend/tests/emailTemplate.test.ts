import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { renderMail, displayName, escapeHtml, safeUrl } from '../src/utils/emailTemplate';
import { verificationMail, passwordResetMail, accountExistsMail, welcomeMail } from '../src/utils/email';

const BASE = 'https://exemple.test/mail';
const all = () => [
  verificationMail('Camille', '123456', 'https://exemple.test/verify-email?email=a%40b.fr'),
  passwordResetMail('Camille', 'https://exemple.test/reset-password?token=abc'),
  accountExistsMail('https://exemple.test/login', 'https://exemple.test/forgot-password'),
  welcomeMail('Camille', 'https://exemple.test/dashboard'),
].map((c) => renderMail(c, { assetBase: BASE }));

describe('gabarit e-mail', () => {
  it('ne dit jamais « Bonjour User » ni « Unknown » : pseudo, sinon « Bonjour, »', () => {
    expect(displayName('User')).toBeNull();
    expect(displayName('Unknown')).toBeNull();
    expect(displayName(null)).toBeNull();
    expect(renderMail(verificationMail('User', '111111', 'https://x.test/v'), { assetBase: BASE }).html).not.toMatch(/Bonjour User/);
    expect(renderMail(verificationMail(null, '111111', 'https://x.test/v'), { assetBase: BASE }).html).toContain('Bonjour,');
    expect(renderMail(verificationMail('Camille', '111111', 'https://x.test/v'), { assetBase: BASE }).html).toContain('Bonjour Camille,');
  });

  it('échappe le contenu des joueurs (pas de HTML injecté)', () => {
    const { html, text } = renderMail(verificationMail('<script>alert(1)</script>', '1"><b>', 'https://x.test/v'), { assetBase: BASE });
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<b>');
    expect(text).toBeTruthy();
    expect(escapeHtml(`<&"'>`)).toBe('&lt;&amp;&quot;&#39;&gt;');
  });

  it('refuse les liens dangereux', () => {
    expect(() => safeUrl('javascript:alert(1)')).toThrow();
    expect(() => renderMail(verificationMail('A', '1', 'javascript:alert(1)'))).toThrow();
  });

  it('structure compatible boîtes mail : tables, bouton Outlook, préheader, mode sombre, texte brut, alt sur les images', () => {
    for (const m of all()) {
      expect(m.html).toContain('role="presentation"');
      expect(m.html).toContain('<!--[if mso]>');
      expect(m.html).toContain('v:roundrect');
      expect(m.html).toContain('color-scheme');
      expect(m.html).toMatch(/aucun argent réel/);
      expect(m.text).toMatch(/aucun argent réel/);
      expect(m.html).not.toMatch(/<script/i);
      const imgs = m.html.match(/<img\b[^>]*>/g) ?? [];
      expect(imgs.length).toBeGreaterThan(0);
      for (const img of imgs) {
        expect(img).toMatch(/alt="[^"]+"/);
        expect(img).toMatch(/src="https:\/\/exemple\.test\/mail\//); // images sur notre propre serveur, aucun pixel de suivi
      }
    }
  });

  it('le mail de vérification montre bouton, grand code, lien de secours et durée', () => {
    const m = renderMail(verificationMail('Camille', '482915', 'https://exemple.test/verify-email?email=a%40b.fr'), { assetBase: BASE });
    expect(m.html).toContain('Vérifier mon e-mail');
    expect(m.html).toContain('482915');
    expect(m.html).toContain('15 minutes');
    expect(m.text).toContain('482915');
    expect(m.text).toContain('https://exemple.test/verify-email');
  });

  it('les images du dossier public/mail existent, l\'en-tête animé pèse moins de 500 Ko', () => {
    const dir = path.join(__dirname, '..', '..', 'public', 'mail');
    for (const f of ['header.gif', 'coin.png', 'shield.png', 'building.png', 'chart.png', 'logo-k.png']) expect(fs.existsSync(path.join(dir, f))).toBe(true);
    expect(fs.statSync(path.join(dir, 'header.gif')).size).toBeLessThan(500 * 1024);
  });

  it('aucun secret ni valeur personnelle dans les gabarits', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'emailTemplate.ts'), 'utf8');
    expect(src).not.toMatch(/api[_-]?key|password\s*[:=]|secret/i);
  });
});
