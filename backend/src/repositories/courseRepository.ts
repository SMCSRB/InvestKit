import { query } from '../utils/db';

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  duration_minutes: number;
  content: string;
  content_html?: string;
  order_index: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

export const courseRepository = {
  async findAll(category?: string, level?: string): Promise<Course[]> {
    let sql = 'SELECT * FROM courses WHERE is_published = TRUE';
    const params = [];

    if (category) {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }

    if (level) {
      params.push(level);
      sql += ` AND level = $${params.length}`;
    }

    sql += ' ORDER BY order_index ASC';

    const result = await query(sql, params);
    return result.rows;
  },

  async findById(id: string): Promise<Course | null> {
    const result = await query('SELECT * FROM courses WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByCategory(category: string): Promise<Course[]> {
    const result = await query(
      'SELECT * FROM courses WHERE category = $1 AND is_published = TRUE ORDER BY order_index ASC',
      [category]
    );
    return result.rows;
  },

  async findByLevel(level: string): Promise<Course[]> {
    const result = await query(
      'SELECT * FROM courses WHERE level = $1 AND is_published = TRUE ORDER BY order_index ASC',
      [level]
    );
    return result.rows;
  },

  async create(data: Partial<Course>): Promise<Course> {
    const result = await query(
      `INSERT INTO courses (title, description, category, level, duration_minutes, content, order_index, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.title,
        data.description,
        data.category,
        data.level,
        data.duration_minutes,
        data.content,
        data.order_index || 0,
        data.is_published || false,
      ]
    );
    return result.rows[0];
  },
};
