import Coin from './Coin';

// Progression vers le classement : « 1 800 / 2 500 investis · 3 / 5 jours actifs ». Même règle pour tous les domaines.
// Ton volontairement neutre : aucune date limite, aucune perte possible, rien à « tenir ».
const fr = (n) => Number(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const Bar = ({ value, max, label }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ flex: '1 1 220px', minWidth: 0 }}>
      <div style={{ fontSize: 13, color: 'var(--ik-text-2)', marginBottom: 4 }}>{label}</div>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)} aria-label={label}
        style={{ height: 8, borderRadius: 999, background: 'color-mix(in srgb, var(--ik-text) 12%, transparent)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--ik-primary)', borderRadius: 999 }} />
      </div>
    </div>
  );
};

export default function RankingProgress({ progress }) {
  if (!progress) return null;
  const { investedCoins, minInvestedCoins, activeDays, minActiveDays, ranked } = progress;
  return (
    <div data-testid="ranking-progress" style={{ margin: '0 0 12px', padding: '10px 12px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--ik-text) 15%, transparent)' }}>
      <div style={{ fontSize: 13, color: 'var(--ik-text)', marginBottom: 8 }}>
        {ranked
          ? 'Tu es éligible au classement : les deux conditions sont remplies.'
          : 'Pour apparaître au classement, il faut deux choses. Tu peux avancer à ton rythme : rien ne s’efface et il n’y a pas de date limite.'}
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Bar value={investedCoins} max={minInvestedCoins} label={<>{fr(investedCoins)} / {fr(minInvestedCoins)} <Coin /> investis</>} />
        <Bar value={activeDays} max={minActiveDays} label={`${fr(Math.min(activeDays, minActiveDays))} / ${fr(minActiveDays)} jours actifs`} />
      </div>
    </div>
  );
}
