import Link from 'next/link';
import Logo from '@/app/components/ui/Logo';
import { SITE_INFO } from '@/app/lib/siteInfo';

// Pied de page des pages publiques : liens légaux, aide, Discord seulement si le lien est renseigné.
export default function PublicFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap">
        <div className="lp-footer__grid">
          <div>
            <Logo size={34} />
            <p style={{ margin: '14px 0 0', maxWidth: '36ch', fontSize: 'var(--ik-fs-sm)', lineHeight: 1.6 }}>
              Simulateur d&apos;investissement et parcours d&apos;éducation financière. Les InvestCoins sont une monnaie virtuelle : aucun argent réel n&apos;est en jeu.
            </p>
          </div>
          <div>
            <h4>Découvrir</h4>
            <ul>
              <li><Link href="/#domaines">Domaines</Link></li>
              <li><Link href="/#fonctionnalites">Fonctionnalités</Link></li>
              <li><Link href="/education">Éducation</Link></li>
              <li><Link href="/glossaire">Glossaire</Link></li>
              <li><Link href="/changelog">Nouveautés</Link></li>
            </ul>
          </div>
          <div>
            <h4>Aide</h4>
            <ul>
              <li><Link href="/#faq">Questions fréquentes</Link></li>
              <li><Link href="/support">Aide et support</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              {SITE_INFO.discordUrl && <li><a href={SITE_INFO.discordUrl} target="_blank" rel="noopener noreferrer">Discord</a></li>}
            </ul>
          </div>
          <div>
            <h4>Légal</h4>
            <ul>
              <li><Link href="/legal">Mentions légales</Link></li>
              <li><Link href="/privacy">Confidentialité</Link></li>
              <li><Link href="/conditions">Conditions d&apos;utilisation</Link></li>
              <li><Link href="/cookies">Cookies</Link></li>
            </ul>
          </div>
        </div>
        <p className="lp-footer__legal">
          InvestKit est un outil pédagogique de simulation. Il ne fournit aucun conseil en investissement et ne propose aucun produit financier réel.
          Les performances simulées ne préjugent en rien des performances réelles ; investir comporte un risque de perte en capital.
        </p>
      </div>
    </footer>
  );
}
