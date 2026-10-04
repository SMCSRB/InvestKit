'use client';

import { Modal } from '@/app/components/ui/primitives';
import Icon from '@/app/components/ui/Icon';
import { MAIN_TOUR, SECTIONS } from '@/app/lib/tour/steps';
import { useTour } from './TourProvider';

const LABEL = { new: 'Pas commencée', running: 'En cours', paused: 'En pause', done: 'Terminée', dismissed: 'Passée' };

// « Mon parcours de découverte » : ce qui a été vu, reprendre / lancer / recommencer. L'état vient du compte (serveur).
export function TourChecklist({ onDone }) {
  const tour = useTour();
  const s = tour?.state;
  if (!s) return <p className="ik-muted">Chargement de ton parcours…</p>;
  const main = s.tours.main;
  const resumable = main.status === 'paused' || main.status === 'running';
  const go = (restart) => { tour.open(MAIN_TOUR, { restart }); onDone?.(); };
  return (
    <div data-testid="tour-checklist" style={{ display: 'grid', gap: 14 }}>
      <p style={{ margin: 0 }}>Visite complète : <strong data-testid="tour-main-status">{LABEL[main.status]}</strong></p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {SECTIONS.map((x) => {
          const ok = s.seen.includes(x.id);
          return (
            <li key={x.id} data-done={ok ? '1' : '0'} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 11, display: 'inline-grid', placeItems: 'center', border: '2px solid var(--ik-border-strong)', background: ok ? 'var(--ik-positive)' : 'transparent', color: 'var(--ik-text-on-positive)' }}>{ok && <Icon name="check" size={14} />}</span>
              <span>{x.label}<span className="ik-sr-only">{ok ? ' : vu' : ' : pas encore vu'}</span></span>
            </li>
          );
        })}
      </ul>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" className="ik-btn ik-btn--primary ik-btn--sm" onClick={() => go(false)} data-testid="tour-resume">{resumable ? 'Reprendre la visite' : 'Lancer la visite complète'}</button>
        {resumable && <button type="button" className="ik-btn ik-btn--sm" onClick={() => go(true)} data-testid="tour-restart">Recommencer au début</button>}
        <button type="button" className="ik-btn ik-btn--ghost ik-btn--sm" onClick={() => tour.reset('all')} data-testid="tour-reset">Tout remettre à zéro</button>
      </div>
    </div>
  );
}

export function TourPanel({ onClose }) {
  return (
    <Modal open onClose={onClose} title="Mon parcours de découverte">
      <TourChecklist onDone={onClose} />
    </Modal>
  );
}
