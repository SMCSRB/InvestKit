import { query } from '../utils/db';
import { hasProAccess } from '../utils/entitlements';
import { DASHBOARD_TEMPLATES, DEFAULT_TEMPLATE, CUSTOM_TEMPLATE, DASHBOARD_WIDGETS, validateWidgets, type DashboardWidget } from '../config/dashboardLayout';

export class LayoutError extends Error {
  constructor(public code: 'INVALID_INPUT' | 'PRO_REQUIRED', message: string) { super(message); this.name = 'LayoutError'; }
}

const catalog = () => ({ availableWidgets: [...DASHBOARD_WIDGETS], templates: DASHBOARD_TEMPLATES });

export const dashboardLayoutService = {
  // Disposition du joueur ; à défaut, le modèle de départ. Les blocs qui n'existent plus sont ignorés.
  async get(userId: string) {
    const r = (await query('SELECT template, layout, version FROM dashboard_layouts WHERE user_id = $1', [userId])).rows[0];
    const user = (await query('SELECT subscription_tier, pro_override FROM users WHERE id = $1', [userId])).rows[0];
    const canCustomize = !!user && hasProAccess(user);
    if (!r) return { template: DEFAULT_TEMPLATE, widgets: DASHBOARD_TEMPLATES[DEFAULT_TEMPLATE], version: 0, canCustomize, ...catalog() };
    const widgets = (Array.isArray(r.layout) ? r.layout : []).filter((w: unknown) => (DASHBOARD_WIDGETS as readonly string[]).includes(w as string)) as DashboardWidget[];
    return { template: r.template as string, widgets, version: r.version as number, canCustomize, ...catalog() };
  },

  // Compte gratuit : choisit un modèle de départ. Pro : peut aussi envoyer sa propre liste de blocs. Le droit est lu en base, jamais dans la requête.
  async save(userId: string, input: { template?: unknown; widgets?: unknown }) {
    const user = (await query('SELECT subscription_tier, pro_override FROM users WHERE id = $1', [userId])).rows[0];
    if (!user) throw new LayoutError('INVALID_INPUT', 'Compte introuvable.');
    let template: string;
    let widgets: DashboardWidget[];
    if (input.widgets !== undefined) {
      if (!hasProAccess(user)) throw new LayoutError('PRO_REQUIRED', 'Réorganiser librement le tableau de bord fait partie du plan Pro. Tu peux choisir un modèle.');
      const v = validateWidgets(input.widgets);
      if (!v.ok) throw new LayoutError('INVALID_INPUT', v.error);
      template = CUSTOM_TEMPLATE; widgets = v.widgets;
    } else {
      if (typeof input.template !== 'string' || !Object.prototype.hasOwnProperty.call(DASHBOARD_TEMPLATES, input.template)) throw new LayoutError('INVALID_INPUT', 'Modèle inconnu.');
      template = input.template; widgets = DASHBOARD_TEMPLATES[input.template];
    }
    await query(
      `INSERT INTO dashboard_layouts (user_id, template, layout) VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (user_id) DO UPDATE SET template = EXCLUDED.template, layout = EXCLUDED.layout, version = dashboard_layouts.version + 1, updated_at = NOW()`,
      [userId, template, JSON.stringify(widgets)]);
    return this.get(userId);
  },
};
