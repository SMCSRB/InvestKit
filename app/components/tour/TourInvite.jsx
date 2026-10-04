'use client';

import { PAGE_TOURS } from '@/app/lib/tour/steps';

// Première visite d'une page : une petite invitation discrète (jamais bloquante) à faire le tour en 3 ou 4 étapes.
export default function TourInvite({ tour, onStart, onLater }) {
  return (
    <div className="ik-tour-invite" role="region" aria-label="Visite rapide de la page" data-testid="tour-invite">
      <p className="ik-tour-invite__t">Visite rapide de {PAGE_TOURS[tour]?.label} ?</p>
      <p className="ik-tour-invite__s">3 ou 4 étapes, tu peux quitter à tout moment.</p>
      <div className="ik-tour-invite__a">
        <button type="button" className="ik-btn ik-btn--primary ik-btn--sm" onClick={onStart} data-testid="tour-invite-go">Commencer</button>
        <button type="button" className="ik-btn ik-btn--ghost ik-btn--sm" onClick={onLater} data-testid="tour-invite-no">Non merci</button>
      </div>
    </div>
  );
}
