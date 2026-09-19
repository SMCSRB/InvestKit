'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HCaptcha from '@hcaptcha/react-hcaptcha';

const TRANSLATIONS = {
  fr: {
    createAccount: 'Créer votre compte',
    joinInvestors: 'Rejoignez des milliers d\'investisseurs',
    progress: 'Progression',
    email: 'Email',
    emailAvailable: 'Email disponible',
    password: 'Mot de passe',
    passwordConfirm: 'Confirmer le mot de passe',
    passwordsMatch: 'Les mots de passe correspondent',
    passwordDontMatch: 'Les mots de passe ne correspondent pas',
    strength: 'Force:',
    weak: '❌ Faible',
    medium: '⚠️ Moyen',
    strong: '💪 Fort',
    iamHuman: 'Je suis un humain',
    gdprConsent: '🔒 Je consens au traitement de mes données personnelles selon le RGPD',
    terms: 'conditions d\'utilisation',
    signup: '✨ S\'inscrire',
    signupError: 'Erreur lors de l\'inscription',
    resendCode: 'Renvoyer le code',
    serverError: 'Erreur de connexion au serveur',
  },
  en: {
    createAccount: 'Create your account',
    joinInvestors: 'Join thousands of investors',
    progress: 'Progress',
    email: 'Email',
    emailAvailable: 'Email available',
    password: 'Password',
    passwordConfirm: 'Confirm password',
    passwordsMatch: 'Passwords match',
    passwordDontMatch: 'Passwords don\'t match',
    strength: 'Strength:',
    weak: '❌ Weak',
    medium: '⚠️ Medium',
    strong: '💪 Strong',
    iamHuman: 'I\'m human',
    gdprConsent: '🔒 I consent to the processing of my personal data according to GDPR',
    terms: 'terms of service',
    signup: '✨ Sign up',
    signupError: 'Signup error',
    serverError: 'Server connection error',
    resendCode: 'Resend code',
  },
  es: {
    createAccount: 'Crear tu cuenta',
    joinInvestors: 'Únete a miles de inversores',
    progress: 'Progreso',
    email: 'Correo electrónico',
    emailAvailable: 'Correo disponible',
    password: 'Contraseña',
    passwordConfirm: 'Confirmar contraseña',
    passwordsMatch: 'Las contraseñas coinciden',
    passwordDontMatch: 'Las contraseñas no coinciden',
    strength: 'Fuerza:',
    weak: '❌ Débil',
    medium: '⚠️ Media',
    strong: '💪 Fuerte',
    iamHuman: 'Soy humano',
    gdprConsent: '🔒 Doy mi consentimiento para el tratamiento de mis datos personales según RGPD',
    terms: 'términos de servicio',
    signup: '✨ Registrarse',
    signupError: 'Error de registro',
    serverError: 'Error de conexión al servidor',
    resendCode: 'Reenviar código',
  },
};

const EMAIL_SUGGESTIONS = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com'];

export default function SignupPage() {
  const router = useRouter();
  const [lang, setLang] = useState('fr');
  const [email, setEmail] = useState('');
  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const captchaRef = useRef(null);
  const emailCheckTimeoutRef = useRef(null);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => setIsInitialLoad(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEmailChange = (value) => {
    setEmail(value);
    
    // Show suggestions if user types @ or partially typed email
    if (value.includes('@')) {
      const [name, domain] = value.split('@');
      if (domain.length > 0 && domain.length < 5) {
        const suggestions = EMAIL_SUGGESTIONS
          .filter(s => s.startsWith(domain))
          .map(s => `${name}@${s}`);
        setEmailSuggestions(suggestions);
      } else {
        setEmailSuggestions([]);
      }
    } else {
      setEmailSuggestions([]);
    }
  };

  const selectEmailSuggestion = (suggestion) => {
    setEmail(suggestion);
    setEmailSuggestions([]);
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

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    const strengthScore = [hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar].filter(Boolean).length;

    if (password.length >= 12 && strengthScore >= 3) return 'fort';
    if (password.length >= 10 && strengthScore >= 2) return 'moyen';
    if (password.length >= 8 && strengthScore >= 1) return 'moyen';
    if (password.length >= 6) return 'faible';

    return 'faible';
  };

  const isEmailFormatValid = validateEmail(email);
  const isEmailValid = isEmailFormatValid && emailAvailable === true;
  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password === passwordConfirm && password.length >= 6;
  const isFormValid = isEmailValid && passwordsMatch && captchaToken && gdprConsent;

  const formSteps = [
    isEmailValid,
    password.length >= 6,
    passwordsMatch,
    captchaToken !== null,
    gdprConsent,
  ];
  const completedSteps = formSteps.filter(Boolean).length;
  const formProgress = Math.round((completedSteps / formSteps.length) * 100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!isFormValid) {
      setMessage('❌ ' + t.signupError);
      setLoading(false);
      return;
    }

    if (!captchaToken) {
      setMessage('❌ ' + t.signupError);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://192.168.1.201:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, captchaToken }),
      });

      const data = await response.json();
      if (response.ok) {
        sessionStorage.setItem('verificationEmail', email);
        router.push('/verify-email');
      } else {
        setMessage(`❌ ${data.error || t.signupError}`);
        console.error('Signup error:', data);
      }
    } catch (error) {
      setMessage('❌ ' + t.serverError);
    } finally {
      setLoading(false);
    }
  };

  // Skeleton Loader
  if (isInitialLoad) {
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
          @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
          }
          .skeleton {
            background: linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%);
            background-size: 1000px 100%;
            animation: shimmer 2s infinite;
            border-radius: 8px;
          }
        `}</style>
        
        <div style={{
          maxWidth: '420px',
          width: '100%',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          padding: '40px',
        }}>
          {/* Skeleton Header */}
          <div className="skeleton" style={{ width: '50px', height: '50px', borderRadius: '10px', margin: '0 auto 15px' }} />
          <div className="skeleton" style={{ width: '100%', height: '28px', marginBottom: '10px' }} />
          <div className="skeleton" style={{ width: '80%', height: '14px', marginBottom: '20px' }} />

          {/* Skeleton Progress */}
          <div className="skeleton" style={{ width: '100%', height: '6px', marginBottom: '30px' }} />

          {/* Skeleton Fields */}
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ marginBottom: '15px' }}>
              <div className="skeleton" style={{ width: '60px', height: '14px', marginBottom: '8px' }} />
              <div className="skeleton" style={{ width: '100%', height: '40px', marginBottom: '8px' }} />
            </div>
          ))}

          {/* Skeleton Button */}
          <div className="skeleton" style={{ width: '100%', height: '45px', marginTop: '20px' }} />
        </div>
      </div>
    );
  }

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
      position: 'relative',
    }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 30px;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .email-suggestions {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-top: none;
          border-radius: 0 0 8px 8px;
          max-height: 150px;
          overflow-y: auto;
          z-index: 100;
        }
        .email-suggestion {
          padding: 10px 12px;
          cursor: pointer;
          border-bottom: 1px solid #e2e8f0;
          font-size: 14px;
          color: #2d3748;
        }
        .email-suggestion:hover {
          background: #f7fafc;
        }
        .email-suggestion:last-child {
          border-bottom: none;
        }
      `}</style>

      {/* Language Selector */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        display: 'flex',
        gap: '8px',
      }}>
        {['fr', 'en', 'es'].map(l => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{
              padding: '8px 12px',
              background: lang === l ? '#667eea' : 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: lang === l ? '600' : '400',
              transition: 'all 0.3s',
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

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
          <h2 style={{ margin: '0', fontSize: '20px', color: '#2d3748', fontWeight: '500' }}>{t.createAccount}</h2>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#a0aec0' }}>{t.joinInvestors}</p>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '500', color: '#718096' }}>{t.progress}</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#667eea' }}>{formProgress}%</span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: '#e2e8f0',
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${formProgress}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${formProgress < 50 ? '#f56565' : formProgress < 100 ? '#ecc94b' : '#48bb78'}, ${formProgress < 50 ? '#f56565' : formProgress < 100 ? '#ecc94b' : '#48bb78'})`,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Email */}
          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#2d3748', marginBottom: '6px', display: 'block' }}>📧 {t.email}</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
              <input
                type="email"
                placeholder="nom@example.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  position: 'relative',
                  zIndex: 1,
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
              
              {/* Email Suggestions */}
              {emailSuggestions.length > 0 && (
                <div className="email-suggestions">
                  {emailSuggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="email-suggestion"
                      onClick={() => selectEmailSuggestion(suggestion)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {email && !checkingEmail && !isEmailFormatValid && <p style={{ fontSize: '12px', color: '#f56565', margin: '4px 0 0 0' }}>Format invalide</p>}
            {email && !checkingEmail && isEmailValid && <p style={{ fontSize: '12px', color: '#48bb78', margin: '4px 0 0 0' }}>✅ {t.emailAvailable}</p>}
          </div>

          {/* Mot de passe */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#2d3748', marginBottom: '6px', display: 'block' }}>🔒 {t.password}</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
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
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '0',
                  color: '#718096',
                  transition: 'color 0.3s',
                }}
                onMouseEnter={(e) => e.target.style.color = '#667eea'}
                onMouseLeave={(e) => e.target.style.color = '#718096'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
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
                  {t.strength} <strong>{passwordStrength === 'fort' ? t.strong : passwordStrength === 'moyen' ? t.medium : t.weak}</strong>
                </p>
              </>
            )}
          </div>

          {/* Confirmer Mot de passe */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#2d3748', marginBottom: '6px', display: 'block' }}>🔐 {t.passwordConfirm}</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type={showPasswordConfirm ? 'text' : 'password'}
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
              <button
                type="button"
                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '0',
                  color: '#718096',
                  transition: 'color 0.3s',
                }}
                onMouseEnter={(e) => e.target.style.color = '#667eea'}
                onMouseLeave={(e) => e.target.style.color = '#718096'}
              >
                {showPasswordConfirm ? '👁️' : '👁️‍🗨️'}
              </button>
              {passwordConfirm && <span style={{ fontSize: '18px', color: passwordsMatch ? '#48bb78' : '#f56565' }}>{passwordsMatch ? '✅' : '❌'}</span>}
            </div>
            {passwordConfirm && !passwordsMatch && <p style={{ fontSize: '12px', color: '#f56565', margin: '4px 0 0 0' }}>{t.passwordDontMatch}</p>}
            {passwordConfirm && passwordsMatch && <p style={{ fontSize: '12px', color: '#48bb78', margin: '4px 0 0 0' }}>✅ {t.passwordsMatch}</p>}
          </div>

          {/* hCaptcha */}
          <div style={{ margin: '10px 0' }}>
            <HCaptcha
              sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY}
              onVerify={(token) => setCaptchaToken(token)}
              ref={captchaRef}
              theme="light"
            />
          </div>

          {/* GDPR Consent */}
          <div style={{
            padding: '12px',
            background: '#e6fffa',
            border: '1px solid #81e6d9',
            borderRadius: '8px',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
          }}>
            <input
              type="checkbox"
              id="gdpr"
              checked={gdprConsent}
              onChange={(e) => setGdprConsent(e.target.checked)}
              style={{
                marginTop: '3px',
                cursor: 'pointer',
                width: '18px',
                height: '18px',
              }}
              required
            />
            <label htmlFor="gdpr" style={{ fontSize: '12px', color: '#234e52', margin: '0', cursor: 'pointer', flex: 1 }}>
              {t.gdprConsent}
            </label>
          </div>

          {/* Terms Link */}
          <div style={{ textAlign: 'center', fontSize: '12px', color: '#718096' }}>
            En créant un compte, vous acceptez nos{' '}
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: 'inherit',
                fontWeight: '500',
              }}
            >
              {t.terms}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !isFormValid}
            style={{
              marginTop: '5px',
              padding: '12px 16px',
              background: !loading && isFormValid ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#cbd5e0',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: !loading && isFormValid ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
              boxShadow: !loading && isFormValid ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              if (!loading && isFormValid) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && isFormValid) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }
            }}
          >
            {loading ? (
              <>
                <div className="spinner" />
                <span>Inscription...</span>
              </>
            ) : (
              t.signup
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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>{message}</span>
            {message.includes('❌') && (
              <button
                type="button"
                onClick={() => setShowResendModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  padding: 0,
                }}
              >
                {t.resendCode}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: '30px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px' }}>
        <p style={{ margin: '0' }}>Pas de compte? <a href="/login" style={{ color: 'white', textDecoration: 'none', fontWeight: '600' }}>Se connecter</a></p>
      </div>

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="modal-overlay" onClick={() => setShowTermsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: '0', color: '#2d3748' }}>Conditions d'Utilisation</h2>
            
            <h3 style={{ color: '#667eea', marginTop: '20px' }}>1. Acceptation des Conditions</h3>
            <p>En utilisant InvestKit, vous acceptez ces conditions d'utilisation dans leur intégralité.</p>

            <h3 style={{ color: '#667eea', marginTop: '20px' }}>2. Licence d'Utilisation</h3>
            <p>InvestKit vous accorde une licence limitée pour accéder à la plateforme.</p>

            <h3 style={{ color: '#667eea', marginTop: '20px' }}>3. Restrictions d'Utilisation</h3>
            <p>Vous ne devez pas reproduire ou distribuer le contenu sans autorisation.</p>

            <h3 style={{ color: '#667eea', marginTop: '20px' }}>4. Disclaimer</h3>
            <p>Les informations sont à titre informatif uniquement et ne constituent pas des conseils financiers.</p>

            <h3 style={{ color: '#667eea', marginTop: '20px' }}>5. Limitation de Responsabilité</h3>
            <p>InvestKit n'est pas responsable des pertes résultant de l'utilisation de la plateforme.</p>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                onClick={() => setShowTermsModal(false)}
                style={{
                  padding: '10px 20px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
