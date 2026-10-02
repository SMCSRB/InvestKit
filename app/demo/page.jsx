import PublicShell from '@/app/components/landing/PublicShell';
import { Button, Card } from '@/app/components/ui/primitives';
import Icon from '@/app/components/ui/Icon';

export const metadata = { title: 'Essayer les simulateurs', robots: { index: false, follow: false } };

const SIMS = [
  { href: '/simulateurs/pea', icon: 'chart', title: 'Investissement (PEA)', text: 'Intérêts composés, frais, fiscalité, inflation, scénarios et risque.' },
  { href: '/simulateurs/loan1', icon: 'bank', title: 'Crédit immobilier', text: 'Mensualité, coût total, TAEG, capacité d\'emprunt, remboursement anticipé.' },
  { href: '/simulateurs/loan2', icon: 'building', title: 'Investissement locatif', text: 'Rendement, cash-flow, impôt selon le régime, patrimoine sur 20 ans.' },
];

// Les trois simulateurs sont ouverts à tous, sans compte : aucune donnée n'est enregistrée.
export default function DemoPage() {
  return (
    <PublicShell>
      <div className="sim-public">
        <h1>Essayer les simulateurs</h1>
        <p className="ik-muted">Ouverts à tous, sans compte. Tes chiffres restent dans ton navigateur (le lien que tu copies les contient, rien n&apos;est enregistré).</p>
        <div className="ik-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {SIMS.map((s) => (
            <Card key={s.href} glow>
              <span className="lp-domain__icon" style={{ margin: '0 0 12px' }}><Icon name={s.icon} size={22} /></span>
              <h2 style={{ margin: '0 0 6px', fontSize: 'var(--ik-fs-lg)' }}>{s.title}</h2>
              <p className="ik-muted" style={{ margin: '0 0 14px' }}>{s.text}</p>
              <Button variant="primary" href={s.href}>Ouvrir</Button>
            </Card>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
