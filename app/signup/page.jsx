'use client';

import { useState, useRef, useEffect } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [verificationInfo, setVerificationInfo] = useState(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const captchaRef = useRef(null);
  const emailCheckTimeoutRef = useRef(null);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const checkEmailAvailability = async (emailToCheck) => {
    if (!validateEmail(emailToCheck)) {
      setEmailAvailable(null);
      return;
    }

    setCheckingEmail(true);
    try {
      const response = await fetch(`http://192.168.1.201:5000/api/auth/check-email/${encodeURIComponent(emailToCheck)}`);
      const data = await response.json();
      setEmailAvailable(data.available);
    } catch (error) {
      console.error('Email check error:', error);
      setEmailAvailable(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  // Debounced email check
  useEffect(() => {
    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
    }

    if (email) {
      emailCheckTimeoutRef.current = setTimeout(() => {
        checkEmailAvailability(email);
      }, 500);
    } else {
      setEmailAvailable(null);
    }

    return () => {
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }
    };
  }, [email]);

  const getPasswordStrength = (password) => {
    if (password.length < 6) return 'faible';
    if (password.length < 10 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return 'moyen';
    return 'fort';
  };

  const isEmailFormatValid = validateEmail(email);
  const isEmailValid = isEmailFormatValid && emailAvailable === true;
  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password === passwordConfirm && password.length >= 6;
  const isFormValid = firstName && lastName && isEmailValid && passwordsMatch && captchaToken && acceptTerms;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!isFormValid) {
      setMessage('❌ Veuillez remplir tous les champs correctement');
      setLoading(false);
      return;
    }

    if (!captchaToken) {
      setMessage('❌ Veuillez compléter le captcha');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://192.168.1.201:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName, captchaToken }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('✅ Inscription réussie!');
        setVerificationInfo(data);
        console.log('Signup response:', data);
        setEmail('');
        setPassword('');
        setPasswordConfirm('');
        setFirstName('');
        setLastName('');
      } else {
        setMessage(`❌ ${data.error || 'Erreur lors de l\'inscription'}`);
        console.error('Signup error:', data);
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
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
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
          <h2 style={{ margin: '0', fontSize: '20px', color: '#2d3748', fontWeight: '500' }}>Créer votre compte</h2>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#a0aec0' }}>Rejoignez des milliers d'investisseurs</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Prénom */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#2d3748', marginBottom: '6px' }}>👤 Prénom</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Votre prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'all 0.3s ease',
                outline: 'none',
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
            {firstName && <span style={{ fontSize: '18px', color: '#48bb78' }}>✅</span>}
          </div>
          {!firstName && <p style={{ fontSize: '12px', color: '#cbd5e0', margin: '4px 0 0 0' }}>Requis</p>}
        </div>

        {/* Nom */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#2d3748', marginBottom: '6px' }}>👤 Nom</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Votre nom de famille"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'all 0.3s ease',
                outline: 'none',
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
            {lastName && <span style={{ fontSize: '18px', color: '#48bb78' }}>✅</span>}
          </div>
          {!lastName && <p style={{ fontSize: '12px', color: '#cbd5e0', margin: '4px 0 0 0' }}>Requis</p>}
        </div>

        {/* Email */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#2d3748', marginBottom: '6px' }}>📧 Email</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="email"
              placeholder="nom@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'all 0.3s ease',
                outline: 'none',
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
            {checkingEmail && <span style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}>⏳</span>}
            {!checkingEmail && email && (isEmailValid ? <span style={{ fontSize: '18px', color: '#48bb78' }}>✅</span> : <span style={{ fontSize: '18px', color: '#f56565' }}>❌</span>)}
          </div>
          {email && checkingEmail && <p style={{ fontSize: '12px', color: '#a0aec0', margin: '4px 0 0 0' }}>Vérification en cours...</p>}
          {email && !checkingEmail && !isEmailFormatValid && <p style={{ fontSize: '12px', color: '#f56565', margin: '4px 0 0 0' }}>Format invalide</p>}
          {email && !checkingEmail && isEmailFormatValid && emailAvailable === false && <p style={{ fontSize: '12px', color: '#f56565', margin: '4px 0 0 0' }}>Email déjà utilisé</p>}
          {email && !checkingEmail && isEmailValid && <p style={{ fontSize: '12px', color: '#48bb78', margin: '4px 0 0 0' }}>Email disponible</p>}
          {!email && <p style={{ fontSize: '12px', color: '#cbd5e0', margin: '4px 0 0 0' }}>Requis</p>}
        </div>

        {/* Mot de passe */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#2d3748', marginBottom: '6px' }}>🔒 Mot de passe</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="password"
              placeholder="Minimum 6 caractères"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'all 0.3s ease',
                outline: 'none',
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
            {password.length >= 6 && <span style={{ fontSize: '18px', color: '#48bb78' }}>✅</span>}
          </div>
          {password && (
            <>
              <div style={{ display: 'flex', gap: '4px', margin: '8px 0', height: '5px' }}>
                <div style={{ flex: 1, background: passwordStrength !== 'faible' ? '#f56565' : '#e2e8f0', borderRadius: '3px', transition: 'all 0.3s' }} />
                <div style={{ flex: 1, background: passwordStrength === 'fort' ? '#48bb78' : '#e2e8f0', borderRadius: '3px', transition: 'all 0.3s' }} />
                <div style={{ flex: 1, background: passwordStrength === 'fort' ? '#48bb78' : '#e2e8f0', borderRadius: '3px', transition: 'all 0.3s' }} />
              </div>
              <p style={{ fontSize: '12px', color: passwordStrength === 'fort' ? '#48bb78' : passwordStrength === 'moyen' ? '#ecc94b' : '#f56565', margin: '0', fontWeight: '500' }}>
                Force: <strong>{passwordStrength === 'fort' ? '💪 Fort' : passwordStrength === 'moyen' ? '⚠️ Moyen' : '❌ Faible'}</strong>
              </p>
            </>
          )}
          {!password && <p style={{ fontSize: '12px', color: '#cbd5e0', margin: '4px 0 0 0' }}>Minimum 6 caractères</p>}
        </div>

        {/* Confirmer Mot de passe */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#2d3748', marginBottom: '6px' }}>🔐 Confirmer le mot de passe</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="password"
              placeholder="Répétez votre mot de passe"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: `2px solid ${passwordConfirm ? (passwordsMatch ? '#c6f6d5' : '#fed7d7') : '#e2e8f0'}`,
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'all 0.3s ease',
                outline: 'none',
                backgroundColor: passwordConfirm ? (passwordsMatch ? '#f0fff4' : '#fff5f5') : 'white',
              }}
              onFocus={(e) => {
                if (!passwordConfirm || !password) {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none';
                if (!passwordConfirm) {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.backgroundColor = 'white';
                }
              }}
              required
            />
            {passwordConfirm && password && (passwordsMatch ? <span style={{ fontSize: '18px', color: '#48bb78' }}>✅</span> : <span style={{ fontSize: '18px', color: '#f56565' }}>❌</span>)}
          </div>
          {password && !passwordConfirm && <p style={{ fontSize: '12px', color: '#cbd5e0', margin: '4px 0 0 0' }}>Requis</p>}
          {passwordConfirm && password && !passwordsMatch && <p style={{ fontSize: '12px', color: '#f56565', margin: '4px 0 0 0' }}>Les mots de passe ne correspondent pas</p>}
          {passwordConfirm && password && passwordsMatch && <p style={{ fontSize: '12px', color: '#48bb78', margin: '4px 0 0 0' }}>Mots de passe identiques ✓</p>}
        </div>

        {/* hCaptcha */}
        <div style={{ margin: '20px 0', padding: '12px', background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'center', minHeight: '90px' }}>
          {process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY ? (
            <HCaptcha
              ref={captchaRef}
              sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY}
              onVerify={(token) => setCaptchaToken(token)}
            />
          ) : (
            <p style={{ color: '#f56565', fontSize: '13px' }}>⚠️ hCaptcha key not configured</p>
          )}
        </div>

        {/* Conditions d'utilisation */}
        <div style={{ margin: '15px 0', padding: '12px', background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              id="terms"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              style={{ marginTop: '2px', cursor: 'pointer', width: '18px', height: '18px', accentColor: '#667eea' }}
              required
            />
            <label htmlFor="terms" style={{ fontSize: '13px', cursor: 'pointer', color: '#2d3748', lineHeight: '1.4' }}>
              J'accepte les <a href="/conditions" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', textDecoration: 'none', fontWeight: '500' }}>Conditions d'Utilisation</a> et la <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', textDecoration: 'none', fontWeight: '500' }}>Politique de Confidentialité</a>
            </label>
          </div>
          {!acceptTerms && <p style={{ fontSize: '12px', color: '#f56565', margin: '6px 0 0 0' }}>Requis pour continuer</p>}
        </div>

        {/* Trust Signals / Sécurité */}
        <div style={{ margin: '15px 0', paddingTop: '15px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '12px', color: '#718096' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '16px' }}>🔒</span>
            <span>SSL Secure</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '16px' }}>✓</span>
            <span>hCaptcha Protected</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !isFormValid}
          style={{
            marginTop: '10px',
            padding: '12px 16px',
            background: isFormValid && !loading ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : loading ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#cbd5e0',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: isFormValid && !loading ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s ease',
            boxShadow: isFormValid && !loading ? '0 4px 15px rgba(102, 126, 234, 0.4)' : loading ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: loading ? 0.9 : 1,
          }}
          onMouseEnter={(e) => {
            if (isFormValid && !loading) {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (isFormValid && !loading) {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
            }
          }}
        >
          {loading ? (
            <>
              <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span>Inscription en cours...</span>
            </>
          ) : (
            '✨ S\'inscrire'
          )}
        </button>
        </form>

        {/* Message alert */}
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

        {/* Verification Info */}
        {verificationInfo && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: 'linear-gradient(135deg, #f0fff4 0%, #e6fffa 100%)',
            border: '1px solid #c6f6d5',
            borderRadius: '8px',
            textAlign: 'left',
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#22543d' }}>✅ Inscription réussie!</h3>
            <div style={{ fontSize: '13px', color: '#2d3748', lineHeight: '1.6' }}>
              <p style={{ margin: '0 0 8px 0' }}><strong>ID Utilisateur:</strong> <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>{verificationInfo.userId}</code></p>
              {verificationInfo.verificationCode && (
                <p style={{ margin: '0 0 12px 0' }}><strong>Code de vérification:</strong> <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', color: '#667eea', fontWeight: '600' }}>{verificationInfo.verificationCode}</code></p>
              )}
              <p style={{ margin: '12px 0 0 0', paddingTop: '12px', borderTop: '1px solid #c6f6d5' }}>
                ➡️ <a href="/verify-email" style={{ color: '#667eea', textDecoration: 'none', fontWeight: '600' }}>Vérifier votre email</a>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: '30px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px' }}>
        <p style={{ margin: '0' }}>Vous avez déjà un compte? <a href="/login" style={{ color: 'white', textDecoration: 'none', fontWeight: '600' }}>Se connecter</a></p>
      </div>
    </div>
  );
}
