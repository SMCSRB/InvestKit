'use client';

export default function ConditionsPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)',
      padding: '40px 24px 60px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    }}>
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
        background: 'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.97) 100%)',
        borderRadius: '28px',
        padding: '48px 40px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25), 0 0 120px rgba(59, 130, 246, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #0f172a 0%, #3b82f6 50%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: '0 0 12px 0',
          }}>
            ⚖️ Conditions d'Utilisation
          </h1>
          <p style={{
            fontSize: '13px',
            color: '#64748b',
            margin: 0,
            fontWeight: '500',
          }}>
            Dernière mise à jour : 2026-09-19
          </p>
        </div>

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
            email: 'contact@investkit.com',
          },
        ].map((section, idx) => (
          <section key={idx} style={{
            marginBottom: '28px',
            paddingBottom: '28px',
            borderBottom: idx < 7 ? '1px solid rgba(59, 130, 246, 0.1)' : 'none',
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#0f172a',
              margin: '0 0 12px 0',
              background: 'linear-gradient(135deg, #0f172a 0%, #3b82f6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {section.title}
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#475569',
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
                    color: '#475569',
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
                color: '#475569',
                margin: '12px 0 0 0',
              }}>
                <a href={`mailto:${section.email}`} style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.color = '#8b5cf6'}
                onMouseLeave={(e) => e.target.style.color = '#3b82f6'}
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
          borderTop: '1px solid rgba(59, 130, 246, 0.1)',
        }}>
          <a href="/signup" style={{
            fontSize: '13px',
            color: '#3b82f6',
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'all 0.2s',
            display: 'inline-block',
          }}
          onMouseEnter={(e) => {
            e.target.style.color = '#8b5cf6';
            e.target.style.transform = 'translateX(-4px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.color = '#3b82f6';
            e.target.style.transform = 'translateX(0)';
          }}
          >
            ← Retour à l'inscription
          </a>
        </div>
      </div>
    </div>
  );
}
