'use client';

import { useEffect, useState } from 'react';
import AppShell, { PageHeader } from '@/app/components/shell/AppShell';
import PublicShell from '@/app/components/landing/PublicShell';
import { Button } from '@/app/components/ui/primitives';
import { copyText } from '@/app/lib/social';

// Cadre commun des simulateurs : coque connectée si tu es connecté, en-tête public sinon (les simulateurs sont ouverts à tous).
export default function SimFrame({ title, subtitle, children, onReset, shareUrl }) {
  const [logged, setLogged] = useState(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { try { setLogged(!!localStorage.getItem('token')); } catch { setLogged(false); } }, []);
  const share = async () => { if (await copyText(shareUrl ? shareUrl() : window.location.href)) { setCopied(true); setTimeout(() => setCopied(false), 2000); } };
  const body = (
    <div className="sim">
      {logged ? (
        <PageHeader title={title} subtitle={subtitle} actions={<SimActions onReset={onReset} onShare={share} copied={copied} />} />
      ) : (
        <header className="sim-head">
          <div><h1>{title}</h1><p className="ik-muted">{subtitle}</p></div>
          <SimActions onReset={onReset} onShare={share} copied={copied} />
        </header>
      )}
      <p className="sim-notice" role="note">
        <strong>Simulation pédagogique.</strong> Les résultats dépendent des hypothèses que tu saisis ; ce ne sont ni des promesses de rendement ni un conseil en investissement. Les taux et règles fiscales de référence sont affichés dans les pages : vérifie-les sur les sources officielles avant toute décision.
      </p>
      {children}
    </div>
  );
  // Contenu rendu tout de suite dans l'en-tête public (utile au premier affichage et aux moteurs de recherche), puis coque connectée si besoin.
  return logged ? <AppShell>{body}</AppShell> : <PublicShell><div className="sim-public">{body}</div></PublicShell>;
}

function SimActions({ onReset, onShare, copied }) {
  return (
    <div className="sim-actions">
      <Button size="sm" icon={copied ? 'check' : 'share'} onClick={onShare}>{copied ? 'Lien copié' : 'Copier le lien'}</Button>
      <Button size="sm" icon="file" onClick={() => window.print()}>Imprimer / PDF</Button>
      {onReset && <Button size="sm" variant="ghost" onClick={onReset}>Réinitialiser</Button>}
    </div>
  );
}
