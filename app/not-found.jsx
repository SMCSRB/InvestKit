import PublicShell from '@/app/components/landing/PublicShell';
import { Button, EmptyState } from '@/app/components/ui/primitives';

export const metadata = { title: 'Page introuvable', robots: { index: false, follow: false } };

// Page 404 : aux couleurs du site, avec un chemin pour revenir.
export default function NotFound() {
  return (
    <PublicShell>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(40px, 12vw, 120px) 16px' }}>
        <EmptyState icon="search" title="Cette page n'existe pas" action={<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}><Button variant="primary" href="/">Retour à l&apos;accueil</Button><Button href="/dashboard">Mon tableau de bord</Button></div>}>
          Le lien est peut-être ancien ou mal écrit. Rien n&apos;est perdu : tes données sont intactes.
        </EmptyState>
      </div>
    </PublicShell>
  );
}
