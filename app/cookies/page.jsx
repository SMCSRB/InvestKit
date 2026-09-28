import LegalPage from '../components/LegalPage';

export const metadata = { title: 'Cookies — InvestKit' };

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookies et stockage local"
      updated="2026-09-28"
      sections={[
        {
          title: 'Ce que le site enregistre dans ton navigateur',
          body: 'Pendant la phase de test, le site n\'utilise ni outil de mesure d\'audience, ni publicité, ni traceur tiers. Il conserve uniquement dans ton navigateur ce qui est nécessaire à son fonctionnement : ta session de connexion et tes préférences d\'affichage.',
        },
        {
          title: 'À valider avant ouverture au public',
          body: 'Le contenu exact (liste des éléments stockés, durée, base légale) doit être vérifié sur les sources officielles (CNIL) et complété avant toute ouverture au public ou tout ajout d\'un service tiers (paiement, mesure d\'audience…).',
        },
      ]}
    />
  );
}
