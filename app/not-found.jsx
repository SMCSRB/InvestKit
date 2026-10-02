import { Button } from '@/app/components/ui/primitives';
import StatusPage from '@/app/components/auth/StatusPage';

export const metadata = { title: 'Page introuvable', robots: { index: false, follow: false } };

// Page 404 : même fond animé que les pages de compte, avec un chemin pour revenir.
export default function NotFound() {
  return (
    <StatusPage code="404" title="Cette page n’existe pas" actions={<><Button variant="primary" href="/">Retour à l’accueil</Button><Button href="/dashboard">Mon tableau de bord</Button></>}>
      Le lien est peut-être ancien ou mal écrit. Rien n’est perdu : tes données sont intactes.
    </StatusPage>
  );
}
