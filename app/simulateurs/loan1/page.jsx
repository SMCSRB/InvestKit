'use client';

import { useMemo, useState } from 'react';
import { Card, CardHead, EmptyState, StatCard, Tabs } from '@/app/components/ui/primitives';
import { Donut, LineChart, StackedBars } from '@/app/components/ui/charts';
import { Field, SelectField } from '@/app/components/sim/Field';
import SimFrame from '@/app/components/sim/SimFrame';
import HelpTip from '@/app/components/HelpTip';
import useSimState from '@/app/lib/sim/useSimState';
import { borrowingCapacity, buildSchedule, clamp, earlyRepayment, monthlyPayment, notaryFees, taegPct, totalCreditCost } from '@/app/lib/sim/finance';
import { SIM_RULES } from '@/app/lib/sim/rules';
import { fmtInt } from '@/app/lib/format';

const eur = (n) => `${fmtInt(Number.isFinite(n) ? n : 0)} €`;
const eur2 = (n) => `${(Number.isFinite(n) ? n : 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const pct = (n, d = 2) => `${(Number.isFinite(n) ? n : 0).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })} %`;
const DEFAULTS = {
  price: 220000, age: 'old', works: 0, downPayment: 30000, ratePct: 3.6, years: 20, insuranceRatePct: 0.3, fees: 2000,
  income: 4200, otherPayments: 0,
  afterYear: 5, repayAmount: 20000, repayMode: 'duration',
  bRatePct: 3.4, bInsuranceRatePct: 0.4, bFees: 1500, bYears: 20,
};

export default function LoanSimulatorPage() {
  const [s, set, reset] = useSimState(DEFAULTS);
  const [tab, setTab] = useState('result');

  const calc = useMemo(() => {
    const price = clamp(s.price, 0, 1e8); const works = clamp(s.works, 0, 1e7);
    const notary = notaryFees(price, s.age);
    const totalCost = price + works + notary;
    const down = clamp(s.downPayment, 0, 1e8);
    const principal = Math.max(0, totalCost - down);
    const months = Math.round(clamp(s.years, 1, 40)) * 12;
    const ratePct = clamp(s.ratePct, 0, 25); const ins = clamp(s.insuranceRatePct, 0, 5); const fees = clamp(s.fees, 0, 1e6);
    const sched = buildSchedule({ principal, annualRatePct: ratePct, months, insuranceRatePct: ins });
    const insMonthly = sched.rows[0] ? sched.rows[0].insurance : 0;
    const total = sched.monthlyPayment + insMonthly;
    const taeg = principal > 0 ? taegPct({ principal, annualRatePct: ratePct, months, insuranceRatePct: ins, upfrontFees: fees }) : 0;
    const income = clamp(s.income, 0, 1e6); const other = clamp(s.otherPayments, 0, 1e6);
    const debt = income > 0 ? ((total + other) / income) * 100 : NaN;
    return { price, works, notary, totalCost, down, principal, months, ratePct, ins, fees, sched, insMonthly, total, taeg, cost: totalCreditCost(sched, fees), debt, income, other };
  }, [s]);

  const yearly = useMemo(() => {
    const out = [];
    for (let y = 1; y <= Math.ceil(calc.months / 12); y += 1) {
      const rs = calc.sched.rows.filter((r) => Math.ceil(r.month / 12) === y);
      out.push({ year: y, principal: rs.reduce((a, r) => a + r.principal, 0), interest: rs.reduce((a, r) => a + r.interest, 0), insurance: rs.reduce((a, r) => a + r.insurance, 0), balance: rs[rs.length - 1]?.balance ?? 0 });
    }
    return out;
  }, [calc]);

  const cap = useMemo(() => borrowingCapacity({ monthlyIncome: calc.income, otherPayments: calc.other, annualRatePct: calc.ratePct, months: calc.months, insuranceRatePct: calc.ins }), [calc]);
  const early = useMemo(() => calc.principal > 0 ? earlyRepayment({ principal: calc.principal, annualRatePct: calc.ratePct, months: calc.months, insuranceRatePct: calc.ins, afterMonth: Math.round(clamp(s.afterYear, 0, 40) * 12), amount: s.repayAmount, mode: s.repayMode }) : null, [calc, s.afterYear, s.repayAmount, s.repayMode]);
  const terms = useMemo(() => [15, 20, 25].map((y) => {
    const sc = buildSchedule({ principal: calc.principal, annualRatePct: calc.ratePct, months: y * 12, insuranceRatePct: calc.ins });
    return { years: y, payment: sc.monthlyPayment + (sc.rows[0]?.insurance ?? 0), cost: totalCreditCost(sc, calc.fees) };
  }), [calc]);
  const offerB = useMemo(() => {
    const m = Math.round(clamp(s.bYears, 1, 40)) * 12; const bi = clamp(s.bInsuranceRatePct, 0, 5); const br = clamp(s.bRatePct, 0, 25); const bf = clamp(s.bFees, 0, 1e6);
    const sc = buildSchedule({ principal: calc.principal, annualRatePct: br, months: m, insuranceRatePct: bi });
    return { sched: sc, payment: sc.monthlyPayment + (sc.rows[0]?.insurance ?? 0), cost: totalCreditCost(sc, bf), taeg: calc.principal > 0 ? taegPct({ principal: calc.principal, annualRatePct: br, months: m, insuranceRatePct: bi, upfrontFees: bf }) : 0 };
  }, [calc, s.bRatePct, s.bInsuranceRatePct, s.bFees, s.bYears]);

  const tabs = [{ value: 'result', label: 'Résultat' }, { value: 'amort', label: 'Amortissement' }, { value: 'capacity', label: 'Capacité' }, { value: 'early', label: 'Remboursement anticipé' }, { value: 'compare', label: 'Comparer' }];
  const debtTone = !Number.isFinite(calc.debt) ? '' : calc.debt > SIM_RULES.maxDebtRatioPct ? 'ik-down' : 'ik-up';

  return (
    <SimFrame title="Simulateur de crédit immobilier" subtitle="Mensualité, coût total, TAEG, capacité d'emprunt et remboursement anticipé." onReset={reset}>
      <div className="sim-layout">
        <Card className="sim-inputs">
          <div className="sim-group">
            <h3>Le bien</h3>
            <Field label="Prix du bien" value={s.price} onChange={set('price')} max={2000000} step={5000} suffix="€" slider />
            <SelectField label="Type" value={s.age} onChange={set('age')} options={[{ value: 'old', label: 'Ancien' }, { value: 'new', label: 'Neuf' }]} hint={`Frais de notaire estimés : ${eur(calc.notary)} (${s.age === 'new' ? SIM_RULES.notaryNewPct : SIM_RULES.notaryOldPct} % : remplace par ton devis).`} term="frais-notaire" />
            <Field label="Travaux" value={s.works} onChange={set('works')} max={500000} step={1000} suffix="€" />
            <Field label="Apport" value={s.downPayment} onChange={set('downPayment')} max={1000000} step={1000} suffix="€" term="apport" slider />
          </div>
          <div className="sim-group">
            <h3>Le crédit</h3>
            <Field label="Taux nominal" value={s.ratePct} onChange={set('ratePct')} max={12} step={0.05} suffix="%" term="taux" slider hint="Le taux de ton offre, hors assurance." />
            <Field label="Durée" value={s.years} onChange={set('years')} min={1} max={30} suffix="ans" slider />
            <Field label="Assurance emprunteur" value={s.insuranceRatePct} onChange={set('insuranceRatePct')} max={2} step={0.01} suffix="%/an" term="assurance-emprunteur" hint="Sur le capital initial. Comptée une seule fois, séparément du taux." />
            <Field label="Frais de dossier et de garantie" value={s.fees} onChange={set('fees')} max={50000} step={100} suffix="€" term="frais-dossier" />
          </div>
          <div className="sim-group">
            <h3>Ton budget</h3>
            <Field label="Revenus nets mensuels du foyer" value={s.income} onChange={set('income')} max={50000} step={100} suffix="€" />
            <Field label="Autres crédits en cours (mensualités)" value={s.otherPayments} onChange={set('otherPayments')} max={10000} step={50} suffix="€" />
          </div>
        </Card>

        <div className="sim-results">
          <Tabs ariaLabel="Résultats du simulateur" value={tab} onChange={setTab} tabs={tabs} />

          {tab === 'result' && (
            <>
              <div className="sim-cards">
                <StatCard hero icon="bank" label="Mensualité (assurance incluse)" value={calc.total} format={eur2} deltaLabel={`dont ${eur2(calc.insMonthly)} d'assurance`} />
                <StatCard icon="coins" label="Tu empruntes" value={calc.principal} format={eur} deltaLabel={`prix + notaire ${eur(calc.notary)}${calc.works ? ' + travaux' : ''} − apport`} />
                <StatCard icon="alert" label="Coût total du crédit" value={calc.cost} format={eur} deltaLabel="intérêts + assurance + frais" />
                <StatCard icon="chart" label="TAEG" value={calc.taeg} format={(v) => pct(v)} help={<HelpTip term="taeg" />} deltaLabel="taux tout compris" />
              </div>
              <Card>
                <CardHead title="Ton taux d'endettement" icon="shield" />
                <p style={{ margin: 0 }}>
                  <strong className={`sim-big ik-num ${debtTone}`}>{Number.isFinite(calc.debt) ? pct(calc.debt, 1) : 'Renseigne tes revenus'}</strong>
                  {Number.isFinite(calc.debt) && <span className="ik-muted"> · les banques visent {SIM_RULES.maxDebtRatioPct} % au maximum (mensualité + autres crédits ÷ revenus).</span>}
                </p>
              </Card>
              <div className="sim-two">
                <Card>
                  <CardHead title="Où va ton argent" icon="pie" />
                  <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Donut size={128} thickness={16} ariaLabel="Répartition du coût : capital, intérêts, assurance, frais" segments={[
                      { label: 'Capital', value: calc.principal, color: 'var(--ik-series-1)' }, { label: 'Intérêts', value: calc.sched.totalInterest, color: 'var(--ik-series-3)' },
                      { label: 'Assurance', value: calc.sched.totalInsurance, color: 'var(--ik-series-2)' }, { label: 'Frais', value: calc.fees, color: 'var(--ik-series-4)' }]}>
                      <div className="ik-num" style={{ fontWeight: 800 }}>{eur(calc.sched.totalPaid + calc.fees)}</div><div className="ik-muted">au total</div>
                    </Donut>
                    <ul className="sim-list" style={{ listStyle: 'none', padding: 0 }}>
                      <li>Capital : <strong className="ik-num">{eur(calc.principal)}</strong></li>
                      <li>Intérêts : <strong className="ik-num">{eur(calc.sched.totalInterest)}</strong></li>
                      <li>Assurance : <strong className="ik-num">{eur(calc.sched.totalInsurance)}</strong></li>
                      <li>Frais : <strong className="ik-num">{eur(calc.fees)}</strong></li>
                    </ul>
                  </div>
                </Card>
                <Card>
                  <CardHead title="Et sur une autre durée ?" icon="clock" />
                  <div className="ik-table-wrap"><table className="ik-table"><thead><tr><th scope="col">Durée</th><th scope="col">Mensualité</th><th scope="col">Coût du crédit</th></tr></thead>
                    <tbody>{terms.map((t) => <tr key={t.years}><td>{t.years} ans</td><td className="ik-num">{eur2(t.payment)}</td><td className="ik-num">{eur(t.cost)}</td></tr>)}</tbody></table></div>
                  <p className="ik-muted" style={{ marginBottom: 0 }}>Plus long = mensualité plus légère mais crédit plus cher.</p>
                </Card>
              </div>
            </>
          )}

          {tab === 'amort' && (
            <>
              <Card>
                <CardHead title="Capital et intérêts, année par année" icon="chart" />
                <StackedBars ariaLabel="Capital remboursé, intérêts et assurance par année" format={eur} rows={yearly.map((y) => ({ label: String(y.year), parts: [y.principal, y.interest, y.insurance] }))}
                  keys={[{ label: 'Capital', color: 'var(--ik-series-1)' }, { label: 'Intérêts', color: 'var(--ik-series-3)' }, { label: 'Assurance', color: 'var(--ik-series-2)' }]} />
                <LineChart ariaLabel="Capital restant dû" labels={yearly.map((y) => String(y.year))} format={eur} xEvery={Math.max(1, Math.ceil(yearly.length / 10))}
                  series={[{ label: 'Capital restant dû (fin d\'année)', color: 'var(--ik-series-1)', data: yearly.map((y) => y.balance) }]} />
              </Card>
              <Card>
                <CardHead title="Tableau d'amortissement" icon="file" />
                <div className="ik-table-wrap sim-table"><table className="ik-table"><thead><tr><th scope="col">Année</th><th scope="col">Capital</th><th scope="col">Intérêts</th><th scope="col">Assurance</th><th scope="col">Reste dû</th></tr></thead>
                  <tbody>{yearly.map((y) => <tr key={y.year}><td>{y.year}</td><td className="ik-num">{eur(y.principal)}</td><td className="ik-num">{eur(y.interest)}</td><td className="ik-num">{eur(y.insurance)}</td><td className="ik-num">{eur(y.balance)}</td></tr>)}</tbody></table></div>
              </Card>
            </>
          )}

          {tab === 'capacity' && (
            <Card>
              <CardHead title="Combien peux-tu emprunter ?" icon="wallet" />
              {calc.income <= 0 ? <EmptyState icon="info" title="Renseigne tes revenus">Indique tes revenus nets mensuels à gauche.</EmptyState> : (
                <>
                  <div className="sim-cards">
                    <StatCard hero icon="coins" label="Capital empruntable" value={cap.principal} format={eur} deltaLabel={`à ${pct(calc.ratePct)} sur ${calc.months / 12} ans`} />
                    <StatCard icon="bank" label="Mensualité maximale" value={cap.budget} format={eur2} deltaLabel={`${SIM_RULES.maxDebtRatioPct} % de tes revenus − autres crédits`} />
                    <StatCard icon="building" label="Prix de bien accessible" value={cap.principal + calc.down} format={eur} deltaLabel="avec ton apport, frais de notaire inclus" />
                  </div>
                  <p className="ik-muted" style={{ marginBottom: 0 }}>Calcul de la règle des {SIM_RULES.maxDebtRatioPct} % d&apos;endettement (recommandation du HCSF). Une banque regarde aussi ton reste à vivre, ton apport et la stabilité de tes revenus : c&apos;est une estimation, pas un accord de prêt.</p>
                </>
              )}
            </Card>
          )}

          {tab === 'early' && (
            <Card>
              <CardHead title="Si tu rembourses une partie plus tôt" icon="arrowDownRight" />
              <div className="sim-two">
                <Field label="Après combien d'années ?" value={s.afterYear} onChange={set('afterYear')} min={0} max={Math.max(0, calc.months / 12 - 1)} step={1} suffix="ans" />
                <Field label="Montant remboursé" value={s.repayAmount} onChange={set('repayAmount')} max={1000000} step={1000} suffix="€" />
                <SelectField label="Je préfère" value={s.repayMode} onChange={set('repayMode')} options={[{ value: 'duration', label: 'Réduire la durée (même mensualité)' }, { value: 'payment', label: 'Réduire la mensualité (même durée)' }]} />
              </div>
              {early && (
                <>
                  <div className="sim-cards" style={{ marginTop: 14 }}>
                    <StatCard hero icon="sparkles" label="Économie nette" value={early.netSaving} format={eur} deltaLabel="intérêts + assurance économisés − indemnité" />
                    <StatCard icon="clock" label={s.repayMode === 'duration' ? 'Mois gagnés' : 'Nouvelle mensualité'} value={s.repayMode === 'duration' ? early.monthsSaved : early.newMonthlyPayment} format={s.repayMode === 'duration' ? (v) => `${fmtInt(v)} mois` : eur2} deltaLabel={s.repayMode === 'duration' ? 'plus tôt libéré' : 'hors assurance'} />
                    <StatCard icon="alert" label="Indemnité de remboursement" value={early.penalty} format={eur} help={<HelpTip term="remboursement-anticipe" />} deltaLabel="plafond : 3 % du capital, 6 mois d'intérêts" />
                  </div>
                  <p className="ik-muted" style={{ marginBottom: 0 }}>Capital restant dû avant remboursement : {eur(early.remainingBefore)}. Indemnité maximale prévue par la loi pour un prêt immobilier ; ton contrat peut prévoir moins (ou pas du tout : vérifie-le).</p>
                </>
              )}
            </Card>
          )}

          {tab === 'compare' && (
            <Card>
              <CardHead title="Compare deux offres" icon="swap" />
              <p className="ik-muted" style={{ marginTop: 0 }}>Offre A = celle de gauche. Saisis l&apos;offre B d&apos;une autre banque : seuls des chiffres que tu connais, aucun taux n&apos;est inventé.</p>
              <div className="sim-two">
                <Field label="Taux de l'offre B" value={s.bRatePct} onChange={set('bRatePct')} max={12} step={0.05} suffix="%" />
                <Field label="Assurance de l'offre B" value={s.bInsuranceRatePct} onChange={set('bInsuranceRatePct')} max={2} step={0.01} suffix="%/an" />
                <Field label="Frais de l'offre B" value={s.bFees} onChange={set('bFees')} max={50000} step={100} suffix="€" />
                <Field label="Durée de l'offre B" value={s.bYears} onChange={set('bYears')} min={1} max={30} suffix="ans" />
              </div>
              <div className="ik-table-wrap" style={{ marginTop: 12 }}><table className="ik-table"><thead><tr><th scope="col" /><th scope="col">Offre A</th><th scope="col">Offre B</th><th scope="col">Écart (B − A)</th></tr></thead><tbody>
                <tr><th scope="row">Mensualité (assurance incluse)</th><td className="ik-num">{eur2(calc.total)}</td><td className="ik-num">{eur2(offerB.payment)}</td><td className="ik-num">{eur2(offerB.payment - calc.total)}</td></tr>
                <tr><th scope="row">Coût total du crédit</th><td className="ik-num">{eur(calc.cost)}</td><td className="ik-num">{eur(offerB.cost)}</td><td className={`ik-num ${offerB.cost <= calc.cost ? 'ik-up' : 'ik-down'}`}>{eur(offerB.cost - calc.cost)}</td></tr>
                <tr><th scope="row">TAEG</th><td className="ik-num">{pct(calc.taeg)}</td><td className="ik-num">{pct(offerB.taeg)}</td><td className="ik-num">{pct(offerB.taeg - calc.taeg)}</td></tr>
              </tbody></table></div>
              <p className="ik-muted" style={{ marginBottom: 0 }}>Compare surtout le <strong>coût total</strong> et le <strong>TAEG</strong> : à durées différentes, la mensualité seule est trompeuse.</p>
            </Card>
          )}
        </div>
      </div>
    </SimFrame>
  );
}
