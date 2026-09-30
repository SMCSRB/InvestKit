// Gestion des codes d'invitation (inscription sur invitation).
//   npm run invite -- create [--uses 1] [--days 30] [--note "pour Julien"]
//   npm run invite -- list
//   npm run invite -- revoke ABCDE-FGHJK
import { initDatabase, query, closePool } from '../src/utils/db';
import { invitationRepository, normalizeInvitationCode } from '../src/repositories/invitationRepository';

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const fmt = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 16).replace('T', ' ') : '—');

const main = async (): Promise<void> => {
  const cmd = process.argv[2];
  initDatabase();
  if (cmd === 'create') {
    const uses = arg('uses') ? Number(arg('uses')) : 1;
    const days = arg('days') ? Number(arg('days')) : null;
    if (!Number.isInteger(uses) || uses < 1) throw new Error('--uses doit être un entier ≥ 1');
    if (days !== null && (!Number.isFinite(days) || days <= 0)) throw new Error('--days doit être un nombre > 0');
    const c = await invitationRepository.create({
      maxUses: uses,
      expiresAt: days ? new Date(Date.now() + days * 86400000) : null,
      note: arg('note') ?? null,
    });
    await query(`INSERT INTO audit_logs (action, entity_type, entity_id, metadata) VALUES ('admin_invitation_create', 'invitation_code', $1, $2)`, [c.id, JSON.stringify({ maxUses: uses, days })]);
    console.log(`✅ Code créé : ${c.code}  (utilisations max : ${uses}, expire : ${fmt(c.expires_at)})`);
  } else if (cmd === 'list') {
    const rows = await invitationRepository.list();
    if (rows.length === 0) console.log('Aucun code.');
    for (const r of rows) {
      const state = r.revoked_at ? 'RÉVOQUÉ' : r.expires_at && new Date(r.expires_at) < new Date() ? 'EXPIRÉ' : r.uses >= r.max_uses ? 'ÉPUISÉ' : 'actif';
      console.log(`${r.code}  ${state.padEnd(8)} ${r.uses}/${r.max_uses}  expire ${fmt(r.expires_at)}  ${r.note ?? ''}  ${r.users.join(', ')}`);
    }
  } else if (cmd === 'revoke') {
    const code = normalizeInvitationCode(process.argv[3]);
    if (!code) throw new Error('Code invalide');
    console.log((await invitationRepository.revoke(code)) ? `✅ Code ${code} révoqué` : 'Code introuvable ou déjà révoqué');
  } else {
    console.log('Usage : npm run invite -- create [--uses N] [--days D] [--note "..."] | list | revoke CODE');
    process.exitCode = 1;
  }
  await closePool();
};
main().catch(async (e) => { console.error('❌', e.message); await closePool(); process.exit(1); });
