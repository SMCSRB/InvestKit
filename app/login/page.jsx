'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

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
        setTimeout(() => router.push('/dashboard'), 1500);
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
          50% { transform: translateY(-10px) scale(1.05); }
        }

        .form-container {
          animation: slideIn 0.6s ease-out;
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
        maxWidth: '420px',
        width: '100%',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.97) 100%)',
        borderRadius: '28px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25), 0 0 120px rgba(59, 130, 246, 0.15)',
        padding: 'clamp(20px, 5vw, 28px) clamp(20px, 6vw, 32px)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
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
            🔐
          </div>
          <h1 style={{
            margin: '0 0 6px 0',
            fontSize: 'clamp(18px, 5vw, 24px)',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #0f172a 0%, #3b82f6 50%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Connexion
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Accédez à votre compte InvestKit
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Email */}
          <div>
            <label style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#1e293b',
              display: 'block',
              marginBottom: '8px',
              letterSpacing: '0.3px',
            }}>
              📧 Email
            </label>
            <input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#f8fafc',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
                e.target.style.backgroundColor = '#f8fafc';
              }}
              required
            />
          </div>

          {/* Password */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: '700',
                color: '#1e293b',
                letterSpacing: '0.3px',
              }}>
                🔒 Mot de passe
              </label>
              <a href="/forgot-password" style={{
                fontSize: '11px',
                color: '#3b82f6',
                textDecoration: 'none',
                fontWeight: '600',
                transition: 'color 0.2s',
              }}
              onMouseOver={(e) => e.target.style.color = '#8b5cf6'}
              onMouseOut={(e) => e.target.style.color = '#3b82f6'}
              >
                Oublié?
              </a>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#f8fafc',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
                e.target.style.backgroundColor = '#f8fafc';
              }}
              required
            />
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              padding: '11px 14px',
              background: !loading && email && password
                ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)'
                : '#cbd5e1',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: !loading && email && password ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: loading ? 0.9 : 1,
              letterSpacing: '0.3px',
              boxShadow: !loading && email && password ? '0 10px 30px rgba(59, 130, 246, 0.3)' : 'none',
            }}
            onMouseOver={(e) => {
              if (!loading && email && password) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 15px 40px rgba(59, 130, 246, 0.4)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading && email && password) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.3)';
              }
            }}
          >
            {loading ? '⏳ Connexion...' : '✨ Se connecter'}
          </button>
        </form>

        {/* Footer Link */}
        <div style={{
          marginTop: '14px',
          textAlign: 'center',
          paddingTop: '12px',
          borderTop: '1px solid #e2e8f0',
        }}>
          <p style={{
            fontSize: '12px',
            color: '#64748b',
            margin: '0 0 8px 0',
            fontWeight: '500',
          }}>
            Pas de compte?
          </p>
          <a
            href="/signup"
            style={{
              fontSize: '12px',
              color: '#3b82f6',
              textDecoration: 'none',
              fontWeight: '600',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.target.style.textDecoration = 'underline';
              e.target.style.color = '#8b5cf6';
            }}
            onMouseOut={(e) => {
              e.target.style.textDecoration = 'none';
              e.target.style.color = '#3b82f6';
            }}
          >
            Créer un compte →
          </a>
        </div>
      </div>
    </div>
  );
}
