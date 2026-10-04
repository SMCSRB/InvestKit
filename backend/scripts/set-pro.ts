// Usage : npm run set-pro -- <email ou pseudo> on|off
// Accorde ou retire l'accès Pro manuel (testeurs) sans passer par Stripe.
// Champ pro_override séparé de subscription_tier : un webhook Stripe ne
// l'écrase jamais. Chaque changement est tracé dans audit_logs.
import { initDatabase, query, closePool } from '../src/utils/db';

const main = async (): Promise<void> => {
  const [email, mode] = process.argv.slice(2);
  if (!email || (mode !== 'on' && mode !== 'off')) {
    console.error('Usage : npm run set-pro -- <email ou pseudo> on|off');
    process.exit(1);
  }
  initDatabase();
  const enabled = mode === 'on';
  // Un seul compte doit correspondre (e-mail ou pseudo) : en cas de doute, rien n'est modifié.
  const found = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)', [email]);
  if (found.rows.length > 1) {
    console.error(`Plusieurs comptes correspondent à ${email} : rien n'a été modifié.`);
    await closePool();
    process.exit(1);
  }
  const result = await query('UPDATE users SET pro_override = $1, updated_at = NOW() WHERE id = ANY($2::uuid[]) RETURNING id', [enabled, found.rows.map((r: any) => r.id)]);
  if (result.rows.length === 0) {
    console.error(`Aucun utilisateur avec l'email ou le pseudo ${email}`);
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
