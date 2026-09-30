import PublicFooter from './PublicFooter';
import PublicHeader from './PublicHeader';

// Habillage commun des pages publiques (accueil, connexion, inscription, pages légales).
export default function PublicShell({ children, footer = true }) {
  return (
    <div className="lp">
      <a href="#lp-main" className="ik-skip-link">Aller au contenu</a>
      <PublicHeader />
      <main id="lp-main">{children}</main>
      {footer && <PublicFooter />}
    </div>
  );
}
