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
        padding: 'clamp(30px, 5vw, 60px) clamp(16px, 5vw, 40px)',
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
            fontSize: 'clamp(28px, 8vw, 72px)',
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
            fontSize: 'clamp(14px, 4vw, 20px)',
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
              padding: 'clamp(12px, 3vw, 16px) clamp(24px, 6vw, 32px)',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
              color: 'white',
              borderRadius: '14px',
              fontSize: 'clamp(14px, 3vw, 16px)',
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
              padding: 'clamp(12px, 3vw, 16px) clamp(24px, 6vw, 32px)',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              borderRadius: '14px',
              fontSize: 'clamp(14px, 3vw, 16px)',
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
        padding: 'clamp(40px, 8vw, 100px) clamp(16px, 5vw, 40px)',
        position: 'relative',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{
              fontSize: 'clamp(28px, 7vw, 48px)',
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
                  fontSize: 'clamp(18px, 4vw, 22px)',
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

      {/* LIVE DATA WIDGET SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)',
        padding: 'clamp(40px, 8vw, 100px) clamp(16px, 5vw, 40px)',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{
              fontSize: 'clamp(28px, 7vw, 40px)',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: '0 0 16px 0',
            }}>
              📊 Données Financières en Temps Réel
            </h2>
            <p style={{
              fontSize: 'clamp(14px, 3vw, 16px)',
              color: 'rgba(255, 255, 255, 0.7)',
              margin: 0,
            }}>
              Suivez les marchés et actualités en direct
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
          }}>
            {[
              { symbol: 'CAC 40', value: '7,842.56', change: '+1.24%', color: '#10b981', icon: '📈' },
              { symbol: 'BTC/EUR', value: '€67,432', change: '+3.42%', color: '#10b981', icon: '₿' },
              { symbol: 'ETH/EUR', value: '€3,128', change: '+2.15%', color: '#10b981', icon: '⟠' },
              { symbol: 'Gold', value: '€65.42/g', change: '-0.85%', color: '#ef4444', icon: '🟡' },
            ].map((ticker, idx) => (
              <div key={idx} style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '18px',
                padding: '24px',
                backdropFilter: 'blur(15px)',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.25)';
              }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px',
                }}>
                  <div>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: 'white',
                      marginBottom: '4px',
                    }}>
                      {ticker.symbol}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.6)',
                    }}>
                      Mis à jour maintenant
                    </div>
                  </div>
                  <div style={{ fontSize: '32px' }}>{ticker.icon}</div>
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  color: 'white',
                  marginBottom: '8px',
                }}>
                  {ticker.value}
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: ticker.color,
                }}>
                  {ticker.change}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)',
        padding: 'clamp(40px, 8vw, 100px) clamp(16px, 5vw, 40px)',
        borderTop: '1px solid rgba(59, 130, 246, 0.15)',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{
              fontSize: 'clamp(28px, 7vw, 40px)',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: '0 0 16px 0',
            }}>
              ⭐ Avis de Nos Utilisateurs
            </h2>
            <p style={{
              fontSize: 'clamp(14px, 3vw, 16px)',
              color: 'rgba(255, 255, 255, 0.7)',
              margin: 0,
            }}>
              Ce que disent les investisseurs qui nous font confiance
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '28px',
          }}>
            {[
              {
                name: 'Marie Dubois',
                role: 'Investisseur Immobilier',
                avatar: '👩‍💼',
                rating: 5,
                text: 'InvestKit m\'a permis de simuler et comparer différentes stratégies immobilières. J\'ai économisé 10K€ en frais en optimisant mon portefeuille!',
                gain: '+35% ROI',
              },
              {
                name: 'Pierre Leclerc',
                role: 'Trader Crypto',
                avatar: '👨‍💼',
                rating: 5,
                text: 'Les outils d\'analyse de risque sont incroyablement précis. Mes simulations avant d\'investir m\'ont sauvé d\'énormes pertes.',
                gain: '+52% gains',
              },
              {
                name: 'Sophie Martin',
                role: 'Débutante en Bourse',
                avatar: '👩‍🦰',
                rating: 5,
                text: 'L\'académie gamifiée m\'a appris les bases sans m\'ennuyer. Maintenant je fais mes propres choix d\'investissement avec confiance!',
                gain: '+18% croissance',
              },
            ].map((testimonial, idx) => (
              <div key={idx} style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 250, 252, 0.97) 100%)',
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 60px rgba(59, 130, 246, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.1)';
              }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                  }}>
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div style={{
                      fontWeight: '700',
                      color: '#0f172a',
                      fontSize: '16px',
                    }}>
                      {testimonial.name}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#64748b',
                    }}>
                      {testimonial.role}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '4px',
                  marginBottom: '16px',
                }}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} style={{ fontSize: '18px' }}>⭐</span>
                  ))}
                </div>

                <p style={{
                  fontSize: '14px',
                  color: '#475569',
                  lineHeight: '1.6',
                  margin: '0 0 16px 0',
                }}>
                  "{testimonial.text}"
                </p>

                <div style={{
                  paddingTop: '16px',
                  borderTop: '1px solid #e2e8f0',
                  color: '#10b981',
                  fontWeight: '700',
                  fontSize: '14px',
                }}>
                  {testimonial.gain}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SUCCESS STORIES SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)',
        padding: 'clamp(40px, 8vw, 100px) clamp(16px, 5vw, 40px)',
        borderTop: '1px solid rgba(59, 130, 246, 0.15)',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{
              fontSize: 'clamp(28px, 7vw, 40px)',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: '0 0 16px 0',
            }}>
              🚀 Cas de Succès
            </h2>
            <p style={{
              fontSize: 'clamp(14px, 3vw, 16px)',
              color: 'rgba(255, 255, 255, 0.7)',
              margin: 0,
            }}>
              Comment d'autres investisseurs ont atteint leurs objectifs
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '28px',
          }}>
            {[
              {
                title: 'Diversification Optimale',
                description: 'Jean a utilisé nos simulateurs pour diversifier son portefeuille entre immobilier, crypto et bourse.',
                before: 'Portefeuille concentré, rendement 4%',
                after: 'Portefeuille diversifié, rendement 12%',
                timeframe: '6 mois',
                icon: '📊',
              },
              {
                title: 'Réduction des Risques',
                description: 'Sophie a appris à identifier et minimiser les risques grâce à notre moteur d\'analyse IA.',
                before: 'Perte potentielle: €25K',
                after: 'Perte potentielle: €8K',
                timeframe: '3 mois',
                icon: '🛡️',
              },
              {
                title: 'Accélération Crypto',
                description: 'Thomas a maîtrisé la stratégie DCA via nos outils et nos cours avant d\'investir.',
                before: 'Débutant, peur d\'investir',
                after: '+€45K en gains validés',
                timeframe: '12 mois',
                icon: '₿',
              },
            ].map((story, idx) => (
              <div key={idx} style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '20px',
                padding: '36px',
                backdropFilter: 'blur(15px)',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-10px)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.25)';
              }}
              >
                <div style={{
                  fontSize: '48px',
                  marginBottom: '16px',
                }}>
                  {story.icon}
                </div>
                <h3 style={{
                  fontSize: 'clamp(18px, 4vw, 22px)',
                  fontWeight: '800',
                  color: 'white',
                  margin: '0 0 12px 0',
                }}>
                  {story.title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  margin: '0 0 20px 0',
                  lineHeight: '1.6',
                }}>
                  {story.description}
                </p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: '16px',
                  alignItems: 'center',
                  marginBottom: '20px',
                  padding: '16px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '12px',
                }}>
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.6)',
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>Avant</div>
                    {story.before}
                  </div>
                  <div style={{
                    fontSize: '20px',
                    color: '#3b82f6',
                  }}>
                    →
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#10b981',
                    fontWeight: '600',
                  }}>
                    <div style={{ marginBottom: '4px' }}>Après</div>
                    {story.after}
                  </div>
                </div>

                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontWeight: '600',
                }}>
                  ⏱️ {story.timeframe}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTERACTIVE DEMO SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)',
        padding: 'clamp(40px, 8vw, 100px) clamp(16px, 5vw, 40px)',
        borderTop: '1px solid rgba(59, 130, 246, 0.15)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'clamp(30px, 5vw, 60px)',
            alignItems: 'center',
          }}>
            <div>
              <h2 style={{
                fontSize: 'clamp(28px, 7vw, 40px)',
                fontWeight: '900',
                background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: '0 0 20px 0',
              }}>
                🎬 Découvrez InvestKit
              </h2>
              <p style={{
                fontSize: '16px',
                color: 'rgba(255, 255, 255, 0.75)',
                margin: '0 0 28px 0',
                lineHeight: '1.8',
              }}>
                Regardez comment notre plateforme vous permet de simuler, analyser et optimiser vos stratégies d'investissement en quelques clics.
              </p>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                marginBottom: '32px',
              }}>
                {[
                  '✓ Simulateurs pour tous les marchés',
                  '✓ Analyse de risque en temps réel',
                  '✓ Tutoriels interactifs inclus',
                  '✓ Pas d\'expérience requise',
                ].map((item, idx) => (
                  <div key={idx} style={{
                    fontSize: '15px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontWeight: '500',
                  }}>
                    {item}
                  </div>
                ))}
              </div>

              <Link href="/signup" style={{
                display: 'inline-block',
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                color: 'white',
                borderRadius: '12px',
                fontWeight: '700',
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
                🚀 Essai Rapide Gratuit
              </Link>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
              border: '2px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '16px',
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '300px',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)';
            }}
            >
              <div style={{
                fontSize: '64px',
                marginBottom: '16px',
              }}>
                ▶️
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '700',
                color: 'white',
                marginBottom: '8px',
                textAlign: 'center',
              }}>
                Regarder la démo (2:45)
              </div>
              <div style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.6)',
                textAlign: 'center',
              }}>
                Tour complet de la plateforme
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEWSLETTER SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)',
        padding: 'clamp(40px, 8vw, 80px) clamp(16px, 5vw, 40px)',
        borderTop: '1px solid rgba(59, 130, 246, 0.15)',
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontSize: 'clamp(24px, 6vw, 36px)',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: '0 0 16px 0',
          }}>
            📧 Conseils d'Investissement
          </h2>
          <p style={{
            fontSize: '16px',
            color: 'rgba(255, 255, 255, 0.75)',
            margin: '0 0 32px 0',
            lineHeight: '1.6',
          }}>
            Recevez chaque semaine les meilleures stratégies d'investissement, analyses de marché et tips d'optimisation
          </p>

          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
            flexDirection: 'column',
          }}>
            <input
              type="email"
              placeholder="votre@email.com"
              style={{
                flex: 1,
                padding: '14px 18px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '10px',
                color: 'white',
                fontSize: '14px',
                transition: 'all 0.2s',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.background = 'rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            />
            <button style={{
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 30px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.3)';
            }}
            >
              S'abonner
            </button>
          </div>
          <p style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.5)',
            margin: 0,
          }}>
            ✓ Pas de spam • ✓ Désinscription facile • ✓ Contenu exclusif
          </p>
        </div>
      </section>

      {/* SOCIAL PROOF SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)',
        padding: 'clamp(40px, 8vw, 80px) clamp(16px, 5vw, 40px)',
        borderTop: '1px solid rgba(59, 130, 246, 0.15)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(24px, 6vw, 36px)',
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
        padding: 'clamp(60px, 10vw, 120px) clamp(16px, 5vw, 40px)',
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
            fontSize: 'clamp(28px, 8vw, 52px)',
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
        padding: 'clamp(40px, 8vw, 80px) clamp(16px, 5vw, 40px) clamp(20px, 4vw, 40px)',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Main Footer Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 'clamp(30px, 5vw, 50px)',
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
