'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@/app/components/ui/primitives';
import { PLANS } from '@/app/lib/plans';

const KEY = 'ik-upgrade-hidden-until';
const HIDE_DAYS = 30;

// Petit encart « Passer Pro » pour un compte gratuit. Discret : une seule carte, pas de fenêtre, et on peut la masquer 30 jours
// (simple confort d'affichage enregistré dans le navigateur ; le statut Pro, lui, vient toujours du serveur).
export default function UpgradeCard({ plan }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => { try { setHidden(Number(localStorage.getItem(KEY) || 0) > Date.now()); } catch { setHidden(false); } }, []);
  if (!plan || plan.isPro || hidden) return null;
  const pro = PLANS.find((p) => p.id === 'pro');
  const hide = () => { try { localStorage.setItem(KEY, String(Date.now() + HIDE_DAYS * 86400000)); } catch { /* ignore */ } setHidden(true); };
  return (
    <Card className="ik-upgradecard" data-testid="upgrade-card">
      <div className="ik-upgradecard__main">
        <strong>Passer Pro</strong>
        <ul>{pro.features.slice(0, 4).map((f) => <li key={f}>{f}</li>)}</ul>
      </div>
      <div className="ik-upgradecard__actions">
        <Button variant="primary" size="sm" href="/dashboard?tab=settings&section=billing">Voir l’abonnement</Button>
        <button type="button" className="ik-link" onClick={hide} style={{ background: 'none', border: 0, cursor: 'pointer' }}>Masquer 30 jours</button>
      </div>
    </Card>
  );
}
