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
  const [selectedPeriod, setSelectedPeriod] = useState('1y');
  const [showNotifications, setShowNotifications] = useState(false);

  const [portfolioData, setPortfolioData] = useState({
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
    { id: 1, type: 'alert', title: 'Rebalancement Recommandé', message: 'Votre allocation a dérivé de 3%. Un rebalancement est suggéré.', time: 'il y a 2h', severity: 'high' },
    { id: 2, type: 'info', title: 'Dividende Reçu', message: 'Dividende de €145.50 versé sur votre PEA', time: 'il y a 4h', severity: 'medium' },
    { id: 3, type: 'alert', title: 'Volatilité Élevée', message: 'BTC a augmenté de 5.2% aujourd\'hui', time: 'il y a 6h', severity: 'medium' },
    { id: 4, type: 'success', title: 'Objectif Atteint', message: 'Vous avez atteint votre objectif de gain mensuel', time: 'hier', severity: 'low' },
  ]);

  const [projects, setProjects] = useState([
    {
      id: 1,
      name: 'Investissement Immobilier - Premier Appart',
      type: 'immobilier',
      initialInvestment: 250000,
      currentValue: 268500,
      projectedReturn: 18,
      timeline: '15 ans',
      status: 'active',
      riskLevel: 'modéré',
      aiNotes: 'Excellente stratégie. Le marché immobilier français offre une bonne stabilité. Recommandé de diversifier avec d\'autres actifs.',
      allocation: '45%',
      volatility: '3.2%',
      sharpeRatio: 1.8,
      yearGain: 18500,
      monthPerformance: 4.2,
    },
    {
      id: 2,
      name: 'Portefeuille Crypto Diversifié',
      type: 'crypto',
      initialInvestment: 15000,
      currentValue: 21750,
      projectedReturn: 45,
      timeline: '5 ans',
      status: 'active',
      riskLevel: 'élevé',
      aiNotes: 'Volatilité élevée détectée. Envisager un rebalancement. Maintenir une position conservatrice.',
      allocation: '12%',
      volatility: '42.8%',
      sharpeRatio: 0.92,
      yearGain: 6750,
      monthPerformance: 8.5,
    },
    {
      id: 3,
      name: 'PEA Multi-Secteurs',
      type: 'pea',
      initialInvestment: 75000,
      currentValue: 84430.50,
      projectedReturn: 12,
      timeline: '8 ans',
      status: 'active',
      riskLevel: 'faible',
      aiNotes: 'Très bon choix pour l\'imposition. Diversification optimale détectée.',
      allocation: '35%',
      volatility: '8.5%',
      sharpeRatio: 1.95,
      yearGain: 9430.50,
      monthPerformance: 2.1,
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
          gap: '24px',
          marginBottom: '32px',
          alignItems: 'center',
        }}>
          <div>
            <h1 style={{
              fontSize: '36px',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: '0 0 6px 0',
              letterSpacing: '-0.5px',
            }}>
              📊 Tableau de Bord
            </h1>
            <p style={{
              color: 'rgba(255, 255, 255, 0.5)',
              margin: 0,
              fontSize: '13px',
              letterSpacing: '0.3px',
            }}>
              Suivi temps réel de vos investissements
            </p>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
            borderRadius: '16px',
            padding: '20px 24px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(20px)',
            minWidth: '280px',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
          }}>
            <div style={{ marginBottom: '14px' }}>
              <p style={{
                fontSize: '11px',
                color: '#94a3b8',
                margin: '0 0 4px 0',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Profil
              </p>
              <p style={{
                fontSize: '17px',
                fontWeight: '800',
                color: '#0f172a',
                margin: '0',
              }}>
                Jean Dupont
              </p>
              <p style={{
                fontSize: '12px',
                color: '#94a3b8',
                margin: '3px 0 0 0',
                fontWeight: '500',
              }}>
                Membre depuis 3 ans
              </p>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              fontSize: '12px',
              borderTop: '1px solid rgba(59, 130, 246, 0.1)',
              paddingTop: '12px',
            }}>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600' }}>Projets</span>
                <p style={{ color: '#3b82f6', fontWeight: '800', margin: '2px 0 0 0', fontSize: '18px' }}>
                  {projects.length}
                </p>
              </div>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600' }}>KYC</span>
                <p style={{ color: '#10b981', fontWeight: '800', margin: '2px 0 0 0', fontSize: '13px' }}>
                  ✓ Vérifié
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION: PORTFOLIO OVERVIEW */}
        <div style={{
          marginBottom: '32px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}>
            <h2 style={{
              fontSize: '16px',
              fontWeight: '700',
              color: 'rgba(255, 255, 255, 0.9)',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              📈 Vue d'Ensemble Portefeuille
            </h2>
            <div style={{
              display: 'flex',
              gap: '8px',
            }}>
              {['1m', '3m', '6m', '1y', 'all'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  style={{
                    padding: '6px 12px',
                    background: selectedPeriod === period ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(255, 255, 255, 0.05)',
                    color: selectedPeriod === period ? 'white' : 'rgba(255, 255, 255, 0.6)',
                    border: selectedPeriod === period ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                  }}
                >
                  {period === '1m' && '1m'}
                  {period === '3m' && '3m'}
                  {period === '6m' && '6m'}
                  {period === '1y' && '1y'}
                  {period === 'all' && 'All'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PRIMARY METRICS - KEY STATS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}>
          {/* Main Metric: Portfolio Value */}
          <div className="metric-card" style={{
            gridColumn: 'span 1',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderRadius: '16px',
            padding: '28px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-50%',
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
              borderRadius: '50%',
            }} />
            <p style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.8)',
              margin: '0 0 8px 0',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              position: 'relative',
              zIndex: 1,
            }}>
              💼 Valeur Totale du Portefeuille
            </p>
            <p style={{
              fontSize: '32px',
              fontWeight: '900',
              color: 'white',
              margin: '0 0 12px 0',
              position: 'relative',
              zIndex: 1,
            }}>
              €{portfolioData.totalValue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
            </p>
            <div style={{
              display: 'flex',
              gap: '16px',
              position: 'relative',
              zIndex: 1,
            }}>
              <div>
                <p style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  margin: 0,
                  fontWeight: '600',
                }}>
                  Gain du Jour
                </p>
                <p style={{
                  fontSize: '18px',
                  fontWeight: '800',
                  color: 'rgba(16, 185, 129, 0.8)',
                  margin: '4px 0 0 0',
                }}>
                  +€{portfolioData.dayChange.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.2)', paddingLeft: '16px' }}>
                <p style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  margin: 0,
                  fontWeight: '600',
                }}>
                  % Variation
                </p>
                <p style={{
                  fontSize: '18px',
                  fontWeight: '800',
                  color: 'rgba(16, 185, 129, 0.8)',
                  margin: '4px 0 0 0',
                }}>
                  {portfolioData.dayChangePercent}%
                </p>
              </div>
            </div>
          </div>

          {/* Secondary Metric: YTD Return */}
          <div className="metric-card" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.97) 100%)',
            borderRadius: '16px',
            padding: '28px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
          }}>
            <p style={{
              fontSize: '12px',
              color: '#94a3b8',
              margin: '0 0 8px 0',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              📊 Rendement YTD
            </p>
            <p style={{
              fontSize: '32px',
              fontWeight: '900',
              color: '#3b82f6',
              margin: '0 0 12px 0',
            }}>
              {portfolioData.ytdReturn}%
            </p>
            <div>
              <p style={{
                fontSize: '12px',
                color: '#64748b',
                margin: 0,
                fontWeight: '600',
              }}>
                Gain: €{portfolioData.yearGain.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Secondary Metric: Risk Metrics */}
          <div className="metric-card" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.97) 100%)',
            borderRadius: '16px',
            padding: '28px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
          }}>
            <p style={{
              fontSize: '12px',
              color: '#94a3b8',
              margin: '0 0 8px 0',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              ⚖️ Métriques de Risque
            </p>
            <div style={{
              display: 'grid',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '600' }}>Sharpe Ratio</span>
                <span style={{ color: '#10b981', fontSize: '18px', fontWeight: '900' }}>{portfolioData.sharpeRatio}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '600' }}>Volatilité</span>
                <span style={{ color: '#f59e0b', fontSize: '18px', fontWeight: '900' }}>{portfolioData.volatility}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECONDARY METRICS GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}>
          <div className="metric-card" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
            borderRadius: '16px',
            padding: '18px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.1)',
          }}>
            <p style={{
              fontSize: '11px',
              color: '#94a3b8',
              margin: '0 0 6px 0',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              📉 Max Drawdown
            </p>
            <p style={{
              fontSize: '24px',
              fontWeight: '900',
              color: '#f43f5e',
              margin: 0,
            }}>
              {portfolioData.maxDrawdown}%
            </p>
          </div>

          <div className="metric-card" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
            borderRadius: '16px',
            padding: '18px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.1)',
          }}>
            <p style={{
              fontSize: '11px',
              color: '#94a3b8',
              margin: '0 0 6px 0',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              🎯 Win Rate
            </p>
            <p style={{
              fontSize: '24px',
              fontWeight: '900',
              color: '#10b981',
              margin: 0,
            }}>
              {portfolioData.winRate}%
            </p>
          </div>

          <div className="metric-card" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
            borderRadius: '16px',
            padding: '18px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.1)',
          }}>
            <p style={{
              fontSize: '11px',
              color: '#94a3b8',
              margin: '0 0 6px 0',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              💰 Investi
            </p>
            <p style={{
              fontSize: '20px',
              fontWeight: '900',
              color: '#3b82f6',
              margin: 0,
            }}>
              €{(portfolioData.totalInvested / 1000).toFixed(0)}k
            </p>
          </div>

          <div className="metric-card" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
            borderRadius: '16px',
            padding: '18px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.1)',
          }}>
            <p style={{
              fontSize: '11px',
              color: '#94a3b8',
              margin: '0 0 6px 0',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              📈 Gain Non-Réalisé
            </p>
            <p style={{
              fontSize: '20px',
              fontWeight: '900',
              color: '#10b981',
              margin: 0,
            }}>
              €{(portfolioData.unrealizedGain / 1000).toFixed(1)}k
            </p>
          </div>
        </div>

        {/* ANALYTICS SECTION HEADER */}
        <div style={{
          marginBottom: '20px',
        }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: '700',
            color: 'rgba(255, 255, 255, 0.9)',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            🔍 Analyse Détaillée
          </h2>
        </div>

        {/* ADVANCED ANALYTICS SECTION */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '40px',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
          }}>
            <h4 style={{
              fontSize: '13px',
              fontWeight: '700',
              color: '#0f172a',
              margin: '0 0 18px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              📊 Métriques Avancées
            </h4>
            <div style={{
              display: 'grid',
              gap: '14px',
            }}>
              {[
                { label: 'Alpha', value: portfolioMetrics.alpha, unit: '%', color: '#3b82f6' },
                { label: 'Beta', value: portfolioMetrics.beta, unit: '', color: '#8b5cf6' },
                { label: 'R-Squared', value: portfolioMetrics.rsquared, unit: '', color: '#10b981' },
                { label: 'Sortino Ratio', value: portfolioMetrics.sortinoRatio, unit: '', color: '#f59e0b' },
              ].map((metric, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: idx < 5 ? '1px solid rgba(59, 130, 246, 0.1)' : 'none',
                }}>
                  <span style={{
                    fontSize: '12px',
                    color: '#64748b',
                    fontWeight: '600',
                  }}>
                    {metric.label}
                  </span>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: '900',
                    color: metric.color,
                  }}>
                    {metric.value}{metric.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
          }}>
            <h4 style={{
              fontSize: '13px',
              fontWeight: '700',
              color: '#0f172a',
              margin: '0 0 18px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              💰 Synthèse Financière
            </h4>
            <div style={{
              display: 'grid',
              gap: '14px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
              }}>
                <span style={{
                  fontSize: '12px',
                  color: '#64748b',
                  fontWeight: '600',
                }}>
                  Capital Investi
                </span>
                <span style={{
                  fontSize: '15px',
                  fontWeight: '800',
                  color: '#3b82f6',
                }}>
                  €{(portfolioData.totalInvested / 1000).toFixed(0)}k
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
              }}>
                <span style={{
                  fontSize: '12px',
                  color: '#64748b',
                  fontWeight: '600',
                }}>
                  Gain Non-Réalisé
                </span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#10b981',
                }}>
                  +€{portfolioData.unrealizedGain.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
              }}>
                <span style={{
                  fontSize: '12px',
                  color: '#64748b',
                  fontWeight: '600',
                }}>
                  Variation Semaine
                </span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#10b981',
                }}>
                  +€{portfolioData.weekChange.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
              }}>
                <span style={{
                  fontSize: '12px',
                  color: '#64748b',
                  fontWeight: '600',
                }}>
                  Variation Mois
                </span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#10b981',
                }}>
                  +€{portfolioData.monthChange.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              🔔
            </button>
            <h4 style={{
              fontSize: '13px',
              fontWeight: '700',
              color: '#0f172a',
              margin: '0 0 16px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              🚨 Alertes
            </h4>
            <div style={{
              display: 'grid',
              gap: '8px',
              maxHeight: '200px',
              overflowY: 'auto',
            }}>
              {notifications.slice(0, 3).map((notif) => (
                <div
                  key={notif.id}
                  style={{
                    padding: '10px 12px',
                    background: notif.severity === 'high' ? 'rgba(239, 68, 68, 0.05)' : notif.severity === 'medium' ? 'rgba(245, 158, 11, 0.05)' : 'rgba(16, 185, 129, 0.05)',
                    borderLeft: `3px solid ${notif.severity === 'high' ? '#ef4444' : notif.severity === 'medium' ? '#f59e0b' : '#10b981'}`,
                    borderRadius: '6px',
                  }}
                >
                  <p style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#0f172a',
                    margin: '0 0 2px 0',
                  }}>
                    {notif.title}
                  </p>
                  <p style={{
                    fontSize: '10px',
                    color: '#64748b',
                    margin: '0 0 2px 0',
                  }}>
                    {notif.message}
                  </p>
                  <p style={{
                    fontSize: '9px',
                    color: '#94a3b8',
                    margin: 0,
                  }}>
                    {notif.time}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '36px',
          marginTop: '40px',
          paddingBottom: '0',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          {['overview', 'projects', 'simulators', 'education', 'market', 'risk', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-button ${activeTab === tab ? 'active' : ''}`}
              style={{
                background: activeTab === tab ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '10px 16px',
                color: activeTab === tab ? '#3b82f6' : 'rgba(255, 255, 255, 0.5)',
                fontSize: '13px',
                fontWeight: activeTab === tab ? '700' : '600',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                borderBottom: activeTab === tab ? '2px solid #3b82f6' : 'none',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab) {
                  e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.target.style.color = 'rgba(255, 255, 255, 0.7)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab) {
                  e.target.style.background = 'transparent';
                  e.target.style.color = 'rgba(255, 255, 255, 0.5)';
                }
              }}
            >
              {tab === 'overview' && '📊 Aperçu'}
              {tab === 'projects' && '🎯 Projets'}
              {tab === 'simulators' && '🛠️ Simulateurs'}
              {tab === 'education' && '📚 Académie'}
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
            gap: '24px',
          }}>
            {/* Quick Actions & Allocations */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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
                  <button style={{
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.3s',
                  }} onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}>
                    ⚙️ Rebalancer Automatiquement
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
                    { label: 'Immobilier', value: 45, color: '#3b82f6', target: 40 },
                    { label: 'PEA/Bourse', value: 35, color: '#8b5cf6', target: 40 },
                    { label: 'Crypto', value: 12, color: '#f59e0b', target: 10 },
                    { label: 'Obligations', value: 8, color: '#10b981', target: 10 },
                  ].map((item, idx) => (
                    <div key={idx}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                        fontSize: '13px',
                      }}>
                        <span style={{ color: '#0f172a', fontWeight: '600' }}>{item.label}</span>
                        <span style={{ color: '#64748b', fontWeight: '600' }}>
                          {item.value}%
                          <span style={{ fontSize: '11px', marginLeft: '4px', opacity: 0.6 }}>
                            (Cible: {item.target}%)
                          </span>
                        </span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        position: 'relative',
                      }}>
                        <div style={{
                          width: `${item.value}%`,
                          height: '100%',
                          background: item.color,
                          position: 'relative',
                        }} />
                        <div style={{
                          position: 'absolute',
                          width: '2px',
                          height: '100%',
                          background: 'rgba(0, 0, 0, 0.2)',
                          left: `${item.target}%`,
                          top: 0,
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity & Dividends */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '24px',
            }}>
              {/* Recent Transactions */}
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
                  📝 Transactions Récentes
                </h3>
                <div style={{
                  display: 'grid',
                  gap: '12px',
                }}>
                  {[
                    { type: 'buy', asset: 'Apple Inc. (AAPL)', amount: 1500, price: 185.32, date: 'il y a 2h', change: '+2.3%' },
                    { type: 'dividend', asset: 'ETF Vanguard S&P 500', amount: 145.50, price: 'Dividende', date: 'il y a 1j', change: '+0%' },
                    { type: 'sell', asset: 'Tesla (TSLA)', amount: 2000, price: 142.65, date: 'il y a 3j', change: '-1.2%' },
                    { type: 'buy', asset: 'ETF MSCI World', amount: 5000, price: 82.15, date: 'il y a 5j', change: '+1.5%' },
                  ].map((trans, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: 'rgba(59, 130, 246, 0.03)',
                        borderRadius: '8px',
                        borderLeft: `3px solid ${trans.type === 'buy' ? '#10b981' : trans.type === 'dividend' ? '#f59e0b' : '#ef4444'}`,
                      }}
                    >
                      <div style={{
                        flex: 1,
                      }}>
                        <p style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#0f172a',
                          margin: '0 0 2px 0',
                        }}>
                          {trans.type === 'buy' && '📈'} {trans.type === 'sell' && '📉'} {trans.type === 'dividend' && '💰'} {trans.asset}
                        </p>
                        <p style={{
                          fontSize: '11px',
                          color: '#64748b',
                          margin: 0,
                        }}>
                          {trans.date}
                        </p>
                      </div>
                      <div style={{
                        textAlign: 'right',
                      }}>
                        <p style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#0f172a',
                          margin: '0 0 2px 0',
                        }}>
                          €{trans.amount.toLocaleString('fr-FR')}
                        </p>
                        <p style={{
                          fontSize: '11px',
                          color: trans.change.includes('-') ? '#ef4444' : '#10b981',
                          margin: 0,
                          fontWeight: '600',
                        }}>
                          {trans.change}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dividends & Income */}
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
                  💵 Revenus Passifs & Dividendes
                </h3>
                <div style={{
                  display: 'grid',
                  gap: '16px',
                }}>
                  <div style={{
                    padding: '16px',
                    background: 'rgba(16, 185, 129, 0.05)',
                    borderRadius: '12px',
                    borderLeft: '4px solid #10b981',
                  }}>
                    <p style={{
                      fontSize: '12px',
                      color: '#64748b',
                      margin: '0 0 4px 0',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                    }}>
                      Dividendes ce mois
                    </p>
                    <p style={{
                      fontSize: '22px',
                      fontWeight: '900',
                      color: '#10b981',
                      margin: '0 0 4px 0',
                    }}>
                      +€287.45
                    </p>
                    <p style={{
                      fontSize: '11px',
                      color: '#64748b',
                      margin: 0,
                    }}>
                      Rendement annualisé: 3.8%
                    </p>
                  </div>

                  <div style={{
                    padding: '16px',
                    background: 'rgba(59, 130, 246, 0.05)',
                    borderRadius: '12px',
                    borderLeft: '4px solid #3b82f6',
                  }}>
                    <p style={{
                      fontSize: '12px',
                      color: '#64748b',
                      margin: '0 0 4px 0',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                    }}>
                      Dividendes YTD
                    </p>
                    <p style={{
                      fontSize: '22px',
                      fontWeight: '900',
                      color: '#3b82f6',
                      margin: '0 0 4px 0',
                    }}>
                      +€1,245.30
                    </p>
                    <p style={{
                      fontSize: '11px',
                      color: '#64748b',
                      margin: 0,
                    }}>
                      Prochains paiements: 15 oct., 22 nov.
                    </p>
                  </div>

                  <div style={{
                    padding: '16px',
                    background: 'rgba(139, 92, 246, 0.05)',
                    borderRadius: '12px',
                    borderLeft: '4px solid #8b5cf6',
                  }}>
                    <p style={{
                      fontSize: '12px',
                      color: '#64748b',
                      margin: '0 0 4px 0',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                    }}>
                      Intérêts composés
                    </p>
                    <p style={{
                      fontSize: '22px',
                      fontWeight: '900',
                      color: '#8b5cf6',
                      margin: '0 0 4px 0',
                    }}>
                      +€5,234.87
                    </p>
                    <p style={{
                      fontSize: '11px',
                      color: '#64748b',
                      margin: 0,
                    }}>
                      Croissance depuis 1 an
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Calendar & Upcoming Events */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
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
                  📅 Événements Importants
                </h3>
                <div style={{
                  display: 'grid',
                  gap: '12px',
                }}>
                  {[
                    { date: '15 Oct 2026', event: 'Dividende Apple', color: '#f59e0b' },
                    { date: '22 Oct 2026', event: 'Résultats Vanguard ETF', color: '#8b5cf6' },
                    { date: '01 Nov 2026', event: 'Rebalancement Automatique', color: '#3b82f6' },
                    { date: '10 Nov 2026', event: 'Fin Période Fiscale', color: '#ef4444' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: 'rgba(59, 130, 246, 0.03)',
                        borderRadius: '8px',
                        borderLeft: `3px solid ${item.color}`,
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: `${item.color}20`,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                      }}>
                        📌
                      </div>
                      <div style={{
                        flex: 1,
                      }}>
                        <p style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#0f172a',
                          margin: '0 0 2px 0',
                        }}>
                          {item.event}
                        </p>
                        <p style={{
                          fontSize: '11px',
                          color: '#64748b',
                          margin: 0,
                        }}>
                          {item.date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance by Period */}
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
                  📊 Performance par Période
                </h3>
                <div style={{
                  display: 'grid',
                  gap: '12px',
                }}>
                  {[
                    { period: 'Dernière Semaine', return: '+2.34%', color: '#10b981' },
                    { period: 'Dernier Mois', return: '+3.85%', color: '#10b981' },
                    { period: 'Dernier Trimestre', return: '+8.42%', color: '#10b981' },
                    { period: 'Année en cours', return: '+18.34%', color: '#10b981' },
                    { period: 'Depuis le début', return: '+125.48%', color: '#3b82f6' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: 'rgba(59, 130, 246, 0.03)',
                        borderRadius: '8px',
                        borderBottom: idx < 4 ? '1px solid rgba(59, 130, 246, 0.1)' : 'none',
                      }}
                    >
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#64748b',
                      }}>
                        {item.period}
                      </span>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '900',
                        color: item.color,
                      }}>
                        {item.return}
                      </span>
                    </div>
                  ))}
                </div>
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

            {/* Projects Statistics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
                borderRadius: '16px',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(20px)',
              }}>
                <p style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  margin: '0 0 6px 0',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                }}>
                  Projets Actifs
                </p>
                <p style={{
                  fontSize: '24px',
                  fontWeight: '900',
                  color: '#0f172a',
                  margin: 0,
                }}>
                  {projects.length}
                </p>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
                borderRadius: '16px',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(20px)',
              }}>
                <p style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  margin: '0 0 6px 0',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                }}>
                  Capital Alloué
                </p>
                <p style={{
                  fontSize: '20px',
                  fontWeight: '900',
                  color: '#0f172a',
                  margin: 0,
                }}>
                  €{projects.reduce((sum, p) => sum + p.initialInvestment, 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
                borderRadius: '16px',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(20px)',
              }}>
                <p style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  margin: '0 0 6px 0',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                }}>
                  Gain Total
                </p>
                <p style={{
                  fontSize: '20px',
                  fontWeight: '900',
                  color: '#10b981',
                  margin: 0,
                }}>
                  €{projects.reduce((sum, p) => sum + p.yearGain, 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
                borderRadius: '16px',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(20px)',
              }}>
                <p style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  margin: '0 0 6px 0',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                }}>
                  Retour Moyen
                </p>
                <p style={{
                  fontSize: '20px',
                  fontWeight: '900',
                  color: '#3b82f6',
                  margin: 0,
                }}>
                  {(projects.reduce((sum, p) => sum + p.projectedReturn, 0) / projects.length).toFixed(1)}%
                </p>
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
                      gridTemplateColumns: 'auto 1fr 1fr 1fr auto',
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
                        fontSize: '11px',
                        color: '#64748b',
                      }}>
                        <span>Investi: €{project.initialInvestment.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</span>
                        <span>•</span>
                        <span>Valeur: €{project.currentValue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                    <div>
                      <p style={{
                        fontSize: '11px',
                        color: '#94a3b8',
                        margin: '0 0 4px 0',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                      }}>
                        Performance
                      </p>
                      <p style={{
                        fontSize: '16px',
                        fontWeight: '900',
                        color: '#10b981',
                        margin: 0,
                      }}>
                        +{project.monthPerformance}%
                      </p>
                      <p style={{
                        fontSize: '10px',
                        color: '#64748b',
                        margin: '2px 0 0 0',
                      }}>
                        ce mois
                      </p>
                    </div>
                    <div>
                      <p style={{
                        fontSize: '11px',
                        color: '#94a3b8',
                        margin: '0 0 4px 0',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                      }}>
                        Sharpe Ratio
                      </p>
                      <p style={{
                        fontSize: '16px',
                        fontWeight: '900',
                        color: '#8b5cf6',
                        margin: 0,
                      }}>
                        {project.sharpeRatio}
                      </p>
                      <p style={{
                        fontSize: '10px',
                        color: '#64748b',
                        margin: '2px 0 0 0',
                      }}>
                        ratio rendement
                      </p>
                    </div>
                    <div style={{
                      textAlign: 'right',
                    }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        background: project.riskLevel === 'élevé' ? 'rgba(239, 68, 68, 0.1)' : project.riskLevel === 'modéré' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: project.riskLevel === 'élevé' ? '#ef4444' : project.riskLevel === 'modéré' ? '#f59e0b' : '#10b981',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '700',
                      }}>
                        {project.riskLevel.toUpperCase()}
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
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '16px',
                        marginBottom: '16px',
                      }}>
                        <div>
                          <h5 style={{
                            fontSize: '12px',
                            color: '#94a3b8',
                            margin: '0 0 8px 0',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                          }}>
                            📊 Métriques Détaillées
                          </h5>
                          <div style={{
                            display: 'grid',
                            gap: '8px',
                            fontSize: '12px',
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                              paddingBottom: '6px',
                            }}>
                              <span style={{ color: '#64748b' }}>Allocation:</span>
                              <span style={{ fontWeight: '700', color: '#0f172a' }}>{project.allocation}</span>
                            </div>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                              paddingBottom: '6px',
                            }}>
                              <span style={{ color: '#64748b' }}>Volatilité:</span>
                              <span style={{ fontWeight: '700', color: '#f59e0b' }}>{project.volatility}</span>
                            </div>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                              paddingBottom: '6px',
                            }}>
                              <span style={{ color: '#64748b' }}>Sharpe:</span>
                              <span style={{ fontWeight: '700', color: '#8b5cf6' }}>{project.sharpeRatio}</span>
                            </div>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                              paddingBottom: '6px',
                            }}>
                              <span style={{ color: '#64748b' }}>Gain annuel:</span>
                              <span style={{ fontWeight: '700', color: '#10b981' }}>+€{project.yearGain.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}>
                              <span style={{ color: '#64748b' }}>ROI projeté:</span>
                              <span style={{ fontWeight: '700', color: '#3b82f6' }}>{project.projectedReturn}%</span>
                            </div>
                          </div>
                        </div>

                        <div>
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
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
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
                          📊 Rapport PDF
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
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }} onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(16, 185, 129, 0.2)';
                        }} onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(16, 185, 129, 0.1)';
                        }}>
                          📈 Backtest
                        </button>
                        <button style={{
                          padding: '10px 16px',
                          background: 'rgba(245, 158, 11, 0.1)',
                          color: '#f59e0b',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }} onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(245, 158, 11, 0.2)';
                        }} onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(245, 158, 11, 0.1)';
                        }}>
                          ⚙️ Rebalancer
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

        {activeTab === 'education' && (
          <div className="accordion-content" style={{
            display: 'grid',
            gap: '24px',
          }}>
            {/* Académie Header */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
              borderRadius: '16px',
              padding: '32px',
              border: '2px solid rgba(59, 130, 246, 0.3)',
              textAlign: 'center',
            }}>
              <h2 style={{
                fontSize: '32px',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '12px',
              }}>📚 Académie InvestKit</h2>
              <p style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '16px',
                marginBottom: '24px',
              }}>Maîtrisez l'investissement avec nos formations gamifiées et nos badges</p>

              <Link href="/education" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '14px 32px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-4px)';
                  e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}>
                  Accéder à l'Académie →
                </button>
              </Link>
            </div>

            {/* Domaines Disponibles */}
            <div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: 'white',
                marginBottom: '16px',
              }}>Domaines Disponibles</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
              }}>
                {[
                  { name: 'Cryptomonnaies', icon: '₿', color: '#F7931A', desc: '4 chapitres • Bitcoin, Ethereum, DeFi' },
                  { name: 'Bourse & PEA', icon: '📈', color: '#1E40AF', desc: '3 chapitres • Actions, Analyse, Stratégies' },
                  { name: 'Immobilier', icon: '🏠', color: '#8B4513', desc: 'À venir • Investissement locatif' },
                  { name: 'Obligations', icon: '💼', color: '#16A34A', desc: 'À venir • Emprunts et revenus fixes' },
                ].map((domain, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: `linear-gradient(135deg, ${domain.color}15 0%, ${domain.color}05 100%)`,
                      borderRadius: '12px',
                      padding: '20px',
                      border: `1px solid ${domain.color}40`,
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = domain.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>{domain.icon}</div>
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'white', marginBottom: '4px' }}>
                      {domain.name}
                    </h4>
                    <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
                      {domain.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Avantages */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#10b981',
                marginBottom: '16px',
              }}>✨ Pourquoi l'Académie ?</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
              }}>
                {[
                  '🎓 Formations gamifiées avec badges',
                  '⭐ Système de niveaux et XP',
                  '🔒 Progression bloquée par compréhension',
                  '📚 Vocabulaire interactif',
                  '🎯 Quiz intelligents',
                  '🏆 Certificats à débloquer',
                ].map((benefit, idx) => (
                  <div key={idx} style={{
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.8)',
                  }}>
                    {benefit}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'market' && (
          <div className="accordion-content" style={{
            display: 'grid',
            gap: '24px',
          }}>
            {/* Main Market Data */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
            }}>
              {marketData.map((data, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
                    borderRadius: '16px',
                    padding: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '12px',
                  }}>
                    <h3 style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#0f172a',
                      margin: 0,
                    }}>
                      {data.name}
                    </h3>
                    <div style={{
                      padding: '4px 10px',
                      background: data.changePercent >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '16px',
                      color: data.changePercent >= 0 ? '#10b981' : '#ef4444',
                      fontSize: '11px',
                      fontWeight: '700',
                    }}>
                      {data.changePercent >= 0 ? '↑' : '↓'} {Math.abs(data.changePercent)}%
                    </div>
                  </div>
                  <div style={{
                    fontSize: '22px',
                    fontWeight: '900',
                    color: '#0f172a',
                    marginBottom: '8px',
                  }}>
                    {data.value.toLocaleString('fr-FR')}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: data.change >= 0 ? '#10b981' : '#ef4444',
                    fontWeight: '700',
                  }}>
                    {data.change >= 0 ? '+' : ''}{data.change.toLocaleString('fr-FR')}
                  </div>
                </div>
              ))}
            </div>

            {/* Market Watchlist */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
              borderRadius: '20px',
              padding: '28px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#0f172a',
                  margin: 0,
                }}>
                  👁️ Votre Watchlist
                </h3>
                <button style={{
                  padding: '6px 12px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: '#3b82f6',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}>
                  + Ajouter
                </button>
              </div>
              <div style={{
                display: 'grid',
                gap: '12px',
              }}>
                {[
                  { symbol: 'MSFT', name: 'Microsoft', price: 427.85, change: 3.45, pe: 32.1, dividend: '0.68%' },
                  { symbol: 'NVDA', name: 'NVIDIA', price: 892.50, change: 8.23, pe: 58.4, dividend: '0.02%' },
                  { symbol: 'JPM', name: 'JP Morgan', price: 182.30, change: -1.23, pe: 12.8, dividend: '2.85%' },
                  { symbol: 'XOM', name: 'ExxonMobil', price: 115.75, change: 2.10, pe: 10.2, dividend: '3.92%' },
                  { symbol: 'VTI', name: 'Vanguard Total Stock', price: 243.15, change: 1.85, pe: 22.5, dividend: '1.45%' },
                ].map((stock, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '80px 1fr 80px 80px 80px auto',
                      gap: '12px',
                      alignItems: 'center',
                      padding: '12px',
                      background: 'rgba(59, 130, 246, 0.03)',
                      borderRadius: '8px',
                      borderBottom: idx < 4 ? '1px solid rgba(59, 130, 246, 0.1)' : 'none',
                    }}
                  >
                    <div>
                      <p style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#0f172a',
                        margin: 0,
                      }}>
                        {stock.symbol}
                      </p>
                      <p style={{
                        fontSize: '10px',
                        color: '#64748b',
                        margin: '2px 0 0 0',
                      }}>
                        {stock.name}
                      </p>
                    </div>
                    <div />
                    <div style={{
                      textAlign: 'right',
                    }}>
                      <p style={{
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#0f172a',
                        margin: 0,
                      }}>
                        €{stock.price.toLocaleString('fr-FR')}
                      </p>
                      <p style={{
                        fontSize: '10px',
                        color: stock.change >= 0 ? '#10b981' : '#ef4444',
                        margin: '2px 0 0 0',
                        fontWeight: '600',
                      }}>
                        {stock.change >= 0 ? '↑' : '↓'} {Math.abs(stock.change)}%
                      </p>
                    </div>
                    <div style={{
                      textAlign: 'center',
                      fontSize: '11px',
                    }}>
                      <p style={{
                        color: '#94a3b8',
                        margin: '0 0 4px 0',
                        fontWeight: '600',
                      }}>
                        P/E
                      </p>
                      <p style={{
                        color: '#0f172a',
                        margin: 0,
                        fontWeight: '700',
                      }}>
                        {stock.pe}
                      </p>
                    </div>
                    <div style={{
                      textAlign: 'center',
                      fontSize: '11px',
                    }}>
                      <p style={{
                        color: '#94a3b8',
                        margin: '0 0 4px 0',
                        fontWeight: '600',
                      }}>
                        Div
                      </p>
                      <p style={{
                        color: '#10b981',
                        margin: 0,
                        fontWeight: '700',
                      }}>
                        {stock.dividend}
                      </p>
                    </div>
                    <button style={{
                      padding: '6px 10px',
                      background: 'rgba(139, 92, 246, 0.1)',
                      color: '#8b5cf6',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}>
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Trends */}
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
                📈 Tendances du Marché
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px',
              }}>
                {[
                  { category: 'Sectors Haut', items: ['Tech (+4.2%)', 'Healthcare (+2.8%)', 'Finance (+1.9%)'], icon: '📈' },
                  { category: 'Sectors Bas', items: ['Energy (-2.1%)', 'Utilities (-1.5%)', 'Materials (-0.8%)'], icon: '📉' },
                  { category: 'Indices Majeurs', items: ['S&P 500 (+1.8%)', 'NASDAQ (+2.5%)', 'Russell 2000 (+0.6%)'], icon: '📊' },
                  { category: 'Cryptomonnaies', items: ['Bitcoin (+3.2%)', 'Ethereum (+2.1%)', 'Solana (+5.8%)'], icon: '₿' },
                ].map((trend, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '16px',
                      background: 'rgba(59, 130, 246, 0.03)',
                      borderRadius: '12px',
                      borderLeft: '3px solid #3b82f6',
                    }}
                  >
                    <p style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#0f172a',
                      margin: '0 0 12px 0',
                    }}>
                      {trend.icon} {trend.category}
                    </p>
                    <div style={{
                      display: 'grid',
                      gap: '6px',
                    }}>
                      {trend.items.map((item, i) => (
                        <p
                          key={i}
                          style={{
                            fontSize: '11px',
                            color: item.includes('-') ? '#ef4444' : '#10b981',
                            margin: 0,
                            fontWeight: '600',
                          }}
                        >
                          {item.includes('-') ? '↓' : '↑'} {item}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Economic Calendar */}
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
                📅 Calendrier Économique (Prochains événements)
              </h3>
              <div style={{
                display: 'grid',
                gap: '12px',
              }}>
                {[
                  { date: 'Aujourd\'hui 14:30', event: 'Données Emploi USA', impact: 'Élevé', forecast: '200K', previous: '195K' },
                  { date: 'Demain 10:00', event: 'Inflation Zone Euro', impact: 'Élevé', forecast: '2.1%', previous: '2.4%' },
                  { date: 'Jeudi 18:00', event: 'Réserves Fédérales', impact: 'Élevé', forecast: 'Stable', previous: '-' },
                  { date: 'Vendredi 08:00', event: 'Ventes au Détail UK', impact: 'Moyen', forecast: '+0.1%', previous: '-0.2%' },
                ].map((event, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px',
                      background: 'rgba(59, 130, 246, 0.03)',
                      borderRadius: '8px',
                      borderLeft: event.impact === 'Élevé' ? '3px solid #ef4444' : '3px solid #f59e0b',
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr auto',
                      gap: '12px',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <p style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#64748b',
                        margin: 0,
                      }}>
                        {event.date}
                      </p>
                    </div>
                    <div>
                      <p style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#0f172a',
                        margin: '0 0 4px 0',
                      }}>
                        {event.event}
                      </p>
                      <p style={{
                        fontSize: '10px',
                        color: '#64748b',
                        margin: 0,
                      }}>
                        Prévu: {event.forecast} | Précédent: {event.previous}
                      </p>
                    </div>
                    <div style={{
                      padding: '4px 8px',
                      background: event.impact === 'Élevé' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: event.impact === 'Élevé' ? '#ef4444' : '#f59e0b',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                    }}>
                      {event.impact}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="accordion-content" style={{
            display: 'grid',
            gap: '24px',
          }}>
            {/* Main Risk Analysis */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
              }}>
                <p style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  margin: '0 0 8px 0',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                }}>
                  Niveau Risque Global
                </p>
                <p style={{
                  fontSize: '32px',
                  fontWeight: '900',
                  color: '#f59e0b',
                  margin: '0 0 12px 0',
                }}>
                  {riskAnalysis.overallRisk}
                </p>
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  marginBottom: '12px',
                }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: '6px',
                        background: i <= 3 ? '#f59e0b' : 'rgba(0, 0, 0, 0.1)',
                        borderRadius: '3px',
                      }}
                    />
                  ))}
                </div>
                <p style={{
                  fontSize: '11px',
                  color: '#64748b',
                  margin: 0,
                }}>
                  3/5 - Risque Modéré Optimal
                </p>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
              }}>
                <p style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  margin: '0 0 8px 0',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                }}>
                  Score Diversification
                </p>
                <p style={{
                  fontSize: '32px',
                  fontWeight: '900',
                  color: '#8b5cf6',
                  margin: '0 0 12px 0',
                }}>
                  {riskAnalysis.diversificationScore}%
                </p>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${riskAnalysis.diversificationScore}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)',
                  }} />
                </div>
                <p style={{
                  fontSize: '11px',
                  color: '#64748b',
                  margin: '8px 0 0 0',
                }}>
                  Très bien diversifié ✓
                </p>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
              }}>
                <p style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  margin: '0 0 8px 0',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                }}>
                  Corrélation Assets
                </p>
                <p style={{
                  fontSize: '32px',
                  fontWeight: '900',
                  color: '#3b82f6',
                  margin: '0 0 12px 0',
                }}>
                  {riskAnalysis.correlationIndex}
                </p>
                <p style={{
                  fontSize: '11px',
                  color: '#64748b',
                  margin: 0,
                }}>
                  Corrélation basse = Diversification optimale
                </p>
              </div>
            </div>

            {/* Risk Metrics Grid */}
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
                📊 Métriques de Risque Avancées
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
              }}>
                {[
                  { label: 'Value at Risk (95%)', value: '-€2,845.30', type: 'risk' },
                  { label: 'Conditional VaR', value: '-€3,456.75', type: 'risk' },
                  { label: 'Stress Test (10% chute)', value: '-€24,568.05', type: 'risk' },
                  { label: 'Probabilité Drawdown > 10%', value: '12.3%', type: 'risk' },
                  { label: 'Recovery Time (avg)', value: '28 jours', type: 'time' },
                  { label: 'Coefficient d\'Asymétrie', value: '0.34', type: 'normal' },
                ].map((metric, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '16px',
                      background: metric.type === 'risk' ? 'rgba(239, 68, 68, 0.05)' : metric.type === 'time' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(16, 185, 129, 0.05)',
                      borderRadius: '12px',
                      borderLeft: `3px solid ${metric.type === 'risk' ? '#ef4444' : metric.type === 'time' ? '#3b82f6' : '#10b981'}`,
                    }}
                  >
                    <p style={{
                      fontSize: '11px',
                      color: '#94a3b8',
                      margin: '0 0 6px 0',
                      fontWeight: '700',
                    }}>
                      {metric.label}
                    </p>
                    <p style={{
                      fontSize: '18px',
                      fontWeight: '900',
                      color: metric.type === 'risk' ? '#ef4444' : metric.type === 'time' ? '#3b82f6' : '#10b981',
                      margin: 0,
                    }}>
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Correlation Matrix */}
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
                🔗 Matrice de Corrélation entre Assets
              </h3>
              <div style={{
                overflowX: 'auto',
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                }}>
                  <tbody>
                    {[
                      { asset: 'Immobilier', val1: '1.00', val2: '0.35', val3: '-0.12', val4: '0.45' },
                      { asset: 'PEA', val1: '0.35', val2: '1.00', val3: '0.52', val4: '0.28' },
                      { asset: 'Crypto', val1: '-0.12', val2: '0.52', val3: '1.00', val4: '-0.08' },
                      { asset: 'Obligations', val1: '0.45', val2: '0.28', val3: '-0.08', val4: '1.00' },
                    ].map((row, idx) => (
                      <tr key={idx}>
                        <td style={{
                          padding: '12px',
                          fontWeight: '700',
                          color: '#0f172a',
                          borderRight: '1px solid rgba(59, 130, 246, 0.1)',
                          background: 'rgba(59, 130, 246, 0.05)',
                        }}>
                          {row.asset}
                        </td>
                        {[row.val1, row.val2, row.val3, row.val4].map((val, i) => {
                          const num = parseFloat(val);
                          let bgColor = 'rgba(255, 255, 255, 0.5)';
                          if (num > 0.5) bgColor = 'rgba(16, 185, 129, 0.1)';
                          else if (num > 0) bgColor = 'rgba(59, 130, 246, 0.05)';
                          else if (num > -0.3) bgColor = 'rgba(245, 158, 11, 0.05)';
                          else bgColor = 'rgba(239, 68, 68, 0.1)';

                          return (
                            <td
                              key={i}
                              style={{
                                padding: '12px',
                                textAlign: 'center',
                                background: bgColor,
                                borderRight: i < 3 ? '1px solid rgba(59, 130, 246, 0.1)' : 'none',
                                fontWeight: '600',
                              }}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{
                fontSize: '11px',
                color: '#64748b',
                margin: '16px 0 0 0',
              }}>
                Les valeurs proches de -1 indiquent une corrélation négative (bonne diversification). Les valeurs proches de 1 indiquent une corrélation positive.
              </p>
            </div>

            {/* Recommendations */}
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
                💡 Recommandations IA Personnalisées
              </h3>
              <div style={{
                display: 'grid',
                gap: '12px',
              }}>
                {riskAnalysis.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '16px',
                      background: 'rgba(16, 185, 129, 0.05)',
                      border: '1px solid rgba(16, 185, 129, 0.1)',
                      borderLeft: '4px solid #10b981',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#0f172a',
                    }}
                  >
                    <p style={{ margin: '0 0 4px 0', fontWeight: '600' }}>
                      ✓ {rec}
                    </p>
                    <p style={{
                      fontSize: '11px',
                      color: '#64748b',
                      margin: 0,
                    }}>
                      Impact estimé: +0.{3 + idx}% annuel
                    </p>
                  </div>
                ))}
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
