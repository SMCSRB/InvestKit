import { getClient } from '../utils/db';
import { userRepository, User } from '../repositories/userRepository';
import { notify } from './notificationService';
import { investcoinsRepository } from '../repositories/investcoinsRepository';

import { Queryable } from '../repositories/investcoinsRepository';
import { STARTING_CAPITAL, proStartingBonus } from '../config/game';

export { STARTING_CAPITAL };
export const REFERRAL_BONUS = 100;

// Complément de capital de départ pour un abonné Pro, versé UNE seule fois par compte : le marqueur est posé par une mise à jour
// conditionnelle, donc deux webhooks simultanés ne versent pas deux fois, et résilier puis se réabonner ne redonne rien.
// Renvoie le montant versé (0 si déjà versé ou désactivé).
export const grantProStartingCapital = async (userId: string, db: Queryable): Promise<number> => {
  const bonus = proStartingBonus();
  if (bonus <= 0) return 0;
  const marked = await db.query(
    'UPDATE users SET pro_capital_granted_at = NOW() WHERE id = $1 AND pro_capital_granted_at IS NULL RETURNING id', [userId]
  );
  if (marked.rows.length === 0) return 0;
  await investcoinsRepository.applyTransaction(userId, bonus, 'pro_starting_bonus', undefined, db);
  await notify(db, userId, { kind: 'pro_bonus', title: 'Bienvenue dans Pro', body: `${bonus} InvestCoins de capital de départ supplémentaire t'ont été versés.` });
  return bonus;
};

// Même chose dans sa propre transaction (webhook Stripe) : marqueur et versement réussissent ou échouent ensemble.
export const grantProStartingCapitalTx = async (userId: string): Promise<number> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const bonus = await grantProStartingCapital(userId, client);
    await client.query('COMMIT');
    return bonus;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Active le compte et accorde les récompenses dans UNE transaction :
// - l'activation est conditionnelle (voir verifyEmailAtomic), donc les
//   récompenses ne sont versées qu'une seule fois même si l'utilisateur
//   envoie le code deux fois en même temps ;
// - si un versement échoue, tout est annulé et le code reste utilisable.
// Note parrainage : comme tout programme sans vérification d'identité forte,
// il peut être farmé avec plusieurs comptes ; accepté pour l'instant, à durcir
// plus tard si l'abus devient réel.
export const activateAccount = async (user: User, code: string): Promise<boolean> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const activated = await userRepository.verifyEmailAtomic(user.id, code, client);
    if (!activated) {
      await client.query('ROLLBACK');
      return false;
    }
    await investcoinsRepository.applyTransaction(user.id, STARTING_CAPITAL, 'starting_capital', undefined, client);
    if (user.subscription_tier === 'pro' || user.pro_override) await grantProStartingCapital(user.id, client);
    if (user.referred_by_user_id) {
      await investcoinsRepository.applyTransaction(
        user.referred_by_user_id, REFERRAL_BONUS, 'referral_bonus', { referredUserId: user.id }, client
      );
    }
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
