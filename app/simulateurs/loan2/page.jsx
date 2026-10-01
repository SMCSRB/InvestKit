'use client';

import { useMemo, useState } from 'react';
import { Card, CardHead, StatCard, Tabs } from '@/app/components/ui/primitives';
import { LineChart } from '@/app/components/ui/charts';
import { Field, SelectField } from '@/app/components/sim/Field';
import SimFrame from '@/app/components/sim/SimFrame';
import HelpTip from '@/app/components/HelpTip';
import useSimState from '@/app/lib/sim/useSimState';
import { REGIMES, attentionPoints, compareRegimes, simulateRental } from '@/app/lib/sim/rental';
import { SIM_RULES, TMI_OPTIONS } from '@/app/lib/sim/rules';
import { fmtInt } from '@/app/lib/format';
import Icon from '@/app/components/ui/Icon';

const eur = (n) => `${fmtInt(Number.isFinite(n) ? n : 0)} €`;
const pct = (n, d = 2) => (Number.isFinite(n) ? `${n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })} %` : '–');
const DEFAULTS = {
  price: 200000, age: 'old', works: 10000, downPayment: 40000, upfrontFees: 2000, ratePct: 3.6, years: 20, insuranceRatePct: 0.3,
  monthlyRent: 900, vacancyPct: 5, coproMonthly: 50, propertyTaxYear: 900, pnoYear: 150, maintenanceYear: 800, managementPct: 0,
  regime: 'micro_foncier', tmiPct: 30, worksDeductiblePct: 0, horizon: 20, valueGrowthPct: 1.5, rentGrowthPct: 1.5, chargesGrowthPct: 2, saleFeesPct: 5,
};

export default function RentalSimulatorPage() {
  const [s, set, reset] = useSimState(DEFAULTS);
  const [tab, setTab] = useState('result');
  const r = useMemo(() => simulateRental(s), [s]);
  const regimes = useMemo(() => compareRegimes(s), [s]);
  const points = useMemo(() => attentionPoints(r), [r]);
  const sens = useMemo(() => [0, 5, 10, 20].map((v) => ({ vacancy: v, r: simulateRental({ ...s, vacancyPct: v }) })), [s]);
  const labels = r.rows.map((x) => String(x.year));
  const cfTone = r.cashFlowMonthlyAfter >= 0 ? 'ik-up' : 'ik-down';
  const tabs = [{ value: 'result', label: 'Résultat' }, { value: 'tax', label: 'Fiscalité' }, { value: 'projection', label: 'Projection' }, { value: 'risk', label: 'Risques' }];

  return (
    <SimFrame title="Simulateur d'investissement locatif" subtitle="Rendement, cash-flow, impôt selon le régime et patrimoine sur la durée." onReset={reset}>
      <div className="sim-layout">
        <Card className="sim-inputs">
          <div className="sim-group">
            <h3>Le bien</h3>
            <Field label="Prix d'achat" value={s.price} onChange={set('price')} max={2000000} step={5000} suffix="€" slider />
            <SelectField label="Type" value={s.age} onChange={set('age')} options={[{ value: 'old', label: 'Ancien' }, { value: 'new', label: 'Neuf' }]} hint={`Frais de notaire estimés : ${eur(r.notaryFees)}.`} term="frais-notaire" />
            <Field label="Travaux" value={s.works} onChange={set('works')} max={500000} step={1000} suffix="€" />
          </div>
          <div className="sim-group">
            <h3>Financement</h3>
            <Field label="Apport" value={s.downPayment} onChange={set('downPayment')} max={1000000} step={1000} suffix="€" term="apport" slider />
            <Field label="Taux du crédit" value={s.ratePct} onChange={set('ratePct')} max={12} step={0.05} suffix="%" term="taux" />
            <Field label="Durée" value={s.years} onChange={set('years')} min={1} max={30} suffix="ans" />
            <Field label="Assurance emprunteur" value={s.insuranceRatePct} onChange={set('insuranceRatePct')} max={2} step={0.01} suffix="%/an" term="assurance-emprunteur" />
            <Field label="Frais de dossier et de garantie" value={s.upfrontFees} onChange={set('upfrontFees')} max={50000} step={100} suffix="€" />
          </div>
          <div className="sim-group">
            <h3>Loyers</h3>
            <Field label="Loyer mensuel (charges non comprises)" value={s.monthlyRent} onChange={set('monthlyRent')} max={10000} step={10} suffix="€" term="loyer" slider />
            <Field label="Vacance locative" value={s.vacancyPct} onChange={set('vacancyPct')} max={50} step={1} suffix="%" term="vacance" hint="Part de l'année sans locataire (5 % ≈ 18 jours)." />
          </div>
          <div className="sim-group">
            <h3>Charges</h3>
            <Field label="Charges de copropriété non récupérables" value={s.coproMonthly} onChange={set('coproMonthly')} max={2000} step={5} suffix="€/mois" term="charges-non-recuperables" />
            <Field label="Taxe foncière" value={s.propertyTaxYear} onChange={set('propertyTaxYear')} max={20000} step={50} suffix="€/an" term="taxe-fonciere" />
            <Field label="Assurance propriétaire (PNO)" value={s.pnoYear} onChange={set('pnoYear')} max={5000} step={10} suffix="€/an" />
            <Field label="Entretien et petites réparations" value={s.maintenanceYear} onChange={set('maintenanceYear')} max={50000} step={50} suffix="€/an" />
            <Field label="Gestion locative" value={s.managementPct} onChange={set('managementPct')} max={15} step={0.5} suffix="% des loyers" hint="0 si tu gères toi-même ; environ 6 à 8 % avec une agence." />
          </div>
          <div className="sim-group">
            <h3>Impôts</h3>
            <SelectField label="Régime fiscal" value={s.regime} onChange={set('regime')} options={Object.entries(REGIMES).map(([value, label]) => ({ value, label }))} />
            <SelectField label="Ta tranche marginale (TMI)" value={String(s.tmiPct)} onChange={(v) => set('tmiPct')(Number(v))} options={TMI_OPTIONS.map((t) => ({ value: String(t), label: `${t} %` }))} hint="Voir ton avis d'imposition." />
            <Field label="Part des travaux déductible (régime réel)" value={s.worksDeductiblePct} onChange={set('worksDeductiblePct')} max={100} step={10} suffix="%" hint="Seuls les travaux d'entretien/réparation se déduisent, pas la construction ni l'agrandissement." />
          </div>
          <div className="sim-group">
            <h3>Projection</h3>
            <Field label="Horizon" value={s.horizon} onChange={set('horizon')} min={1} max={40} suffix="ans" slider />
            <Field label="Évolution annuelle du prix du bien" value={s.valueGrowthPct} onChange={set('valueGrowthPct')} min={-5} max={8} step={0.1} suffix="%" />
            <Field label="Évolution annuelle des loyers" value={s.rentGrowthPct} onChange={set('rentGrowthPct')} min={-3} max={8} step={0.1} suffix="%" />
            <Field label="Évolution annuelle des charges" value={s.chargesGrowthPct} onChange={set('chargesGrowthPct')} min={-3} max={8} step={0.1} suffix="%" />
            <Field label="Frais de revente (agence, diagnostics)" value={s.saleFeesPct} onChange={set('saleFeesPct')} max={15} step={0.5} suffix="%" />
          </div>
        </Card>

        <div className="sim-results">
          <Tabs ariaLabel="Résultats du simulateur" value={tab} onChange={setTab} tabs={tabs} />

          {tab === 'result' && (
            <>
              <div className="sim-cards">
                <StatCard hero icon="wallet" label="Cash-flow mensuel après impôt" value={r.cashFlowMonthlyAfter} format={(v) => `${v >= 0 ? '+' : '−'}${fmtInt(Math.abs(v))} €`} help={<HelpTip term="cash-flow" />} deltaLabel={`${r.cashFlowMonthlyBefore >= 0 ? '+' : '−'}${fmtInt(Math.abs(r.cashFlowMonthlyBefore))} € avant impôt`} />
                <StatCard icon="chart" label="Rendement brut" value={r.grossYieldPct} format={(v) => pct(v)} help={<HelpTip term="rendement-brut" />} deltaLabel="loyers annuels ÷ coût total" />
                <StatCard icon="building" label="Rendement net" value={r.netYieldPct} format={(v) => pct(v)} deltaLabel={`net d'impôt : ${pct(r.netNetYieldPct)}`} />
                <StatCard icon="target" label={`TRI sur ${r.params.horizon} ans`} value={Number.isFinite(r.triPct) ? r.triPct : 0} format={(v) => (Number.isFinite(r.triPct) ? pct(v) : '–')} deltaLabel="rendement annuel de ton apport" />
              </div>
              <div className="sim-two">
                <Card>
                  <CardHead title="Le montage" icon="bank" />
                  <ul className="sim-list" style={{ listStyle: 'none', padding: 0 }}>
                    <li>Coût total (prix + travaux + notaire) : <strong className="ik-num">{eur(r.totalCost)}</strong></li>
                    <li>Tu empruntes : <strong className="ik-num">{eur(r.financed)}</strong></li>
                    <li>Mensualité du crédit : <strong className="ik-num">{eur(r.monthlyPayment)}</strong> + {eur(r.monthlyInsurance)} d&apos;assurance</li>
                    <li>Argent sorti de ta poche au départ : <strong className="ik-num">{eur(r.ownCash)}</strong></li>
                    <li>Loyer à partir duquel tu ne perds plus d&apos;argent (avant impôt) : <strong className="ik-num">{eur(r.breakEvenRent)}</strong>/mois</li>
                  </ul>
                </Card>
                <Card>
                  <CardHead title="Chaque année (première année)" icon="calendar" />
                  <ul className="sim-list" style={{ listStyle: 'none', padding: 0 }}>
                    <li>Loyers encaissés : <strong className="ik-num">{eur(r.rows[0].rent)}</strong></li>
                    <li>Charges : <strong className="ik-num">−{eur(r.rows[0].charges)}</strong></li>
                    <li>Crédit (mensualités + assurance) : <strong className="ik-num">−{eur(r.rows[0].loanPayment)}</strong></li>
                    <li>Impôt ({REGIMES[r.regime].split(' · ')[1]}) : <strong className="ik-num">−{eur(r.rows[0].tax)}</strong></li>
                    <li>Reste dans ta poche : <strong className={`ik-num ${cfTone}`}>{eur(r.rows[0].cashFlowAfter)}</strong></li>
                  </ul>
                </Card>
              </div>
              <Card>
                <CardHead title="Points d'attention" icon="alert" />
                <div style={{ display: 'grid', gap: 8 }}>
                  {points.map((p, i) => <div key={i} className={`sim-point ${p.level === 'warn' ? 'sim-point--warn' : ''}`}><Icon name={p.level === 'warn' ? 'alert' : 'info'} size={18} /><span>{p.text}</span></div>)}
                </div>
                <p className="ik-muted" style={{ marginBottom: 0 }}>Règles de bon sens calculées sur tes chiffres : ce n&apos;est pas un conseil personnalisé.</p>
              </Card>
            </>
          )}

          {tab === 'tax' && (
            <Card>
              <CardHead title="Quel régime te coûte le moins d'impôt ?" icon="file" />
              <div className="ik-table-wrap"><table className="ik-table"><thead><tr><th scope="col">Régime</th><th scope="col">Impôt année 1</th><th scope="col">Impôt sur {r.params.horizon} ans</th><th scope="col">Cash-flow mensuel</th><th scope="col">TRI</th></tr></thead>
                <tbody>{regimes.map((g) => <tr key={g.id} style={g.id === r.regime ? { fontWeight: 700 } : undefined}><td>{g.label}{g.id === r.regime ? ' (ton choix)' : ''}{g.fallbackUsed ? ' *' : ''}</td><td className="ik-num">{eur(g.year1Tax)}</td><td className="ik-num">{eur(g.totalTax)}</td><td className="ik-num">{g.cashFlowMonthlyAfter >= 0 ? '+' : '−'}{fmtInt(Math.abs(g.cashFlowMonthlyAfter))} €</td><td className="ik-num">{pct(g.triPct)}</td></tr>)}</tbody></table></div>
              <ul className="sim-list" style={{ marginTop: 14 }}>
                <li>Impôt = base imposable × (ta TMI {s.tmiPct} % + prélèvements sociaux {SIM_RULES.socialLevyPct.toLocaleString('fr-FR')} %).</li>
                <li><strong>Micro-foncier</strong> : abattement forfaitaire de {SIM_RULES.microFoncierAllowancePct} %, jusqu&apos;à {eur(SIM_RULES.microFoncierCeiling)} de loyers par an. <strong>Réel</strong> : on déduit les charges, les intérêts d&apos;emprunt et l&apos;assurance. <strong>Meublé micro-BIC</strong> : abattement de {SIM_RULES.microBicAllowancePct} %, jusqu&apos;à {eur(SIM_RULES.microBicCeiling)}.</li>
                <li>* au-dessus du plafond de loyers, le calcul bascule sur le régime réel. Non modélisés : déficit foncier reportable, amortissement du meublé au réel (LMNP réel), loueur professionnel, dispositifs de défiscalisation.</li>
              </ul>
              <p className="sim-notice" style={{ marginBottom: 0 }}>Valeurs de référence <strong>à reconfirmer</strong> sur impots.gouv.fr (elles changent selon les années). La fiscalité de la revente (plus-value) n&apos;est pas incluse.</p>
            </Card>
          )}

          {tab === 'projection' && (
            <>
              <Card>
                <CardHead title="Ton patrimoine net au fil des années" icon="chart" />
                <LineChart ariaLabel="Patrimoine net, valeur du bien et capital restant dû" labels={labels} format={eur} xEvery={Math.max(1, Math.ceil(labels.length / 10))}
                  series={[{ label: 'Valeur du bien', color: 'var(--ik-series-1)', data: r.rows.map((x) => x.value) }, { label: 'Capital restant dû', color: 'var(--ik-series-3)', data: r.rows.map((x) => x.balance) }, { label: 'Patrimoine net (après apport et cash-flows)', color: 'var(--ik-series-5)', data: r.rows.map((x) => x.netWorth) }]} area={false} />
                <p className="ik-muted" style={{ marginBottom: 0 }}>Patrimoine net = valeur du bien − capital restant dû + cash-flows cumulés après impôt − apport et frais initiaux. À {r.params.horizon} ans : <strong className="ik-num">{eur(r.netWorthEnd)}</strong> (hors impôt sur la plus-value).</p>
              </Card>
              <Card>
                <CardHead title="Année par année" icon="file" />
                <div className="ik-table-wrap sim-table"><table className="ik-table"><thead><tr><th scope="col">Année</th><th scope="col">Loyers</th><th scope="col">Charges</th><th scope="col">Crédit</th><th scope="col">Impôt</th><th scope="col">Cash-flow</th><th scope="col">Reste dû</th></tr></thead>
                  <tbody>{r.rows.map((x) => <tr key={x.year}><td>{x.year}</td><td className="ik-num">{eur(x.rent)}</td><td className="ik-num">{eur(x.charges)}</td><td className="ik-num">{eur(x.loanPayment)}</td><td className="ik-num">{eur(x.tax)}</td><td className={`ik-num ${x.cashFlowAfter >= 0 ? 'ik-up' : 'ik-down'}`}>{eur(x.cashFlowAfter)}</td><td className="ik-num">{eur(x.balance)}</td></tr>)}</tbody></table></div>
              </Card>
            </>
          )}

          {tab === 'risk' && (
            <Card>
              <CardHead title="Et si le bien restait vide plus souvent ?" icon="shield" />
              <div className="ik-table-wrap"><table className="ik-table"><thead><tr><th scope="col">Vacance locative</th><th scope="col">Cash-flow mensuel après impôt</th><th scope="col">Rendement net</th><th scope="col">TRI</th></tr></thead>
                <tbody>{sens.map((x) => <tr key={x.vacancy}><td>{x.vacancy} %{x.vacancy === s.vacancyPct ? ' (ton hypothèse)' : ''}</td><td className={`ik-num ${x.r.cashFlowMonthlyAfter >= 0 ? 'ik-up' : 'ik-down'}`}>{x.r.cashFlowMonthlyAfter >= 0 ? '+' : '−'}{fmtInt(Math.abs(x.r.cashFlowMonthlyAfter))} €</td><td className="ik-num">{pct(x.r.netYieldPct)}</td><td className="ik-num">{pct(x.r.triPct)}</td></tr>)}</tbody></table></div>
              <p className="ik-muted" style={{ marginBottom: 0 }}>Un logement mal situé ou mal entretenu peut rester vide plusieurs mois : teste toujours un scénario plus sombre que le tien. Pour t&apos;entraîner sans risque, le jeu InvestKit simule vacance, travaux et locataires qui partent (Immobilier).</p>
            </Card>
          )}
        </div>
      </div>
    </SimFrame>
  );
}
