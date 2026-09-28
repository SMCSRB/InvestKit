import { query } from '../utils/db';
import { MIN_YEAR } from '../data/stockPrices';

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
  started_at: Date;
  updated_at: Date;
}

export const virtualPortfolioRepository = {
  async getOrCreate(userId: string, mode: string, domain: string): Promise<VirtualPortfolio> {
    const existing = await query(
      'SELECT * FROM virtual_portfolios WHERE user_id = $1 AND mode = $2 AND domain = $3',
      [userId, mode, domain]
    );
    if (existing.rows[0]) return existing.rows[0];

    const created = await query(
      `INSERT INTO virtual_portfolios (user_id, mode, domain, positions, simulated_year)
       VALUES ($1, $2, $3, '[]', $4)
       RETURNING *`,
      [userId, mode, domain, MIN_YEAR]
    );
    return created.rows[0];
  },

  async updatePositions(id: string, positions: Position[]): Promise<void> {
    await query(
      `UPDATE virtual_portfolios SET positions = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(positions), id]
    );
  },

  async advanceYear(id: string, newYear: number): Promise<void> {
    await query(
      `UPDATE virtual_portfolios SET simulated_year = $1, updated_at = NOW() WHERE id = $2`,
      [newYear, id]
    );
  },
};
