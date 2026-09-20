'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    const verificationEmail = sessionStorage.getItem('verificationEmail');
    if (!verificationEmail) {
      router.push('/signup');
    } else {
      setEmail(verificationEmail);
    }
  }, [router]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return;
    if (!/^[0-9]*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setMessage('❌ Veuillez entrer un code à 6 chiffres');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://192.168.1.201:5000/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('✅ Email vérifiée!');
        sessionStorage.setItem('userEmail', email);
        setTimeout(() => router.push('/onboarding'), 1500);
      } else {
        setMessage(`❌ ${data.error || 'Code invalide'}`);
      }
    } catch (error) {
      setMessage('❌ Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://192.168.1.201:5000/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setMessage('✅ Code renvoyé avec succès');
        setResendTimer(60);
      } else {
        setMessage('❌ Erreur lors de l\'envoi du code');
      }
    } catch (error) {
      setMessage('❌ Erreur de connexion');
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

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        .form-container {
          animation: slideIn 0.6s ease-out;
        }

        .code-input-focused {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          background-color: rgba(59, 130, 246, 0.02);
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
        padding: '28px 32px',
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
            fontSize: '32px',
            margin: '0 auto 12px',
            animation: 'floatGradient 3s ease-in-out infinite',
            boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
          }}>
            ✉️
          </div>
          <h1 style={{
            margin: '0 0 6px 0',
            fontSize: '24px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #0f172a 0%, #3b82f6 50%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Vérifiez votre Email
          </h1>
          <p style={{ margin: '8px 0 3px 0', fontSize: '13px', color: '#64748b' }}>
            Nous avons envoyé un code à
          </p>
          <p style={{
            margin: '2px 0 0 0',
            fontSize: '13px',
            color: '#3b82f6',
            fontWeight: '600',
            wordBreak: 'break-all',
          }}>
            {email}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Code Input Label */}
          <div>
            <label style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#1e293b',
              display: 'block',
              marginBottom: '10px',
              letterSpacing: '0.3px',
            }}>
              Code de vérification (6 chiffres)
            </label>

            {/* Code Input Boxes */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`code-${index}`}
                  type="text"
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  maxLength={1}
                  style={{
                    width: '46px',
                    height: '46px',
                    fontSize: '22px',
                    fontWeight: '700',
                    textAlign: 'center',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    outline: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    color: '#1e293b',
                    backgroundColor: digit ? 'rgba(59, 130, 246, 0.03)' : '#f8fafc',
                    letterSpacing: '2px',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = digit ? '#10b981' : '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                    e.target.style.backgroundColor = digit ? 'rgba(16, 185, 129, 0.03)' : '#f8fafc';
                  }}
                  autoComplete="off"
                  autoFocus={index === 0}
                  required
                />
              ))}
            </div>
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
            disabled={loading || code.some(c => !c)}
            style={{
              padding: '11px 14px',
              background: !loading && code.every(c => c)
                ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)'
                : '#cbd5e1',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: !loading && code.every(c => c) ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: loading ? 0.9 : 1,
              letterSpacing: '0.3px',
              boxShadow: !loading && code.every(c => c) ? '0 10px 30px rgba(59, 130, 246, 0.3)' : 'none',
            }}
            onMouseOver={(e) => {
              if (!loading && code.every(c => c)) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 15px 40px rgba(59, 130, 246, 0.4)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading && code.every(c => c)) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.3)';
              }
            }}
          >
            {loading ? '⏳ Vérification...' : '✨ Vérifier le code'}
          </button>

          {/* Resend Code Section */}
          <div style={{
            textAlign: 'center',
            paddingTop: '4px',
            borderTop: '1px solid #e2e8f0',
          }}>
            <p style={{
              fontSize: '12px',
              color: '#64748b',
              margin: '10px 0 8px 0',
              fontWeight: '500',
            }}>
              Vous n'avez pas reçu le code ?
            </p>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendTimer > 0 || loading}
              style={{
                background: 'none',
                border: 'none',
                color: resendTimer > 0 ? '#cbd5e1' : '#3b82f6',
                fontSize: '12px',
                fontWeight: '700',
                cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                textDecoration: 'none',
                transition: 'all 0.2s',
                padding: '6px 0',
              }}
              onMouseOver={(e) => {
                if (resendTimer === 0 && !loading) {
                  e.target.style.textDecoration = 'underline';
                  e.target.style.color = '#8b5cf6';
                }
              }}
              onMouseOut={(e) => {
                e.target.style.textDecoration = 'none';
                e.target.style.color = resendTimer > 0 ? '#cbd5e1' : '#3b82f6';
              }}
            >
              {resendTimer > 0 ? `Renvoyer dans ${resendTimer}s` : 'Renvoyer le code'}
            </button>
          </div>
        </form>

        {/* Back Link */}
        <div style={{
          marginTop: '14px',
          textAlign: 'center',
          paddingTop: '12px',
          borderTop: '1px solid #e2e8f0',
        }}>
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
            ← Retour à l'inscription
          </a>
        </div>
      </div>
    </div>
  );
}
