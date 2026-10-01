'use client';

import { Card, CardHead, Segmented } from '@/app/components/ui/primitives';
import { useTheme } from '@/app/context/ThemeContext';

// Réglages d'apparence : thème (sombre par défaut, clair complet) et animations (Auto / Oui / Non).
// « Auto » suit la préférence système « réduire les animations ». Réglages mémorisés dans ce navigateur.
export default function AppearanceSettings() {
  const { theme, setTheme, motion, setMotion, motionEnabled } = useTheme();
  return (
    <Card style={{ marginBottom: 32 }}>
      <CardHead title="Apparence" icon="sun" />
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="dash-line" style={{ border: 0, padding: 0 }}>
          <span id="ik-theme-label">Thème</span>
          <Segmented ariaLabel="Thème" value={theme} onChange={setTheme} options={[{ value: 'dark', label: 'Sombre' }, { value: 'light', label: 'Clair' }]} />
        </div>
        <div className="dash-line" style={{ border: 0, padding: 0 }}>
          <span>Animations</span>
          <Segmented ariaLabel="Animations" value={motion} onChange={setMotion} options={[{ value: 'auto', label: 'Auto' }, { value: 'on', label: 'Oui' }, { value: 'off', label: 'Non' }]} />
        </div>
        <p className="ik-muted" style={{ margin: 0, fontSize: 'var(--ik-fs-sm)' }}>
          « Auto » suit le réglage de ton appareil (« réduire les animations »). Actuellement : animations {motionEnabled ? 'activées' : 'désactivées'}. Ces réglages restent sur cet appareil.
        </p>
      </div>
    </Card>
  );
}
