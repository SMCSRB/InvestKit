import { Candle, rollup, BASE_MS } from '../../engine/crypto/candles';
import { makeRng } from '../../engine/risk/monteCarlo';

// ⚠️ DONNÉES FICTIVES DE DÉMONSTRATION — générées par marche aléatoire déterministe. Elles ne représentent AUCUN cours réel.
// Elles servent uniquement (1) aux tests automatiques et (2) à essayer l'interface quand l'import de vraies données n'a pas encore été fait.
// Les actifs correspondants sont marqués `synthetic` en base et l'interface affiche « DONNÉES FICTIVES ».

export interface DemoSpec { symbol: string; name: string; start: string; days: number; startPrice: number; dailyVolPct: number; driftPctPerDay: number; baseVolume: number; seed: number;
  category: string; risk: 1 | 2 | 3 | 4 | 5; stable?: boolean; crash?: { dayIndex: number; toFactor: number; days: number }; description: string }

export const DEMO_SPECS: DemoSpec[] = [
  { symbol: 'DEMO1', name: 'Démo Grand (fictif)', start: '2017-01-01', days: 3000, startPrice: 900, dailyVolPct: 3.2, driftPctPerDay: 0.12, baseVolume: 2_000_000_000, seed: 11, category: 'store_of_value', risk: 3, description: 'Actif FICTIF de démonstration, comportement inspiré d\'une grande capitalisation.' },
  { symbol: 'DEMO2', name: 'Démo Contrats (fictif)', start: '2019-01-01', days: 2400, startPrice: 130, dailyVolPct: 4.2, driftPctPerDay: 0.1, baseVolume: 800_000_000, seed: 22, category: 'smart_contract', risk: 3, description: 'Actif FICTIF de démonstration.' },
  { symbol: 'DEMOS', name: 'Démo Stable (fictif)', start: '2017-01-01', days: 3000, startPrice: 1, dailyVolPct: 0.03, driftPctPerDay: 0, baseVolume: 3_000_000_000, seed: 33, category: 'stablecoin', risk: 1, stable: true, description: 'Stablecoin FICTIF de démonstration.' },
  { symbol: 'DEMOM', name: 'Démo Mème (fictif)', start: '2020-06-01', days: 1800, startPrice: 0.002, dailyVolPct: 9, driftPctPerDay: 0.05, baseVolume: 20_000_000, seed: 44, category: 'meme', risk: 5, description: 'Mème FICTIF de démonstration, très volatil.' },
  { symbol: 'DEMOX', name: 'Démo Effondrement (fictif)', start: '2019-06-01', days: 1400, startPrice: 1, dailyVolPct: 5, driftPctPerDay: 0.3, baseVolume: 300_000_000, seed: 55, category: 'defi', risk: 5,
    crash: { dayIndex: 1000, toFactor: 0.0001, days: 6 }, description: 'Actif FICTIF qui s\'effondre (rejoue le scénario d\'une faillite) : jeu de démonstration.' },
];

const roundPx = (x: number) => Number(x.toPrecision(10));

// Bougies horaires d'un actif fictif, puis agrégation en journalier et en minutes pour les derniers jours.
export const generateDemoCandles = (spec: DemoSpec, minuteDays = 10): { h1: Candle[]; d1: Candle[]; m1: Candle[] } => {
  const rng = makeRng(spec.seed);
  const startMs = Date.parse(spec.start + 'T00:00:00Z');
  const h1: Candle[] = [];
  const m1: Candle[] = [];
  let price = spec.startPrice;
  const hourVol = spec.dailyVolPct / 100 / Math.sqrt(24);
  const hourDrift = spec.driftPctPerDay / 100 / 24;
  for (let d = 0; d < spec.days; d++) {
    let crashFactorHour = 1;
    if (spec.crash && d >= spec.crash.dayIndex && d < spec.crash.dayIndex + spec.crash.days) crashFactorHour = Math.pow(spec.crash.toFactor, 1 / (spec.crash.days * 24));
    for (let h = 0; h < 24; h++) {
      const ts = startMs + d * 86_400_000 + h * 3_600_000;
      const o = price;
      const drift = spec.stable ? (1 - price) * 0.05 : hourDrift;
      const ret = drift + hourVol * rng.normal();
      const c = Math.max(1e-9, o * Math.exp(ret) * crashFactorHour);
      const wick = Math.abs(hourVol * rng.normal()) * 0.6;
      const hi = Math.max(o, c) * (1 + wick), lo = Math.min(o, c) * (1 - wick * 0.8);
      const vol = spec.baseVolume / 24 * (0.6 + rng.uniform() * 0.8) * (1 + 3 * Math.abs(ret) / Math.max(hourVol, 1e-9) * 0.1);
      h1.push({ ts, o: roundPx(o), h: roundPx(hi), l: roundPx(lo), c: roundPx(c), volume: Math.round(vol) });
      price = c;
      if (d >= spec.days - minuteDays) {   // minutes : interpolation bruitée à l'intérieur de l'heure, cohérente avec l'heure
        const mv = hourVol / Math.sqrt(60);
        let p = o;
        for (let m = 0; m < 60; m++) {
          const target = o + (c - o) * ((m + 1) / 60);
          const mo = p, mc = m === 59 ? c : Math.max(1e-9, target * (1 + mv * rng.normal() * 0.3));
          m1.push({ ts: ts + m * 60_000, o: roundPx(mo), h: roundPx(Math.max(mo, mc) * (1 + 0.0002)), l: roundPx(Math.min(mo, mc) * (1 - 0.0002)), c: roundPx(mc), volume: Math.round(vol / 60) });
          p = mc;
        }
        // l'extrême horaire doit rester celui de l'heure : on borne les minutes
        for (let k = m1.length - 60; k < m1.length; k++) { m1[k].h = Math.min(m1[k].h, roundPx(hi)); m1[k].l = Math.max(m1[k].l, roundPx(lo)); m1[k].h = Math.max(m1[k].h, m1[k].o, m1[k].c); m1[k].l = Math.min(m1[k].l, m1[k].o, m1[k].c); }
      }
    }
  }
  const d1 = rollup(h1, '1d', Number.MAX_SAFE_INTEGER - 1).map(({ partial, ...c }) => c);
  void BASE_MS;
  return { h1, d1, m1 };
};
