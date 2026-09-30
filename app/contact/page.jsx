import LegalPage from '../components/LegalPage';
import { SITE_INFO, val } from '../lib/siteInfo';

export const metadata = { title: 'Contact — InvestKit' };

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact et support"
      updated="2026-09-28"
      sections={[
        {
          title: 'Nous écrire',
          body: SITE_INFO.contactEmail
            ? <a href={`mailto:${SITE_INFO.contactEmail}`}>{SITE_INFO.contactEmail}</a>
            : `E-mail : ${val(null)}`,
        },
        {
          title: 'Discord',
          body: SITE_INFO.discordUrl
            ? <a href={SITE_INFO.discordUrl} target="_blank" rel="noopener noreferrer">Rejoindre le Discord</a>
            : `Lien d'invitation : ${val(null)}`,
        },
      ]}
    />
  );
}
