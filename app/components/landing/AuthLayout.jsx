import PublicShell from './PublicShell';

// Mise en page des écrans de compte (connexion, inscription, vérification, mot de passe oublié) : carte centrée dans l'habillage public.
export default function AuthLayout({ children, footer = false, wide = false }) {
  return (
    <PublicShell footer={footer}>
      <div className="lp-wrap lp-auth">
        <div className="ik-card ik-card--glow lp-auth__card ik-page-enter" style={wide ? { width: 'min(520px, 100%)' } : undefined}>
          {children}
        </div>
      </div>
    </PublicShell>
  );
}

export function AuthHeader({ title, subtitle, icon }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 22 }}>
      {icon}
      <h1 style={{ margin: '0 0 6px', fontSize: 'var(--ik-fs-xl)', letterSpacing: '-0.02em' }}>{title}</h1>
      {subtitle && <p className="ik-muted" style={{ margin: 0, fontSize: 'var(--ik-fs-base)' }}>{subtitle}</p>}
    </div>
  );
}
