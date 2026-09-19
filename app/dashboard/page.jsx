'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedProject, setExpandedProject] = useState(null);

  const [portfolioData] = useState({
    totalValue: 245680.50,
    dayChange: 1245.30,
    dayChangePercent: 0.51,
    weekChange: 3420.75,
    monthChange: 8560.45,
    yearGain: 32450.20,
    ytdReturn: 18.3,
    totalInvested: 213230.30,
    unrealizedGain: 32450.20,
    sharpeRatio: 1.45,
    volatility: 12.3,
    maxDrawdown: -8.5,
    winRate: 72.5,
  });

  const [portfolioMetrics] = useState({
    beta: 0.85,
    alpha: 2.34,
    treynorRatio: 0.42,
    sortinoRatio: 2.15,
    informationRatio: 1.68,
    rsquared: 0.78,
  });

  const [notifications] = useState([
    { id: 1, type: 'alert', title: 'Rebalancement Recommandé', message: 'Allocation dérivée de 3%', time: 'il y a 2h', severity: 'high' },
    { id: 2, type: 'info', title: 'Dividende Reçu', message: '€145.50 versé sur PEA', time: 'il y a 4h', severity: 'medium' },
    { id: 3, type: 'alert', title: 'Volatilité Élevée', message: 'BTC +5.2% aujourd\'hui', time: 'il y a 6h', severity: 'medium' },
  ]);

  const [projects] = useState([
    {
      id: 1,
      name: 'Investissement Immobilier - Premier Appart',
      type: 'immobilier',
      currentValue: 268500,
      yearGain: 18500,
      allocation: '45%',
      projectedReturn: 18,
      riskLevel: 'modéré',
    },
    {
      id: 2,
      name: 'Portefeuille Crypto Diversifié',
      type: 'crypto',
      currentValue: 21750,
      yearGain: 6750,
      allocation: '12%',
      projectedReturn: 45,
      riskLevel: 'élevé',
    },
    {
      id: 3,
      name: 'PEA Multi-Secteurs',
      type: 'pea',
      currentValue: 84430.50,
      yearGain: 9430.50,
      allocation: '35%',
      projectedReturn: 12,
      riskLevel: 'faible',
    },
  ]);

  const [marketData] = useState([
    { name: 'CAC 40', value: 7425.38, change: 0.75 },
    { name: 'BTC/EUR', value: 68450.50, change: 3.53 },
    { name: 'ETH/EUR', value: 2850.75, change: 5.36 },
    { name: 'Or ($/oz)', value: 2095.30, change: 1.72 },
  ]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)',
      display: 'grid',
      gridTemplateColumns: '280px 1fr 370px',
      gap: '24px',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    }}>
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dashboard-content {
          animation: slideInUp 0.6s ease-out;
        }
        .metric-card {
          transition: all 0.3s ease;
        }
        .metric-card:hover {
          transform: translateY(-2px);
        }
      `}</style>

      {/* LEFT SIDEBAR */}
      <div style={{
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        paddingRight: '24px',
        height: 'fit-content',
      }}>
        {/* User Profile */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            borderRadius: '12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
          }}>
            👤
          </div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '700',
            color: 'white',
            margin: '0 0 4px 0',
          }}>
            Jean Dupont
          </h3>
          <p style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.6)',
            margin: 0,
          }}>
            Investisseur Premium
          </p>
        </div>

        {/* Quick Stats */}
        <div style={{ marginBottom: '40px' }}>
          <p style={{
            fontSize: '11px',
            fontWeight: '700',
            color: 'rgba(255, 255, 255, 0.5)',
            margin: '0 0 12px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Aperçu
          </p>
          {[
            { label: 'Portefeuille', value: '€' + (portfolioData.totalValue / 1000).toFixed(0) + 'k', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
            { label: 'Gain YTD', value: '+' + portfolioData.ytdReturn + '%', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
            { label: 'Projets', value: projects.length, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
          ].map((stat, idx) => (
            <div key={idx} style={{
              padding: '16px',
              background: stat.bg,
              borderRadius: '12px',
              marginBottom: '12px',
              borderLeft: `3px solid ${stat.color}`,
            }}>
              <p style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.6)',
                margin: '0 0 4px 0',
                fontWeight: '600',
              }}>
                {stat.label}
              </p>
              <p style={{
                fontSize: '20px',
                fontWeight: '900',
                color: stat.color,
                margin: 0,
              }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div style={{ marginBottom: '40px' }}>
          <p style={{
            fontSize: '11px',
            fontWeight: '700',
            color: 'rgba(255, 255, 255, 0.5)',
            margin: '0 0 12px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Menu
          </p>
          <div style={{ display: 'grid', gap: '8px' }}>
            {[
              { id: 'overview', label: '📊 Vue d\'ensemble' },
              { id: 'projects', label: '🎯 Projets' },
              { id: 'market', label: '💹 Marché' },
              { id: 'education', label: '📚 Académie' },
              { id: 'risk', label: '⚠️ Risques' },
              { id: 'settings', label: '⚙️ Paramètres' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  background: activeTab === item.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  color: activeTab === item.id ? '#3b82f6' : 'rgba(255, 255, 255, 0.6)',
                  fontSize: '14px',
                  fontWeight: activeTab === item.id ? '700' : '500',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== item.id) {
                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.target.style.color = 'rgba(255, 255, 255, 0.8)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== item.id) {
                    e.target.style.background = 'transparent';
                    e.target.style.color = 'rgba(255, 255, 255, 0.6)';
                  }
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* User Info */}
        <div style={{
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <p style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.6)',
            margin: '0 0 8px 0',
            fontWeight: '600',
          }}>
            Membre depuis
          </p>
          <p style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.8)',
            margin: '0 0 12px 0',
            fontWeight: '700',
          }}>
            3 ans
          </p>
          <div style={{
            padding: '8px 12px',
            background: 'rgba(16, 185, 129, 0.15)',
            borderRadius: '8px',
            borderLeft: '2px solid #10b981',
          }}>
            <p style={{
              fontSize: '11px',
              color: '#10b981',
              margin: 0,
              fontWeight: '700',
            }}>
              ✓ KYC Vérifié
            </p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT - CENTER COLUMN */}
      <div className="dashboard-content" style={{}}>
        {/* HEADER */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '900',
            color: 'white',
            margin: '0 0 8px 0',
            letterSpacing: '-0.5px',
          }}>
            Votre Portefeuille
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.5)',
            margin: 0,
            fontSize: '14px',
          }}>
            Dernière mise à jour : {new Date().toLocaleString('fr-FR')}
          </p>
        </div>

        {/* MAIN PORTFOLIO CARD - BANK CARD STYLE */}
        {activeTab === 'overview' && (
          <>
            <div className="metric-card" style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              borderRadius: '24px',
              padding: '0',
              marginBottom: '32px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 60px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              position: 'relative',
              overflow: 'hidden',
              height: '320px',
              display: 'flex',
              flexDirection: 'column',
              maxWidth: '500px',
              aspectRatio: '1.7',
            }}>
              {/* Card Background Effects */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
                pointerEvents: 'none',
              }} />

              {/* Decorative Elements */}
              <div style={{
                position: 'absolute',
                top: '-50px',
                right: '-50px',
                width: '200px',
                height: '200px',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
                borderRadius: '50%',
                pointerEvents: 'none',
              }} />

              {/* Card Content */}
              <div style={{
                position: 'relative',
                zIndex: 1,
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                justifyContent: 'space-between',
              }}>
                {/* Top Section - Card Type & Logo */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '20px',
                }}>
                  <div>
                    <p style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      margin: 0,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}>
                      INVESTKIT PREMIUM
                    </p>
                  </div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: '900',
                  }}>
                    💳
                  </div>
                </div>

                {/* Middle Section - Card Number Placeholder */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  margin: '20px 0',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: 'rgba(255, 255, 255, 0.7)',
                  letterSpacing: '3px',
                  fontFamily: 'monospace',
                }}>
                  <span>••••</span>
                  <span>••••</span>
                  <span>••••</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>2024</span>
                </div>

                {/* Bottom Section - Holder & Date */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginTop: 'auto',
                }}>
                  <div>
                    <p style={{
                      fontSize: '9px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      margin: '0 0 4px 0',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      CARDHOLDER
                    </p>
                    <p style={{
                      fontSize: '14px',
                      color: 'white',
                      margin: 0,
                      fontWeight: '700',
                      letterSpacing: '0.5px',
                    }}>
                      JEAN DUPONT
                    </p>
                  </div>
                  <div style={{
                    textAlign: 'right',
                  }}>
                    <p style={{
                      fontSize: '9px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      margin: '0 0 4px 0',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      Valid Thru
                    </p>
                    <p style={{
                      fontSize: '14px',
                      color: 'white',
                      margin: 0,
                      fontWeight: '700',
                      fontFamily: 'monospace',
                    }}>
                      12/26
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* PORTFOLIO STATS BELOW CARD */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}>
              {/* Total Balance */}
              <div className="metric-card" style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                backdropFilter: 'blur(20px)',
              }}>
                <p style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  margin: '0 0 8px 0',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Solde Total
                </p>
                <p style={{
                  fontSize: '32px',
                  fontWeight: '900',
                  color: '#60a5fa',
                  margin: '0 0 12px 0',
                }}>
                  €{portfolioData.totalValue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                </p>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span style={{
                    fontSize: '12px',
                    color: '#10b981',
                    fontWeight: '700',
                  }}>
                    ↑ +€{portfolioData.dayChange.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.6)',
                  }}>
                    ({portfolioData.dayChangePercent}% today)
                  </span>
                </div>
              </div>

              {/* Available Balance */}
              <div className="metric-card" style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                backdropFilter: 'blur(20px)',
              }}>
                <p style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  margin: '0 0 8px 0',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Gain Année (YTD)
                </p>
                <p style={{
                  fontSize: '32px',
                  fontWeight: '900',
                  color: '#86efac',
                  margin: '0 0 12px 0',
                }}>
                  +{portfolioData.ytdReturn}%
                </p>
                <p style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  margin: 0,
                }}>
                  €{portfolioData.yearGain.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} gains réalisés
                </p>
              </div>

              {/* Performance */}
              <div className="metric-card" style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                backdropFilter: 'blur(20px)',
              }}>
                <p style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  margin: '0 0 8px 0',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Performance
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginTop: '12px',
                }}>
                  <div>
                    <p style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      margin: 0,
                      fontWeight: '600',
                    }}>
                      Win Rate
                    </p>
                    <p style={{
                      fontSize: '18px',
                      fontWeight: '900',
                      color: '#a78bfa',
                      margin: '4px 0 0 0',
                    }}>
                      {portfolioData.winRate}%
                    </p>
                  </div>
                  <div>
                    <p style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      margin: 0,
                      fontWeight: '600',
                    }}>
                      Capital
                    </p>
                    <p style={{
                      fontSize: '18px',
                      fontWeight: '900',
                      color: '#c4b5fd',
                      margin: '4px 0 0 0',
                    }}>
                      €{(portfolioData.totalInvested / 1000).toFixed(0)}k
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* PROJECTS SECTION */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '800',
                color: 'white',
                margin: '0 0 16px 0',
              }}>
                🎯 Vos Projets
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '16px',
              }}>
                {projects.map((project) => (
                  <div key={project.id} className="metric-card" style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(20px)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                  >
                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: 'white',
                        margin: '0 0 4px 0',
                      }}>
                        {project.name}
                      </h3>
                      <p style={{
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.5)',
                        margin: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                        fontWeight: '600',
                      }}>
                        {project.type} • {project.allocation} allocation
                      </p>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '16px',
                      marginBottom: '16px',
                      paddingBottom: '16px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    }}>
                      <div>
                        <p style={{
                          fontSize: '11px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          margin: '0 0 4px 0',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                        }}>
                          Valeur
                        </p>
                        <p style={{
                          fontSize: '18px',
                          fontWeight: '800',
                          color: '#60a5fa',
                          margin: 0,
                        }}>
                          €{(project.currentValue / 1000).toFixed(0)}k
                        </p>
                      </div>
                      <div>
                        <p style={{
                          fontSize: '11px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          margin: '0 0 4px 0',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                        }}>
                          Gain Annuel
                        </p>
                        <p style={{
                          fontSize: '18px',
                          fontWeight: '800',
                          color: '#86efac',
                          margin: 0,
                        }}>
                          +€{(project.yearGain / 1000).toFixed(1)}k
                        </p>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <p style={{
                          fontSize: '11px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          margin: 0,
                          fontWeight: '600',
                          textTransform: 'uppercase',
                        }}>
                          Risque
                        </p>
                        <p style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: project.riskLevel === 'élevé' ? '#f43f5e' : project.riskLevel === 'modéré' ? '#f59e0b' : '#10b981',
                          margin: '2px 0 0 0',
                        }}>
                          {project.riskLevel}
                        </p>
                      </div>
                      <div>
                        <p style={{
                          fontSize: '11px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          margin: 0,
                          fontWeight: '600',
                          textTransform: 'uppercase',
                        }}>
                          Retour
                        </p>
                        <p style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#a78bfa',
                          margin: '2px 0 0 0',
                        }}>
                          {project.projectedReturn}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ANALYSIS SECTION */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '800',
                color: 'white',
                margin: '0 0 16px 0',
              }}>
                📊 Analyse Détaillée
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
              }}>
                {/* Risk Metrics */}
                <div className="metric-card" style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                }}>
                  <h4 style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'rgba(255, 255, 255, 0.9)',
                    margin: '0 0 16px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    ⚖️ Risque
                  </h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {[
                      { label: 'Sharpe Ratio', value: portfolioData.sharpeRatio, color: '#10b981' },
                      { label: 'Volatilité', value: portfolioData.volatility + '%', color: '#f59e0b' },
                      { label: 'Max Drawdown', value: portfolioData.maxDrawdown + '%', color: '#f43f5e' },
                    ].map((m, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingBottom: idx < 2 ? '12px' : 0,
                        borderBottom: idx < 2 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                      }}>
                        <span style={{
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontWeight: '600',
                        }}>
                          {m.label}
                        </span>
                        <span style={{
                          fontSize: '16px',
                          fontWeight: '900',
                          color: m.color,
                        }}>
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Advanced Metrics */}
                <div className="metric-card" style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                }}>
                  <h4 style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'rgba(255, 255, 255, 0.9)',
                    margin: '0 0 16px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    📈 Métriques
                  </h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {[
                      { label: 'Alpha', value: portfolioMetrics.alpha + '%', color: '#3b82f6' },
                      { label: 'Beta', value: portfolioMetrics.beta, color: '#8b5cf6' },
                      { label: 'Sortino', value: portfolioMetrics.sortinoRatio, color: '#a78bfa' },
                    ].map((m, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingBottom: idx < 2 ? '12px' : 0,
                        borderBottom: idx < 2 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                      }}>
                        <span style={{
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontWeight: '600',
                        }}>
                          {m.label}
                        </span>
                        <span style={{
                          fontSize: '16px',
                          fontWeight: '900',
                          color: m.color,
                        }}>
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="metric-card" style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                }}>
                  <h4 style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'rgba(255, 255, 255, 0.9)',
                    margin: '0 0 16px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    💰 Synthèse
                  </h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {[
                      { label: 'Capital Investi', value: '€' + (portfolioData.totalInvested / 1000).toFixed(0) + 'k', color: '#3b82f6' },
                      { label: 'Gain Non-Réalisé', value: '+€' + (portfolioData.unrealizedGain / 1000).toFixed(1) + 'k', color: '#10b981' },
                      { label: 'Var. Semaine', value: '+€' + (portfolioData.weekChange / 1000).toFixed(1) + 'k', color: '#a78bfa' },
                    ].map((m, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingBottom: idx < 2 ? '12px' : 0,
                        borderBottom: idx < 2 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                      }}>
                        <span style={{
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontWeight: '600',
                        }}>
                          {m.label}
                        </span>
                        <span style={{
                          fontSize: '16px',
                          fontWeight: '900',
                          color: m.color,
                        }}>
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* MARKET TAB */}
        {activeTab === 'market' && (
          <div style={{ marginTop: '20px' }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '800',
              color: 'white',
              margin: '0 0 24px 0',
            }}>
              💹 Marché
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}>
              {marketData.map((item, idx) => (
                <div key={idx} className="metric-card" style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                }}>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: 'white',
                    margin: '0 0 12px 0',
                  }}>
                    {item.name}
                  </p>
                  <p style={{
                    fontSize: '28px',
                    fontWeight: '900',
                    color: '#60a5fa',
                    margin: '0 0 8px 0',
                  }}>
                    {item.value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
                  </p>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: item.change > 0 ? '#10b981' : '#f43f5e',
                    margin: 0,
                  }}>
                    {item.change > 0 ? '↑' : '↓'} {Math.abs(item.change)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EDUCATION TAB */}
        {activeTab === 'education' && (
          <div style={{ marginTop: '20px' }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '800',
              color: 'white',
              margin: '0 0 24px 0',
            }}>
              📚 Académie
            </h2>
            <div style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
              borderRadius: '16px',
              padding: '40px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              textAlign: 'center',
            }}>
              <p style={{
                fontSize: '48px',
                margin: '0 0 16px 0',
              }}>
                📖
              </p>
              <h3 style={{
                fontSize: '22px',
                fontWeight: '800',
                color: 'white',
                margin: '0 0 12px 0',
              }}>
                Formations Disponibles
              </h3>
              <p style={{
                fontSize: '16px',
                color: 'rgba(255, 255, 255, 0.7)',
                margin: '0 0 24px 0',
              }}>
                Accédez à notre plateforme d'apprentissage gamifiée
              </p>
              <a href="/education" style={{
                display: 'inline-block',
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: '700',
                fontSize: '14px',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Accéder à l'Académie →
              </a>
            </div>
          </div>
        )}

        {/* PLACEHOLDERS FOR OTHER TABS */}
        {(['projects', 'risk', 'settings'].includes(activeTab)) && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
            borderRadius: '16px',
            padding: '60px 40px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
            marginTop: '20px',
          }}>
            <p style={{
              fontSize: '36px',
              margin: '0 0 16px 0',
            }}>
              {activeTab === 'projects' && '🎯'}
              {activeTab === 'risk' && '⚠️'}
              {activeTab === 'settings' && '⚙️'}
            </p>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '800',
              color: 'white',
              margin: '0 0 12px 0',
            }}>
              {activeTab === 'projects' && 'Gestion des Projets'}
              {activeTab === 'risk' && 'Analyse des Risques'}
              {activeTab === 'settings' && 'Paramètres'}
            </h3>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.6)',
              margin: 0,
            }}>
              Section en développement
            </p>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN - STICKY NEWS FEED */}
      <div style={{
        position: 'sticky',
        top: '24px',
        height: 'fit-content',
      }}>
        {/* Phone Frame */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
          borderRadius: '40px',
          padding: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          width: '100%',
          height: '620px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Phone Notch */}
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '150px',
            height: '25px',
            background: '#0f172a',
            borderRadius: '0 0 20px 20px',
            zIndex: 10,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <div style={{
              width: '100px',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '2px',
            }} />
          </div>

          {/* Phone Status Bar */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: '32px 32px 0 0',
            padding: '28px 16px 16px',
            marginTop: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.8)',
          }}>
            <span>9:41</span>
            <span>📶 📡 🔋</span>
          </div>

          {/* Phone Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '800',
              color: 'white',
              margin: 0,
            }}>
              InvestKit
            </h3>
          </div>

          {/* Scrollable Content */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            scrollBehavior: 'smooth',
          }}>
            {/* News Item 1 */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.15)',
              borderLeft: '3px solid #3b82f6',
              borderRadius: '12px',
              padding: '12px',
              flex: '0 0 auto',
            }}>
              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'start',
                marginBottom: '6px',
              }}>
                <span style={{ fontSize: '16px', marginTop: '2px' }}>📈</span>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#60a5fa',
                    margin: '0 0 2px 0',
                  }}>
                    CAC 40 en hausse
                  </p>
                  <p style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    margin: 0,
                  }}>
                    L'indice gagne 1.2% aujourd'hui
                  </p>
                </div>
              </div>
              <span style={{
                fontSize: '9px',
                color: 'rgba(255, 255, 255, 0.5)',
              }}>
                À l'instant
              </span>
            </div>

            {/* News Item 2 */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              borderLeft: '3px solid #10b981',
              borderRadius: '12px',
              padding: '12px',
              flex: '0 0 auto',
            }}>
              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'start',
                marginBottom: '6px',
              }}>
                <span style={{ fontSize: '16px', marginTop: '2px' }}>💡</span>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#86efac',
                    margin: '0 0 2px 0',
                  }}>
                    Conseil du jour
                  </p>
                  <p style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    margin: 0,
                  }}>
                    Diversifiez pour réduire les risques
                  </p>
                </div>
              </div>
              <span style={{
                fontSize: '9px',
                color: 'rgba(255, 255, 255, 0.5)',
              }}>
                Il y a 2h
              </span>
            </div>

            {/* News Item 3 */}
            <div style={{
              background: 'rgba(168, 85, 247, 0.15)',
              borderLeft: '3px solid #a855f7',
              borderRadius: '12px',
              padding: '12px',
              flex: '0 0 auto',
            }}>
              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'start',
                marginBottom: '6px',
              }}>
                <span style={{ fontSize: '16px', marginTop: '2px' }}>📚</span>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#d8b4fe',
                    margin: '0 0 2px 0',
                  }}>
                    Nouvelle formation
                  </p>
                  <p style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    margin: 0,
                  }}>
                    Maîtrisez la crypto
                  </p>
                </div>
              </div>
              <span style={{
                fontSize: '9px',
                color: 'rgba(255, 255, 255, 0.5)',
              }}>
                Il y a 5h
              </span>
            </div>

            {/* News Item 4 */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.15)',
              borderLeft: '3px solid #f59e0b',
              borderRadius: '12px',
              padding: '12px',
              flex: '0 0 auto',
            }}>
              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'start',
                marginBottom: '6px',
              }}>
                <span style={{ fontSize: '16px', marginTop: '2px' }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#fcd34d',
                    margin: '0 0 2px 0',
                  }}>
                    Alerte BTC
                  </p>
                  <p style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    margin: 0,
                  }}>
                    Prix en baisse, opportunité?
                  </p>
                </div>
              </div>
              <span style={{
                fontSize: '9px',
                color: 'rgba(255, 255, 255, 0.5)',
              }}>
                Il y a 1h
              </span>
            </div>

            {/* News Item 5 */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.15)',
              borderLeft: '3px solid #3b82f6',
              borderRadius: '12px',
              padding: '12px',
              flex: '0 0 auto',
            }}>
              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'start',
                marginBottom: '6px',
              }}>
                <span style={{ fontSize: '16px', marginTop: '2px' }}>🏆</span>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#60a5fa',
                    margin: '0 0 2px 0',
                  }}>
                    Objectif atteint!
                  </p>
                  <p style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    margin: 0,
                  }}>
                    +€5k de gains ce mois
                  </p>
                </div>
              </div>
              <span style={{
                fontSize: '9px',
                color: 'rgba(255, 255, 255, 0.5)',
              }}>
                Il y a 3h
              </span>
            </div>
          </div>

          {/* Phone Home Indicator */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: '0 0 32px 32px',
            padding: '8px',
            textAlign: 'center',
          }}>
            <div style={{
              width: '120px',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '2px',
              margin: '0 auto',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
