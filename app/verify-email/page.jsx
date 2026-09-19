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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    }}>
      <div style={{
        maxWidth: '420px',
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
            ✉️
          </div>
          <h1 style={{ margin: '0 0 5px 0', fontSize: '28px', color: '#2d3748', fontWeight: '600' }}>Vérifiez votre Email</h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#a0aec0' }}>Nous avons envoyé un code à</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#667eea', fontWeight: '600' }}>{email}</p>
        </div>

        {/* Code Input */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#2d3748', display: 'block', marginBottom: '12px' }}>
              Code de vérification (6 chiffres)
            </label>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
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
                    width: '50px',
                    height: '50px',
                    fontSize: '24px',
                    fontWeight: '600',
                    textAlign: 'center',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    color: '#2d3748',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || code.some(c => !c)}
            style={{
              padding: '12px 16px',
              background: !loading && code.every(c => c) ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#cbd5e0',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: !loading && code.every(c => c) ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
            }}
          >
            {loading ? 'Vérification...' : '✨ Vérifier le code'}
          </button>

          {/* Resend Code */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#718096', margin: '0 0 10px 0' }}>Vous n'avez pas reçu le code?</p>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendTimer > 0 || loading}
              style={{
                background: 'none',
                border: 'none',
                color: resendTimer > 0 ? '#cbd5e0' : '#667eea',
                fontSize: '13px',
                fontWeight: '600',
                cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                textDecoration: 'underline',
              }}
            >
              {resendTimer > 0 ? `Renvoyer dans ${resendTimer}s` : 'Renvoyer le code'}
            </button>
          </div>
        </form>

        {/* Back to Signup */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <a href="/signup" style={{ fontSize: '12px', color: '#667eea', textDecoration: 'none', fontWeight: '500' }}>
            ← Retour à l'inscription
          </a>
        </div>
      </div>
    </div>
  );
}
