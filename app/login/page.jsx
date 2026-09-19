'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://192.168.1.201:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('✅ Connexion réussie!');
        localStorage.setItem('token', data.token);
        setEmail('');
        setPassword('');
      } else {
        setMessage(`❌ ${data.error || 'Email ou mot de passe incorrect'}`);
      }
    } catch (error) {
      setMessage('❌ Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
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
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Conteneur principal */}
      <div style={{
        maxWidth: '420px',
        width: '100%',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        padding: '40px',
        position: 'relative',
      }}>
        {/* Header avec logo */}
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
            💼
          </div>
          <h1 style={{ margin: '0 0 5px 0', fontSize: '28px', color: '#2d3748', fontWeight: '600' }}>InvestKit</h1>
          <p style={{ margin: '0', fontSize: '14px', color: '#718096' }}>Plateforme Premium d'Investissement</p>
        </div>

        {/* Sous-titre */}
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h2 style={{ margin: '0', fontSize: '20px', color: '#2d3748', fontWeight: '500' }}>Bienvenue</h2>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#a0aec0' }}>Connectez-vous à votre compte</p>
        </div>

        {/* Social Login Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/' })}
            style={{
              flex: 1,
              padding: '10px 12px',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              color: '#2d3748',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.3s ease',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#f7fafc';
              e.target.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'white';
              e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }}
          >
            <span style={{ fontSize: '18px' }}>🔵</span>
            <span>Google</span>
          </button>
          <button
            type="button"
            onClick={() => signIn('github', { callbackUrl: '/' })}
            style={{
              flex: 1,
              padding: '10px 12px',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              color: '#2d3748',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.3s ease',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#f7fafc';
              e.target.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'white';
              e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }}
          >
            <span style={{ fontSize: '18px' }}>⚫</span>
            <span>GitHub</span>
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0', opacity: 0.5 }}>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          <span style={{ fontSize: '12px', color: '#a0aec0', fontWeight: '500' }}>OU</span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#2d3748', marginBottom: '6px' }}>📧 Email</label>
            <input
              type="email"
              placeholder="nom@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'all 0.3s ease',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
              }}
              required
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#2d3748', marginBottom: '6px' }}>🔒 Mot de passe</label>
            <input
              type="password"
              placeholder="Votre mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'all 0.3s ease',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
              }}
              required
            />
          </div>

          {/* Links */}
          <div style={{ textAlign: 'right', marginBottom: '5px' }}>
            <a href="/forgot-password" style={{ fontSize: '12px', color: '#667eea', textDecoration: 'none', fontWeight: '500' }}>Mot de passe oublié?</a>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '5px',
              padding: '12px 16px',
              background: !loading ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#cbd5e0',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: !loading ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
              boxShadow: !loading ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }
            }}
          >
            {loading ? (
              <>
                <div style={{ width: '16px', height: '16px', borderWidth: '2px', borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>Connexion...</span>
              </>
            ) : (
              '✨ Se connecter'
            )}
          </button>
        </form>

        {/* Message */}
        {message && (
          <div style={{
            marginTop: '15px',
            padding: '12px 14px',
            background: message.includes('✅') ? '#f0fff4' : '#fff5f5',
            border: `1px solid ${message.includes('✅') ? '#c6f6d5' : '#fed7d7'}`,
            borderRadius: '8px',
            color: message.includes('✅') ? '#22543d' : '#742a2a',
            fontSize: '13px',
            lineHeight: '1.5',
          }}>
            {message}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: '30px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px' }}>
        <p style={{ margin: '0' }}>Pas de compte? <a href="/signup" style={{ color: 'white', textDecoration: 'none', fontWeight: '600' }}>S'inscrire</a></p>
      </div>
    </div>
  );
}
