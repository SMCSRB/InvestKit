// Chiffre les secrets 2FA encore en clair (anciens comptes). Sans danger : idempotent, ne touche pas ce qui est déjà chiffré.
//   npm run encrypt-totp            (FIELD_ENCRYPTION_KEY définie dans backend/.env.local, voir docs)
import { initDatabase, query, closePool } from '../src/utils/db';
import { encryptField, isEncrypted } from '../src/utils/fieldCrypto';

(async () => {
  initDatabase();
  const rows = (await query(`SELECT id, totp_secret FROM users WHERE totp_secret IS NOT NULL`)).rows;
  let done = 0;
  for (const r of rows) {
    if (isEncrypted(r.totp_secret)) continue;
    await query('UPDATE users SET totp_secret = $2 WHERE id = $1', [r.id, encryptField(r.totp_secret)]);
    done += 1;
  }
  console.log(`✅ ${done} secret(s) 2FA chiffré(s) sur ${rows.length} (les autres l'étaient déjà).`);
  await closePool();
})().catch((e) => { console.error(e); process.exit(1); });
