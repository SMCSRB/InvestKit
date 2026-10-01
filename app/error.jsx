'use client';

import { useEffect } from 'react';
import { Button, EmptyState } from '@/app/components/ui/primitives';

// Erreur inattendue dans une page : message clair, bouton pour réessayer, aucun détail technique affiché au joueur.
export default function ErrorPage({ error, reset }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(40px, 12vw, 120px) 16px' }}>
      <EmptyState icon="alert" title="Quelque chose s'est mal passé" action={<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}><Button variant="primary" onClick={() => reset()}>Réessayer</Button><Button href="/dashboard">Mon tableau de bord</Button></div>}>
        Une erreur inattendue est survenue. Tes données et tes InvestCoins ne sont pas touchés. Si cela continue, écris-nous depuis la page Contact.
      </EmptyState>
    </div>
  );
}
