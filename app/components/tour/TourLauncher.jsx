'use client';

import { pageTourFor, PAGE_TOURS } from '@/app/lib/tour/steps';
import Icon from '@/app/components/ui/Icon';

// Bouton « ? » toujours visible (en bas à gauche) : le guide de la page en cours, ou le panneau « Mon parcours de découverte ».
export default function TourLauncher({ pathname, onOpen, onPanel }) {
  const pageTour = pageTourFor(pathname);
  return (
    <div className="ik-tour-launch" data-testid="tour-launcher">
      {pageTour ? (
        <>
          <button type="button" className="ik-btn ik-btn--sm ik-tour-launch__btn" onClick={() => onOpen(pageTour, { restart: true })} data-testid="tour-page-guide" aria-label={`Guide de cette page : ${PAGE_TOURS[pageTour].label}`}>
            <span className="ik-tour-launch__q" aria-hidden="true">?</span> Guide de cette page
          </button>
          <button type="button" className="ik-btn ik-btn--sm ik-tour-launch__more" onClick={onPanel} aria-label="Mon parcours de découverte" title="Mon parcours de découverte" data-testid="tour-panel-open"><Icon name="target" size={16} /></button>
        </>
      ) : (
        <button type="button" className="ik-btn ik-btn--sm ik-tour-launch__btn" onClick={onPanel} data-testid="tour-panel-open" aria-label="Guide : mon parcours de découverte">
          <span className="ik-tour-launch__q" aria-hidden="true">?</span> Guide
        </button>
      )}
    </div>
  );
}
