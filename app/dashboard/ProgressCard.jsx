'use client';

import Link from 'next/link';
import { Card, CardHead, Button } from '@/app/components/ui/primitives';
import { AnimatedNumber } from '@/app/components/ui/motion';
import { useEducationProgress } from '@/app/context/EducationContext';

const XP_PER_LEVEL = 500; // même règle que EducationContext : niveau = XP / 500 + 1

// Niveau et XP RÉELS (progression d'éducation) : anneau qui se remplit à l'arrivée.
export default function ProgressCard() {
  const { progress, isLoading } = useEducationProgress();
  const xp = progress?.totalXP ?? 0;
  const level = progress?.userLevel ?? 1;
  const into = xp % XP_PER_LEVEL;
  const pct = Math.round((into / XP_PER_LEVEL) * 100);
  const R = 46; const C = 2 * Math.PI * R;
  return (
    <Card glow data-tilt="" style={{ height: '100%' }}>
      <CardHead title="Ma progression" icon="trophy" />
      <div className="dh-ring-wrap">
        <div className="dh-ring" role="img" aria-label={`Niveau ${level}, ${into} sur ${XP_PER_LEVEL} points d'expérience pour le niveau suivant`}>
          <svg viewBox="0 0 110 110" width="116" height="116" aria-hidden="true">
            <defs>
              <linearGradient id="dhring" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--ik-primary)" /><stop offset="100%" stopColor="var(--ik-orchid)" /></linearGradient>
            </defs>
            <circle cx="55" cy="55" r={R} fill="none" stroke="var(--ik-border-strong)" strokeWidth="9" />
            <circle className="dh-ring__bar" cx="55" cy="55" r={R} fill="none" stroke="url(#dhring)" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={C} style={{ '--c': C, '--to': C * (1 - pct / 100) }} transform="rotate(-90 55 55)" />
          </svg>
          <div className="dh-ring__lvl"><span>Niveau</span><strong className="ik-num">{isLoading ? '–' : <AnimatedNumber value={level} />}</strong></div>
        </div>
        <div className="dh-ring__side">
          <p className="ik-num" style={{ margin: 0, fontWeight: 800, fontSize: 'var(--ik-fs-lg)' }}>{into} / {XP_PER_LEVEL} XP</p>
          <p className="ik-muted" style={{ margin: '4px 0 12px' }}>{XP_PER_LEVEL - into} XP avant le niveau {level + 1}. Chaque leçon et chaque quiz en rapportent.</p>
          <Button size="sm" href="/education">Continuer à apprendre</Button>
        </div>
      </div>
    </Card>
  );
}
