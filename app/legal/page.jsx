import LegalPage from '../components/LegalPage';
import { SITE_INFO, val } from '../lib/siteInfo';

export const metadata = { title: 'Mentions légales — InvestKit' };

export default function LegalNoticePage() {
  return (
    <LegalPage
      title="Mentions légales"
      updated="2026-09-28"
      sections={[
        {
          title: 'Éditeur du site',
          body: (
            <ul>
              <li>Nom : {val(SITE_INFO.publisherName)}</li>
              <li>Statut : {val(SITE_INFO.publisherStatus)}</li>
              <li>Responsable de la publication : {val(SITE_INFO.publicationDirector)}</li>
              <li>Contact : {val(SITE_INFO.contactEmail)}</li>
            </ul>
          ),
        },
        {
          title: 'Hébergement',
          body: (
            <ul>
              <li>Hébergeur : {val(SITE_INFO.hostName)}</li>
              <li>Adresse / contact : {val(SITE_INFO.hostAddress)}</li>
            </ul>
          ),
        },
        {
          title: 'Nature du service',
          body: 'InvestKit propose des outils de simulation et d\'éducation à l\'investissement. Les données et les cours utilisés sont simplifiés ou fictifs ; rien sur ce site ne constitue un conseil en investissement ni une incitation à investir.',
        },
      ]}
    />
  );
}
