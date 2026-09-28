import { query, getClient } from '../utils/db';
import type { Queryable } from './investcoinsRepository';

export interface Position {
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
}

export interface VirtualPortfolio {
  id: string;
  user_id: string;
  mode: string;
  domain: string;
  positions: Position[];
  simulated_year: number;
  total_bought: number;
  total_proceeds: number;
  started_at: Date;
  updated_at: Date;
}

// pg renvoie les DECIMAL sous forme de chaînes ("1200.00") : on convertit une
// seule fois ici plutôt que de laisser des chaînes se glisser dans les calculs.
const toPortfolio = (row: any): VirtualPortfolio => ({
  ...row,
  total_bought: Number(row.total_bought),
  total_proceeds: Number(row.total_proceeds),
});

export interface PortfolioSave {
  positions: Position[];
  totalBought: number;
  totalProceeds: number;
}

export const virtualPortfolioRepository = {
  // Lecture simple (sans verrou) : pour AFFICHER un portefeuille.
  // startYear = première année disponible du domaine (2010 Bourse, 2013 Crypto).
  async getOrCreate(
    userId: string,
    mode: string,
    domain: string,
    startYear: number
  ): Promise<VirtualPortfolio> {
    await query(
      `INSERT INTO virtual_portfolios (user_id, mode, domain, positions, simulated_year)
       VALUES ($1, $2, $3, '[]', $4)
       ON CONFLICT (user_id, mode, domain) DO NOTHING`,
      [userId, mode, domain, startYear]
    );
    const result = await query(
      'SELECT * FROM virtual_portfolios WHERE user_id = $1 AND mode = $2 AND domain = $3',
      [userId, mode, domain]
    );
    return toPortfolio(result.rows[0]);
  },

  // Exécute `fn` dans UNE transaction, avec le portefeuille verrouillé
  // (SELECT ... FOR UPDATE). Toute requête concurrente sur le même portefeuille
  // attend la fin de celle-ci : c'est ce qui empêche les mises à jour perdues
  // (deux achats simultanés dont le second écraserait le premier) et les
  // doubles dépenses. Tout ce qui est écrit via `tx` (portefeuille, ledger,
  // classement) est validé ou annulé ensemble.
  async withLock<T>(
    userId: string,
    mode: string,
    domain: string,
    startYear: number,
    fn: (portfolio: VirtualPortfolio, tx: Queryable) => Promise<T>
  ): Promise<T> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO virtual_portfolios (user_id, mode, domain, positions, simulated_year)
         VALUES ($1, $2, $3, '[]', $4)
         ON CONFLICT (user_id, mode, domain) DO NOTHING`,
        [userId, mode, domain, startYear]
      );
      const locked = await client.query(
        `SELECT * FROM virtual_portfolios
         WHERE user_id = $1 AND mode = $2 AND domain = $3
         FOR UPDATE`,
        [userId, mode, domain]
      );
      const result = await fn(toPortfolio(locked.rows[0]), client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async save(db: Queryable, id: string, data: PortfolioSave): Promise<void> {
    await db.query(
      `UPDATE virtual_portfolios
       SET positions = $1, total_bought = $2, total_proceeds = $3, updated_at = NOW()
       WHERE id = $4`,
      [JSON.stringify(data.positions), data.totalBought, data.totalProceeds, id]
    );
  },

  async setYear(db: Queryable, id: string, year: number): Promise<void> {
    await db.query(
      `UPDATE virtual_portfolios SET simulated_year = $1, updated_at = NOW() WHERE id = $2`,
      [year, id]
    );
  },
};
