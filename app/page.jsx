'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes floatUp {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        body {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%);
          color: #1e293b;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        a {
          text-decoration: none;
        }
      `}</style>

      {/* HEADER/NAV */}
      <header style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <nav style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{
            fontSize: '20px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            💎 InvestKit
          </div>
          <div style={{
            display: 'flex',
            gap: '24px',
            alignItems: 'center',
          }}>
            <Link href="/outils" style={{
              fontSize: '14px',
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.7)',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
            onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}
            >
              Outils
            </Link>
            <Link href="/education" style={{
              fontSize: '14px',
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.7)',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
            onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}
            >
              Éducation
            </Link>
            <Link href="/login" style={{
              fontSize: '14px',
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.7)',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
            onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}
            >
              Connexion
            </Link>
            <Link href="/signup" style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: 'white',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              S'inscrire
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decorative elements */}
        <div style={{
          position: 'absolute',
          top: '-30%',
          right: '-10%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-20%',
          left: '-5%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />

        <div style={{
          maxWidth: '800px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 10,
          animation: 'slideInUp 0.8s ease-out',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '48px',
            margin: '0 auto 24px',
            boxShadow: '0 20px 60px rgba(59, 130, 246, 0.3)',
            animation: 'floatUp 3s ease-in-out infinite',
          }}>
            📈
          </div>

          <h1 style={{
            fontSize: '56px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: '0 0 16px 0',
            lineHeight: '1.2',
          }}>
            Investissez Intelligemment
          </h1>

          <p style={{
            fontSize: '18px',
            color: 'rgba(255, 255, 255, 0.8)',
            margin: '0 0 32px 0',
            lineHeight: '1.6',
          }}>
            Simulateurs pro • Analyses de risque • Éducation gamifiée <br />
            Tout ce qu'il vous faut pour maîtriser l'investissement
          </p>

          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <Link href="/outils" style={{
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
              color: 'white',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: '600',
              transition: 'all 0.3s',
              boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
              display: 'inline-block',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-4px)';
              e.target.style.boxShadow = '0 15px 40px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.3)';
            }}
            >
              🚀 Essayer les Outils
            </Link>
            <Link href="/education" style={{
              padding: '14px 28px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: '600',
              transition: 'all 0.3s',
              backdropFilter: 'blur(10px)',
              display: 'inline-block',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(59, 130, 246, 0.2)';
              e.target.style.borderColor = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
            >
              📚 Découvrir
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)',
        padding: '80px 24px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '40px',
            fontWeight: '800',
            textAlign: 'center',
            color: 'white',
            margin: '0 0 60px 0',
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Pourquoi Choisir InvestKit ?
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}>
            {[
              { icon: '💡', title: 'Outils Puissants', desc: 'Simulateurs avancés pour tous les marchés' },
              { icon: '🛡️', title: 'Analyse de Risque', desc: 'Évaluez automatiquement les risques' },
              { icon: '🎓', title: 'Éducation Gamifiée', desc: 'Apprenez à votre rythme avec quiz' },
              { icon: '📊', title: 'Données Temps Réel', desc: 'Analyses basées sur données actualisées' },
            ].map((feature, idx) => (
              <div key={idx} style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '20px',
                padding: '32px 24px',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)';
                e.currentTarget.style.transform = 'translateY(-8px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              >
                <div style={{
                  fontSize: '48px',
                  marginBottom: '16px',
                }}>
                  {feature.icon}
                </div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: 'white',
                  margin: '0 0 12px 0',
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  margin: 0,
                  lineHeight: '1.6',
                }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
        padding: '60px 24px',
        borderTop: '1px solid rgba(59, 130, 246, 0.2)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '32px',
            textAlign: 'center',
          }}>
            {[
              { number: '10K+', label: 'Utilisateurs Actifs' },
              { number: '50+', label: 'Simulateurs' },
              { number: '100%', label: 'Sécurisé' },
              { number: '24/7', label: 'Support' },
            ].map((stat, idx) => (
              <div key={idx}>
                <div style={{
                  fontSize: '42px',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  margin: '0 0 8px 0',
                }}>
                  {stat.number}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: '500',
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)',
        padding: '80px 24px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '40px',
            fontWeight: '800',
            color: 'white',
            margin: '0 0 16px 0',
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Commencez Dès Maintenant
          </h2>
          <p style={{
            fontSize: '16px',
            color: 'rgba(255, 255, 255, 0.8)',
            margin: '0 0 32px 0',
            lineHeight: '1.6',
          }}>
            Rejoignez nos utilisateurs et commencez vos projections gratuitement. Aucune carte bancaire requise.
          </p>
          <Link href="/signup" style={{
            display: 'inline-block',
            padding: '14px 32px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
            color: 'white',
            borderRadius: '14px',
            fontSize: '15px',
            fontWeight: '600',
            transition: 'all 0.3s',
            boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-4px)';
            e.target.style.boxShadow = '0 15px 40px rgba(59, 130, 246, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.3)';
          }}
          >
            🚀 S'inscrire Gratuitement
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
        borderTop: '1px solid rgba(59, 130, 246, 0.1)',
        padding: '60px 24px 24px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '40px',
            marginBottom: '40px',
          }}>
            {[
              {
                title: 'Produit',
                links: [
                  { name: 'Simulateurs', href: '/outils' },
                  { name: 'Glossaire', href: '/glossaire' },
                  { name: 'Tarifs', href: '/pricing' },
                ]
              },
              {
                title: 'Éducation',
                links: [
                  { name: 'Guides', href: '/guides' },
                  { name: 'FAQ', href: '/faq' },
                  { name: 'Support', href: '/support' },
                ]
              },
              {
                title: 'Entreprise',
                links: [
                  { name: 'À Propos', href: '/about' },
                  { name: 'Carrières', href: '/careers' },
                  { name: 'Contact', href: '/contact' },
                ]
              },
              {
                title: 'Légal',
                links: [
                  { name: 'CGU', href: '/terms' },
                  { name: 'Confidentialité', href: '/privacy' },
                  { name: 'Cookies', href: '/cookies' },
                ]
              },
            ].map((col, idx) => (
              <div key={idx}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'white',
                  margin: '0 0 16px 0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {col.title}
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {col.links.map((link, i) => (
                    <li key={i} style={{ marginBottom: '12px' }}>
                      <Link href={link.href} style={{
                        fontSize: '14px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
                      onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.6)'}
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{
            borderTop: '1px solid rgba(59, 130, 246, 0.1)',
            paddingTop: '24px',
            textAlign: 'center',
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.5)',
          }}>
            <p style={{ margin: 0 }}>© 2026 InvestKit. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
