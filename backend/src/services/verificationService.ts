import { getClient } from '../utils/db';
import { userRepository, User } from '../repositories/userRepository';
import { investcoinsRepository } from '../repositories/investcoinsRepository';

export const STARTING_CAPITAL = 500;
export const REFERRAL_BONUS = 100;

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
