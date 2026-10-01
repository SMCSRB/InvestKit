'use client';

import { SITE_INFO } from '../lib/siteInfo';
import TestPhaseNotice from '../components/TestPhaseNotice';
import PublicShell from '@/app/components/landing/PublicShell';

export default function PrivacyPage() {
  return (
    <PublicShell>
    <div style={{ padding: 'clamp(24px, 6vw, 48px) clamp(16px, 4vw, 24px)' }}>
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .privacy-container {
          animation: slideInUp 0.6s ease-out;
        }
      `}</style>

      <div className="privacy-container" style={{
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
            🔒 Politique de Confidentialité
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
            title: '1. Introduction',
            content: 'InvestKit ("nous", "notre" ou "nos") s\'engage à protéger votre vie privée. Cette politique explique comment nous collectons, utilisons et protégeons vos données personnelles.',
            list: null,
          },
          {
            title: '2. Données Collectées',
            content: 'Nous collectons les informations suivantes :',
            list: [
              { label: 'Informations d\'inscription :', text: 'Email, nom, prénom, mot de passe' },
              { label: 'Données de profil :', text: 'Préférences, historique d\'utilisation, projets d\'investissement' },
              { label: 'Données techniques :', text: 'Adresse IP, type de navigateur, pages visitées, durée des sessions' },
              { label: 'Données de paiement :', text: 'Informations de transaction (traitées de manière sécurisée)' },
            ],
          },
          {
            title: '3. Utilisation des Données',
            content: 'Nous utilisons vos données pour :',
            list: [
              { text: 'Créer et gérer votre compte' },
              { text: 'Fournir et améliorer nos services' },
              { text: 'Communiquer avec vous concernant votre compte et les mises à jour' },
              { text: 'Analyser l\'utilisation et améliorer l\'expérience utilisateur' },
              { text: 'Respecter nos obligations légales' },
            ],
          },
          {
            title: '4. Protection des Données',
            content: 'Nous utilisons le chiffrement SSL/TLS pour protéger vos données en transit. Vos mots de passe sont hashés avec bcrypt. Nous ne partageons jamais vos données sensibles avec des tiers sans votre consentement explicite.',
            list: null,
          },
          {
            title: '5. Cookies et Suivi',
            content: 'Nous utilisons les cookies pour :',
            list: [
              { text: 'Maintenir votre session authentifiée' },
              { text: 'Mémoriser vos préférences' },
              { text: 'Analyser le trafic du site (outils anonymisés)' },
            ],
            footer: 'Vous pouvez désactiver les cookies dans les paramètres de votre navigateur.',
          },
          {
            title: '6. Vos Droits',
            content: 'Vous avez le droit de :',
            list: [
              { text: 'Accéder à vos données personnelles (export JSON depuis la page « Mes données »)' },
              { text: 'Rectifier les informations inexactes' },
              { text: 'Supprimer votre compte et vos données immédiatement, depuis la page « Mes données » (/mes-donnees)' },
              { text: 'Vous opposer au traitement de vos données' },
              { text: 'Récupérer vos données dans un format portable (JSON) depuis /mes-donnees' },
            ],
          },
          {
            title: '7. Partage de Données',
            content: 'Nous ne vendons jamais vos données. Nous partageons vos informations uniquement avec :',
            list: [
              { text: 'Les prestataires de services (hébergement, email, paiement) sous contrats stricts' },
              { text: 'Les autorités légales si requis par la loi' },
              { text: 'Vos contacts si vous le demandez explicitement' },
            ],
          },
          {
            title: '8. Conservation des Données',
            content: 'Nous conservons vos données aussi longtemps que votre compte est actif. La suppression du compte est immédiate et définitive : vos données sont effacées et le journal de sécurité est anonymisé. Les obligations légales de conservation (par exemple la facturation d’un abonnement) restent réservées.',
            list: null,
          },
          {
            title: '9. Modifications',
            content: 'Nous pouvons modifier cette politique de confidentialité. Les modifications seront publiées ici et nous vous notifierons des changements majeurs par email.',
            list: null,
          },
          {
            title: '10. Contact',
            content: 'Pour toute question concernant cette politique ou vos données, contactez-nous à :',
            list: null,
            email: SITE_INFO.contactEmail || '[adresse à compléter]',
          },
        ].map((section, idx) => (
          <section key={idx} style={{
            marginBottom: '28px',
            paddingBottom: '28px',
            borderBottom: idx < 9 ? '1px solid color-mix(in srgb, var(--ik-primary) 10%, transparent)' : 'none',
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
                    {item.label ? (
                      <>
                        <strong style={{ color: 'var(--ik-text)' }}>{item.label}</strong> {item.text}
                      </>
                    ) : (
                      item.text
                    )}
                  </li>
                ))}
              </ul>
            )}

            {section.footer && (
              <p style={{
                fontSize: '13px',
                color: 'var(--ik-text-2)',
                margin: '12px 0 0 0',
                lineHeight: '1.5',
              }}>
                {section.footer}
              </p>
            )}

            {section.email && (
              <p style={{
                fontSize: '14px',
                color: 'var(--ik-text-2)',
                margin: '12px 0 0 0',
              }}>
                Email: <a href={section.email.includes('@') ? `mailto:${section.email}` : undefined} style={{
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
