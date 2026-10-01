'use client';

import { markLoggedIn } from '@/app/lib/session';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PublicShell from '@/app/components/landing/PublicShell';

export default function OnboardingPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
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

    if (!username.trim()) {
      setMessage('❌ Veuillez entrer votre pseudo');
      setLoading(false);
      return;
    }

    if (!accountType) {
      setMessage('❌ Veuillez sélectionner un type de compte');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/save-preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          username: username.trim(),
          accountType,
          interests,
          language,
          enable2FA,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('✅ Préférences enregistrées!');
        markLoggedIn();
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
    markLoggedIn();
    sessionStorage.removeItem('userEmail');
    router.push('/dashboard');
  };

  return (
    <PublicShell>
    <div style={{
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
        background: 'radial-gradient(circle, color-mix(in srgb, var(--ik-primary) 10%, transparent) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        left: '-5%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, color-mix(in srgb, var(--ik-orchid) 8%, transparent) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />

      {/* Main Form Container */}
      <div className="form-container" style={{
        maxWidth: '480px',
        width: '100%',
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--ik-text) 97%, transparent) 0%, rgba(248,250,252,0.97) 100%)',
        borderRadius: '28px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25), 0 0 120px color-mix(in srgb, var(--ik-primary) 15%, transparent)',
        padding: 'clamp(20px, 5vw, 28px) clamp(20px, 6vw, 32px)',
        backdropFilter: 'blur(20px)',
        border: '1px solid color-mix(in srgb, var(--ik-text) 30%, transparent)',
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
            background: 'linear-gradient(135deg, var(--ik-primary) 0%, var(--ik-orchid) 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '28px',
            margin: '0 auto 12px',
            animation: 'floatGradient 3s ease-in-out infinite',
            boxShadow: '0 10px 30px color-mix(in srgb, var(--ik-primary) 30%, transparent)',
          }}>
            🎯
          </div>
          <h1 style={{
            margin: '0 0 6px 0',
            fontSize: 'clamp(18px, 5vw, 22px)',
            fontWeight: '700',
            background: 'linear-gradient(135deg, var(--ik-surface-1) 0%, var(--ik-primary) 50%, var(--ik-orchid) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Personnalisez votre profil
          </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--ik-text-3)' }}>
            Adaptez la plateforme à vos besoins
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Username Input */}
          <div>
            <label style={{
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--ik-surface-2)',
              display: 'block',
              marginBottom: '8px',
              letterSpacing: '0.3px',
            }}>
              0️⃣ Votre Pseudo
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
              placeholder="ex: InvestorPro123"
              maxLength="30"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid var(--ik-text-2)',
                borderRadius: '12px',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                color: 'var(--ik-surface-2)',
                backgroundColor: '#f8fafc',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--ik-primary)';
                e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--ik-primary) 10%, transparent)';
                e.target.style.backgroundColor = 'color-mix(in srgb, var(--ik-primary) 2%, transparent)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--ik-text-2)';
                e.target.style.boxShadow = 'none';
                e.target.style.backgroundColor = '#f8fafc';
              }}
              required
            />
            <p style={{
              fontSize: '11px',
              color: 'var(--ik-text-3)',
              margin: '4px 0 0 0',
            }}>
              {username.length}/30 caractères • Lettres, chiffres, - et _ uniquement
            </p>
          </div>

          {/* Account Type Selection */}
          <div>
            <label style={{
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--ik-surface-2)',
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
                    border: `2px solid ${accountType === type.id ? 'var(--ik-positive)' : 'var(--ik-text-2)'}`,
                    borderRadius: '12px',
                    background: accountType === type.id
                      ? 'linear-gradient(135deg, color-mix(in srgb, var(--ik-positive) 5%, transparent) 0%, color-mix(in srgb, var(--ik-positive) 3%, transparent) 100%)'
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
                      e.currentTarget.style.borderColor = 'var(--ik-text-2)';
                      e.currentTarget.style.background = '#f1f5f9';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (accountType !== type.id) {
                      e.currentTarget.style.borderColor = 'var(--ik-text-2)';
                      e.currentTarget.style.background = '#f8fafc';
                    }
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{type.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0', fontWeight: '700', color: 'var(--ik-surface-2)', fontSize: '13px' }}>
                      {type.label}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--ik-text-3)' }}>
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
              color: 'var(--ik-surface-2)',
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
                    border: `2px solid ${interests.includes(interest.id) ? 'var(--ik-positive)' : 'var(--ik-text-2)'}`,
                    borderRadius: '10px',
                    background: interests.includes(interest.id)
                      ? 'linear-gradient(135deg, color-mix(in srgb, var(--ik-positive) 8%, transparent) 0%, color-mix(in srgb, var(--ik-positive) 4%, transparent) 100%)'
                      : '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--ik-surface-2)',
                  }}
                  onMouseOver={(e) => {
                    if (!interests.includes(interest.id)) {
                      e.currentTarget.style.borderColor = 'var(--ik-text-2)';
                      e.currentTarget.style.background = '#f1f5f9';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!interests.includes(interest.id)) {
                      e.currentTarget.style.borderColor = 'var(--ik-text-2)';
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
              color: 'var(--ik-surface-2)',
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
                border: '2px solid var(--ik-text-2)',
                borderRadius: '12px',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                color: 'var(--ik-surface-2)',
                backgroundColor: '#f8fafc',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--ik-primary)';
                e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--ik-primary) 10%, transparent)';
                e.target.style.backgroundColor = 'color-mix(in srgb, var(--ik-primary) 2%, transparent)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--ik-text-2)';
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
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--ik-primary) 5%, transparent) 0%, color-mix(in srgb, var(--ik-orchid) 3%, transparent) 100%)',
            border: '1px solid var(--ik-text-2)',
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
                accentColor: 'var(--ik-primary)',
                borderRadius: '4px',
                flexShrink: 0,
              }}
            />
            <label htmlFor="2fa" style={{
              fontSize: '12px',
              color: 'var(--ik-surface-2)',
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
                ? 'linear-gradient(135deg, color-mix(in srgb, var(--ik-positive) 10%, transparent), color-mix(in srgb, var(--ik-positive) 5%, transparent))'
                : 'linear-gradient(135deg, color-mix(in srgb, var(--ik-negative) 10%, transparent), rgba(185, 28, 28, 0.05))',
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
                color: 'var(--ik-primary)',
                border: '2px solid var(--ik-primary)',
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
                  ? 'linear-gradient(135deg, var(--ik-primary) 0%, var(--ik-orchid) 50%, #ec4899 100%)'
                  : 'var(--ik-text-2)',
                color: 'var(--ik-text)',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: !loading && accountType ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: loading ? 0.9 : 1,
                letterSpacing: '0.3px',
                boxShadow: !loading && accountType ? '0 10px 30px color-mix(in srgb, var(--ik-primary) 30%, transparent)' : 'none',
              }}
              onMouseOver={(e) => {
                if (!loading && accountType) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 15px 40px color-mix(in srgb, var(--ik-primary) 40%, transparent)';
                }
              }}
              onMouseOut={(e) => {
                if (!loading && accountType) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 10px 30px color-mix(in srgb, var(--ik-primary) 30%, transparent)';
                }
              }}
            >
              {loading ? '⏳ Enregistrement...' : '✨ Continuer'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </PublicShell>
  );
}
