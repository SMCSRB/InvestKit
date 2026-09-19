'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [hoveredCard, setHoveredCard] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setIsAuthenticated(!!token);
  }, []);

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

        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes floatUp {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        body {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%);
          color: #1e293b;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        a {
          text-decoration: none;
        }

        .feature-card-premium {
          position: relative;
          overflow: hidden;
        }

        .feature-card-premium::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          transition: left 0.5s;
        }

        .feature-card-premium:hover::before {
          left: 100%;
        }
      `}</style>

      {/* HEADER/NAV */}
      <header style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
      }}>
        <nav style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '20px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Link href="/" style={{
            fontSize: '24px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            💎 InvestKit
          </Link>
          <div style={{
            display: 'flex',
            gap: '32px',
            alignItems: 'center',
          }}>
            <Link href="/" style={{
              fontSize: '14px',
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.7)',
              transition: 'all 0.2s',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.target.style.color = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.target.style.color = 'rgba(255, 255, 255, 0.7)';
            }}
            >
              Accueil
            </Link>
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
            <Link href="/pricing" style={{
              fontSize: '14px',
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.7)',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
            onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}
            >
              Tarifs
            </Link>
            <div style={{ width: '1px', height: '20px', background: 'rgba(59, 130, 246, 0.2)' }} />

            {isAuthenticated ? (
              <>
                <Link href="/dashboard" style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'rgba(255, 255, 255, 0.7)',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
                onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}
                >
                  📊 Dashboard
                </Link>
                <button onClick={() => {
                  localStorage.removeItem('token');
                  setIsAuthenticated(false);
                  router.push('/');
                }} style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'rgba(255, 255, 255, 0.7)',
                  transition: 'color 0.2s',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
                onMouseEnter={(e) => e.target.style.color = '#ec4899'}
                onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
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
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.3)';
                }}
                >
                  S'inscrire
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* HERO SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)',
        minHeight: '95vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 40px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decorative elements */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '-5%',
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-15%',
          left: '-10%',
          width: '700px',
          height: '700px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: '50%',
          right: '10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />

        <div style={{
          maxWidth: '1000px',
          position: 'relative',
          zIndex: 10,
          animation: 'slideInUp 0.8s ease-out',
        }}>
          {/* Premium Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '50px',
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#3b82f6',
            marginBottom: '24px',
            marginLeft: '50%',
            transform: 'translateX(-50%)',
            backdropFilter: 'blur(10px)',
          }}>
            <span style={{ fontSize: '16px' }}>⭐</span>
            Plateforme de référence pour l'investissement intelligent
          </div>

          <h1 style={{
            fontSize: '72px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #bfdbfe 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: '0 0 20px 0',
            lineHeight: '1.15',
            textAlign: 'center',
          }}>
            Maîtrisez Votre <br /> Destinée Financière
          </h1>

          <p style={{
            fontSize: '20px',
            color: 'rgba(255, 255, 255, 0.8)',
            margin: '0 0 40px 0',
            lineHeight: '1.7',
            textAlign: 'center',
            maxWidth: '700px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            Accédez aux outils professionnels d'investissement, analysez vos risques en temps réel,
            et progressez avec notre académie gamifiée. Tout cela sur une seule plateforme.
          </p>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '60px',
          }}>
            <Link href="/signup" style={{
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
              color: 'white',
              borderRadius: '14px',
              fontSize: '16px',
              fontWeight: '700',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 12px 40px rgba(59, 130, 246, 0.4)',
              display: 'inline-block',
              letterSpacing: '0.3px',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-6px)';
              e.target.style.boxShadow = '0 18px 50px rgba(59, 130, 246, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 12px 40px rgba(59, 130, 246, 0.4)';
            }}
            >
              🚀 Commencer Gratuitement
            </Link>
            <Link href="/outils" style={{
              padding: '16px 32px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              borderRadius: '14px',
              fontSize: '16px',
              fontWeight: '700',
              transition: 'all 0.3s',
              backdropFilter: 'blur(10px)',
              display: 'inline-block',
              letterSpacing: '0.3px',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(59, 130, 246, 0.15)';
              e.target.style.borderColor = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            >
              📊 Voir les Outils
            </Link>
          </div>

          {/* Trust Indicators */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '40px',
            textAlign: 'center',
            flexWrap: 'wrap',
            paddingTop: '40px',
            borderTop: '1px solid rgba(59, 130, 246, 0.1)',
          }}>
            <div>
              <div style={{
                fontSize: '28px',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #3b82f6 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                10K+
              </div>
              <div style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.6)',
                fontWeight: '500',
                marginTop: '4px',
              }}>
                Investisseurs actifs
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '28px',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #3b82f6 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                50+
              </div>
              <div style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.6)',
                fontWeight: '500',
                marginTop: '4px',
              }}>
                Simulateurs avancés
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '28px',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #3b82f6 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                99.9%
              </div>
              <div style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.6)',
                fontWeight: '500',
                marginTop: '4px',
              }}>
                Uptime garanti
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)',
        padding: '100px 40px',
        position: 'relative',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{
              fontSize: '48px',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: '0 0 16px 0',
            }}>
              Des Outils Professionnels <br /> à Votre Portée
            </h2>
            <p style={{
              fontSize: '18px',
              color: 'rgba(255, 255, 255, 0.7)',
              margin: 0,
              maxWidth: '600px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              Conçus pour les investisseurs sérieux et les débutants curieux
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '28px',
          }}>
            {[
              {
                icon: '📊',
                title: 'Simulateurs Avancés',
                desc: 'Simulez vos investissements en immobilier, crypto, bourse et bien d\'autres marchés avec des calculs professionnels.',
                features: ['Tous les marchés', 'Calculs précis', 'Exportable']
              },
              {
                icon: '🛡️',
                title: 'Analyse de Risque',
                desc: 'Identifiez et évaluez les risques de vos projets d\'investissement automatiquement avec notre moteur IA.',
                features: ['Analyse IA', 'Recommandations', 'Optimisation']
              },
              {
                icon: '🎓',
                title: 'Académie Gamifiée',
                desc: 'Apprenez l\'investissement à votre rythme avec des cours interactifs, quizzes et système de niveaux.',
                features: ['Cours structurés', 'Quiz interactifs', 'Certificats']
              },
              {
                icon: '📈',
                title: 'Données Temps Réel',
                desc: 'Accédez à des données financières actualisées en continu et des analyses d\'experts.',
                features: ['Mises à jour live', 'Analyses pro', 'Alertes']
              },
              {
                icon: '💼',
                title: 'Portfolio Tracker',
                desc: 'Suivisez tous vos investissements en un seul endroit avec tableaux de bord intuitifs.',
                features: ['Vue d\'ensemble', 'Statistiques', 'Rapports']
              },
              {
                icon: '🤖',
                title: 'Conseils Intelligents',
                desc: 'Obtenez des recommandations personnalisées basées sur votre profil et vos objectifs.',
                features: ['Recommandations', 'Personnalisées', 'Stratégies']
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="feature-card-premium"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '24px',
                  padding: '40px 32px',
                  backdropFilter: 'blur(15px)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.18) 0%, rgba(139, 92, 246, 0.12) 100%)';
                  e.currentTarget.style.transform = 'translateY(-12px)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                  e.currentTarget.style.boxShadow = '0 20px 60px rgba(59, 130, 246, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.25)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  fontSize: '52px',
                  marginBottom: '20px',
                }}>
                  {feature.icon}
                </div>
                <h3 style={{
                  fontSize: '22px',
                  fontWeight: '800',
                  color: 'white',
                  margin: '0 0 12px 0',
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.75)',
                  margin: '0 0 20px 0',
                  lineHeight: '1.7',
                }}>
                  {feature.desc}
                </p>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}>
                  {feature.features.map((f, i) => (
                    <span key={i} style={{
                      fontSize: '11px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      color: '#93c5fd',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontWeight: '600',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                    }}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)',
        padding: '80px 40px',
        borderTop: '1px solid rgba(59, 130, 246, 0.15)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '36px',
            fontWeight: '800',
            textAlign: 'center',
            color: 'white',
            margin: '0 0 60px 0',
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Confiance des Investisseurs
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '40px',
            textAlign: 'center',
          }}>
            {[
              { number: '10,000+', label: 'Investisseurs actifs', icon: '👥' },
              { number: '₹ 500M+', label: 'Simulés annuellement', icon: '💰' },
              { number: '99.9%', label: 'Disponibilité garantie', icon: '✓' },
              { number: '24/7', label: 'Support en français', icon: '🎧' },
            ].map((stat, idx) => (
              <div key={idx} style={{
                animation: `slideInUp 0.6s ease-out ${idx * 0.1}s both`,
              }}>
                <div style={{
                  fontSize: '48px',
                  marginBottom: '12px',
                }}>
                  {stat.icon}
                </div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: '900',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  margin: '0 0 8px 0',
                }}>
                  {stat.number}
                </div>
                <div style={{
                  fontSize: '15px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: '600',
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
        padding: '120px 40px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background elements */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          <div style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '50px',
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#3b82f6',
            marginBottom: '24px',
            backdropFilter: 'blur(10px)',
          }}>
            ⏰ Offre spéciale: Essai gratuit sans limite de temps
          </div>

          <h2 style={{
            fontSize: '52px',
            fontWeight: '900',
            color: 'white',
            margin: '0 0 20px 0',
            lineHeight: '1.2',
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Prêt à Transformer <br /> Votre Stratégie ?
          </h2>

          <p style={{
            fontSize: '18px',
            color: 'rgba(255, 255, 255, 0.8)',
            margin: '0 0 40px 0',
            lineHeight: '1.8',
            maxWidth: '650px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            Rejoignez des milliers d'investisseurs qui optimisent déjà leurs stratégies.
            Accès gratuit à tous nos outils. Aucune carte bancaire, aucun engagement.
          </p>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '40px',
          }}>
            <Link href="/signup" style={{
              display: 'inline-block',
              padding: '16px 36px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
              color: 'white',
              borderRadius: '14px',
              fontSize: '16px',
              fontWeight: '700',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 14px 45px rgba(59, 130, 246, 0.4)',
              letterSpacing: '0.3px',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-6px)';
              e.target.style.boxShadow = '0 20px 60px rgba(59, 130, 246, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 14px 45px rgba(59, 130, 246, 0.4)';
            }}
            >
              🚀 Commencer Gratuitement
            </Link>
            <Link href="/demo" style={{
              display: 'inline-block',
              padding: '16px 36px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              borderRadius: '14px',
              fontSize: '16px',
              fontWeight: '700',
              transition: 'all 0.3s',
              backdropFilter: 'blur(10px)',
              letterSpacing: '0.3px',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(59, 130, 246, 0.15)';
              e.target.style.borderColor = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            >
              📹 Voir la Démo
            </Link>
          </div>

          {/* Trust info */}
          <p style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.6)',
            margin: 0,
          }}>
            ✓ Inscription en moins d'1 minute • ✓ Aucune donnée bancaire • ✓ Annulable à tout moment
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
        borderTop: '1px solid rgba(59, 130, 246, 0.15)',
        padding: '80px 40px 40px',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Main Footer Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '50px',
            marginBottom: '60px',
          }}>
            {/* Brand Column */}
            <div style={{ gridColumn: 'auto' }}>
              <div style={{
                fontSize: '24px',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '12px',
              }}>
                💎 InvestKit
              </div>
              <p style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.6)',
                margin: '0 0 16px 0',
                lineHeight: '1.6',
              }}>
                La plateforme complète pour maîtriser votre investissement.
              </p>
              <div style={{
                display: 'flex',
                gap: '12px',
              }}>
                {['f', 'tw', 'li', 'ig'].map((icon, i) => (
                  <a key={i} href="#" style={{
                    width: '36px',
                    height: '36px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3b82f6',
                    fontSize: '16px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(59, 130, 246, 0.2)';
                    e.target.style.borderColor = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(59, 130, 246, 0.1)';
                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                  }}
                  >
                    {'ftwliig'[i]}
                  </a>
                ))}
              </div>
            </div>

            {/* Footer Links */}
            {[
              {
                title: 'Produit',
                links: [
                  { name: 'Simulateurs', href: '/outils' },
                  { name: 'Analyse de Risque', href: '/outils' },
                  { name: 'Portfolio', href: '/outils' },
                  { name: 'Tarifs', href: '/pricing' },
                ]
              },
              {
                title: 'Ressources',
                links: [
                  { name: 'Académie', href: '/education' },
                  { name: 'Guide de Démarrage', href: '/guides' },
                  { name: 'FAQ', href: '/faq' },
                  { name: 'Glossaire', href: '/glossaire' },
                ]
              },
              {
                title: 'Entreprise',
                links: [
                  { name: 'À Propos', href: '/about' },
                  { name: 'Support', href: '/support' },
                  { name: 'Carrières', href: '/careers' },
                  { name: 'Contact', href: '/contact' },
                ]
              },
              {
                title: 'Légal',
                links: [
                  { name: 'Conditions', href: '/conditions' },
                  { name: 'Confidentialité', href: '/privacy' },
                  { name: 'Cookies', href: '/cookies' },
                  { name: 'Mentions Légales', href: '/legal' },
                ]
              },
            ].map((col, idx) => (
              <div key={idx}>
                <h4 style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: 'white',
                  margin: '0 0 20px 0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  opacity: 0.9,
                }}>
                  {col.title}
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {col.links.map((link, i) => (
                    <li key={i} style={{ marginBottom: '12px' }}>
                      <Link href={link.href} style={{
                        fontSize: '13px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        transition: 'all 0.2s',
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
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Footer Bottom */}
          <div style={{
            borderTop: '1px solid rgba(59, 130, 246, 0.15)',
            paddingTop: '32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
          }}>
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.5)',
            }}>
              © 2026 InvestKit. Tous droits réservés. | Développé avec 💚 pour les investisseurs
            </p>
            <div style={{
              display: 'flex',
              gap: '24px',
              fontSize: '12px',
            }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>🔒 Sécurisé SSL</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>✓ Conforme RGPD</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>🌍 Multi-langue</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
