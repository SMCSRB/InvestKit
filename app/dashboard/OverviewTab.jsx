'use client';

import Icon from '@/app/components/ui/Icon';
import { Button, Card, CardHead, Coin, EmptyState, StatCard } from '@/app/components/ui/primitives';
import { Reveal } from '@/app/components/ui/motion';
import { Donut, SegmentedBar } from '@/app/components/ui/charts';
import OnboardingChecklist from '@/app/components/OnboardingChecklist';
import DashHero from './DashHero';
import UpgradeCard from '@/app/components/plan/UpgradeCard';
import { useShell } from '@/app/components/shell/ShellContext';
import ProgressCard from './ProgressCard';
import HelpTip from '@/app/components/HelpTip';
import { tone as riskTone } from '@/app/components/PortfolioRisk';
import { fmtInt } from '@/app/lib/format';
import { useCoins } from '@/app/lib/coinStore';

const signed = (v) => `${Number(v) > 0 ? '+' : ''}${fmtInt(v)}`;

// Droit d'accès au domaine côté affichage (la règle réelle reste côté serveur : backend/src/utils/entitlements.ts).
const isLocked = (ov, domainIds) => ov.tier !== 'pro' && !domainIds.includes(ov.freeDomain);

function DomainCard({ icon, name, locked, free, children, action, index }) {
  return (
    <Reveal index={index} data-tilt="">
      <Card glow className="dash-domain" data-locked={locked || undefined}>
        <div className="dash-domain__head">
          <span className="lp-domain__icon" style={{ margin: 0, width: 44, height: 44, borderRadius: 14 }}><Icon name={icon} size={22} /></span>
          <h3>{name}</h3>
          {locked ? <span className="ik-chip ik-chip--soon"><Icon name="lock" size={13} />Pro</span> : free ? <span className="ik-chip">Domaine gratuit</span> : null}
        </div>
        <div className={locked ? 'dash-blur' : undefined} aria-hidden={locked || undefined}>{children}</div>
        {action}
      </Card>
    </Reveal>
  );
}

// Explication de la performance Immobilier, avec les chiffres du joueur (mêmes chiffres que le Bilan Immobilier).
function RealEstateExplain({ re }) {
  const e = re.performanceExplain;
  if (!e) return null;
  const n = (v) => <strong>{fmtInt(v)} <Coin size={13} /></strong>;
  const s = (v) => <strong>{v > 0 ? '+' : ''}{fmtInt(v)} <Coin size={13} /></strong>;
  return (
    <details className="rp-explain" data-testid="dash-re-explain" style={{ marginTop: 6 }}>
      <summary>Comment est calculé ce pourcentage ?</summary>
      <p className="ik-muted" style={{ margin: '8px 0 4px' }}>C’est le gain que tu ferais si tu vendais tous tes biens aujourd’hui, divisé par ton capital de départ ({n(e.startingCapitalCoins)}).</p>
      <ol style={{ margin: '4px 0 8px', paddingLeft: 18, display: 'grid', gap: 4 }}>
        <li><strong>Ce que tu as mis :</strong> apport {n(e.downPaymentCoins)} (frais de notaire {n(e.notaryFeesCoins)} compris), frais de dossier du prêt {n(e.loanFeesCoins)}, travaux payés {n(e.worksCoins)}.</li>
        <li><strong>Ce que valent tes biens :</strong> {n(e.marketValueCoins)} (prix d’achat {n(e.purchasePriceCoins)}, évolué avec le marché), moins le prêt immobilier restant {n(e.mortgageDebtCoins)}.</li>
        <li><strong>Ce que la revente coûterait :</strong> décote d’un bien loué {n(e.occupiedDiscountCoins)}, agence {n(e.agencyFeesCoins)}, diagnostics {n(e.diagnosticsCoins)}, indemnité de remboursement anticipé {n(e.earlyRepaymentCoins)}, impôts {n(e.taxesCoins)}, dépôt de garantie à rendre {n(e.depositCoins)}.</li>
        <li><strong>Valeur nette de revente :</strong> {n(re.netLiquidationCoins ?? 0)}. À cela s’ajoutent tes loyers encaissés {n(e.rentCollectedCoins)} et tes ventes déjà faites {n(e.salesAlreadyDoneCoins)}, moins les intérêts de prêts personnels {n(e.personalLoanInterestCoins)}, moins ce que tu as mis {n(e.investedTotalCoins)}.</li>
        <li><strong>Gain :</strong> {s(e.gainCoins)}, soit {String(re.performancePct).replace('.', ',')} % de ton capital de départ.</li>
      </ol>
      <p className="ik-muted" style={{ margin: 0 }}>Un chiffre négatif au début est normal : les frais d’achat (notaire, dossier) et de revente sont comptés tout de suite, alors que les loyers n’ont pas encore eu le temps de les compenser. Il redevient positif si le bien prend de la valeur ou si les loyers s’accumulent. Rien ne t’oblige à vendre.</p>
    </details>
  );
}

function Line({ label, value, tone }) {
  return (
    <div className="dash-line">
      <span>{label}</span>
      <strong className={`ik-num ${tone || ''}`}>{value}</strong>
    </div>
  );
}

// Vue d'ensemble : uniquement des données réelles du serveur (/overview). Aucune valeur de démonstration.
export default function OverviewTab({ overview: ov, failed, onRetry, onOpenTab }) {
  const shell = useShell();
  // Liquidités, titres, dettes et patrimoine viennent du portefeuille partagé (renvoyé par le serveur après chaque action) : ils changent
  // dès qu'une récompense est récupérée ou qu'une dépense est faite, sans attendre le rechargement de la vue d'ensemble.
  const { wallet: w } = useCoins();
  const loading = !ov && !failed;
  const t = ov?.totals;
  const coins = w?.balance ?? ov?.coins ?? 0;
  // Deux patrimoines : FINANCIER (liquidités + titres − dettes) et TOTAL (financier + immobilier net de revente).
  const financialWealth = w?.financialWealth ?? t?.financialWealth ?? w?.netWorth ?? t?.netWorth;
  const totalWealth = w?.totalWealth ?? t?.totalWealth;
  const netWorth = totalWealth;
  const tradingValue = w?.tradingValue ?? t?.tradingValue;
  const debtCoins = w?.debtCoins ?? ov?.bank?.debtCoins;
  const stocks = ov?.trading?.stocks;
  const crypto = ov?.trading?.crypto;
  const re = ov?.realEstate;
  const risk = ov?.risk;
  const invested = t?.invested ?? 0;
  const dist = [
    { label: 'Liquidités', value: coins, color: 'var(--ik-series-1)' },
    { label: 'Bourse', value: stocks?.marketValue ?? 0, color: 'var(--ik-series-2)' },
    { label: 'Crypto', value: crypto?.marketValue ?? 0, color: 'var(--ik-series-3)' },
    { label: 'Immobilier (net de revente)', value: Math.max(0, re?.netLiquidationCoins ?? 0), color: 'var(--ik-series-4)' },
  ];
  const distTotal = dist.reduce((a, d) => a + d.value, 0);
  const lockedStocks = !!ov && isLocked(ov, ['stocks']);
  const lockedCrypto = !!ov && isLocked(ov, ['crypto', 'crypto_market']);
  const lockedRe = !!ov && isLocked(ov, ['real_estate']);

  if (failed && !ov) {
    return (
      <div className="dash-overview">
        <OnboardingChecklist />
        <Card><EmptyState icon="alert" title="Vue d'ensemble indisponible" action={<Button onClick={onRetry}>Réessayer</Button>}>Le serveur n&apos;a pas répondu (ou trop de requêtes). Tes données ne sont pas perdues.</EmptyState></Card>
      </div>
    );
  }
  return (
    <div className="dash-overview">
      <DashHero username={ov?.username} patrimoine={netWorth} loading={loading && !w} />
      <UpgradeCard plan={shell?.user?.plan} />

      <OnboardingChecklist />

      <div className="ik-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <Reveal index={0} data-tilt="">
          <StatCard hero icon="wallet" label="Patrimoine total" value={Number.isFinite(totalWealth) ? totalWealth : NaN} unit={<Coin size={26} />}
            deltaLabel={Number.isFinite(totalWealth) ? 'financier + immobilier net de revente' : undefined} />
        </Reveal>
        <Reveal index={1} data-tilt="">
          <StatCard icon="wallet" label="Patrimoine financier" value={Number.isFinite(financialWealth) ? financialWealth : NaN} unit={<Coin size={22} />}
            delta={!loading && invested > 0 ? t.performancePct : undefined} deltaLabel={Number.isFinite(financialWealth) ? 'liquidités + titres − dettes' : undefined} />
        </Reveal>
        <Reveal index={2} data-tilt="">
          <StatCard icon="coins" label="Liquidités" value={loading && !w ? NaN : coins} unit={<Coin size={22} />} deltaLabel="à dépenser dans les domaines" href="/banque" />
        </Reveal>
        <Reveal index={3} data-tilt="">
          <StatCard icon="chart" label="Titres" value={Number.isFinite(tradingValue) ? tradingValue : NaN} unit={<Coin size={22} />} delta={!loading && invested > 0 ? t.performancePct : undefined} deltaLabel={loading ? undefined : invested > 0 ? 'depuis le début' : 'Bourse + Crypto'} />
        </Reveal>
        <Reveal index={4} data-tilt="">
          <StatCard icon="bank" label="Dette bancaire" value={Number.isFinite(debtCoins) ? debtCoins : NaN} unit={<Coin size={22} />} deltaLabel="à rembourser" href="/banque" />
        </Reveal>
      </div>

      <div className="ik-grid dash-two">
        <Reveal index={0}>
          <Card glow style={{ height: '100%' }}>
            <CardHead title="Répartition" icon="pie" />
            {loading ? <div className="ik-skeleton" style={{ height: 290 }} /> : distTotal <= 0 ? (
              <EmptyState icon="target" title="Rien à répartir pour l'instant">Tes liquidités et tes titres apparaîtront ici dès que tu auras joué.</EmptyState>
            ) : (
              <div className="dash-dist">
                <Donut size={148} thickness={18} segments={dist.filter((d) => d.value > 0)} ariaLabel={`Répartition : ${dist.map((d) => `${d.label} ${Math.round((d.value / distTotal) * 100)} %`).join(', ')}`}>
                  <div><div className="ik-num" style={{ fontWeight: 800, fontSize: 20 }}>{fmtInt(distTotal)}</div><div className="ik-muted">InvestCoins</div></div>
                </Donut>
                <div style={{ flex: 1, minWidth: 180, display: 'grid', gap: 12 }}>
                  <SegmentedBar segments={dist.filter((d) => d.value > 0)} />
                  {dist.map((d) => (
                    <div key={d.label} className="dash-line">
                      <span><i className="ik-dot" style={{ background: d.color, marginRight: 8 }} />{d.label}</span>
                      <strong className="ik-num">{fmtInt(d.value)} <span className="ik-muted">({Math.round((d.value / distTotal) * 100)} %)</span></strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </Reveal>

        <Reveal index={1}>
          <Card glow style={{ height: '100%' }}>
            <CardHead title="Risque de ton portefeuille" icon="shield" help={<HelpTip term="volatilite" />} actions={<Button size="sm" variant="ghost" href={risk?.domain === 'crypto_market' || risk?.domain === 'crypto' ? '/crypto' : '/bourse'}>Voir l&apos;analyse</Button>} />
            {loading ? <div className="ik-skeleton" style={{ height: 290 }} /> : !risk ? (
              <EmptyState icon="shield" title="Pas encore de risque à mesurer">Achète un premier titre dans le simulateur : le score de risque apparaît ici.</EmptyState>
            ) : (
              <div className="dash-dist">
                <Donut size={132} thickness={16} segments={[{ label: 'Score', value: risk.score, color: riskTone(risk.score) }, { label: 'Reste', value: Math.max(0, 100 - risk.score), color: 'var(--ik-surface-3)' }]} ariaLabel={`Score de risque : ${risk.score} sur 100, ${risk.label}`}>
                  <div><div className="ik-num" style={{ fontWeight: 800, fontSize: 24 }}>{risk.score}</div><div className="ik-muted">/ 100</div></div>
                </Donut>
                <div style={{ flex: 1, minWidth: 170, display: 'grid', gap: 10 }}>
                  <Line label="Niveau" value={risk.label} />
                  <Line label="Volatilité estimée" value={`${risk.volatilityPct} %`} />
                  <Line label="Pire crise historique" value={`${risk.worstCrisis.lossPct} %`} tone="ik-down" />
                </div>
              </div>
            )}
          </Card>
        </Reveal>
      </div>

      <div className="dash-domains">
        <DomainCard index={0} icon="chart" name="Bourse et PEA" locked={lockedStocks} free={!loading && ov.tier !== 'pro' && ov.freeDomain === 'stocks'}
          action={lockedStocks ? <Button size="sm" onClick={() => onOpenTab('settings')}>Voir l&apos;offre Pro</Button> : <Button size="sm" href="/bourse">Ouvrir la Bourse</Button>}>
          {loading ? <div className="ik-skeleton" style={{ height: 104 }} /> : stocks.started ? (
            <>
              <Line label="Positions" value={stocks.positions} />
              <Line label="Actuellement investi" value={`${fmtInt(stocks.investedNow ?? 0)}`} />
              <Line label="Total acheté (cumul)" value={`${fmtInt(stocks.invested)}`} />
              <Line label="Gain ou perte" value={signed(stocks.gain)} tone={stocks.gain >= 0 ? 'ik-up' : 'ik-down'} />
              <Line label="Année simulée" value={stocks.simulatedYear} />
            </>
          ) : <p className="ik-muted" style={{ margin: 0 }}>Pas encore commencé : achète ton premier titre.</p>}
        </DomainCard>

        <DomainCard index={1} icon="candles" name="Crypto" locked={lockedCrypto} free={!loading && ov.tier !== 'pro' && ['crypto', 'crypto_market'].includes(ov.freeDomain)}
          action={lockedCrypto ? <Button size="sm" onClick={() => onOpenTab('settings')}>Voir l&apos;offre Pro</Button> : <Button size="sm" href="/crypto">Ouvrir le marché</Button>}>
          {loading ? <div className="ik-skeleton" style={{ height: 100 }} /> : crypto.started ? (
            <>
              <Line label="Positions" value={crypto.positions} />
              <Line label="Valeur actuelle" value={crypto.fxUnavailable ? 'taux indisponible' : <>{fmtInt(crypto.marketValue)} <Coin /></>} />
              <Line label="Actuellement investi" value={`${fmtInt(crypto.investedNow ?? 0)}`} />
              <Line label="Total acheté (cumul)" value={`${fmtInt(crypto.invested)}`} />
              <Line label="Gain ou perte" value={signed(crypto.gain)} tone={crypto.gain >= 0 ? 'ik-up' : 'ik-down'} />
            </>
          ) : <p className="ik-muted" style={{ margin: 0 }}>Pas encore commencé : choisis ta date de départ.</p>}
        </DomainCard>

        <DomainCard index={2} icon="building" name="Immobilier" locked={lockedRe} free={!loading && ov.tier !== 'pro' && ov.freeDomain === 'real_estate'}
          action={lockedRe ? <Button size="sm" onClick={() => onOpenTab('settings')}>Voir l&apos;offre Pro</Button> : <Button size="sm" href="/immobilier">Ouvrir l&apos;immobilier</Button>}>
          {loading ? <div className="ik-skeleton" style={{ height: 206 }} /> : re?.started ? (
            <>
              <Line label="Biens" value={re.properties} />
              <Line label="Valeur nette de revente" value={<>{fmtInt(re.netLiquidationCoins ?? 0)} <Coin /></>} />
              <Line label="Dette bancaire" value={<>{fmtInt(re.bankDebtCoins ?? 0)} <Coin /></>} />
              <Line label="Résultat si tu revendais aujourd’hui" value={`${re.performancePct > 0 ? '+' : ''}${String(re.performancePct).replace('.', ',')} %`} tone={re.performancePct > 0 ? 'ik-up' : undefined} />
              <RealEstateExplain re={re} />
            </>
          ) : <p className="ik-muted" style={{ margin: 0 }}>Pas encore commencé : choisis ton profil.</p>}
        </DomainCard>
      </div>

      <div className="ik-grid dash-two">
        <Reveal index={0} data-tilt="">
          <ProgressCard />
        </Reveal>
        <Reveal index={1}>
          <Card style={{ height: '100%' }}>
            <CardHead title="Synthèse Bourse + Crypto" icon="file" />
            <div style={{ display: 'grid', gap: 12 }}>
              <Line label="Actuellement investi (compte pour le classement)" value={loading ? '…' : fmtInt(t.investedNow ?? 0)} />
              <Line label="Total acheté (cumul)" value={loading ? '…' : fmtInt(invested)} />
              <Line label="Gain ou perte (latent + réalisé)" value={loading ? '…' : signed(t.gain)} tone={!loading && t.gain < 0 ? 'ik-down' : 'ik-up'} />
              <Line label="Frais et impôts payés" value={loading ? '…' : fmtInt(t.feesPaid + t.taxPaid)} />
            </div>
            <p className="ik-muted" style={{ margin: '14px 0 0' }}>Tous les montants sont en InvestCoins. Le patrimoine financier = liquidités + Bourse + Crypto − dettes ; le patrimoine total y ajoute l&apos;immobilier net de revente (ce qu&apos;il resterait après avoir tout revendu).</p>
          </Card>
        </Reveal>
      </div>

      <div className="ik-grid">
        <Reveal index={0} data-tilt="">
          <Card hero style={{ display: 'grid', alignContent: 'space-between', gap: 14 }}>
            <div>
              <span className="ik-chip" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}><Icon name="sparkles" size={14} />Analyse de risque</span>
              <h3 style={{ margin: '14px 0 6px', fontSize: 'var(--ik-fs-lg)' }}>Comprends ce qui menace ton portefeuille</h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55 }}>Score décomposé, crises passées rejouées sur tes positions et pistes pour réduire le risque.</p>
            </div>
            <div><Button href="/bourse" style={{ background: '#fff', color: '#2c1d7a', border: 0 }}>Ouvrir l&apos;analyse</Button></div>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
