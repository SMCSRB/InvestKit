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
    { id: 'stocks', label: '📈 Bourse / Actions', emoji: '📈' },
    { id: 'crypto', label: '₿ Cryptomonnaies', emoji: '₿' },
    { id: 'realestate', label: '🏠 Immobilier', emoji: '🏠' },
    { id: 'bonds', label: '💰 Obligations', emoji: '💰' },
    { id: 'pea', label: '📊 PEA / Fonds', emoji: '📊' },
    { id: 'commodities', label: '⚡ Matières premières', emoji: '⚡' },
    { id: 'startup', label: '🚀 Startups / Equity', emoji: '🚀' },
    { id: 'forex', label: '💱 Forex / Devises', emoji: '💱' },
  ];

  const accountTypes = [
    {
      id: 'beginner',
      label: '📚 Débutant',
      description: 'Éducation et simulateurs simples',
      icon: '📚'
    },
    {
      id: 'intermediate',
      label: '📈 Intermédiaire',
      description: 'Outils avancés et analyses',
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        padding: '40px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            width: '50px',
            height: '50px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '28px',
            fontWeight: 'bold',
            margin: '0 auto 15px',
          }}>
            🎯
          </div>
          <h1 style={{ margin: '0 0 5px 0', fontSize: '28px', color: '#2d3748', fontWeight: '600' }}>
            Personnalisez votre expérience
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#a0aec0' }}>
            Dites-nous ce qui vous intéresse pour adapter la plateforme à vos besoins
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Account Type Selection */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748', display: 'block', marginBottom: '15px' }}>
              1️⃣ Type de compte
            </label>
            <div style={{ display: 'grid', gap: '12px' }}>
              {accountTypes.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setAccountType(type.id)}
                  style={{
                    padding: '16px',
                    border: `2px solid ${accountType === type.id ? '#667eea' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    background: accountType === type.id ? '#f7fafc' : 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (accountType !== type.id) {
                      e.target.style.borderColor = '#cbd5e0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (accountType !== type.id) {
                      e.target.style.borderColor = '#e2e8f0';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>{type.icon}</span>
                    <div>
                      <p style={{ margin: '0', fontWeight: '600', color: '#2d3748', fontSize: '14px' }}>
                        {type.label}
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#718096' }}>
                        {type.description}
                      </p>
                    </div>
                    {accountType === type.id && (
                      <span style={{ marginLeft: 'auto', fontSize: '18px' }}>✅</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Investment Interests */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748', display: 'block', marginBottom: '15px' }}>
              2️⃣ Domaines d'intérêt (optionnel)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {investmentInterests.map(interest => (
                <button
                  key={interest.id}
                  type="button"
                  onClick={() => toggleInterest(interest.id)}
                  style={{
                    padding: '12px',
                    border: `2px solid ${interests.includes(interest.id) ? '#48bb78' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    background: interests.includes(interest.id) ? '#f0fff4' : 'white',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#2d3748',
                  }}
                  onMouseEnter={(e) => {
                    if (!interests.includes(interest.id)) {
                      e.target.style.borderColor = '#cbd5e0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!interests.includes(interest.id)) {
                      e.target.style.borderColor = '#e2e8f0';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <span>{interest.emoji}</span>
                    <span>{interest.label}</span>
                    {interests.includes(interest.id) && (
                      <span style={{ marginLeft: '4px' }}>✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748', display: 'block', marginBottom: '10px' }}>
              3️⃣ Langue
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
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
            padding: '12px',
            background: '#f0f4ff',
            border: '1px solid #cbd5e0',
            borderRadius: '8px',
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
              }}
            />
            <label htmlFor="2fa" style={{ fontSize: '13px', color: '#2d3748', margin: '0', cursor: 'pointer', flex: 1 }}>
              🔐 Activer l'authentification à deux facteurs (2FA)
            </label>
          </div>

          {/* Message */}
          {message && (
            <div style={{
              padding: '12px 14px',
              background: message.includes('✅') ? '#f0fff4' : '#fff5f5',
              border: `1px solid ${message.includes('✅') ? '#c6f6d5' : '#fed7d7'}`,
              borderRadius: '8px',
              color: message.includes('✅') ? '#22543d' : '#742a2a',
              fontSize: '13px',
              textAlign: 'center',
            }}>
              {message}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={handleSkip}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'white',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f7fafc';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white';
              }}
            >
              ⏭️ Passer
            </button>
            <button
              type="submit"
              disabled={loading || !accountType}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: !loading && accountType ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#cbd5e0',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: !loading && accountType ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
              }}
            >
              {loading ? 'Enregistrement...' : '✨ Continuer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
