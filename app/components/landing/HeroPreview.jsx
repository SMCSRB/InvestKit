'use client';

import Icon from '@/app/components/ui/Icon';
import { Coin, Delta } from '@/app/components/ui/primitives';
import { AnimatedNumber } from '@/app/components/ui/motion';
import { LineChart } from '@/app/components/ui/charts';
import CandlePreview from './CandlePreview';
import Stage3D, { Coin3D, Layer } from './Stage3D';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août'];

// Aperçu animé du produit en 3D (valeurs illustratives).
export default function HeroPreview() {
  return (
    <div className="lp-preview" aria-label="Aperçu du produit">
      <Stage3D>
        <Layer z={-90} par={0.05} className="lp-layer--glow" aria-hidden="true" />
        <Layer z={0} par={0}>
          <div className="lp-preview__card lp-float"><CandlePreview /></div>
        </Layer>
        <Layer z={44} par={-0.025} className="lp-preview__row">
          <div className="lp-mini">
            <small>Patrimoine</small>
            <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}><AnimatedNumber value={12480} /> <Coin size={20} /></strong>
            <Delta value={6.4} />
          </div>
          <div className="lp-mini" style={{ paddingBottom: 6 }}>
            <small>Valeur sur 8 mois</small>
            <LineChart labels={MONTHS} xEvery={2} height={96} area minimal series={[{ label: 'Valeur', color: 'var(--ik-series-1)', data: [100, 104, 101, 110, 108, 118, 121, 130] }]} format={(v) => String(Math.round(v))} ariaLabel="Courbe de valeur" />
          </div>
        </Layer>
        <Layer z={96} par={-0.05} className="lp-abs lp-abs--a">
          <div className="lp-bob lp-chip3d"><Icon name="flame" size={16} />Série de 7 jours</div>
        </Layer>
        <Layer z={78} par={-0.035} className="lp-abs lp-abs--b">
          <div className="lp-bob lp-bob--late lp-chip3d"><Icon name="trophy" size={16} />Niveau 3</div>
        </Layer>
        <Layer z={140} par={-0.08} className="lp-abs lp-abs--c">
          <div className="lp-bob"><Coin3D size={74} /></div>
        </Layer>
      </Stage3D>
    </div>
  );
}
