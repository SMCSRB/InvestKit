'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [accountType, setAccountType] = useState('');
  const [interests, setInterests] = useState([]);
  const [language, setLanguage] = useState('fr');
  const [enable2FA, setEnable2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const investmentInterests = [
    { id: 'stocks', label: '📈 Bourse', emoji: '📈' },
    { id: 'crypto', label: '₿ Crypto', emoji: '₿' },
    { id: 'realestate', label: '🏠 Immobilier', emoji: '🏠' },
    { id: 'bonds', label: '💰 Obligations', emoji: '💰' },
    { id: 'pea', label: '📊 PEA', emoji: '📊' },
    { id: 'commodities', label: '⚡ Matières', emoji: '⚡' },
    { id: 'startup', label: '🚀 Startups', emoji: '🚀' },
    { id: 'forex', label: '💱 Forex', emoji: '💱' },
  ];

  const accountTypes = [
    {
      id: 'beginner',
      label: '📚 Débutant',
      description: 'Éducation et simulateurs',
      icon: '📚'
    },
    {
      id: 'intermediate',
      label: '📈 Intermédiaire',
      description: 'Outils avancés',
      icon: '📈'
    },
    {
      id: 'pro',
      label: '🏆 Pro',
      description: 'Accès complet + API',
      icon: '🏆'
    },
  ];

  useEffect(() => {
    const userEmail = sessionStorage.getItem('userEmail');
    if (!userEmail) {
      router.push('/signup');
    } else {
      setEmail(userEmail);
    }
  }, [router]);

  const toggleInterest = (interestId) => {
    setInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!accountType) {
      setMessage('❌ Veuillez sélectionner un type de compte');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://192.168.1.201:5000/api/auth/save-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          accountType,
          interests,
          language,
          enable2FA,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('✅ Préférences enregistrées!');
        localStorage.setItem('token', data.token || '');
        sessionStorage.removeItem('userEmail');
        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        setMessage(`❌ ${data.error || 'Erreur lors de l\'enregistrement'}`);
      }
    } catch (error) {
      setMessage('❌ Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('token', 'temporary');
    sessionStorage.removeItem('userEmail');
    router.push('/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-25px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes floatGradient {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-12px) scale(1.05); }
        }

        .form-container {
          animation: slideIn 0.6s ease-out;
        }

        .account-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .account-card:hover {
          transform: translateY(-4px);
        }

        .interest-btn {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .interest-btn:hover:not(:disabled) {
          transform: scale(1.05);
        }
      `}</style>

      {/* Background Decorative Elements */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-10%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        left: '-5%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />

      {/* Main Form Container */}
      <div className="form-container" style={{
        maxWidth: '480px',
        width: '100%',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.97) 100%)',
        borderRadius: '28px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25), 0 0 120px rgba(59, 130, 246, 0.15)',
        padding: 'clamp(20px, 5vw, 28px) clamp(20px, 6vw, 32px)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        position: 'relative',
        zIndex: 10,
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '28px',
            margin: '0 auto 12px',
            animation: 'floatGradient 3s ease-in-out infinite',
            boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
          }}>
            🎯
          </div>
          <h1 style={{
            margin: '0 0 6px 0',
            fontSize: 'clamp(18px, 5vw, 22px)',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #0f172a 0%, #3b82f6 50%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Personnalisez votre profil
          </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Adaptez la plateforme à vos besoins
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Account Type Selection */}
          <div>
            <label style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#1e293b',
              display: 'block',
              marginBottom: '10px',
              letterSpacing: '0.3px',
            }}>
              1️⃣ Type de compte
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {accountTypes.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setAccountType(type.id)}
                  className="account-card"
                  style={{
                    padding: '12px 14px',
                    border: `2px solid ${accountType === type.id ? '#10b981' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    background: accountType === type.id
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.03) 100%)'
                      : '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                  onMouseOver={(e) => {
                    if (accountType !== type.id) {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.background = '#f1f5f9';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (accountType !== type.id) {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                    }
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{type.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0', fontWeight: '700', color: '#1e293b', fontSize: '13px' }}>
                      {type.label}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                      {type.description}
                    </p>
                  </div>
                  {accountType === type.id && (
                    <span style={{ fontSize: '16px', marginLeft: 'auto' }}>✅</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Investment Interests */}
          <div>
            <label style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#1e293b',
              display: 'block',
              marginBottom: '8px',
              letterSpacing: '0.3px',
            }}>
              2️⃣ Domaines d'intérêt
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {investmentInterests.map(interest => (
                <button
                  key={interest.id}
                  type="button"
                  onClick={() => toggleInterest(interest.id)}
                  className="interest-btn"
                  style={{
                    padding: '10px 8px',
                    border: `2px solid ${interests.includes(interest.id) ? '#10b981' : '#e2e8f0'}`,
                    borderRadius: '10px',
                    background: interests.includes(interest.id)
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.04) 100%)'
                      : '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#1e293b',
                  }}
                  onMouseOver={(e) => {
                    if (!interests.includes(interest.id)) {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.background = '#f1f5f9';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!interests.includes(interest.id)) {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                    }
                  }}
                >
                  {interest.emoji} {interest.label}
                  {interests.includes(interest.id) && ' ✓'}
                </button>
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#1e293b',
              display: 'block',
              marginBottom: '6px',
              letterSpacing: '0.3px',
            }}>
              3️⃣ Langue
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                color: '#1e293b',
                backgroundColor: '#f8fafc',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.02)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
                e.target.style.backgroundColor = '#f8fafc';
              }}
            >
              <option value="fr">🇫🇷 Français</option>
              <option value="en">🇬🇧 English</option>
              <option value="es">🇪🇸 Español</option>
              <option value="de">🇩🇪 Deutsch</option>
            </select>
          </div>

          {/* 2FA Option */}
          <div style={{
            padding: '10px 12px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.03) 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
          }}>
            <input
              type="checkbox"
              id="2fa"
              checked={enable2FA}
              onChange={(e) => setEnable2FA(e.target.checked)}
              style={{
                cursor: 'pointer',
                width: '18px',
                height: '18px',
                accentColor: '#3b82f6',
                borderRadius: '4px',
                flexShrink: 0,
              }}
            />
            <label htmlFor="2fa" style={{
              fontSize: '12px',
              color: '#1e293b',
              margin: '0',
              cursor: 'pointer',
              flex: 1,
              fontWeight: '500',
            }}>
              🔐 Activer 2FA
            </label>
          </div>

          {/* Message */}
          {message && (
            <div style={{
              padding: '10px 12px',
              background: message.includes('✅')
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(185, 28, 28, 0.05))',
              border: `1px solid ${message.includes('✅') ? '#d1fae5' : '#fee2e2'}`,
              borderRadius: '10px',
              color: message.includes('✅') ? '#065f46' : '#991b1b',
              fontSize: '12px',
              fontWeight: '600',
              textAlign: 'center',
            }}>
              {message}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={handleSkip}
              style={{
                flex: 1,
                padding: '11px 14px',
                background: 'white',
                color: '#3b82f6',
                border: '2px solid #3b82f6',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                letterSpacing: '0.3px',
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#f0f4ff';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'white';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              ⏭️ Passer
            </button>
            <button
              type="submit"
              disabled={loading || !accountType}
              style={{
                flex: 1,
                padding: '11px 14px',
                background: !loading && accountType
                  ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)'
                  : '#cbd5e1',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: !loading && accountType ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: loading ? 0.9 : 1,
                letterSpacing: '0.3px',
                boxShadow: !loading && accountType ? '0 10px 30px rgba(59, 130, 246, 0.3)' : 'none',
              }}
              onMouseOver={(e) => {
                if (!loading && accountType) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 15px 40px rgba(59, 130, 246, 0.4)';
                }
              }}
              onMouseOut={(e) => {
                if (!loading && accountType) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.3)';
                }
              }}
            >
              {loading ? '⏳ Enregistrement...' : '✨ Continuer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
