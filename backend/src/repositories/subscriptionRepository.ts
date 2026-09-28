import { query } from '../utils/db';

export interface Subscription {
  id: string;
  user_id: string;
  tier: string;
  status: string;
  payment_provider?: string;
  external_subscription_id?: string;
  started_at: Date;
  current_period_end?: Date;
  canceled_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export const subscriptionRepository = {
  async findByExternalId(externalSubscriptionId: string): Promise<Subscription | null> {
    const result = await query(
      'SELECT * FROM subscriptions WHERE external_subscription_id = $1',
      [externalSubscriptionId]
    );
    return result.rows[0] || null;
  },

  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    const result = await query(
      `SELECT * FROM subscriptions
       WHERE user_id = $1 AND status IN ('active', 'trialing')
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  },

  // Crée ou met à jour l'abonnement associé à un id Stripe (upsert par
  // external_subscription_id, la source de vérité étant Stripe).
  async upsertByExternalId(data: {
    user_id: string;
    tier: string;
    status: string;
    payment_provider: string;
    external_subscription_id: string;
    current_period_end?: Date;
    canceled_at?: Date;
  }): Promise<void> {
    const existing = await this.findByExternalId(data.external_subscription_id);

    if (existing) {
      await query(
        `UPDATE subscriptions
         SET tier = $1, status = $2, current_period_end = $3, canceled_at = $4, updated_at = NOW()
         WHERE external_subscription_id = $5`,
        [
          data.tier,
          data.status,
          data.current_period_end || null,
          data.canceled_at || null,
          data.external_subscription_id,
        ]
      );
    } else {
      await query(
        `INSERT INTO subscriptions
           (user_id, tier, status, payment_provider, external_subscription_id, current_period_end, canceled_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          data.user_id,
          data.tier,
          data.status,
          data.payment_provider,
          data.external_subscription_id,
          data.current_period_end || null,
          data.canceled_at || null,
        ]
      );
    }
  },
};
