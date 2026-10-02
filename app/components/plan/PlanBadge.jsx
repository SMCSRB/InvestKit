'use client';

import Icon from '@/app/components/ui/Icon';
import { planLine } from '@/app/lib/plan';

// Pastille « Pro » : visible seulement si le SERVEUR dit que le compte est Pro (abonnement ou passage manuel).
export default function PlanBadge({ plan, size = 'md', showDate = false }) {
  if (!plan?.isPro) return null;
  return (
    <span className={`ik-planbadge ik-planbadge--${size}`} data-testid="plan-badge" title={planLine(plan)}>
      <Icon name="sparkles" size={size === 'sm' ? 11 : 14} />
      <span>Pro</span>
      {showDate && <span className="ik-planbadge__date">{planLine(plan).replace(/^Pro\s·\s/, '').replace(/^Plan Pro$/, '')}</span>}
    </span>
  );
}
