'use client';

import { SITE_INFO } from '../lib/siteInfo';
import TestPhaseNotice from '../components/TestPhaseNotice';
import PublicShell from '@/app/components/landing/PublicShell';

export default function ConditionsPage() {
  return (
    <PublicShell>
    <div style={{ padding: 'clamp(24px, 6vw, 48px) clamp(16px, 4vw, 24px)' }}>
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .conditions-container {
          animation: slideInUp 0.6s ease-out;
        }
      `}</style>

      <div className="conditions-container" style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'var(--ik-surface-card)',
        borderRadius: '28px',
        padding: 'clamp(30px, 6vw, 48px) clamp(20px, 5vw, 40px)',
        boxShadow: 'var(--ik-shadow-card)',
        border: '1px solid var(--ik-border)',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: 'clamp(24px, 7vw, 36px)',
            fontWeight: '800',
            background: 'linear-gradient(135deg, var(--ik-text) 0%, var(--ik-primary) 50%, var(--ik-orchid) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: '0 0 12px 0',
          }}>
            ⚖️ Conditions d'Utilisation
          </h1>
          <p style={{
            fontSize: '13px',
            color: 'var(--ik-text-3)',
            margin: 0,
            fontWeight: '500',
          }}>
            Dernière mise à jour : 2026-09-19
          </p>
        </div>

        <TestPhaseNotice />

        {/* Content Sections */}
        {[
          {
            title: '1. Acceptation des Conditions',
            content: 'En accédant et en utilisant InvestKit, vous acceptez d\'être lié par ces conditions d\'utilisation. Si vous n\'acceptez pas ces conditions, veuillez ne pas utiliser ce service.',
          },
          {
            title: '2. Licence d\'Utilisation',
            content: 'InvestKit vous accorde une licence limitée, non-exclusive et révocable pour utiliser ce service à des fins personnelles et non-commerciales.',
          },
          {
            title: '3. Restrictions d\'Utilisation',
            content: 'Vous ne pouvez pas :',
            list: [
              'Utiliser le service de manière illégale ou non autorisée',
              'Modifier, adapter ou hacker le service',
              'Vendre, louer ou transférer l\'accès au service',
              'Héberger, afficher, uploader ou télécharger le contenu sans permission',
              'Utiliser des outils automatisés ou des scripts',
            ],
          },
          {
            title: '4. Contenu Utilisateur',
            content: 'Vous êtes responsable de tout contenu que vous fournissez ou téléchargez. Vous accordez à InvestKit le droit d\'utiliser ce contenu pour améliorer le service.',
          },
          {
            title: '5. Disclaimer',
            content: 'InvestKit fournit des outils de simulation et d\'éducation à titre informatif uniquement. Les informations ne constituent pas des conseils financiers professionnels. Consultez toujours un professionnel avant de prendre des décisions d\'investissement.',
          },
          {
            title: '6. Limitation de Responsabilité',
            content: 'InvestKit et ses propriétaires ne seront pas responsables des dommages indirects, accidentels ou consécutifs résultant de votre utilisation du service.',
          },
          {
            title: '7. Modifications',
            content: 'InvestKit se réserve le droit de modifier ces conditions à tout moment. Les modifications seront effectives dès leur publication.',
          },
          {
            title: '8. Contact',
            content: 'Pour toute question concernant ces conditions, veuillez nous contacter à :',
            email: SITE_INFO.contactEmail || '[adresse à compléter]',
          },
        ].map((section, idx) => (
          <section key={idx} style={{
            marginBottom: '28px',
            paddingBottom: '28px',
            borderBottom: idx < 7 ? '1px solid color-mix(in srgb, var(--ik-primary) 10%, transparent)' : 'none',
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: 'var(--ik-text)',
              margin: '0 0 12px 0',
              background: 'linear-gradient(135deg, var(--ik-text) 0%, var(--ik-primary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {section.title}
            </h2>
            <p style={{
              fontSize: '14px',
              color: 'var(--ik-text-2)',
              margin: '0 0 12px 0',
              lineHeight: '1.6',
            }}>
              {section.content}
            </p>

            {section.list && (
              <ul style={{
                marginLeft: '20px',
                marginTop: '12px',
                marginBottom: 0,
              }}>
                {section.list.map((item, i) => (
                  <li key={i} style={{
                    fontSize: '13px',
                    color: 'var(--ik-text-2)',
                    marginBottom: '8px',
                    lineHeight: '1.5',
                  }}>
                    {item}
                  </li>
                ))}
              </ul>
            )}

            {section.email && (
              <p style={{
                fontSize: '14px',
                color: 'var(--ik-text-2)',
                margin: '12px 0 0 0',
              }}>
                <a href={section.email.includes('@') ? `mailto:${section.email}` : undefined} style={{
                  color: 'var(--ik-accent)',
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.color = 'var(--ik-orchid)'}
                onMouseLeave={(e) => e.target.style.color = 'var(--ik-primary)'}
                >
                  {section.email}
                </a>
              </p>
            )}
          </section>
        ))}

        {/* Back Link */}
        <div style={{
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '1px solid color-mix(in srgb, var(--ik-primary) 10%, transparent)',
        }}>
          <a href="/signup" style={{
            fontSize: '13px',
            color: 'var(--ik-accent)',
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'all 0.2s',
            display: 'inline-block',
          }}
          onMouseEnter={(e) => {
            e.target.style.color = 'var(--ik-orchid)';
            e.target.style.transform = 'translateX(-4px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.color = 'var(--ik-primary)';
            e.target.style.transform = 'translateX(0)';
          }}
          >
            ← Retour à l'inscription
          </a>
        </div>
      </div>
    </div>
    </PublicShell>
  );
}
