'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEducationProgress } from '@/app/context/EducationContext';
import { useUser } from '@/app/context/UserContext';
import { educationDomains } from '@/data/education';

export default function DashboardPage() {
  const router = useRouter();
  const { progress, isDomainCompleted, getDomainProgress } = useEducationProgress();
  const { user: userData, acceptFriendRequest, rejectFriendRequest } = useUser();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedProject, setExpandedProject] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [newsModalTab, setNewsModalTab] = useState('news');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [settingsTab, setSettingsTab] = useState('general');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [fullName, setFullName] = useState('Jean Dupont');
  const [email, setEmail] = useState('jean.dupont@example.com');
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [hideStats, setHideStats] = useState(false);
  const [shareProgress, setShareProgress] = useState(true);
  const [preferredDomain, setPreferredDomain] = useState('crypto');
  const [difficultyLevel, setDifficultyLevel] = useState('intermediate');
  const [academyNotifications, setAcademyNotifications] = useState(true);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const theme = {
    dark: {
      bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)',
      cardBg: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
      text: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.6)',
      textTertiary: 'rgba(255, 255, 255, 0.5)',
      border: 'rgba(255, 255, 255, 0.1)',
      accent: '#3b82f6',
    },
    light: {
      bg: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f0f4f8 100%)',
      cardBg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)',
      text: '#1e293b',
      textSecondary: 'rgba(30, 41, 59, 0.6)',
      textTertiary: 'rgba(30, 41, 59, 0.5)',
      border: 'rgba(30, 41, 59, 0.1)',
      accent: '#2563eb',
    },
  };

  const currentTheme = isDarkMode ? theme.dark : theme.light;

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

  const [dailyTips] = useState([
    {
      id: 1,
      title: 'Règle des 50/30/20',
      tip: 'Alloquez 50% à vos besoins, 30% à vos envies et 20% à l\'épargne/investissement',
      icon: '💰',
    },
    {
      id: 2,
      title: 'Diversification',
      tip: 'Ne mettez jamais tout votre argent dans un seul investissement. Répartissez le risque.',
      icon: '📊',
    },
    {
      id: 3,
      title: 'Dollar Cost Averaging',
      tip: 'Investissez régulièrement des montants fixes pour lisser les prix d\'achat',
      icon: '📈',
    },
    {
      id: 4,
      title: 'Fonds d\'urgence',
      tip: 'Maintenez 3-6 mois de dépenses en compte d\'épargne avant d\'investir',
      icon: '🛡️',
    },
    {
      id: 5,
      title: 'Rebalancement',
      tip: 'Réajustez votre portefeuille 2x par an pour maintenir votre allocation cible',
      icon: '⚖️',
    },
  ]);

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

    // Load theme preference
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (savedTheme === 'light') {
      setIsDarkMode(false);
    }

    // Load profile photo
    const savedPhoto = typeof window !== 'undefined' ? localStorage.getItem('profilePhoto') : null;
    if (savedPhoto) {
      setPhotoPreview(savedPhoto);
    }

    // Load profile data (name, email)
    const savedName = typeof window !== 'undefined' ? localStorage.getItem('userFullName') : null;
    if (savedName) {
      setFullName(savedName);
    }
    const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
    if (savedEmail) {
      setEmail(savedEmail);
    }

    // Load visibility settings
    const savedVisibility = typeof window !== 'undefined' ? localStorage.getItem('profileVisibility') : null;
    if (savedVisibility) {
      setProfileVisibility(savedVisibility);
    }
    const savedHideStats = typeof window !== 'undefined' ? localStorage.getItem('hideStats') : null;
    if (savedHideStats) {
      setHideStats(JSON.parse(savedHideStats));
    }
    const savedShareProgress = typeof window !== 'undefined' ? localStorage.getItem('shareProgress') : null;
    if (savedShareProgress !== null) {
      setShareProgress(JSON.parse(savedShareProgress));
    }

    // Load learning preferences
    const savedDomain = typeof window !== 'undefined' ? localStorage.getItem('preferredDomain') : null;
    if (savedDomain) {
      setPreferredDomain(savedDomain);
    }
    const savedDifficulty = typeof window !== 'undefined' ? localStorage.getItem('difficultyLevel') : null;
    if (savedDifficulty) {
      setDifficultyLevel(savedDifficulty);
    }
    const savedNotifications = typeof window !== 'undefined' ? localStorage.getItem('academyNotifications') : null;
    if (savedNotifications !== null) {
      setAcademyNotifications(JSON.parse(savedNotifications));
    }
  }, [router]);

  // Handle photo upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        setPhotoPreview(base64);
        setProfilePhoto(file);
        if (typeof window !== 'undefined') {
          localStorage.setItem('profilePhoto', base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save profile changes
  const saveProfileChanges = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userFullName', fullName);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('profileVisibility', profileVisibility);
      localStorage.setItem('hideStats', JSON.stringify(hideStats));
      localStorage.setItem('shareProgress', JSON.stringify(shareProgress));
      localStorage.setItem('preferredDomain', preferredDomain);
      localStorage.setItem('difficultyLevel', difficultyLevel);
      localStorage.setItem('academyNotifications', JSON.stringify(academyNotifications));
    }
    alert('Profil mis à jour avec succès!');
  };

  // Save theme preference
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: currentTheme.bg,
      color: currentTheme.text,
      display: 'grid',
      gridTemplateColumns: sidebarOpen ? '280px 1fr' : '1fr',
      gap: '24px',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      position: 'relative',
      transition: 'background 0.3s ease, color 0.3s ease',
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
        .dashboard-content {
          animation: slideInUp 0.6s ease-out;
        }
        .metric-card {
          transition: all 0.3s ease;
        }
        .metric-card:hover {
          transform: translateY(-2px);
        }
        .modal-overlay {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>

      {/* SIDEBAR TOGGLE BUTTON */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
        position: 'fixed',
        top: '24px',
        left: '24px',
        zIndex: 40,
        background: 'rgba(59, 130, 246, 0.2)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '10px',
        padding: '10px 14px',
        color: '#60a5fa',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.target.style.background = 'rgba(59, 130, 246, 0.3)';
        e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.target.style.background = 'rgba(59, 130, 246, 0.2)';
        e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)';
      }}
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* LEFT SIDEBAR */}
      {sidebarOpen && <div style={{
        borderRight: `1px solid ${currentTheme.border}`,
        paddingRight: '24px',
        height: 'fit-content',
      }}>
        {/* User Profile */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: photoPreview ? 'transparent' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            borderRadius: '12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            overflow: 'hidden',
          }}>
            {photoPreview ? (
              <img src={photoPreview} alt="Profile" style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }} />
            ) : (
              '👤'
            )}
          </div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '700',
            color: currentTheme.text,
            margin: '0 0 4px 0',
          }}>
            {fullName}
          </h3>
          <p style={{
            fontSize: '12px',
            color: currentTheme.textSecondary,
            margin: 0,
          }}>
            Investisseur Premium
          </p>
        </div>

        {/* Friend Code Section */}
        <div style={{ marginBottom: '40px', padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <p style={{
            fontSize: '11px',
            fontWeight: '700',
            color: 'rgba(255, 255, 255, 0.6)',
            margin: '0 0 8px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Mon Code Ami
          </p>
          <p style={{
            fontSize: '18px',
            fontWeight: '900',
            color: '#60a5fa',
            margin: '0 0 12px 0',
            fontFamily: 'monospace',
          }}>
            {userData.friendCode}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => copyToClipboard(userData.friendCode)}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: copied ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                border: copied ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(59, 130, 246, 0.5)',
                borderRadius: '8px',
                color: copied ? '#10b981' : '#60a5fa',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                if (!copied) {
                  e.target.style.background = 'rgba(59, 130, 246, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (!copied) {
                  e.target.style.background = 'rgba(59, 130, 246, 0.3)';
                }
              }}
            >
              {copied ? '✓ Copié' : 'Copier'}
            </button>
          </div>
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
              { id: 'friends', label: `👥 Amis (${userData.friends.length})` },
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
          background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(30, 41, 59, 0.05)',
          borderRadius: '12px',
          borderTop: `1px solid ${currentTheme.border}`,
        }}>
          <p style={{
            fontSize: '11px',
            color: currentTheme.textTertiary,
            margin: '0 0 8px 0',
            fontWeight: '600',
          }}>
            Membre depuis
          </p>
          <p style={{
            fontSize: '13px',
            color: currentTheme.textSecondary,
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
      </div>}

      {/* MAIN CONTENT - CENTER COLUMN */}
      <div className="dashboard-content" style={{}}>
        {/* HEADER */}
        <div style={{
          marginBottom: '40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '900',
              color: currentTheme.text,
              margin: '0 0 8px 0',
              letterSpacing: '-0.5px',
            }}>
              Votre Portefeuille
            </h1>
            <p style={{
              color: currentTheme.textSecondary,
              margin: 0,
              fontSize: '14px',
            }}>
              Dernière mise à jour : {new Date().toLocaleString('fr-FR')}
            </p>
          </div>

          {/* News Modal Button */}
          <button onClick={() => setNewsModalOpen(true)} style={{
            padding: '12px 20px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            color: '#60a5fa',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)';
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)';
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
          }}
          >
            📰 Actualités
          </button>
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
                      {fullName.toUpperCase()}
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
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <div>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  color: currentTheme.text,
                  margin: '0 0 8px 0',
                }}>
                  📚 Académie
                </h2>
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  flexWrap: 'wrap',
                  fontSize: '12px',
                }}>
                  <span style={{ color: currentTheme.textSecondary }}>
                    Niveau {progress.userLevel}
                  </span>
                  <span style={{ color: currentTheme.accent }}>
                    ⭐ {progress.totalXP} XP
                  </span>
                  {progress.streak > 0 && (
                    <span style={{ color: '#f59e0b' }}>
                      🔥 Racha: {progress.streak}
                    </span>
                  )}
                  {progress.badges && progress.badges.length > 0 && (
                    <span style={{ color: '#a78bfa' }}>
                      ✨ {progress.badges.length} Badges
                    </span>
                  )}
                </div>
              </div>
              <a href="/education" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '10px',
                color: currentTheme.accent,
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
              }}>
                Voir tous les domaines →
              </a>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
            }}>
              {educationDomains.slice(0, 4).map((domain) => {
                const isCompleted = isDomainCompleted(domain.id);
                const progressPercent = getDomainProgress(domain);

                return (
                  <a
                    key={domain.id}
                    href={`/education/${domain.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div className="metric-card" style={{
                      background: currentTheme.cardBg,
                      borderRadius: '16px',
                      padding: '20px',
                      border: `1px solid ${currentTheme.border}`,
                      backdropFilter: 'blur(20px)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      height: '100%',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = domain.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = currentTheme.border;
                    }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: '12px',
                      }}>
                        <div style={{ fontSize: '28px' }}>{domain.icon}</div>
                        <div style={{ fontSize: '24px' }}>
                          {isCompleted ? domain.badge : ''}
                        </div>
                      </div>

                      <h3 style={{
                        fontSize: '15px',
                        fontWeight: '700',
                        color: currentTheme.text,
                        margin: '0 0 4px 0',
                      }}>
                        {domain.name}
                      </h3>

                      <p style={{
                        fontSize: '12px',
                        color: currentTheme.textSecondary,
                        margin: '0 0 12px 0',
                      }}>
                        {domain.description}
                      </p>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                        fontSize: '12px',
                      }}>
                        <span style={{ color: currentTheme.textTertiary }}>Progression</span>
                        <span style={{ color: domain.color, fontWeight: '600' }}>
                          {progressPercent}%
                        </span>
                      </div>

                      <div style={{
                        width: '100%',
                        height: '6px',
                        background: currentTheme.border,
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${progressPercent}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, ${domain.color}, ${domain.color}80)`,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>

                      <div style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: `1px solid ${currentTheme.border}`,
                        fontSize: '11px',
                        color: currentTheme.textTertiary,
                      }}>
                        {isCompleted ? (
                          <span style={{ color: '#10b981', fontWeight: '600' }}>✓ Maîtrisé</span>
                        ) : progressPercent > 0 ? (
                          <span style={{ color: currentTheme.accent }}>En cours...</span>
                        ) : (
                          <span>Commencer →</span>
                        )}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>

            {progress.completedDomains.length > 0 && (
              <div style={{ marginTop: '40px' }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: currentTheme.text,
                  margin: '0 0 16px 0',
                }}>
                  🏆 Mes Badges ({progress.completedDomains.length})
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                  gap: '12px',
                }}>
                  {educationDomains
                    .filter((d) => isDomainCompleted(d.id))
                    .map((domain) => (
                      <div
                        key={domain.id}
                        style={{
                          padding: '12px',
                          background: currentTheme.cardBg,
                          borderRadius: '12px',
                          border: `2px solid ${domain.color}40`,
                          textAlign: 'center',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                          e.currentTarget.style.borderColor = domain.color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.borderColor = `${domain.color}40`;
                        }}
                      >
                        <div style={{
                          fontSize: '32px',
                          marginBottom: '4px',
                        }}>
                          {domain.badge}
                        </div>
                        <p style={{
                          fontSize: '10px',
                          color: currentTheme.textSecondary,
                          margin: 0,
                          fontWeight: '600',
                        }}>
                          {domain.name}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FRIENDS TAB */}
        {activeTab === 'friends' && (
          <div style={{ marginTop: '20px' }}>
            {/* Friends Header */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '28px',
                fontWeight: '800',
                color: currentTheme.text,
                margin: '0 0 16px 0',
              }}>
                👥 Mes Amis
              </h2>

              {/* Friend Code Card */}
              <div style={{
                display: 'flex',
                gap: '16px',
                padding: '20px',
                background: currentTheme.cardBg,
                borderRadius: '16px',
                border: `1px solid ${currentTheme.border}`,
                marginBottom: '24px',
                alignItems: 'center',
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: currentTheme.textSecondary,
                    margin: '0 0 8px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Ton Code Ami Unique
                  </p>
                  <p style={{
                    fontSize: '24px',
                    fontWeight: '900',
                    color: currentTheme.accent,
                    margin: 0,
                    fontFamily: 'monospace',
                  }}>
                    {userData.friendCode}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(userData.friendCode)}
                  style={{
                    padding: '12px 20px',
                    background: copied ? 'rgba(16, 185, 129, 0.2)' : currentTheme.accent,
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '12px',
                    color: copied ? '#10b981' : '#fff',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!copied) e.target.style.background = 'rgba(59, 130, 246, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    if (!copied) e.target.style.background = currentTheme.accent;
                  }}
                >
                  {copied ? '✓ Copié!' : 'Copier Code'}
                </button>
              </div>
            </div>

            {/* Friends Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}>
              {[
                { label: 'Amis', value: userData.friends.length, icon: '👫', color: '#3b82f6' },
                { label: 'Demandes reçues', value: userData.friendRequests.received.length, icon: '📬', color: '#f59e0b' },
                { label: 'Demandes envoyées', value: userData.friendRequests.sent.length, icon: '📤', color: '#8b5cf6' },
                { label: 'Bloqués', value: userData.blockedUsers.length, icon: '🚫', color: '#ef4444' },
              ].map((stat, idx) => (
                <div key={idx} style={{
                  padding: '20px',
                  background: currentTheme.cardBg,
                  borderRadius: '16px',
                  border: `1px solid ${currentTheme.border}`,
                  textAlign: 'center',
                }}>
                  <p style={{
                    fontSize: '28px',
                    margin: '0 0 8px 0',
                  }}>
                    {stat.icon}
                  </p>
                  <p style={{
                    fontSize: '32px',
                    fontWeight: '900',
                    color: stat.color,
                    margin: '0 0 4px 0',
                  }}>
                    {stat.value}
                  </p>
                  <p style={{
                    fontSize: '12px',
                    color: currentTheme.textSecondary,
                    margin: 0,
                  }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Friends List */}
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: currentTheme.text,
                margin: '0 0 16px 0',
              }}>
                {userData.friends.length > 0 ? 'Mes Amis' : 'Aucun ami pour le moment'}
              </h3>

              {userData.friends.length === 0 ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  background: currentTheme.cardBg,
                  borderRadius: '16px',
                  border: `1px solid ${currentTheme.border}`,
                }}>
                  <p style={{
                    fontSize: '16px',
                    color: currentTheme.textSecondary,
                    margin: 0,
                  }}>
                    Partage ton code ami #{userData.friendCode} pour commencer ! 👉
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gap: '12px',
                }}>
                  {userData.friends.map((friend, idx) => (
                    <div key={friend.userId} style={{
                      padding: '16px',
                      background: currentTheme.cardBg,
                      borderRadius: '12px',
                      border: `1px solid ${currentTheme.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${currentTheme.accent} 0%, #8b5cf6 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: '700',
                          fontSize: '16px',
                        }}>
                          #{idx + 1}
                        </div>
                        <div>
                          <p style={{
                            color: currentTheme.text,
                            fontWeight: '600',
                            margin: '0 0 4px 0',
                          }}>
                            {friend.name}
                          </p>
                          <p style={{
                            color: currentTheme.textSecondary,
                            fontSize: '12px',
                            margin: 0,
                            fontFamily: 'monospace',
                          }}>
                            {friend.friendCode}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Requests */}
            {(userData.friendRequests.received.length > 0 || userData.friendRequests.sent.length > 0) && (
              <div style={{ marginTop: '32px' }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: currentTheme.text,
                  margin: '0 0 16px 0',
                }}>
                  📩 Demandes d'Ami
                </h3>

                {userData.friendRequests.received.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: currentTheme.textSecondary,
                      margin: '0 0 12px 0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      À Accepter ({userData.friendRequests.received.length})
                    </p>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {userData.friendRequests.received.map((req) => (
                        <div key={req.userId} style={{
                          padding: '12px',
                          background: currentTheme.cardBg,
                          borderRadius: '10px',
                          border: `1px solid ${currentTheme.border}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <div>
                            <p style={{ color: currentTheme.text, margin: '0 0 2px 0', fontWeight: '600' }}>
                              {req.name}
                            </p>
                            <p style={{ color: currentTheme.textSecondary, fontSize: '11px', margin: 0 }}>
                              {req.friendCode}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => acceptFriendRequest(req.friendCode, req.name)}
                              style={{
                                padding: '6px 12px',
                                background: '#10b981',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => rejectFriendRequest(req.friendCode)}
                              style={{
                                padding: '6px 12px',
                                background: '#ef4444',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS PAGE */}
        {activeTab === 'settings' && (
          <div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '800',
              color: currentTheme.text,
              margin: '0 0 24px 0',
            }}>
              ⚙️ Paramètres
            </h2>

            {/* Settings Tabs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '12px',
              marginBottom: '24px',
            }}>
              {[
                { id: 'general', label: '🎨 Affichage', icon: '🎨' },
                { id: 'profile', label: '👤 Profil', icon: '👤' },
                { id: 'security', label: '🔐 Sécurité', icon: '🔐' },
                { id: 'alerts', label: '🔔 Alertes', icon: '🔔' },
                { id: 'privacy', label: '📊 Données', icon: '📊' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSettingsTab(tab.id)}
                  style={{
                    padding: '12px 16px',
                    background: settingsTab === tab.id
                      ? 'rgba(59, 130, 246, 0.2)'
                      : currentTheme.cardBg,
                    border: `1px solid ${settingsTab === tab.id
                      ? 'rgba(59, 130, 246, 0.4)'
                      : currentTheme.border}`,
                    borderRadius: '10px',
                    color: settingsTab === tab.id ? currentTheme.accent : currentTheme.text,
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (settingsTab !== tab.id) {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (settingsTab !== tab.id) {
                      e.currentTarget.style.background = currentTheme.cardBg;
                    }
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Settings Content */}
            <div style={{
              background: currentTheme.cardBg,
              borderRadius: '16px',
              padding: '24px',
              border: `1px solid ${currentTheme.border}`,
              backdropFilter: 'blur(20px)',
            }}>
              {/* AFFICHAGE TAB */}
              {settingsTab === 'general' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: currentTheme.text,
                    margin: 0,
                  }}>
                    🎨 Préférences d'Affichage
                  </h3>

                  {/* Theme Toggle */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '16px',
                    borderBottom: `1px solid ${currentTheme.border}`,
                  }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                        Mode Thème
                      </p>
                      <p style={{ fontSize: '12px', color: currentTheme.textSecondary, margin: 0 }}>
                        {isDarkMode ? 'Mode sombre activé' : 'Mode clair activé'}
                      </p>
                    </div>
                    <button onClick={toggleTheme} style={{
                      padding: '8px 16px',
                      background: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                      border: `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.25)'}`,
                      borderRadius: '8px',
                      color: currentTheme.accent,
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'; }}
                    >
                      {isDarkMode ? '🌙 Sombre' : '☀️ Clair'}
                    </button>
                  </div>

                  {/* Devise */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '16px',
                    borderBottom: `1px solid ${currentTheme.border}`,
                  }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                        Devise
                      </p>
                      <p style={{ fontSize: '12px', color: currentTheme.textSecondary, margin: 0 }}>
                        EUR (€)
                      </p>
                    </div>
                    <select style={{
                      padding: '8px 12px',
                      background: `${currentTheme.border}`,
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '8px',
                      color: currentTheme.text,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}>
                      <option>EUR (€)</option>
                      <option>USD ($)</option>
                      <option>GBP (£)</option>
                    </select>
                  </div>

                  {/* Format de date */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                        Format de date
                      </p>
                      <p style={{ fontSize: '12px', color: currentTheme.textSecondary, margin: 0 }}>
                        Jour/Mois/Année
                      </p>
                    </div>
                    <select style={{
                      padding: '8px 12px',
                      background: `${currentTheme.border}`,
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '8px',
                      color: currentTheme.text,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}>
                      <option>JJ/MM/AAAA</option>
                      <option>MM/JJ/AAAA</option>
                      <option>AAAA-MM-JJ</option>
                    </select>
                  </div>
                </div>
              )}

              {/* PROFIL TAB */}
              {settingsTab === 'profile' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: currentTheme.text,
                      margin: 0,
                    }}>
                      👤 Profil Utilisateur
                    </h3>
                    <a href="/profile" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px',
                      color: currentTheme.accent,
                      textDecoration: 'none',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}>
                      📊 Voir profil complet →
                    </a>
                  </div>

                  {/* Profile Photo Upload */}
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    paddingBottom: '16px',
                    borderBottom: `1px solid ${currentTheme.border}`,
                    alignItems: 'center',
                  }}>
                    <div style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '12px',
                      background: currentTheme.border,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                      fontSize: '40px',
                    }}>
                      {photoPreview ? (
                        <img src={photoPreview} alt="Profile" style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }} />
                      ) : (
                        '👤'
                      )}
                    </div>
                    <div style={{
                      display: 'grid',
                      gap: '8px',
                      flex: 1,
                    }}>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '0px',
                      }}>
                        Photo de Profil
                      </label>
                      <p style={{
                        fontSize: '12px',
                        color: currentTheme.textSecondary,
                        margin: '0 0 8px 0',
                      }}>
                        Cliquez pour uploader une photo (JPG, PNG)
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        style={{
                          padding: '8px 12px',
                          background: currentTheme.border,
                          border: `1px solid ${currentTheme.border}`,
                          borderRadius: '8px',
                          color: currentTheme.text,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      />
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div style={{
                    display: 'grid',
                    gap: '12px',
                    paddingBottom: '16px',
                    borderBottom: `1px solid ${currentTheme.border}`,
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '6px',
                      }}>
                        Nom complet
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: currentTheme.border,
                          border: `1px solid ${currentTheme.border}`,
                          borderRadius: '8px',
                          color: currentTheme.text,
                          fontSize: '13px',
                          boxSizing: 'border-box',
                        }} />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '6px',
                      }}>
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: currentTheme.border,
                          border: `1px solid ${currentTheme.border}`,
                          borderRadius: '8px',
                          color: currentTheme.text,
                          fontSize: '13px',
                          boxSizing: 'border-box',
                        }} />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '6px',
                      }}>
                        Bio
                      </label>
                      <textarea defaultValue="Passionné par l'investissement et l'apprentissage 🚀" style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: currentTheme.border,
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '8px',
                        color: currentTheme.text,
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        minHeight: '80px',
                      }} />
                    </div>
                  </div>

                  <button
                    onClick={saveProfileChanges}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                    }}
                    style={{
                      padding: '10px 20px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px',
                      color: currentTheme.accent,
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}>
                    Enregistrer les modifications
                  </button>

                  {/* Stats Section */}
                  <div style={{
                    paddingTop: '16px',
                    borderTop: `1px solid ${currentTheme.border}`,
                  }}>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      color: currentTheme.text,
                      margin: '0 0 16px 0',
                    }}>
                      📊 Mes Statistiques Académie
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '12px',
                    }}>
                      <div style={{
                        padding: '12px',
                        background: currentTheme.border,
                        borderRadius: '8px',
                      }}>
                        <p style={{ fontSize: '11px', color: currentTheme.textSecondary, margin: '0 0 4px 0' }}>Niveau</p>
                        <p style={{ fontSize: '18px', fontWeight: '700', color: '#3b82f6', margin: 0 }}>Lvl {progress.userLevel}</p>
                      </div>
                      <div style={{
                        padding: '12px',
                        background: currentTheme.border,
                        borderRadius: '8px',
                      }}>
                        <p style={{ fontSize: '11px', color: currentTheme.textSecondary, margin: '0 0 4px 0' }}>XP Total</p>
                        <p style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b', margin: 0 }}>{progress.totalXP} XP</p>
                      </div>
                      <div style={{
                        padding: '12px',
                        background: currentTheme.border,
                        borderRadius: '8px',
                      }}>
                        <p style={{ fontSize: '11px', color: currentTheme.textSecondary, margin: '0 0 4px 0' }}>Racha</p>
                        <p style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b', margin: 0 }}>🔥 {progress.streak}</p>
                      </div>
                      <div style={{
                        padding: '12px',
                        background: currentTheme.border,
                        borderRadius: '8px',
                      }}>
                        <p style={{ fontSize: '11px', color: currentTheme.textSecondary, margin: '0 0 4px 0' }}>Badges</p>
                        <p style={{ fontSize: '18px', fontWeight: '700', color: '#a78bfa', margin: 0 }}>{progress.badges?.length || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Visibility Settings */}
                  <div style={{
                    paddingTop: '16px',
                    borderTop: `1px solid ${currentTheme.border}`,
                  }}>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      color: currentTheme.text,
                      margin: '0 0 16px 0',
                    }}>
                      👤 Visibilité du Profil
                    </h4>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {/* Profile Visibility */}
                      <div style={{
                        padding: '12px',
                        background: currentTheme.border,
                        borderRadius: '8px',
                      }}>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: currentTheme.textSecondary,
                          marginBottom: '6px',
                        }}>
                          Visibilité du profil
                        </label>
                        <select
                          value={profileVisibility}
                          onChange={(e) => setProfileVisibility(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: currentTheme.border,
                            border: `1px solid ${currentTheme.border}`,
                            borderRadius: '8px',
                            color: currentTheme.text,
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}>
                          <option value="public">🌍 Public</option>
                          <option value="private">🔒 Privé</option>
                          <option value="friends">👥 Amis seulement</option>
                        </select>
                      </div>

                      {/* Hide Stats */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: currentTheme.border,
                        borderRadius: '8px',
                      }}>
                        <div>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                            Masquer les statistiques
                          </p>
                          <p style={{ fontSize: '11px', color: currentTheme.textSecondary, margin: 0 }}>
                            Cacher votre XP et niveau publiquement
                          </p>
                        </div>
                        <button
                          onClick={() => setHideStats(!hideStats)}
                          style={{
                            position: 'relative',
                            width: '40px',
                            height: '24px',
                            borderRadius: '12px',
                            background: hideStats ? '#3b82f6' : '#6b7280',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                          }}>
                          <div
                            style={{
                              position: 'absolute',
                              top: '2px',
                              left: hideStats ? '20px' : '2px',
                              width: '20px',
                              height: '20px',
                              background: 'white',
                              borderRadius: '50%',
                              transition: 'left 0.3s ease',
                            }}
                          />
                        </button>
                      </div>

                      {/* Share Progress */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: currentTheme.border,
                        borderRadius: '8px',
                      }}>
                        <div>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                            Partager la progression
                          </p>
                          <p style={{ fontSize: '11px', color: currentTheme.textSecondary, margin: 0 }}>
                            Autoriser le partage de vos données
                          </p>
                        </div>
                        <button
                          onClick={() => setShareProgress(!shareProgress)}
                          style={{
                            position: 'relative',
                            width: '40px',
                            height: '24px',
                            borderRadius: '12px',
                            background: shareProgress ? '#3b82f6' : '#6b7280',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                          }}>
                          <div
                            style={{
                              position: 'absolute',
                              top: '2px',
                              left: shareProgress ? '20px' : '2px',
                              width: '20px',
                              height: '20px',
                              background: 'white',
                              borderRadius: '50%',
                              transition: 'left 0.3s ease',
                            }}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Learning Preferences */}
                  <div style={{
                    paddingTop: '16px',
                    borderTop: `1px solid ${currentTheme.border}`,
                  }}>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      color: currentTheme.text,
                      margin: '0 0 16px 0',
                    }}>
                      🎓 Préférences d'Apprentissage
                    </h4>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {/* Preferred Domain */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: currentTheme.textSecondary,
                          marginBottom: '6px',
                        }}>
                          Domaine d'investissement préféré
                        </label>
                        <select
                          value={preferredDomain}
                          onChange={(e) => setPreferredDomain(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: currentTheme.border,
                            border: `1px solid ${currentTheme.border}`,
                            borderRadius: '8px',
                            color: currentTheme.text,
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}>
                          <option value="crypto">🪙 Crypto-monnaies</option>
                          <option value="stocks">📈 Actions/Bourse</option>
                          <option value="real-estate">🏠 Immobilier</option>
                          <option value="bonds">📊 Obligations</option>
                          <option value="forex">💱 Forex</option>
                          <option value="general">🎯 Tous les domaines</option>
                        </select>
                      </div>

                      {/* Difficulty Level */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: currentTheme.textSecondary,
                          marginBottom: '6px',
                        }}>
                          Niveau de difficulté préféré
                        </label>
                        <select
                          value={difficultyLevel}
                          onChange={(e) => setDifficultyLevel(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: currentTheme.border,
                            border: `1px solid ${currentTheme.border}`,
                            borderRadius: '8px',
                            color: currentTheme.text,
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}>
                          <option value="beginner">🌱 Débutant</option>
                          <option value="intermediate">📚 Intermédiaire</option>
                          <option value="advanced">⭐ Avancé</option>
                          <option value="expert">🏆 Expert</option>
                        </select>
                      </div>

                      {/* Academy Notifications */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: currentTheme.border,
                        borderRadius: '8px',
                      }}>
                        <div>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                            Notifications d'académie
                          </p>
                          <p style={{ fontSize: '11px', color: currentTheme.textSecondary, margin: 0 }}>
                            Recevoir les rappels d'apprentissage
                          </p>
                        </div>
                        <button
                          onClick={() => setAcademyNotifications(!academyNotifications)}
                          style={{
                            position: 'relative',
                            width: '40px',
                            height: '24px',
                            borderRadius: '12px',
                            background: academyNotifications ? '#3b82f6' : '#6b7280',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                          }}>
                          <div
                            style={{
                              position: 'absolute',
                              top: '2px',
                              left: academyNotifications ? '20px' : '2px',
                              width: '20px',
                              height: '20px',
                              background: 'white',
                              borderRadius: '50%',
                              transition: 'left 0.3s ease',
                            }}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SÉCURITÉ TAB */}
              {settingsTab === 'security' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: currentTheme.text,
                    margin: 0,
                  }}>
                    🔐 Sécurité
                  </h3>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '16px',
                    borderBottom: `1px solid ${currentTheme.border}`,
                  }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                        Changer le mot de passe
                      </p>
                      <p style={{ fontSize: '12px', color: currentTheme.textSecondary, margin: 0 }}>
                        Mettez à jour votre mot de passe
                      </p>
                    </div>
                    <button style={{
                      padding: '8px 16px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px',
                      color: currentTheme.accent,
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}>
                      Modifier
                    </button>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '16px',
                    borderBottom: `1px solid ${currentTheme.border}`,
                  }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                        Authentification 2FA
                      </p>
                      <p style={{ fontSize: '12px', color: currentTheme.textSecondary, margin: 0 }}>
                        Sécurité supplémentaire
                      </p>
                    </div>
                    <button style={{
                      padding: '8px 16px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px',
                      color: currentTheme.accent,
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}>
                      Activer
                    </button>
                  </div>

                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.text, margin: '0 0 12px 0' }}>
                      Sessions actives
                    </p>
                    <p style={{ fontSize: '12px', color: currentTheme.textSecondary, margin: 0 }}>
                      Gérez vos sessions de connexion
                    </p>
                  </div>
                </div>
              )}

              {/* ALERTES TAB */}
              {settingsTab === 'alerts' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: currentTheme.text,
                    margin: 0,
                  }}>
                    🔔 Seuils d'Alertes Personnalisées
                  </h3>

                  <p style={{
                    fontSize: '13px',
                    color: currentTheme.textSecondary,
                    margin: '0 0 12px 0',
                  }}>
                    Créez des alertes personnalisées basées sur vos critères
                  </p>

                  <button style={{
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    color: currentTheme.accent,
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)';
                  }}
                  >
                    + Créer une alerte
                  </button>

                  <div style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: `1px solid ${currentTheme.border}`,
                    color: currentTheme.textSecondary,
                    fontSize: '12px',
                  }}>
                    Exemples: "Si Bitcoin +20%", "Si portefeuille baisse de 10%", "Si dividende reçu"
                  </div>
                </div>
              )}

              {/* DONNÉES TAB */}
              {settingsTab === 'privacy' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: currentTheme.text,
                    margin: 0,
                  }}>
                    📊 Données & Confidentialité
                  </h3>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '16px',
                    borderBottom: `1px solid ${currentTheme.border}`,
                  }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                        Export mes données
                      </p>
                      <p style={{ fontSize: '12px', color: currentTheme.textSecondary, margin: 0 }}>
                        Téléchargez vos données personnelles
                      </p>
                    </div>
                    <button style={{
                      padding: '8px 16px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px',
                      color: currentTheme.accent,
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}>
                      Exporter
                    </button>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '16px',
                    borderBottom: `1px solid ${currentTheme.border}`,
                  }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                        Politique de confidentialité
                      </p>
                      <p style={{ fontSize: '12px', color: currentTheme.textSecondary, margin: 0 }}>
                        Consultez nos conditions
                      </p>
                    </div>
                    <button style={{
                      padding: '8px 16px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px',
                      color: currentTheme.accent,
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}>
                      Lire
                    </button>
                  </div>

                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#f43f5e', margin: '0 0 8px 0' }}>
                      ⚠️ Zone Danger
                    </p>
                    <button style={{
                      padding: '10px 20px',
                      background: 'rgba(244, 63, 94, 0.15)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      borderRadius: '8px',
                      color: '#f43f5e',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}>
                      Supprimer mon compte
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PLACEHOLDERS FOR OTHER TABS */}
        {(['projects', 'risk'].includes(activeTab)) && (
          <div style={{
            background: currentTheme.cardBg,
            borderRadius: '16px',
            padding: '60px 40px',
            border: `1px solid ${currentTheme.border}`,
            textAlign: 'center',
            marginTop: '20px',
            backdropFilter: 'blur(20px)',
          }}>
            <p style={{
              fontSize: '36px',
              margin: '0 0 16px 0',
            }}>
              {activeTab === 'projects' && '🎯'}
              {activeTab === 'risk' && '⚠️'}
            </p>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '800',
              color: currentTheme.text,
              margin: '0 0 12px 0',
            }}>
              {activeTab === 'projects' && 'Gestion des Projets'}
              {activeTab === 'risk' && 'Analyse des Risques'}
            </h3>
            <p style={{
              fontSize: '14px',
              color: currentTheme.textSecondary,
              margin: 0,
            }}>
              Section en développement
            </p>
          </div>
        )}
      </div>

      {/* NEWS FEED MODAL */}
      {newsModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}
        onClick={() => setNewsModalOpen(false)}
        >
          <div style={{
            position: 'relative',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
            borderRadius: '48px',
            padding: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(20px)',
            width: '100%',
            maxWidth: '600px',
            height: '800px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8)',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button onClick={() => setNewsModalOpen(false)} style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              zIndex: 10,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer',
              fontSize: '20px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            >
              ✕
            </button>

            {/* Tablet Bezel Top */}
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: '36px 36px 0 0',
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.8)',
            }}>
              <span>9:41</span>
              <span style={{ fontWeight: '700' }}>InvestKit</span>
              <span>📶 📡 🔋</span>
            </div>

            {/* Modal Tabs */}
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              padding: '12px 20px',
              display: 'flex',
              gap: '12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <button
                onClick={() => setNewsModalTab('news')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: newsModalTab === 'news' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  border: `1px solid ${newsModalTab === 'news' ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                  borderRadius: '8px',
                  color: newsModalTab === 'news' ? '#60a5fa' : 'rgba(255, 255, 255, 0.5)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                📰 Actualités
              </button>
              <button
                onClick={() => setNewsModalTab('tips')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: newsModalTab === 'tips' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  border: `1px solid ${newsModalTab === 'tips' ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                  borderRadius: '8px',
                  color: newsModalTab === 'tips' ? '#60a5fa' : 'rgba(255, 255, 255, 0.5)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                💡 Conseils
              </button>
            </div>

            {/* Scrollable Content */}
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              scrollBehavior: 'smooth',
            }}>
              {newsModalTab === 'news' && (
                <>
                  {/* News Item 1 */}
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    borderLeft: '4px solid #3b82f6',
                    borderRadius: '16px',
                    padding: '18px',
                    flex: '0 0 auto',
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'start',
                      marginBottom: '8px',
                    }}>
                      <span style={{ fontSize: '24px', marginTop: '2px' }}>📈</span>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          color: '#60a5fa',
                          margin: '0 0 4px 0',
                        }}>
                          CAC 40 en hausse
                        </p>
                        <p style={{
                          fontSize: '13px',
                          color: 'rgba(255, 255, 255, 0.7)',
                          margin: 0,
                          lineHeight: '1.4',
                        }}>
                          L'indice gagne 1.2% aujourd'hui
                        </p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}>
                      À l'instant
                    </span>
                  </div>

                  {/* News Item 2 */}
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    borderLeft: '4px solid #10b981',
                    borderRadius: '16px',
                    padding: '18px',
                    flex: '0 0 auto',
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'start',
                      marginBottom: '8px',
                    }}>
                      <span style={{ fontSize: '24px', marginTop: '2px' }}>💡</span>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          color: '#86efac',
                          margin: '0 0 4px 0',
                        }}>
                          Conseil du jour
                        </p>
                        <p style={{
                          fontSize: '13px',
                          color: 'rgba(255, 255, 255, 0.7)',
                          margin: 0,
                          lineHeight: '1.4',
                        }}>
                          Diversifiez pour réduire les risques
                        </p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}>
                      Il y a 2h
                    </span>
                  </div>

                  {/* News Item 3 */}
                  <div style={{
                    background: 'rgba(168, 85, 247, 0.15)',
                    borderLeft: '4px solid #a855f7',
                    borderRadius: '16px',
                    padding: '18px',
                    flex: '0 0 auto',
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'start',
                      marginBottom: '8px',
                    }}>
                      <span style={{ fontSize: '24px', marginTop: '2px' }}>📚</span>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          color: '#d8b4fe',
                          margin: '0 0 4px 0',
                        }}>
                          Nouvelle formation
                        </p>
                        <p style={{
                          fontSize: '13px',
                          color: 'rgba(255, 255, 255, 0.7)',
                          margin: 0,
                          lineHeight: '1.4',
                        }}>
                          Maîtrisez la crypto
                        </p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}>
                      Il y a 5h
                    </span>
                  </div>

                  {/* News Item 4 */}
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    borderLeft: '4px solid #f59e0b',
                    borderRadius: '16px',
                    padding: '18px',
                    flex: '0 0 auto',
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'start',
                      marginBottom: '8px',
                    }}>
                      <span style={{ fontSize: '24px', marginTop: '2px' }}>⚠️</span>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          color: '#fcd34d',
                          margin: '0 0 4px 0',
                        }}>
                          Alerte BTC
                        </p>
                        <p style={{
                          fontSize: '13px',
                          color: 'rgba(255, 255, 255, 0.7)',
                          margin: 0,
                          lineHeight: '1.4',
                        }}>
                          Prix en baisse, opportunité?
                        </p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}>
                      Il y a 1h
                    </span>
                  </div>

                  {/* News Item 5 */}
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    borderLeft: '4px solid #3b82f6',
                    borderRadius: '16px',
                    padding: '18px',
                    flex: '0 0 auto',
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'start',
                      marginBottom: '8px',
                    }}>
                      <span style={{ fontSize: '24px', marginTop: '2px' }}>🏆</span>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          color: '#60a5fa',
                          margin: '0 0 4px 0',
                        }}>
                          Objectif atteint!
                        </p>
                        <p style={{
                          fontSize: '13px',
                          color: 'rgba(255, 255, 255, 0.7)',
                          margin: 0,
                          lineHeight: '1.4',
                        }}>
                          +€5k de gains ce mois
                        </p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}>
                      Il y a 3h
                    </span>
                  </div>
                </>
              )}

              {newsModalTab === 'tips' && (
                <>
                  {dailyTips.map((tip) => (
                    <div
                      key={tip.id}
                      style={{
                        background: 'rgba(168, 85, 247, 0.15)',
                        borderLeft: '4px solid #a855f7',
                        borderRadius: '16px',
                        padding: '18px',
                        flex: '0 0 auto',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'start',
                        marginBottom: '8px',
                      }}>
                        <span style={{ fontSize: '24px', marginTop: '2px' }}>
                          {tip.icon}
                        </span>
                        <div style={{ flex: 1 }}>
                          <p style={{
                            fontSize: '15px',
                            fontWeight: '700',
                            color: '#d8b4fe',
                            margin: '0 0 4px 0',
                          }}>
                            {tip.title}
                          </p>
                          <p style={{
                            fontSize: '13px',
                            color: 'rgba(255, 255, 255, 0.7)',
                            margin: 0,
                            lineHeight: '1.4',
                          }}>
                            {tip.tip}
                          </p>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        color: 'rgba(255, 255, 255, 0.5)',
                      }}>
                        Conseil quotidien
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Tablet Bezel Bottom */}
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: '0 0 36px 36px',
              padding: '12px',
              textAlign: 'center',
            }}>
              <div style={{
                width: '180px',
                height: '5px',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '2px',
                margin: '0 auto',
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
