// Usage : npm run set-pro -- <email> on|off
// Accorde ou retire l'accès Pro manuel (testeurs) sans passer par Stripe.
// Champ pro_override séparé de subscription_tier : un webhook Stripe ne
// l'écrase jamais. Chaque changement est tracé dans audit_logs.
import { initDatabase, query, closePool } from '../src/utils/db';

const main = async (): Promise<void> => {
  const [email, mode] = process.argv.slice(2);
  if (!email || (mode !== 'on' && mode !== 'off')) {
    console.error('Usage : npm run set-pro -- <email> on|off');
    process.exit(1);
  }
  initDatabase();
  const enabled = mode === 'on';
  const result = await query(
    'UPDATE users SET pro_override = $1, updated_at = NOW() WHERE LOWER(email) = LOWER($2) RETURNING id',
    [enabled, email]
  );
  if (result.rows.length === 0) {
    console.error(`Aucun utilisateur avec l'email ${email}`);
    await closePool();
    process.exit(1);
  }
  const userId = result.rows[0].id;
  await query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
     VALUES ($1, 'admin_set_pro_override', 'user', $1, $2)`,
    [userId, JSON.stringify({ enabled, via: 'cli' })]
  );
  console.log(`✅ Accès Pro manuel ${enabled ? 'ACTIVÉ' : 'RETIRÉ'} pour ${email}`);
  await closePool();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
