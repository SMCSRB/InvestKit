// Génère les images des e-mails : visuels « 3D » (PNG, depuis les SVG de ./svg) et images de l'animation d'en-tête (PNG), puis appelle gif.py.
// Outil de DÉVELOPPEMENT, lancé à la main quand on change un visuel (les images produites sont enregistrées dans public/mail/).
// Il a besoin de Playwright (déjà installé sur la machine de développement, ce n'est PAS une dépendance du site) :
//     PLAYWRIGHT_MODULE=/chemin/vers/playwright PLAYWRIGHT_CHROMIUM=/chemin/vers/chrome node tools/mail-assets/render.mjs
import { createRequire } from 'module';
import { readFileSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const out = join(root, 'public', 'mail');
const tmp = join(here, '.frames');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ['--no-sandbox'] });

// 1) Visuels « 3D » : chaque SVG est dessiné à 2× (écrans Retina), fond transparent.
// tailles d'affichage dans le mail (le PNG produit est 2× plus grand, pour les écrans Retina)
const SIZES = { 'coin': [160, 160], 'shield': [160, 160], 'building': [160, 160], 'chart': [240, 165], 'logo-k': [64, 64] };
const ctx = await browser.newContext({ deviceScaleFactor: 2 });
const page = await ctx.newPage();
for (const [name, [w, h]] of Object.entries(SIZES)) {
  const svg = readFileSync(join(here, 'svg', `${name}.svg`), 'utf8');
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace(/width="\d+" height="\d+"/, `width="${w}" height="${h}"`).replace('<svg ', '<svg style="display:block" ')}</body></html>`);
  await page.screenshot({ path: join(out, `${name}.png`), omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  console.log('✓', `${name}.png`);
}
await ctx.close();

// 2) Animation d'en-tête : 600 × 150. L'IMAGE 0 est l'en-tête COMPLET (Outlook de bureau n'affiche que la première image du GIF).
//    Ensuite : pièces qui montent, puis le K disparaît et réapparaît avec un éclat violet, puis retour à l'état complet. Boucle infinie.
const W = 600, H = 150, FRAMES = 24;
rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
const logo = readFileSync(join(here, 'svg', 'logo-k.svg'), 'utf8').replace(/<\?xml[^>]*>/, '');
const ease = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
// état du K selon l'image : 0..11 complet ; 12-13 il s'efface ; 14..19 il revient (rebond) avec un éclat ; 20..23 complet
const kState = (n) => {
  if (n < 12 || n >= 20) return { s: 1, o: 1, flash: 0, word: 1 };
  if (n < 14) { const q = (n - 11) / 3; return { s: 1 - q * 0.45, o: 1 - q, flash: 0, word: 1 - q * 0.6 }; }
  const q = (n - 13) / 6;                           // 14..19 → 0.17..1
  const e = ease(q); const bounce = 1 + Math.sin(q * Math.PI) * 0.12;
  return { s: (0.55 + 0.45 * e) * bounce, o: Math.min(1, q * 2.2), flash: Math.sin(q * Math.PI), word: Math.min(1, 0.4 + q) };
};
const frameHtml = (n) => {
  const k = kState(n);
  const curve = 1;
  const coins = [0, 1, 2, 3].map((i) => { const q = ((n / FRAMES) + i * 0.25) % 1; return { x: 400 + i * 52 + (i % 2) * 10, y: 160 - q * 200, o: Math.sin(q * Math.PI) * 0.95, s: 0.7 + (i % 3) * 0.18 }; });
  return `<html><body style="margin:0;width:${W}px;height:${H}px;overflow:hidden;background:linear-gradient(120deg,#0b0716 0%,#1a1040 55%,#0b0716 100%);position:relative;font-family:Arial,Helvetica,sans-serif">
  <div style="position:absolute;left:-40px;top:-60px;width:360px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(139,108,255,${(0.34 + k.flash * 0.2).toFixed(2)}) 0%,rgba(139,108,255,0) 70%)"></div>
  <div style="position:absolute;right:-30px;bottom:-90px;width:300px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(193,91,240,.24) 0%,rgba(193,91,240,0) 70%)"></div>
  <svg width="${W}" height="${H}" style="position:absolute;left:0;top:0">
    <path d="M390 118 C420 112 440 98 466 98 C496 98 510 72 534 64 C556 57 572 40 592 24" fill="none" stroke="#8b6cff" stroke-width="3" stroke-linecap="round" stroke-opacity=".9" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${(1 - curve).toFixed(3)}"/>
    ${coins.map((c) => `<g transform="translate(${c.x} ${c.y.toFixed(1)}) scale(${c.s})" opacity="${c.o.toFixed(2)}"><ellipse cx="0" cy="0" rx="11" ry="13" fill="#e79a12"/><ellipse cx="-1.5" cy="-1.5" rx="9" ry="11" fill="#ffd25e"/><rect x="-4" y="-4" width="3" height="8" fill="#fff6d2"/><rect x="0" y="-7" width="3" height="11" fill="#fff6d2"/></g>`).join('')}
  </svg>
  <div style="position:absolute;left:40px;top:40px;width:70px;height:70px;opacity:${k.o.toFixed(2)};transform:scale(${k.s.toFixed(3)});transform-origin:center;filter:drop-shadow(0 0 ${(8 + k.flash * 16).toFixed(0)}px rgba(139,108,255,.95))">${logo.replace('width="128" height="128"', 'width="70" height="70"')}</div>
  <div style="position:absolute;left:128px;top:48px;color:#f4f2ff;font-size:34px;font-weight:700;letter-spacing:.5px;opacity:${k.word.toFixed(2)}">Invest<span style="color:#a893ff">Kit</span></div>
  <div style="position:absolute;left:130px;top:92px;color:#b7b2d3;font-size:14px;opacity:${k.word.toFixed(2)}">Apprends à investir, étape par étape.</div>
  </body></html>`;
};
const fpage = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
for (let i = 0; i < FRAMES; i += 1) {
  await fpage.setContent(frameHtml(i));
  await fpage.screenshot({ path: join(tmp, `f${String(i).padStart(2, '0')}.png`) });
}
await browser.close();
const frames = readdirSync(tmp).filter((f) => f.endsWith('.png')).sort().map((f) => join(tmp, f));
const r = spawnSync('python3', [join(here, 'gif.py'), join(out, 'header.gif'), '90', ...frames], { stdio: 'inherit' });
rmSync(tmp, { recursive: true, force: true });
if (r.status !== 0) process.exit(r.status ?? 1);
