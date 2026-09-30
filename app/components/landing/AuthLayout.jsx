import PublicShell from './PublicShell';

// Mise en page des écrans de compte (connexion, inscription, vérification, mot de passe oublié) : carte centrée dans l'habillage public.
export default function AuthLayout({ children, footer = false, wide = false }) {
  return (
    <PublicShell footer={footer}>
      <div className="lp-wrap lp-auth">
        <div className={`ik-card ik-card--glow lp-auth__card ik-page-enter ${wide ? 'lp-auth__card--wide' : ''}`.trim()}>
          {children}
        </div>
      </div>
    </PublicShell>
  );
}

export function AuthHeader({ title, subtitle, icon }) {
  return (
    <div className="lp-auth__head">
      {icon}
      <h1>{title}</h1>
      {subtitle && <p className="ik-muted">{subtitle}</p>}
    </div>
  );
}
