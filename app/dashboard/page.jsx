'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedProject, setExpandedProject] = useState(null);
  const [activeSimulator, setActiveSimulator] = useState(null);
  const [portfolioData, setPortfolioData] = useState({
    totalValue: 245680.50,
    dayChange: 1245.30,
    dayChangePercent: 0.51,
    yearGain: 32450.20,
  });
  const [projects, setProjects] = useState([
    {
      id: 1,
      name: 'Investissement Immobilier - Premier Appart',
      type: 'immobilier',
      initialInvestment: 250000,
      projectedReturn: 18,
      timeline: '15 ans',
      status: 'active',
      riskLevel: 'modéré',
      aiNotes: 'Excellente stratégie. Le marché immobilier français offre une bonne stabilité. Recommandé de diversifier avec d\'autres actifs.',
    },
    {
      id: 2,
      name: 'Portefeuille Crypto Diversifié',
      type: 'crypto',
      initialInvestment: 15000,
      projectedReturn: 45,
      timeline: '5 ans',
      status: 'active',
      riskLevel: 'élevé',
      aiNotes: 'Volatilité élevée détectée. Envisager un rebalancement. Maintenir une position conservatrice.',
    },
    {
      id: 3,
      name: 'PEA Multi-Secteurs',
      type: 'pea',
      initialInvestment: 75000,
      projectedReturn: 12,
      timeline: '8 ans',
      status: 'active',
      riskLevel: 'faible',
      aiNotes: 'Très bon choix pour l\'imposition. Diversification optimale détectée.',
    },
  ]);

  const [marketData] = useState([
    { name: 'CAC 40', value: 7425.38, change: 0.75, changePercent: 0.01 },
    { name: 'BTC/EUR', value: 68450.50, change: 2340.30, changePercent: 3.53 },
    { name: 'ETH/EUR', value: 2850.75, change: 145.20, changePercent: 5.36 },
    { name: 'Or ($/oz)', value: 2095.30, change: 35.40, changePercent: 1.72 },
  ]);

  const [riskAnalysis] = useState({
    overallRisk: 'Modéré',
    diversificationScore: 78,
    correlationIndex: 0.42,
    recommendations: [
      'Réduire l\'exposition aux actifs volatiles',
      'Augmenter la diversification géographique',
      'Envisager des obligations à long terme',
    ],
  });

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  const [newProject, setNewProject] = useState({
    name: '',
    type: 'pea',
    initialInvestment: '',
  });

  const addProject = () => {
    if (newProject.name && newProject.initialInvestment) {
      setProjects([
        ...projects,
        {
          id: projects.length + 1,
          ...newProject,
          initialInvestment: parseFloat(newProject.initialInvestment),
          projectedReturn: 15,
          timeline: '5 ans',
          status: 'active',
          riskLevel: 'modéré',
          aiNotes: 'Projet en attente d\'analyse IA détaillée...',
        },
      ]);
      setNewProject({ name: '', type: 'pea', initialInvestment: '' });
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    }}>
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .dashboard-container {
          animation: slideInUp 0.6s ease-out;
        }

        .metric-card {
          position: relative;
          overflow: hidden;
        }

        .metric-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          transition: left 0.5s;
        }

        .metric-card:hover::before {
          left: 100%;
        }

        .simulator-btn {
          transition: all 0.3s ease;
        }

        .simulator-btn:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(59, 130, 246, 0.3);
        }

        .project-card {
          transition: all 0.3s ease;
        }

        .project-card:hover {
          transform: translateX(4px);
        }

        .tab-button {
          transition: all 0.2s;
        }

        .tab-button.active {
          border-bottom: 3px solid #3b82f6;
          color: #3b82f6;
        }

        .accordion-content {
          animation: fadeIn 0.3s ease;
        }
      `}</style>

      <div className="dashboard-container" style={{
        maxWidth: '1600px',
        margin: '0 auto',
      }}>
        {/* HEADER WITH USER PROFILE */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '32px',
          marginBottom: '40px',
          alignItems: 'start',
        }}>
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: '0 0 8px 0',
            }}>
              📊 Tableau de Bord Premium
            </h1>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              margin: 0,
              fontSize: '14px',
            }}>
              Bienvenue, Investisseur Premium • Dernière mise à jour: {new Date().toLocaleString('fr-FR')}
            </p>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
            borderRadius: '20px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(20px)',
            minWidth: '280px',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
          }}>
            <div style={{ marginBottom: '16px' }}>
              <p style={{
                fontSize: '12px',
                color: '#94a3b8',
                margin: '0 0 4px 0',
                fontWeight: '600',
                textTransform: 'uppercase',
              }}>
                Profil Utilisateur
              </p>
              <p style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#0f172a',
                margin: '0',
              }}>
                Jean Dupont
              </p>
              <p style={{
                fontSize: '12px',
                color: '#64748b',
                margin: '4px 0 0 0',
              }}>
                Membre depuis 3 ans
              </p>
            </div>
            <div style={{
              borderTop: '1px solid rgba(59, 130, 246, 0.1)',
              paddingTop: '12px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Projets Actifs</span>
                  <p style={{ color: '#3b82f6', fontWeight: '700', margin: '2px 0 0 0', fontSize: '16px' }}>
                    {projects.length}
                  </p>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Statut KYC</span>
                  <p style={{ color: '#10b981', fontWeight: '700', margin: '2px 0 0 0', fontSize: '12px' }}>
                    ✓ Vérifié
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PORTFOLIO OVERVIEW */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '40px',
        }}>
          <div className="metric-card" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.97) 100%)',
            borderRadius: '20px',
            padding: '28px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
          }}>
            <p style={{
              fontSize: '12px',
              color: '#94a3b8',
              margin: '0 0 8px 0',
              fontWeight: '600',
              textTransform: 'uppercase',
            }}>
              💼 Valeur Totale du Portefeuille
            </p>
            <p style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#0f172a',
              margin: '0 0 12px 0',
            }}>
              €{portfolioData.totalValue.toLocaleString('fr-FR')}
            </p>
            <div style={{
              padding: '12px 16px',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '8px',
              borderLeft: '3px solid #10b981',
            }}>
              <span style={{
                color: '#10b981',
                fontSize: '14px',
                fontWeight: '600',
              }}>
                ↑ +€{portfolioData.dayChange.toLocaleString('fr-FR')} ({portfolioData.dayChangePercent}%)
              </span>
              <span style={{
                color: '#64748b',
                fontSize: '12px',
                marginLeft: '8px',
              }}>
                aujourd'hui
              </span>
            </div>
          </div>

          <div className="metric-card" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.97) 100%)',
            borderRadius: '20px',
            padding: '28px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
          }}>
            <p style={{
              fontSize: '12px',
              color: '#94a3b8',
              margin: '0 0 8px 0',
              fontWeight: '600',
              textTransform: 'uppercase',
            }}>
              📈 Gain sur 12 Mois
            </p>
            <p style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#0f172a',
              margin: '0 0 12px 0',
            }}>
              €{portfolioData.yearGain.toLocaleString('fr-FR')}
            </p>
            <div style={{
              fontSize: '12px',
              color: '#64748b',
              padding: '12px 16px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '8px',
              borderLeft: '3px solid #3b82f6',
            }}>
              ROI: <strong>15.3%</strong> annuel
            </div>
          </div>

          <div className="metric-card" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.97) 100%)',
            borderRadius: '20px',
            padding: '28px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
          }}>
            <p style={{
              fontSize: '12px',
              color: '#94a3b8',
              margin: '0 0 8px 0',
              fontWeight: '600',
              textTransform: 'uppercase',
            }}>
              ⚡ Diversification
            </p>
            <p style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#0f172a',
              margin: '0 0 12px 0',
            }}>
              {riskAnalysis.diversificationScore}%
            </p>
            <div style={{
              width: '100%',
              height: '6px',
              background: 'rgba(59, 130, 246, 0.15)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${riskAnalysis.diversificationScore}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              }} />
            </div>
            <span style={{
              fontSize: '11px',
              color: '#64748b',
              marginTop: '8px',
              display: 'block',
            }}>
              Excellent score détecté
            </span>
          </div>

          <div className="metric-card" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.97) 100%)',
            borderRadius: '20px',
            padding: '28px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
          }}>
            <p style={{
              fontSize: '12px',
              color: '#94a3b8',
              margin: '0 0 8px 0',
              fontWeight: '600',
              textTransform: 'uppercase',
            }}>
              🎯 Niveau de Risque
            </p>
            <p style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#0f172a',
              margin: '0 0 12px 0',
            }}>
              {riskAnalysis.overallRisk}
            </p>
            <div style={{
              fontSize: '12px',
              padding: '12px 16px',
              background: 'rgba(245, 158, 11, 0.1)',
              borderRadius: '8px',
              borderLeft: '3px solid #f59e0b',
              color: '#92400e',
            }}>
              Indice de Corrélation: <strong>{riskAnalysis.correlationIndex}</strong>
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div style={{
          display: 'flex',
          gap: '32px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '32px',
          flexWrap: 'wrap',
        }}>
          {['overview', 'projects', 'simulators', 'market', 'risk', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-button ${activeTab === tab ? 'active' : ''}`}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '12px 0',
                color: activeTab === tab ? '#3b82f6' : 'rgba(255, 255, 255, 0.5)',
                fontSize: '14px',
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              {tab === 'overview' && '📊 Aperçu'}
              {tab === 'projects' && '🎯 Projets'}
              {tab === 'simulators' && '🛠️ Simulateurs'}
              {tab === 'market' && '💹 Marché'}
              {tab === 'risk' && '⚠️ Risques'}
              {tab === 'settings' && '⚙️ Paramètres'}
            </button>
          ))}
        </div>

        {/* TAB CONTENTS */}
        {activeTab === 'overview' && (
          <div className="accordion-content" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px',
          }}>
            {/* Quick Actions */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
              borderRadius: '20px',
              padding: '28px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#0f172a',
                margin: '0 0 20px 0',
              }}>
                🚀 Actions Rapides
              </h3>
              <div style={{
                display: 'grid',
                gap: '12px',
              }}>
                <button style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s',
                }} onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}>
                  + Ajouter des Fonds
                </button>
                <button style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s',
                }} onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}>
                  📥 Retirer des Fonds
                </button>
                <button style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s',
                }} onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}>
                  📊 Générer Rapport PDF
                </button>
              </div>
            </div>

            {/* Allocations */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
              borderRadius: '20px',
              padding: '28px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#0f172a',
                margin: '0 0 20px 0',
              }}>
                💰 Allocation d'Actifs
              </h3>
              <div style={{
                display: 'grid',
                gap: '12px',
              }}>
                {[
                  { label: 'Immobilier', value: 45, color: '#3b82f6' },
                  { label: 'PEA/Bourse', value: 35, color: '#8b5cf6' },
                  { label: 'Crypto', value: 12, color: '#f59e0b' },
                  { label: 'Obligations', value: 8, color: '#10b981' },
                ].map((item, idx) => (
                  <div key={idx}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '4px',
                      fontSize: '13px',
                    }}>
                      <span style={{ color: '#0f172a', fontWeight: '600' }}>{item.label}</span>
                      <span style={{ color: '#64748b', fontWeight: '600' }}>{item.value}%</span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${item.value}%`,
                        height: '100%',
                        background: item.color,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="accordion-content">
            {/* Add Project Form */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
              borderRadius: '20px',
              padding: '28px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
              marginBottom: '24px',
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#0f172a',
                margin: '0 0 20px 0',
              }}>
                ➕ Créer un Nouveau Projet
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
              }}>
                <input
                  type="text"
                  placeholder="Nom du projet"
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                  }}
                />
                <select
                  value={newProject.type}
                  onChange={(e) => setNewProject({...newProject, type: e.target.value})}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                  }}
                >
                  <option value="pea">PEA</option>
                  <option value="immobilier">Immobilier</option>
                  <option value="crypto">Crypto</option>
                  <option value="obligations">Obligations</option>
                </select>
                <input
                  type="number"
                  placeholder="Montant initial (€)"
                  value={newProject.initialInvestment}
                  onChange={(e) => setNewProject({...newProject, initialInvestment: e.target.value})}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={addProject}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.3s',
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  Créer Projet
                </button>
              </div>
            </div>

            {/* Projects List */}
            <div style={{
              display: 'grid',
              gap: '16px',
            }}>
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="project-card"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                    style={{
                      padding: '20px',
                      cursor: 'pointer',
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      gap: '16px',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{
                      fontSize: '32px',
                    }}>
                      {project.type === 'immobilier' && '🏠'}
                      {project.type === 'crypto' && '₿'}
                      {project.type === 'pea' && '📈'}
                      {project.type === 'obligations' && '📋'}
                    </div>
                    <div>
                      <h4 style={{
                        margin: '0 0 4px 0',
                        fontSize: '15px',
                        fontWeight: '700',
                        color: '#0f172a',
                      }}>
                        {project.name}
                      </h4>
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        fontSize: '12px',
                        color: '#64748b',
                      }}>
                        <span>€{project.initialInvestment.toLocaleString('fr-FR')}</span>
                        <span>•</span>
                        <span>{project.timeline}</span>
                        <span>•</span>
                        <span style={{
                          color: project.riskLevel === 'élevé' ? '#ef4444' : project.riskLevel === 'modéré' ? '#f59e0b' : '#10b981',
                        }}>
                          {project.riskLevel}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      textAlign: 'right',
                    }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#10b981',
                      }}>
                        +{project.projectedReturn}%
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#64748b',
                      }}>
                        retour proj.
                      </div>
                    </div>
                  </div>

                  {expandedProject === project.id && (
                    <div style={{
                      padding: '20px',
                      borderTop: '1px solid rgba(59, 130, 246, 0.1)',
                      background: 'rgba(59, 130, 246, 0.03)',
                    }}>
                      <div style={{
                        marginBottom: '16px',
                      }}>
                        <h5 style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          margin: '0 0 8px 0',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                        }}>
                          📋 Analyse IA
                        </h5>
                        <p style={{
                          fontSize: '13px',
                          color: '#475569',
                          margin: '0',
                          lineHeight: '1.6',
                        }}>
                          {project.aiNotes}
                        </p>
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '12px',
                      }}>
                        <button style={{
                          padding: '10px 16px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: '#3b82f6',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }} onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(59, 130, 246, 0.2)';
                        }} onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(59, 130, 246, 0.1)';
                        }}>
                          📊 Détails
                        </button>
                        <button style={{
                          padding: '10px 16px',
                          background: 'rgba(139, 92, 246, 0.1)',
                          color: '#8b5cf6',
                          border: '1px solid rgba(139, 92, 246, 0.2)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }} onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(139, 92, 246, 0.2)';
                        }} onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(139, 92, 246, 0.1)';
                        }}>
                          🤖 Conseil IA
                        </button>
                        <button style={{
                          padding: '10px 16px',
                          background: 'rgba(244, 63, 94, 0.1)',
                          color: '#f43f5e',
                          border: '1px solid rgba(244, 63, 94, 0.2)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }} onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(244, 63, 94, 0.2)';
                        }} onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(244, 63, 94, 0.1)';
                        }}>
                          🗑️ Supprimer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'simulators' && (
          <div className="accordion-content" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}>
            {[
              {
                id: 'pea',
                href: '/simulateurs/pea',
                title: '📊 Simulateur PEA Ultra Pro',
                description: 'Simulation complète pour investissement en PEA avec backtesting, comparaison de frais et analyses fiscales.',
                icon: '📈',
                features: ['Backtesting 2008-2026', 'Comparaison ETF', 'Analyse fiscale', '10 onglets détaillés'],
              },
              {
                id: 'loan1',
                href: '/simulateurs/loan1',
                title: '🏦 Simulateur Crédit Immobilier',
                description: 'Analyse détaillée de crédits immobiliers avec comparaison de banques et tableau d\'amortissement.',
                icon: '🏠',
                features: ['7 banques', 'Tableau d\'amortissement', 'Scénarios', 'PDF export'],
              },
              {
                id: 'loan2',
                href: '/simulateurs/loan2',
                title: '💳 Simulateur Crédit Bancaire',
                description: 'Simulateur avancé pour tous types de crédits avec mode clair/sombre et analyses comparatives.',
                icon: '💰',
                features: ['Multi-types crédit', 'Analyses détaillées', 'Recommandations', 'Dark mode'],
              },
            ].map((sim) => (
              <Link
                key={sim.id}
                href={sim.href}
                style={{
                  textDecoration: 'none',
                }}
              >
                <div
                  className="simulator-btn"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
                    borderRadius: '20px',
                    padding: '28px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
                    cursor: 'pointer',
                    height: '100%',
                  }}
                >
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '12px',
                  }}>
                    {sim.icon}
                  </div>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#0f172a',
                    margin: '0 0 8px 0',
                  }}>
                    {sim.title}
                  </h4>
                  <p style={{
                    fontSize: '13px',
                    color: '#64748b',
                    margin: '0 0 16px 0',
                    lineHeight: '1.5',
                  }}>
                    {sim.description}
                  </p>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '16px',
                  }}>
                    {sim.features.map((feature, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '11px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: '#3b82f6',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontWeight: '600',
                        }}
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                  <button style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.3s',
                  }} onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}>
                    Ouvrir →
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}

        {activeTab === 'market' && (
          <div className="accordion-content" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}>
            {marketData.map((data, idx) => (
              <div
                key={idx}
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
                  borderRadius: '20px',
                  padding: '28px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '16px',
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#0f172a',
                    margin: 0,
                  }}>
                    {data.name}
                  </h3>
                  <div style={{
                    padding: '4px 12px',
                    background: data.changePercent >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '20px',
                    color: data.changePercent >= 0 ? '#10b981' : '#ef4444',
                    fontSize: '12px',
                    fontWeight: '700',
                  }}>
                    {data.changePercent >= 0 ? '↑' : '↓'} {Math.abs(data.changePercent)}%
                  </div>
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  color: '#0f172a',
                  marginBottom: '8px',
                }}>
                  {data.value.toLocaleString('fr-FR')}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: data.change >= 0 ? '#10b981' : '#ef4444',
                }}>
                  {data.change >= 0 ? '+' : ''}{data.change.toLocaleString('fr-FR')}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="accordion-content" style={{
            display: 'grid',
            gap: '24px',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
              borderRadius: '20px',
              padding: '28px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#0f172a',
                margin: '0 0 20px 0',
              }}>
                📊 Analyse de Risque Détaillée
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}>
                <div style={{
                  padding: '16px',
                  background: 'rgba(59, 130, 246, 0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(59, 130, 246, 0.1)',
                }}>
                  <p style={{
                    fontSize: '12px',
                    color: '#94a3b8',
                    margin: '0 0 4px 0',
                    fontWeight: '600',
                  }}>
                    Niveau Risque Global
                  </p>
                  <p style={{
                    fontSize: '20px',
                    fontWeight: '800',
                    color: '#3b82f6',
                    margin: 0,
                  }}>
                    {riskAnalysis.overallRisk}
                  </p>
                </div>
                <div style={{
                  padding: '16px',
                  background: 'rgba(139, 92, 246, 0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(139, 92, 246, 0.1)',
                }}>
                  <p style={{
                    fontSize: '12px',
                    color: '#94a3b8',
                    margin: '0 0 4px 0',
                    fontWeight: '600',
                  }}>
                    Score Diversification
                  </p>
                  <p style={{
                    fontSize: '20px',
                    fontWeight: '800',
                    color: '#8b5cf6',
                    margin: 0,
                  }}>
                    {riskAnalysis.diversificationScore}/100
                  </p>
                </div>
                <div style={{
                  padding: '16px',
                  background: 'rgba(245, 158, 11, 0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(245, 158, 11, 0.1)',
                }}>
                  <p style={{
                    fontSize: '12px',
                    color: '#94a3b8',
                    margin: '0 0 4px 0',
                    fontWeight: '600',
                  }}>
                    Indice Corrélation
                  </p>
                  <p style={{
                    fontSize: '20px',
                    fontWeight: '800',
                    color: '#f59e0b',
                    margin: 0,
                  }}>
                    {riskAnalysis.correlationIndex}
                  </p>
                </div>
              </div>

              <div>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#0f172a',
                  margin: '0 0 16px 0',
                }}>
                  💡 Recommandations Personnalisées
                </h4>
                <div style={{
                  display: 'grid',
                  gap: '12px',
                }}>
                  {riskAnalysis.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(16, 185, 129, 0.05)',
                        border: '1px solid rgba(16, 185, 129, 0.1)',
                        borderLeft: '3px solid #10b981',
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: '#0f172a',
                      }}
                    >
                      ✓ {rec}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="accordion-content" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
            borderRadius: '20px',
            padding: '28px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#0f172a',
              margin: '0 0 20px 0',
            }}>
              ⚙️ Paramètres du Compte
            </h3>
            <div style={{
              display: 'grid',
              gap: '16px',
            }}>
              <div style={{
                padding: '16px',
                background: 'rgba(59, 130, 246, 0.05)',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#0f172a',
                    margin: 0,
                  }}>
                    Notifications Push
                  </p>
                  <p style={{
                    fontSize: '12px',
                    color: '#64748b',
                    margin: '4px 0 0 0',
                  }}>
                    Recevoir les alertes de marché
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  style={{
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                  }}
                />
              </div>
              <div style={{
                padding: '16px',
                background: 'rgba(139, 92, 246, 0.05)',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#0f172a',
                    margin: 0,
                  }}>
                    Authentification 2FA
                  </p>
                  <p style={{
                    fontSize: '12px',
                    color: '#64748b',
                    margin: '4px 0 0 0',
                  }}>
                    Sécurité renforcée
                  </p>
                </div>
                <div style={{
                  padding: '4px 12px',
                  background: '#10b981',
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                }}>
                  Activé ✓
                </div>
              </div>
              <div style={{
                padding: '16px',
                background: 'rgba(245, 158, 11, 0.05)',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#0f172a',
                    margin: 0,
                  }}>
                    Partage de Données
                  </p>
                  <p style={{
                    fontSize: '12px',
                    color: '#64748b',
                    margin: '4px 0 0 0',
                  }}>
                    Consentement anonyme pour les analyses
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  style={{
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>
            <button style={{
              marginTop: '24px',
              padding: '12px 24px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s',
            }} onMouseEnter={(e) => e.target.style.opacity = '0.8'} onMouseLeave={(e) => e.target.style.opacity = '1'}>
              Déconnexion
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
