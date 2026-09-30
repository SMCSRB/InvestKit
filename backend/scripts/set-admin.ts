// Usage : npm run set-admin -- <email> on|off
// Donne ou retire le rôle administrateur. Volontairement PAS disponible dans l'interface : seul quelqu'un qui a accès au serveur peut nommer un administrateur.
// Le compte doit avoir activé la double authentification (2FA) pour pouvoir utiliser les routes d'administration. Tracé dans audit_logs.
import { initDatabase, query, closePool } from '../src/utils/db';

const main = async (): Promise<void> => {
  const [email, mode] = process.argv.slice(2);
  if (!email || (mode !== 'on' && mode !== 'off')) {
    console.error('Usage : npm run set-admin -- <email> on|off');
    process.exit(1);
  }
  initDatabase();
  const admin = mode === 'on';
  const result = await query(
    `UPDATE users SET role = $1, updated_at = NOW() WHERE LOWER(email) = LOWER($2) RETURNING id, enable_2fa`,
    [admin ? 'admin' : 'user', email]
  );
  if (result.rows.length === 0) {
    console.error(`Aucun utilisateur avec l'email ${email}`);
    await closePool();
    process.exit(1);
  }
  const { id, enable_2fa } = result.rows[0];
  await query(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES ($1, 'admin_set_role', 'user', $1, $2)`, [id, JSON.stringify({ admin, via: 'cli' })]);
  console.log(`✅ Rôle administrateur ${admin ? 'ACCORDÉ à' : 'RETIRÉ de'} ${email}`);
  if (admin && !enable_2fa) console.log('⚠️  Ce compte n\'a pas encore activé la double authentification : il doit le faire (Paramètres → Sécurité) avant de pouvoir utiliser l\'administration.');
  await closePool();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
