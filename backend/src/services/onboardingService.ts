import { query, getClient } from '../utils/db';
import { investcoinsRepository } from '../repositories/investcoinsRepository';
import { notify } from './notificationService';

// Checklist d'accueil : des étapes calculées À PARTIR DE L'ÉTAT RÉEL du compte (jamais déclarées par le client : impossible de se les attribuer),
// chacune récompensée une seule fois. Pièces créées : petites récompenses, réglées dans config/economy.ts.
import { CHECKLIST_REWARD_COINS, FIRST_STEP_BONUSES } from '../config/economy';
export { CHECKLIST_REWARD_COINS };

interface StepDef { key: string; title: string; description: string; link: string; done: (userId: string) => Promise<boolean> }
const exists = async (sql: string, userId: string): Promise<boolean> => (await query(sql, [userId])).rows.length > 0;

export const STEPS: StepDef[] = [
  { key: 'profile', title: 'Remplir ton profil d\'investisseur', description: 'Trois questions pour adapter les conseils à ton niveau et à tes envies.', link: '#profil',
    done: (u) => exists('SELECT 1 FROM investor_profiles WHERE user_id = $1 AND risk_tolerance IS NOT NULL', u) },
  { key: 'free_domain', title: 'Choisir ton domaine gratuit', description: 'Bourse, Crypto ou Immobilier : le domaine où tu joues gratuitement.', link: '/dashboard',
    done: (u) => exists(`SELECT 1 FROM users WHERE id = $1 AND (free_domain IS NOT NULL OR subscription_tier = 'pro' OR pro_override)`, u) },
  { key: 'first_lesson', title: 'Terminer une leçon d\'éducation', description: `Un chapitre pour comprendre les bases. Deux récompenses distinctes : ${CHECKLIST_REWARD_COINS} pièces ici (à récupérer sur cette liste) et, à part, le bonus « première leçon » de ${FIRST_STEP_BONUSES.first_lesson} pièces, versé automatiquement quand tu réussis le quiz d'un chapitre.`, link: '/education',
    done: (u) => exists('SELECT 1 FROM education_progress WHERE user_id = $1', u) },
  { key: 'daily_reward', title: 'Réclamer ta récompense quotidienne', description: 'Une petite récompense fixe, jusqu\'à 3 jours par semaine : aucune série à tenir.', link: '/dashboard',
    done: (u) => exists('SELECT 1 FROM users WHERE id = $1 AND last_daily_claim_at IS NOT NULL', u) },
  { key: 'first_trade', title: 'Faire ton premier achat en Bourse ou en Crypto', description: `Achète un titre dans le Simulateur : les frais et impôts sont expliqués avant de valider. Le bonus « premier investissement » (${FIRST_STEP_BONUSES.first_investment} pièces, à partir de 100) est versé à part, automatiquement.`, link: '/dashboard',
    done: (u) => exists('SELECT 1 FROM virtual_portfolios WHERE user_id = $1 AND total_bought > 0', u) },
  { key: 'first_property', title: 'Acheter ton premier bien immobilier', description: 'Choisis une annonce, simule l\'achat avec un crédit, et deviens propriétaire.', link: '/immobilier',
    done: (u) => exists('SELECT 1 FROM re_properties p JOIN re_games g ON g.id = p.game_id WHERE g.user_id = $1', u) },
  { key: 'two_factor', title: 'Protéger ton compte avec la double authentification', description: 'Un code en plus du mot de passe : la meilleure protection de ton compte.', link: '/dashboard',
    done: (u) => exists('SELECT 1 FROM users WHERE id = $1 AND enable_2fa IS TRUE', u) },
];

export class OnboardingError extends Error { constructor(public code: 'INVALID_INPUT', message: string) { super(message); this.name = 'OnboardingError'; } }

export const PROFILE_OPTIONS = {
  experience: ['beginner', 'intermediate', 'expert'],
  riskTolerance: ['low', 'medium', 'high'],
  goals: ['learn', 'save', 'income', 'grow', 'retire'],
  markets: ['stocks', 'crypto', 'real_estate', 'bonds'],
};

const pickSubset = (v: unknown, allowed: string[], name: string, max = 5): string[] => {
  if (!Array.isArray(v) || v.length === 0 || v.length > max || !v.every((x) => typeof x === 'string' && allowed.includes(x))) {
    throw new OnboardingError('INVALID_INPUT', `${name} invalide`);
  }
  return [...new Set(v as string[])];
};

// Conseil de départ d'après le profil : où commencer, dans quel ordre.
export const suggestPath = (p: { experience: string; riskTolerance: string; markets: string[] }) => {
  const labels: Record<string, string> = { stocks: 'la Bourse / le PEA', crypto: 'la Crypto', real_estate: 'l\'Immobilier', bonds: 'les obligations' };
  const first = p.markets.find((m) => m !== 'bonds') ?? p.markets[0];
  const steps: string[] = [];
  if (p.experience === 'beginner') steps.push('Commence par l\'Éducation : quelques leçons simples pour comprendre les mots (le glossaire est là pour ça).');
  steps.push(`Teste ${labels[first] ?? 'un domaine'} dans le Simulateur avec de petites sommes avant d'aller plus loin.`);
  if (p.riskTolerance === 'low') steps.push('Garde une bonne part de liquidités et regarde le score de risque de ton portefeuille : vise « Prudent » ou « Modéré ».');
  if (p.riskTolerance === 'high') steps.push('Regarde les tests de résistance (crises de 2000, 2008, 2020…) avant d\'augmenter le risque : le jeu te montre ce que tu aurais perdu.');
  if (p.markets.includes('real_estate')) steps.push('En Immobilier, commence par une petite surface et compare le rendement brut ET l\'effort d\'épargne mensuel.');
  return { headline: `Pour toi : commence par ${labels[first] ?? 'un domaine'}`, steps };
};

export const onboardingService = {
  async get(userId: string) {
    const claimed = new Map((await query('SELECT step, coins FROM onboarding_rewards WHERE user_id = $1', [userId])).rows.map((r: any) => [r.step, Number(r.coins)]));
    const steps = [];
    for (const s of STEPS) {
      const done = await s.done(userId);
      steps.push({ key: s.key, title: s.title, description: s.description, link: s.link, done, claimed: claimed.has(s.key), reward: CHECKLIST_REWARD_COINS });
    }
    const claimable = steps.filter((s) => s.done && !s.claimed);
    const profile = (await query('SELECT risk_tolerance, investment_experience, investment_goals, preferred_markets FROM investor_profiles WHERE user_id = $1', [userId])).rows[0];
    return {
      steps, doneCount: steps.filter((s) => s.done).length, total: steps.length,
      nextStep: steps.find((s) => !s.done) ?? null,
      claimableCoins: claimable.length * CHECKLIST_REWARD_COINS, claimableSteps: claimable.map((s) => s.key),
      profile: profile ? { experience: profile.investment_experience, riskTolerance: profile.risk_tolerance, goals: (profile.investment_goals ?? '').split(',').filter(Boolean), markets: profile.preferred_markets ?? [] } : null,
      options: PROFILE_OPTIONS,
    };
  },

  // Récupère les récompenses des étapes TERMINÉES et pas encore récupérées : atomique et idempotent (la clé primaire empêche tout double versement).
  async claim(userId: string) {
    const state = await onboardingService.get(userId);
    if (state.claimableSteps.length === 0) return { success: true, coins: 0, steps: [] as string[], balance: await investcoinsRepository.getBalance(userId) };
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const won: string[] = [];
      for (const step of state.claimableSteps) {
        const r = await client.query('INSERT INTO onboarding_rewards (user_id, step, coins) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING step', [userId, step, CHECKLIST_REWARD_COINS]);
        if (r.rows.length) won.push(step);
      }
      let balance = await investcoinsRepository.getBalance(userId, client as any);
      const coins = won.length * CHECKLIST_REWARD_COINS;
      if (coins > 0) {
        balance = await investcoinsRepository.applyTransaction(userId, coins, 'checklist_reward', { steps: won }, client as any);
        await notify(client as any, userId, { kind: 'onboarding_reward', title: `+${coins} InvestCoins pour ta progression`, body: `Étapes validées : ${won.map((k) => STEPS.find((s) => s.key === k)!.title).join(' · ')}`, link: '/dashboard' });
      }
      await client.query('COMMIT');
      return { success: true, coins, steps: won, balance };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally { client.release(); }
  },

  async saveProfile(userId: string, body: any) {
    const experience = body?.experience, risk = body?.riskTolerance;
    if (!PROFILE_OPTIONS.experience.includes(experience)) throw new OnboardingError('INVALID_INPUT', 'Niveau d\'expérience invalide');
    if (!PROFILE_OPTIONS.riskTolerance.includes(risk)) throw new OnboardingError('INVALID_INPUT', 'Tolérance au risque invalide');
    const goals = pickSubset(body?.goals, PROFILE_OPTIONS.goals, 'Objectifs');
    const markets = pickSubset(body?.markets, PROFILE_OPTIONS.markets, 'Marchés', 4);
    await query(
      `INSERT INTO investor_profiles (user_id, risk_tolerance, investment_experience, investment_goals, preferred_markets, updated_at) VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (user_id) DO UPDATE SET risk_tolerance = EXCLUDED.risk_tolerance, investment_experience = EXCLUDED.investment_experience,
         investment_goals = EXCLUDED.investment_goals, preferred_markets = EXCLUDED.preferred_markets, updated_at = NOW()`,
      [userId, risk, experience, goals.join(','), markets]);
    return { success: true, suggestion: suggestPath({ experience, riskTolerance: risk, markets }) };
  },
};
