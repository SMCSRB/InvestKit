'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardHead, EmptyState, Segmented, StatCard, Tabs } from '@/app/components/ui/primitives';
import { Donut, LineChart } from '@/app/components/ui/charts';
import { Field, SelectField } from '@/app/components/sim/Field';
import SimFrame from '@/app/components/sim/SimFrame';
import useSimState from '@/app/lib/sim/useSimState';
import { ENVELOPES, projectInvestment, scenarios } from '@/app/lib/sim/invest';
import { SIM_RULES } from '@/app/lib/sim/rules';
import { fmtInt } from '@/app/lib/format';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const eur = (n) => `${fmtInt(Math.round(Number.isFinite(n) ? n : 0))} €`;
const DEFAULTS = { initial: 5000, monthly: 300, years: 20, annualReturnPct: 5, annualFeesPct: 0.5, entryFeePct: 0, contributionGrowthPct: 0, inflationPct: 2, envelope: 'pea', vol: 16 };
const ALLOC_LABELS = { equity_fr: 'Actions françaises', equity_world: 'Actions internationales', bonds: 'Obligations', crypto: 'Cryptomonnaies', real_estate: 'Immobilier', cash: 'Liquidités' };
const ALLOC_DEFAULT = { equity_fr: 20, equity_world: 60, bonds: 15, crypto: 0, real_estate: 0, cash: 5 };

async function tool(path, body) {
  const res = await fetch(`${API}/tools/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(res.status === 429 ? 'Trop de simulations pour le moment : réessaie dans quelques minutes.' : data.error || 'Le calcul a échoué');
  return data;
}

export default function PeaSimulatorPage() {
  const [s, set, reset, shareUrl] = useSimState(DEFAULTS, { envelope: ['pea','cto'] });
  const [tab, setTab] = useState('result');
  const plan = useMemo(() => projectInvestment(s), [s]);
  const sc = useMemo(() => scenarios(s), [s]);
  const labels = plan.rows.map((r) => `${r.year}`);
  const [mc, setMc] = useState({ status: 'idle' });
  const [alloc, setAlloc] = useState(ALLOC_DEFAULT);
  const [stress, setStress] = useState({ status: 'idle' });

  // Les résultats serveur ne valent que pour les chiffres saisis : on les efface dès qu'ils changent.
  useEffect(() => { setMc({ status: 'idle' }); setStress({ status: 'idle' }); }, [s]);

  const runMc = async () => {
    setMc({ status: 'loading' });
    try { setMc({ status: 'ok', data: await tool('monte-carlo', { initial: Number(s.initial) || 0, monthly: Number(s.monthly) || 0, years: Math.max(1, Math.round(Number(s.years) || 1)), annualReturnPct: Number(s.annualReturnPct) || 0, annualVolPct: Number(s.vol) || 0, feesPct: Number(s.annualFeesPct) || 0, contributionGrowthPct: Number(s.contributionGrowthPct) || 0, inflationPct: Number(s.inflationPct) || 0 }) }); }
    catch (e) { setMc({ status: 'error', message: e.message }); }
  };
  const runStress = async () => {
    setStress({ status: 'loading' });
    try { setStress({ status: 'ok', data: await tool('stress-test', { allocation: Object.fromEntries(Object.entries(alloc).map(([k, v]) => [k, Number(v) || 0])), capital: plan.finalValue }) }); }
    catch (e) { setStress({ status: 'error', message: e.message }); }
  };

  const tabs = [{ value: 'result', label: 'Résultat' }, { value: 'fees', label: 'Frais' }, { value: 'scenarios', label: 'Scénarios' }, { value: 'risk', label: 'Risque' }, { value: 'tax', label: 'Fiscalité' }];
  const gainPart = Math.max(0, plan.gains);

  return (
    <SimFrame title="Simulateur d'investissement (PEA)" subtitle="Intérêts composés, frais, fiscalité et inflation : vois où peut mener un plan d'épargne." onReset={reset} shareUrl={shareUrl}>
      <div className="sim-layout">
        <Card className="sim-inputs">
          <div className="sim-group">
            <h3>Ton plan</h3>
            <Field label="Capital de départ" value={s.initial} onChange={set('initial')} max={500000} step={500} suffix="€" slider />
            <Field label="Versement mensuel" value={s.monthly} onChange={set('monthly')} max={5000} step={10} suffix="€" slider />
            <Field label="Durée" value={s.years} onChange={set('years')} min={1} max={50} suffix="ans" slider />
            <Field label="Hausse annuelle des versements" value={s.contributionGrowthPct} onChange={set('contributionGrowthPct')} max={10} step={0.5} suffix="%" hint="Ex. 2 % : tu verses un peu plus chaque année." />
          </div>
          <div className="sim-group">
            <h3>Hypothèses de marché</h3>
            <Field label="Rendement annuel brut" value={s.annualReturnPct} onChange={set('annualReturnPct')} min={-10} max={15} step={0.1} suffix="%" hint="Une hypothèse, pas une promesse : personne ne connaît l'avenir." slider />
            <Field label="Volatilité annuelle" value={s.vol} onChange={set('vol')} min={0} max={60} step={1} suffix="%" term="volatilite" hint="Sert au calcul de risque (onglet Risque)." />
            <Field label="Inflation annuelle" value={s.inflationPct} onChange={set('inflationPct')} min={0} max={10} step={0.1} suffix="%" />
          </div>
          <div className="sim-group">
            <h3>Frais et enveloppe</h3>
            <Field label="Frais annuels" value={s.annualFeesPct} onChange={set('annualFeesPct')} max={5} step={0.05} suffix="%" hint="Frais de gestion de l'ETF + courtage ramenés par an. Exemple d'ordre de grandeur : 0,2 à 1 %. Vois ton propre contrat." />
            <Field label="Frais d'entrée sur chaque versement" value={s.entryFeePct} onChange={set('entryFeePct')} max={5} step={0.1} suffix="%" />
            <SelectField label="Enveloppe" value={s.envelope} onChange={set('envelope')} options={Object.entries(ENVELOPES).map(([value, label]) => ({ value, label }))} />
          </div>
        </Card>

        <div className="sim-results">
          <Tabs ariaLabel="Résultats du simulateur" value={tab} onChange={setTab} tabs={tabs} />

          {tab === 'result' && (
            <>
              <div className="sim-cards">
                <StatCard hero icon="wallet" label={`Dans ${plan.years} ans (avant impôt)`} value={plan.finalValue} format={eur} deltaLabel={`dont ${eur(plan.contributed)} versés`} />
                <StatCard icon="coins" label="Après impôt" value={plan.netAfterTax} format={eur} deltaLabel={plan.peaAdvantage ? 'PEA > 5 ans : prélèvements sociaux seuls' : `imposition ${plan.taxPct.toLocaleString('fr-FR')} % sur les gains`} />
                <StatCard icon="shield" label="Pouvoir d'achat réel" value={plan.realNet} format={eur} deltaLabel={`en euros d'aujourd'hui (inflation ${s.inflationPct} %)`} />
                <StatCard icon="chart" label="Gains avant impôt" value={plan.gains} format={eur} deltaLabel={`${plan.contributed > 0 ? Math.round((plan.gains / plan.contributed) * 100) : 0} % de ce que tu as versé`} />
              </div>
              <Card>
                <CardHead title="Évolution de ton capital" icon="chart" />
                <LineChart ariaLabel="Valeur du plan et montant versé, année par année" labels={labels} format={eur} xEvery={Math.max(1, Math.ceil(labels.length / 10))}
                  series={[{ label: 'Valeur du plan', color: 'var(--ik-series-1)', data: plan.rows.map((r) => r.value) }, { label: 'Ce que tu as versé', color: 'var(--ik-series-3)', data: plan.rows.map((r) => r.contributed) }]} />
              </Card>
              <div className="sim-two">
                <Card>
                  <CardHead title="D'où vient ton capital" icon="pie" />
                  <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Donut size={128} thickness={16} ariaLabel="Part des versements et des gains" segments={[{ label: 'Versements', value: plan.contributed, color: 'var(--ik-series-3)' }, { label: 'Gains', value: gainPart, color: 'var(--ik-series-1)' }]}>
                      <div className="ik-num" style={{ fontWeight: 800 }}>{plan.finalValue > 0 ? Math.round((gainPart / plan.finalValue) * 100) : 0} %</div><div className="ik-muted">de gains</div>
                    </Donut>
                    <ul className="sim-list" style={{ listStyle: 'none', padding: 0 }}>
                      <li>Versements : <strong className="ik-num">{eur(plan.contributed)}</strong></li>
                      <li>Gains : <strong className="ik-num">{eur(plan.gains)}</strong></li>
                      <li>Frais payés : <strong className="ik-num">{eur(plan.feesPaid)}</strong></li>
                      <li>Impôt à la sortie : <strong className="ik-num">{eur(plan.tax)}</strong></li>
                    </ul>
                  </div>
                </Card>
                <Card>
                  <CardHead title="Année par année" icon="file" />
                  <div className="ik-table-wrap sim-table">
                    <table className="ik-table">
                      <thead><tr><th scope="col">Année</th><th scope="col">Versé</th><th scope="col">Valeur</th><th scope="col">Réelle</th></tr></thead>
                      <tbody>{plan.rows.slice(1).map((r) => <tr key={r.year}><td>{r.year}</td><td className="ik-num">{eur(r.contributed)}</td><td className="ik-num">{eur(r.value)}</td><td className="ik-num">{eur(r.realValue)}</td></tr>)}</tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </>
          )}

          {tab === 'fees' && (
            <Card>
              <CardHead title="Ce que les frais te coûtent vraiment" icon="coins" />
              <div className="sim-cards">
                <StatCard icon="wallet" label="Avec tes frais" value={plan.finalValue} format={eur} />
                <StatCard icon="sparkles" label="Sans aucun frais" value={plan.withoutFees} format={eur} />
                <StatCard icon="alert" label="Coût des frais" value={plan.withoutFees - plan.finalValue} format={eur} deltaLabel={`${plan.withoutFees > 0 ? (((plan.withoutFees - plan.finalValue) / plan.withoutFees) * 100).toFixed(1).replace('.', ',') : 0} % de ton capital final`} />
              </div>
              <p className="ik-muted" style={{ marginBottom: 0 }}>Des frais de {String(s.annualFeesPct).replace('.', ',')} % par an semblent faibles, mais ils sont prélevés chaque année sur tout ton capital : plus la durée est longue, plus l&apos;écart se creuse. Modifie les frais à gauche pour voir l&apos;effet.</p>
            </Card>
          )}

          {tab === 'scenarios' && (
            <Card>
              <CardHead title="Et si le rendement était différent ?" icon="candles" />
              <LineChart ariaLabel="Trois scénarios de rendement" labels={labels} format={eur} xEvery={Math.max(1, Math.ceil(labels.length / 10))} area={false}
                series={sc.map((x, i) => ({ label: x.label, color: ['var(--ik-series-3)', 'var(--ik-series-1)', 'var(--ik-series-5)'][i], data: x.plan.rows.map((r) => r.value) }))} />
              <div className="ik-table-wrap" style={{ marginTop: 12 }}>
                <table className="ik-table"><thead><tr><th scope="col">Scénario</th><th scope="col">Avant impôt</th><th scope="col">Après impôt</th></tr></thead>
                  <tbody>{sc.map((x) => <tr key={x.id}><td>{x.label}</td><td className="ik-num">{eur(x.plan.finalValue)}</td><td className="ik-num">{eur(x.plan.netAfterTax)}</td></tr>)}</tbody></table>
              </div>
              <p className="ik-muted" style={{ marginBottom: 0 }}>Ces trois lignes sont des hypothèses espacées de 3 points de rendement : la réalité peut sortir de cette fourchette.</p>
            </Card>
          )}

          {tab === 'risk' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <Card>
                <CardHead title="Et si les marchés étaient plus capricieux ?" icon="sparkles" actions={<Button variant="primary" size="sm" onClick={runMc} loading={mc.status === 'loading'}>Lancer la simulation</Button>} />
                <p className="ik-muted" style={{ marginTop: 0 }}>Des milliers de trajectoires aléatoires avec ta volatilité ({s.vol} %). Le serveur calcule, le résultat est toujours le même pour les mêmes chiffres.</p>
                {mc.status === 'idle' && <EmptyState icon="candles" title="Aucune simulation lancée">Clique sur « Lancer la simulation ».</EmptyState>}
                {mc.status === 'error' && <p role="alert" className="ik-down">{mc.message}</p>}
                {mc.status === 'ok' && (
                  <>
                    <div className="sim-cards">
                      <StatCard icon="arrowDownRight" label="Scénario défavorable" value={mc.data.final.p10} format={eur} deltaLabel="1 chance sur 10 de finir en dessous" />
                      <StatCard hero icon="target" label="Scénario médian" value={mc.data.final.p50} format={eur} deltaLabel="une fois sur deux, mieux ou moins bien" />
                      <StatCard icon="arrowUpRight" label="Scénario favorable" value={mc.data.final.p90} format={eur} deltaLabel="1 chance sur 10 de faire mieux" />
                    </div>
                    <p style={{ margin: '12px 0' }}>Probabilité de finir <strong>sous ce que tu as versé</strong> : <strong className="ik-num">{Math.round(mc.data.probLoss * 100)} %</strong> · de ne pas battre l&apos;inflation : <strong className="ik-num">{Math.round((1 - mc.data.probBeatInflation) * 100)} %</strong>.</p>
                    <LineChart ariaLabel="Fourchette de résultats : défavorable, médian, favorable" labels={mc.data.years.map(String)} format={eur} xEvery={Math.max(1, Math.ceil(mc.data.years.length / 10))} area={false}
                      series={[{ label: 'Défavorable (P10)', color: 'var(--ik-series-3)', data: mc.data.p10 }, { label: 'Médian (P50)', color: 'var(--ik-series-1)', data: mc.data.p50 }, { label: 'Favorable (P90)', color: 'var(--ik-series-5)', data: mc.data.p90 }]} />
                    <p className="ik-muted" style={{ marginBottom: 0 }}>{mc.data.note}</p>
                  </>
                )}
              </Card>
              <Card>
                <CardHead title="Résiste-t-il aux grandes crises ?" icon="shield" actions={<Button variant="primary" size="sm" onClick={runStress} loading={stress.status === 'loading'}>Tester</Button>} />
                <p className="ik-muted" style={{ marginTop: 0 }}>Répartis ton capital (en %), puis vois ce qu&apos;il aurait perdu pendant chaque crise passée.</p>
                <div className="sim-two">
                  {Object.entries(ALLOC_LABELS).map(([k, label]) => <Field key={k} label={label} value={alloc[k]} onChange={(v) => setAlloc((a) => ({ ...a, [k]: v }))} max={100} step={5} suffix="%" />)}
                </div>
                {stress.status === 'error' && <p role="alert" className="ik-down">{stress.message}</p>}
                {stress.status === 'ok' && (
                  <div className="ik-table-wrap" style={{ marginTop: 12 }}>
                    <table className="ik-table"><thead><tr><th scope="col">Crise</th><th scope="col">Période</th><th scope="col">Perte</th><th scope="col">Sur ton capital final</th></tr></thead>
                      <tbody>{stress.data.results.map((r) => <tr key={r.id}><td>{r.label}{r.estimated ? ' *' : ''}</td><td>{r.period}</td><td className="ik-num ik-down">{r.lossPct.toLocaleString('fr-FR')} %</td><td className="ik-num">{r.lossAmount !== null ? eur(r.lossAmount) : '–'}</td></tr>)}</tbody></table>
                    <p className="ik-muted">* en partie estimé. {stress.data.note}</p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {tab === 'tax' && (
            <Card>
              <CardHead title="Fiscalité utilisée dans le calcul" icon="file" />
              <ul className="sim-list">
                <li><strong>PEA après {SIM_RULES.peaYears} ans</strong> : seuls les prélèvements sociaux ({SIM_RULES.socialLevyPct.toLocaleString('fr-FR')} %) s&apos;appliquent sur les gains.</li>
                <li><strong>PEA avant {SIM_RULES.peaYears} ans</strong> et <strong>compte-titres</strong> : prélèvement forfaitaire de {(SIM_RULES.socialLevyPct + SIM_RULES.flatIncomeTaxPct).toLocaleString('fr-FR')} % ({SIM_RULES.flatIncomeTaxPct.toLocaleString('fr-FR')} % d&apos;impôt + {SIM_RULES.socialLevyPct.toLocaleString('fr-FR')} % de prélèvements sociaux).</li>
                <li>L&apos;impôt est calculé <em>à la sortie</em>, sur les gains seulement (valeur finale − versements).</li>
              </ul>
              <p className="sim-notice" style={{ marginBottom: 0 }}>Valeurs de référence <strong>à reconfirmer</strong> sur impots.gouv.fr : les taux changent selon les années. Cette page ne couvre ni les plafonds de versement du PEA, ni les cas particuliers (retrait partiel, succession, dividendes).</p>
            </Card>
          )}
        </div>
      </div>
    </SimFrame>
  );
}
