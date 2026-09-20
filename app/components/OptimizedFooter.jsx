'use client';

import Link from 'next/link';

export default function OptimizedFooter() {
  return (
    <footer
      style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
        borderTop: '1px solid rgba(59, 130, 246, 0.15)',
        backdropFilter: 'blur(20px)',
        marginTop: '80px',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '60px 40px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '40px',
          marginBottom: '40px',
        }}
      >
        {/* Brand Column */}
        <div>
          <h3
            style={{
              fontSize: '24px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '16px',
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            💎 InvestKit
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.6)',
              lineHeight: '1.6',
              margin: 0,
            }}
          >
            La plateforme premium pour investir intelligemment avec des outils professionnels et une éducation financière complète.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4
            style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#3b82f6',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '16px',
            }}
          >
            Navigation
          </h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            {[
              { href: '/', label: 'Accueil' },
              { href: '/dashboard', label: 'Dashboard' },
              { href: '/education', label: 'Éducation' },
              { href: '/pricing', label: 'Tarifs' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  textDecoration: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#3b82f6';
                  e.target.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = 'rgba(255, 255, 255, 0.6)';
                  e.target.style.transform = 'translateX(0)';
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div>
          <h4
            style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#3b82f6',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '16px',
            }}
          >
            Ressources
          </h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            {[
              { href: '/privacy', label: 'Politique de Confidentialité' },
              { href: '/conditions', label: 'Conditions d\'Utilisation' },
              { href: '#contact', label: 'Contact' },
              { href: '#blog', label: 'Blog' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  textDecoration: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#3b82f6';
                  e.target.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = 'rgba(255, 255, 255, 0.6)';
                  e.target.style.transform = 'translateX(0)';
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Social */}
        <div>
          <h4
            style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#3b82f6',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '16px',
            }}
          >
            Suivez-Nous
          </h4>
          <div style={{ display: 'flex', gap: '12px' }}>
            {[
              { icon: '𝕏', label: 'Twitter' },
              { icon: 'f', label: 'Facebook' },
              { icon: 'in', label: 'LinkedIn' },
              { icon: '📷', label: 'Instagram' },
            ].map((social) => (
              <a
                key={social.label}
                href="#"
                title={social.label}
                style={{
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '8px',
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontSize: '18px',
                  fontWeight: '600',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#3b82f6';
                  e.target.style.color = 'white';
                  e.target.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(59, 130, 246, 0.1)';
                  e.target.style.color = '#3b82f6';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        style={{
          borderTop: '1px solid rgba(59, 130, 246, 0.1)',
          padding: '20px 40px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        <p style={{ margin: 0 }}>
          © 2026 InvestKit. Tous droits réservés. | Plateforme premium d'investissement intelligent
        </p>
      </div>
    </footer>
  );
}
