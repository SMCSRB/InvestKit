'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Modal } from '@/app/components/ui/primitives';
import Icon from '@/app/components/ui/Icon';
import GuideText from './GuideText';
import { isLoggedIn } from '@/app/lib/session';
import { GUIDE_TOUR, GUIDE_SEEN_KEY, OPEN_GUIDE_EVENT } from '@/app/lib/guide';

const NO_TOUR = ['/', '/guide', '/login', '/signup', '/admin', '/onboarding', '/verify-email', '/forgot-password', '/reset-password'];

const markSeen = () => { try { localStorage.setItem(GUIDE_SEEN_KEY, '1'); } catch { /* ignore */ } };
const wasSeen = () => { try { return localStorage.getItem(GUIDE_SEEN_KEY) === '1'; } catch { return true; } };   // stockage bloqué : on ne harcèle pas

// Parcours du premier lancement : court (une carte par rubrique du guide), on peut le passer à tout moment, et le relancer depuis « Aide et support ».
export default function GuideTour() {
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Premier lancement : seulement pour un joueur connecté, sur une page du jeu, une seule fois (puis plus jamais sauf demande).
  useEffect(() => {
    if (NO_TOUR.some((p) => pathname === p || (p !== '/' && pathname.startsWith(`${p}/`)))) return;
    if (isLoggedIn() && !wasSeen()) { setStep(0); setOpen(true); }
  }, [pathname]);

  useEffect(() => {
    const onOpen = () => { setStep(0); setOpen(true); };
    window.addEventListener(OPEN_GUIDE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_GUIDE_EVENT, onOpen);
  }, []);

  const close = useCallback(() => { markSeen(); setOpen(false); }, []);
  const s = GUIDE_TOUR[step];
  const last = step === GUIDE_TOUR.length - 1;

  return (
    <Modal
      open={open}
      onClose={close}
      title={s ? s.title : ''}
      footer={(
        <>
          <button type="button" className="ik-btn ik-btn--ghost ik-btn--sm" onClick={close} data-testid="guide-skip">Passer</button>
          {step > 0 && <button type="button" className="ik-btn ik-btn--sm" onClick={() => setStep(step - 1)}>Précédent</button>}
          <button type="button" className="ik-btn ik-btn--primary ik-btn--sm" data-testid={last ? 'guide-end' : 'guide-next'} onClick={() => (last ? close() : setStep(step + 1))}>{last ? 'Terminer' : 'Suivant'}</button>
        </>
      )}
    >
      {s && (
        <div data-testid="guide-step" style={{ display: 'grid', gap: 14 }}>
          <p className="ik-muted" style={{ margin: 0, fontSize: 'var(--ik-fs-sm)' }}>Étape {step + 1} sur {GUIDE_TOUR.length}</p>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span aria-hidden="true" style={{ flex: 'none', color: 'var(--ik-accent)' }}><Icon name={s.icon} size={28} /></span>
            <p style={{ margin: 0, lineHeight: 1.55 }}><GuideText>{s.text}</GuideText></p>
          </div>
          <Link href={s.href} className="ik-link" onClick={close}>En savoir plus dans le guide</Link>
          <div role="presentation" style={{ display: 'flex', gap: 6 }}>
            {GUIDE_TOUR.map((x, i) => <span key={x.id} aria-hidden="true" style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 4, background: i === step ? 'var(--ik-primary)' : 'var(--ik-border-strong)', transition: 'width .2s' }} />)}
          </div>
        </div>
      )}
    </Modal>
  );
}
