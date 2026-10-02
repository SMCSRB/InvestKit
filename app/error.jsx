'use client';

import { useEffect } from 'react';
import { Button } from '@/app/components/ui/primitives';
import StatusPage from '@/app/components/auth/StatusPage';

// Erreur inattendue dans une page : message clair, bouton pour réessayer, aucun détail technique affiché au joueur.
export default function ErrorPage({ error, reset }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <StatusPage code="Oups" title="Quelque chose s’est mal passé" actions={<><Button variant="primary" onClick={() => reset()}>Réessayer</Button><Button href="/dashboard">Mon tableau de bord</Button></>}>
      Une erreur inattendue est survenue. Tes données et tes InvestCoins ne sont pas touchés. Si cela continue, écris-nous depuis la page Contact.
    </StatusPage>
  );
}
