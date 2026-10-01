// Aperçu des e-mails : écrit un fichier HTML par modèle dans le dossier donné (défaut : ./mail-preview) et peut envoyer un test.
//   npm run mail:preview                      → fichiers à ouvrir dans un navigateur
//   npm run mail:preview -- --send boite@test  → envoie aussi les 4 modèles à cette adresse de TEST (jamais à un joueur)
import fs from 'fs';
import path from 'path';
import { renderMail } from '../src/utils/emailTemplate';
import { verificationMail, passwordResetMail, accountExistsMail, welcomeMail, deliverEmail } from '../src/utils/email';

const args = process.argv.slice(2);
const sendIdx = args.indexOf('--send');
const sendTo = sendIdx >= 0 ? args[sendIdx + 1] : null;
const outDir = path.resolve(args.find((a, i) => !a.startsWith('--') && (sendIdx < 0 || i !== sendIdx + 1)) ?? 'mail-preview');
const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

const models = {
  verification: verificationMail('Camille', '482915', `${base}/verify-email?email=camille%40example.com`),
  reset: passwordResetMail('Camille', `${base}/reset-password?token=EXEMPLE`),
  exists: accountExistsMail(`${base}/login`, `${base}/forgot-password`),
  welcome: welcomeMail('Camille', `${base}/dashboard`),
};

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  for (const [k, c] of Object.entries(models)) {
    const { html, text } = renderMail(c);
    fs.writeFileSync(path.join(outDir, `${k}.html`), html);
    fs.writeFileSync(path.join(outDir, `${k}.txt`), text);
  }
  console.log(`Aperçus écrits dans ${outDir}`);
  if (sendTo) {
    for (const c of Object.values(models)) {
      const { subject, html, text } = renderMail(c);
      await deliverEmail(sendTo, `[TEST] ${subject}`, html, text);
    }
    console.log(`Tests envoyés à ${sendTo}`);
  }
})();
