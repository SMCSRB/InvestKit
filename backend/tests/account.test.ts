import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';
import { query } from '../src/utils/db';
import { exportUserData, deleteAccount, AccountError } from '../src/services/accountService';
import { investcoinsRepository } from '../src/repositories/investcoinsRepository';
import { tradingService as trading } from '../src/services/tradingService';
import { realEstateService as svc } from '../src/services/realEstateService';
import { withTx, originateLoan } from '../src/services/bankService';
import { auditLog } from '../src/services/auditService';
import { encryptField } from '../src/utils/fieldCrypto';

describe.skipIf(!hasDb)('droits RGPD : export et suppression du compte', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  const PASSWORD = 'MotDePasse-Test-123';
  const rejects = async (p: Promise<unknown>): Promise<AccountError> => { try { await p; } catch (e) { return e as AccountError; } throw new Error('aurait dû échouer'); };
  const noCancel = { cancelSubscription: async () => { throw new Error('ne doit pas être appelé'); } };

  const richUser = async () => {
    const uid = await createUser({ balance: 800, freeDomain: 'real_estate' });
    const hash = await bcrypt.hash(PASSWORD, 4);
    await query(`UPDATE users SET password_hash = $2, reset_token = 'JETON-SECRET-RESET-' || id::text, verification_code_expires_at = NOW(), stripe_customer_id = 'cus_SECRET_' || id::text, totp_backup_codes = '["hashsecret"]' WHERE id = $1`, [uid, hash]);
    await investcoinsRepository.applyTransaction(uid, 50, 'daily_reward', { streak: 1 });
    await trading.getPortfolioView(uid, 'stocks');
    await svc.startGame(uid, 'employee');
    await withTx((c) => originateLoan(c, { userId: uid, product: 'personal', domain: 'real_estate', principalCoins: 100, annualRatePct: 6, months: 12, clockTotal: 24120 }));
    await auditLog({ userId: uid, action: 'login', entityType: 'user', entityId: uid });
    return uid;
  };

  it('EXPORT : contient mes données de tous les domaines, jamais de secret, jamais les données d\'un autre', async () => {
    const uid = await richUser();
    const other = await richUser();
    const exp: any = await exportUserData(uid);
    expect(exp.profile.id).toBe(uid);
    expect(exp.coins.balance.balance).toBeGreaterThan(0);
    expect(exp.coins.transactions.length).toBeGreaterThanOrEqual(2);
    expect(exp.portfolios.some((p: any) => p.domain === 'stocks')).toBe(true);
    expect(exp.realEstate.games).toHaveLength(1);
    expect(exp.bank.loans).toHaveLength(1);
    expect(exp.auditLog.some((a: any) => a.action === 'login')).toBe(true);
    const json = JSON.stringify(exp);
    for (const secret of ['password_hash', 'JETON-SECRET-RESET', 'cus_SECRET_', 'hashsecret', 'totp_secret', 'verification_code"', '$2b$']) expect(json).not.toContain(secret);
    expect(json).not.toContain(other);                             // aucune donnée d'un autre compte
    expect((await rejects(exportUserData('00000000-0000-0000-0000-000000000000'))).code).toBe('NOT_FOUND');
  });

  it('SUPPRESSION : confirmation écrite, mot de passe correct obligatoires ; rien n\'est supprimé en cas de refus', async () => {
    const uid = await richUser();
    for (const input of [{}, { password: PASSWORD }, { confirm: 'SUPPRIMER' }, { password: PASSWORD, confirm: 'supprimer' }]) {
      expect((await rejects(deleteAccount(uid, input, noCancel))).code).toBe('INVALID_INPUT');
    }
    expect((await rejects(deleteAccount(uid, { password: 'mauvais', confirm: 'SUPPRIMER' }, noCancel))).code).toBe('BAD_CREDENTIALS');
    expect((await query('SELECT COUNT(*) AS n FROM users WHERE id = $1', [uid])).rows[0].n).toBe('1');
  });

  it('SUPPRESSION : tout est effacé (cascade), les autres comptes intacts, audit anonymisé', async () => {
    const uid = await richUser();
    const other = await richUser();
    const r = await deleteAccount(uid, { password: PASSWORD, confirm: 'SUPPRIMER' }, noCancel);
    expect(r).toEqual({ deleted: true, subscriptionCancelled: false });
    for (const [table, col] of [['users', 'id'], ['investcoins_balance', 'user_id'], ['investcoins_transactions', 'user_id'], ['virtual_portfolios', 'user_id'], ['re_games', 'user_id'], ['bank_loans', 'user_id'], ['bank_accounts', 'user_id'], ['bank_events', 'user_id']]) {
      expect(Number((await query(`SELECT COUNT(*) AS n FROM ${table} WHERE ${col} = $1`, [uid])).rows[0].n), table).toBe(0);
    }
    expect((await query('SELECT COUNT(*) AS n FROM users WHERE id = $1', [other])).rows[0].n).toBe('1');
    expect((await query('SELECT COUNT(*) AS n FROM bank_loans WHERE user_id = $1', [other])).rows[0].n).toBe('1');
    const audit = (await query(`SELECT user_id FROM audit_logs WHERE action = 'account_deleted' AND entity_id = $1`, [uid])).rows;
    expect(audit).toEqual([{ user_id: null }]);
  });

  it('2FA : le code (ou un code de secours) est exigé et vérifié avant toute suppression', async () => {
    const uid = await richUser();
    const secret = authenticator.generateSecret();
    await query(`UPDATE users SET enable_2fa = TRUE, totp_secret = $2 WHERE id = $1`, [uid, encryptField(secret)]);
    expect((await rejects(deleteAccount(uid, { password: PASSWORD, confirm: 'SUPPRIMER' }, noCancel))).code).toBe('TWO_FACTOR_REQUIRED');
    expect((await rejects(deleteAccount(uid, { password: PASSWORD, confirm: 'SUPPRIMER', code: '000000' }, noCancel))).code).toBe('BAD_CREDENTIALS');
    expect((await query('SELECT COUNT(*) AS n FROM users WHERE id = $1', [uid])).rows[0].n).toBe('1');
    const ok = await deleteAccount(uid, { password: PASSWORD, confirm: 'SUPPRIMER', code: authenticator.generate(secret) }, noCancel);
    expect(ok.deleted).toBe(true);
  });

  it('ABONNEMENT : annulé chez Stripe avant la suppression ; si l\'annulation échoue, le compte est conservé', async () => {
    const uid = await richUser();
    await query(`INSERT INTO subscriptions (user_id, tier, status, payment_provider, external_subscription_id) VALUES ($1, 'pro', 'active', 'stripe', 'sub_TEST_1')`, [uid]);
    const failing = { cancelSubscription: async () => { throw new Error('stripe indisponible'); } };
    expect((await rejects(deleteAccount(uid, { password: PASSWORD, confirm: 'SUPPRIMER' }, failing))).code).toBe('SUBSCRIPTION_CANCEL_FAILED');
    expect((await query('SELECT COUNT(*) AS n FROM users WHERE id = $1', [uid])).rows[0].n).toBe('1');
    const cancelled: string[] = [];
    const r = await deleteAccount(uid, { password: PASSWORD, confirm: 'SUPPRIMER' }, { cancelSubscription: async (id) => { cancelled.push(id); } });
    expect(cancelled).toEqual(['sub_TEST_1']);
    expect(r).toEqual({ deleted: true, subscriptionCancelled: true });
  });
});
