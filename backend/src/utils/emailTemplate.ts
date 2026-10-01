// Gabarit UNIQUE des e-mails d'InvestKit : mise en page en TABLEAUX HTML avec styles EN LIGNE (c'est ce que Gmail, Outlook et les
// applications mobiles comprennent), 600 px au maximum, thème violet sombre du site. Il produit aussi la version TEXTE BRUT.
//
// Règles tenues ici (et vérifiées par tests/emailTemplate.test.ts) :
//  - aucun JavaScript, aucune vidéo, aucune image de suivi (pas de pixel espion) ;
//  - le mail reste lisible SANS images : fond de couleur, texte alternatif sur chaque image, bouton qui n'est pas une image ;
//  - bouton « à toute épreuve » : VML pour Outlook de bureau, simple lien stylé ailleurs ;
//  - tout ce qui vient d'un utilisateur (pseudo…) est ÉCHAPPÉ ; les liens doivent commencer par http:// ou https:// ;
//  - un lien de secours est écrit en toutes lettres sous le bouton ;
//  - images hébergées sur NOTRE serveur (HTTPS, adresse fixe : <site>/mail/…), générées par tools/mail-assets/render.mjs.
import { env } from '../config/env';

export type MailHero = 'coin' | 'shield' | 'chart' | 'building' | null;

export interface MailContent {
  subject: string;
  preheader: string;                          // texte d'aperçu dans la liste de la boîte mail (caché dans le mail)
  title: string;
  greetingName?: string | null;               // pseudo du joueur ; absent → « Bonjour, » tout court (jamais « Bonjour User »)
  paragraphs: string[];                       // texte simple (échappé)
  code?: { value: string; caption?: string };
  button?: { label: string; url: string };
  fallbackLabel?: string;                     // phrase au-dessus du lien de secours
  notes?: string[];                           // petites lignes grises (expiration, sécurité)
  hero?: MailHero;
}

export interface RenderOptions { assetBase?: string }

const C = { page: '#0b0716', card: '#15102b', cardEdge: '#2a2150', text: '#f4f2ff', muted: '#b7b2d3', faint: '#908ab0', primary: '#6d4ff0', accent: '#a893ff', codeBg: '#0f0b22' };
const FONT = "Arial, Helvetica, sans-serif";

export const escapeHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Un lien n'est accepté que s'il commence par http(s):// et ne contient ni espace ni guillemet : sinon on refuse (jamais de javascript:, data:…).
export const safeUrl = (u: string): string => {
  if (!/^https?:\/\/[^\s"'<>]+$/i.test(u)) throw new Error('Lien d\'e-mail invalide');
  return u;
};

// Pseudo à afficher : jamais les valeurs de remplissage « User » / « Unknown » que l'inscription enregistrait avant le choix du pseudo.
export const displayName = (n?: string | null): string | null => {
  const v = (n ?? '').trim();
  return v && !/^(user|unknown)$/i.test(v) ? v.slice(0, 40) : null;
};

export const defaultAssetBase = (): string => `${env.frontendUrl.replace(/\/$/, '')}/mail`;

const img = (base: string, file: string, alt: string, w: number, h: number, extra = '') =>
  `<img src="${escapeHtml(`${base}/${file}`)}" width="${w}" height="${h}" alt="${escapeHtml(alt)}" border="0" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:100%;${extra}">`;

const HERO: Record<Exclude<MailHero, null>, { file: string; alt: string; w: number; h: number }> = {
  coin: { file: 'coin.png', alt: 'Pièce InvestCoin', w: 160, h: 160 },
  shield: { file: 'shield.png', alt: 'Bouclier de sécurité', w: 160, h: 160 },
  building: { file: 'building.png', alt: 'Immeuble', w: 160, h: 160 },
  chart: { file: 'chart.png', alt: 'Courbe de Bourse en hausse', w: 240, h: 165 },
};

const button = (b: { label: string; url: string }): string => {
  const url = escapeHtml(safeUrl(b.url)); const label = escapeHtml(b.label);
  // Outlook de bureau ne comprend pas les arrondis ni les fonds en CSS : on lui donne un bouton VML. Les autres lisent le <a> normal.
  return `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:54px;v-text-anchor:middle;width:320px;" arcsize="22%" stroke="f" fillcolor="${C.primary}"><w:anchorlock/><center style="color:#ffffff;font-family:${FONT};font-size:17px;font-weight:bold;">${label}</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr><td align="center" bgcolor="${C.primary}" style="border-radius:14px;background-color:${C.primary};background-image:linear-gradient(135deg,#7a5cf0,#c15bf0);"><a href="${url}" target="_blank" style="display:block;padding:16px 38px;font-family:${FONT};font-size:17px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:14px;">${label}</a></td></tr></table><!--<![endif]-->`;
};

export const renderMail = (c: MailContent, opts: RenderOptions = {}): { subject: string; html: string; text: string } => {
  const base = (opts.assetBase ?? defaultAssetBase()).replace(/\/$/, '');
  const name = displayName(c.greetingName);
  const hello = name ? `Bonjour ${escapeHtml(name)},` : 'Bonjour,';
  const hero = c.hero ? HERO[c.hero] : null;
  const p = (t: string) => `<p style="margin:0 0 16px 0;font-family:${FONT};font-size:16px;line-height:25px;color:${C.muted};">${escapeHtml(t)}</p>`;

  const codeBlock = c.code ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 22px 0;"><tr><td align="center" bgcolor="${C.codeBg}" style="background-color:${C.codeBg};border:1px solid ${C.cardEdge};border-radius:16px;padding:22px 12px;">
      <div style="font-family:'Courier New',Courier,monospace;font-size:40px;line-height:44px;font-weight:bold;letter-spacing:10px;color:${C.text};" aria-label="Ton code">${escapeHtml(c.code.value)}</div>
      ${c.code.caption ? `<div style="font-family:${FONT};font-size:13px;line-height:18px;color:${C.faint};padding-top:8px;">${escapeHtml(c.code.caption)}</div>` : ''}
    </td></tr></table>` : '';

  const fallback = c.button ? `
    <p style="margin:22px 0 4px 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.faint};text-align:center;">${escapeHtml(c.fallbackLabel ?? 'Le bouton ne marche pas ? Copie ce lien dans ton navigateur :')}</p>
    <p style="margin:0 0 6px 0;font-family:${FONT};font-size:13px;line-height:20px;text-align:center;word-break:break-all;"><a href="${escapeHtml(safeUrl(c.button.url))}" target="_blank" style="color:${C.accent};text-decoration:underline;">${escapeHtml(c.button.url)}</a></p>` : '';

  const notes = (c.notes ?? []).map((n) => `<p style="margin:10px 0 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.faint};text-align:center;">${escapeHtml(n)}</p>`).join('');

  const html = `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${escapeHtml(c.subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  :root { color-scheme: dark light; supported-color-schemes: dark light; }
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; }
  a { text-decoration: none; }
  @media only screen and (max-width: 620px) {
    .px { padding-left: 18px !important; padding-right: 18px !important; }
    .code { font-size: 32px !important; letter-spacing: 6px !important; }
    h1 { font-size: 24px !important; line-height: 30px !important; }
  }
</style>
</head>
<body bgcolor="${C.page}" style="margin:0;padding:0;background-color:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page};mso-hide:all;">${escapeHtml(c.preheader)}${'&nbsp;&zwnj;'.repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background-color:${C.page};"><tr><td align="center" style="padding:20px 10px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;">
  <tr><td bgcolor="#1a1040" style="background-color:#1a1040;border-radius:20px 20px 0 0;overflow:hidden;font-size:0;line-height:0;">${img(base, 'header.gif', 'InvestKit', 600, 150, 'width:100%;border-radius:20px 20px 0 0;')}</td></tr>
  <tr><td class="px" bgcolor="${C.card}" style="background-color:${C.card};padding:30px 34px 34px 34px;border-left:1px solid ${C.cardEdge};border-right:1px solid ${C.cardEdge};">
    ${hero ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 6px auto;"><tr><td>${img(base, hero.file, hero.alt, hero.w, hero.h)}</td></tr></table>` : ''}
    <h1 style="margin:0 0 14px 0;font-family:${FONT};font-size:28px;line-height:34px;font-weight:bold;color:${C.text};text-align:center;">${escapeHtml(c.title)}</h1>
    <p style="margin:0 0 16px 0;font-family:${FONT};font-size:16px;line-height:25px;color:${C.text};">${hello}</p>
    ${c.paragraphs.map(p).join('\n    ')}
    ${codeBlock}
    ${c.button ? `<div style="margin:6px 0 0 0;text-align:center;">${button(c.button)}</div>` : ''}
    ${fallback}
    ${notes}
  </td></tr>
  <tr><td class="px" bgcolor="#100c24" align="center" style="background-color:#100c24;padding:22px 28px;border:1px solid ${C.cardEdge};border-top:0;border-radius:0 0 20px 20px;">
    <p style="margin:0 0 6px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.faint};">InvestKit : simulation pédagogique, aucun argent réel.</p>
    <p style="margin:0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.faint};">Tu reçois ce message parce qu’une action a été demandée avec ton adresse e-mail. Tu peux l’ignorer si ce n’est pas toi.</p>
  </td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>`;

  // Version texte brut (lisible partout, y compris sans HTML)
  const text = [
    c.title, '', name ? `Bonjour ${name},` : 'Bonjour,', '', ...c.paragraphs.flatMap((t) => [t, '']),
    ...(c.code ? [`Ton code : ${c.code.value}`, ...(c.code.caption ? [c.code.caption] : []), ''] : []),
    ...(c.button ? [`${c.button.label} : ${c.button.url}`, ''] : []),
    ...((c.notes ?? []).flatMap((n) => [n])), '', '--', 'InvestKit : simulation pédagogique, aucun argent réel.',
  ].join('\n');

  return { subject: c.subject, html, text };
};
