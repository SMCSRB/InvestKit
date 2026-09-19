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
    gdprConsent: '🔒 Je consens au traitement de mes données personnelles',
    gdprDetails: 'Voir les détails RGPD',
    terms: 'conditions d\'utilisation',
    signup: '✨ S\'inscrire',
    signupError: 'Erreur lors de l\'inscription',
    resendCode: 'Renvoyer le code',
    serverError: 'Erreur de connexion au serveur',
    passwordRequirements: 'Exigences du mot de passe',
    minLength: 'Au moins 8 caractères',
    uppercase: 'Au moins une majuscule',
    lowercase: 'Au moins une minuscule',
    number: 'Au moins un chiffre',
    specialChar: 'Au moins un caractère spécial',
    gdprModal: 'Politique de Confidentialité et RGPD',
    gdprText: 'Nous nous engageons à protéger vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD). Vos informations sont cryptées et traitées de manière sécurisée. Vous avez le droit d\'accéder, modifier ou supprimer vos données à tout moment.',
    close: 'Fermer',
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
    gdprConsent: '🔒 I consent to the processing of my personal data',
    gdprDetails: 'See GDPR details',
    terms: 'terms of service',
    signup: '✨ Sign up',
    signupError: 'Signup error',
    serverError: 'Server connection error',
    resendCode: 'Resend code',
    passwordRequirements: 'Password requirements',
    minLength: 'At least 8 characters',
    uppercase: 'At least one uppercase letter',
    lowercase: 'At least one lowercase letter',
    number: 'At least one number',
    specialChar: 'At least one special character',
    gdprModal: 'Privacy Policy and GDPR',
    gdprText: 'We are committed to protecting your personal data in accordance with the General Data Protection Regulation (GDPR). Your information is encrypted and processed securely. You have the right to access, modify or delete your data at any time.',
    close: 'Close',
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
    gdprConsent: '🔒 Doy mi consentimiento para el tratamiento de mis datos personales',
    gdprDetails: 'Ver detalles RGPD',
    terms: 'términos de servicio',
    signup: '✨ Registrarse',
    signupError: 'Error de registro',
    serverError: 'Error de conexión al servidor',
    resendCode: 'Reenviar código',
    passwordRequirements: 'Requisitos de contraseña',
    minLength: 'Al menos 8 caracteres',
    uppercase: 'Al menos una mayúscula',
    lowercase: 'Al menos una minúscula',
    number: 'Al menos un número',
    specialChar: 'Al menos un carácter especial',
    gdprModal: 'Política de Privacidad y RGPD',
    gdprText: 'Nos comprometemos a proteger tus datos personales de conformidad con el Reglamento General de Protección de Datos (RGPD). Tu información está encriptada y se procesa de forma segura. Tienes derecho a acceder, modificar o eliminar tus datos en cualquier momento.',
    close: 'Cerrar',
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
  const [showGdprModal, setShowGdprModal] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  const captchaRef = useRef(null);
  const emailCheckTimeoutRef = useRef(null);
  const formRef = useRef(null);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEmailChange = (value) => {
    setEmail(value);

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

  const getPasswordRequirements = () => {
    const requirements = {
      minLength: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      specialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };
    return requirements;
  };

  const requirements = getPasswordRequirements();

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);
  };

  const isEmailFormatValid = validateEmail(email);
  const isEmailValid = isEmailFormatValid && emailAvailable === true;
  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password === passwordConfirm && password.length >= 6;
  const allRequirementsMet = Object.values(requirements).every(Boolean);
  const isFormValid = isEmailValid && passwordsMatch && allRequirementsMet && captchaToken && gdprConsent;

  const formSteps = [
    isEmailValid,
    password.length >= 6,
    passwordsMatch,
    allRequirementsMet,
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
        triggerConfetti();
        setTimeout(() => {
          sessionStorage.setItem('verificationEmail', email);
          router.push('/verify-email');
        }, 1500);
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && isFormValid) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

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
          <div className="skeleton" style={{ width: '50px', height: '50px', borderRadius: '10px', margin: '0 auto 15px' }} />
          <div className="skeleton" style={{ width: '100%', height: '28px', marginBottom: '10px' }} />
          <div className="skeleton" style={{ width: '80%', height: '14px', marginBottom: '20px' }} />
          <div className="skeleton" style={{ width: '100%', height: '6px', marginBottom: '30px' }} />
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ marginBottom: '15px' }}>
              <div className="skeleton" style={{ width: '60px', height: '14px', marginBottom: '8px' }} />
              <div className="skeleton" style={{ width: '100%', height: '40px', marginBottom: '8px' }} />
            </div>
          ))}
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
    }}>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        .confetti {
          position: fixed;
          width: 10px;
          height: 10px;
          pointer-events: none;
          z-index: 9999;
          animation: confetti-fall 2s forwards;
        }

        .form-container {
          animation: slideIn 0.5s ease-out;
        }

        .valid-input {
          border-color: #10b981 !important;
          background-color: rgba(16, 185, 129, 0.05);
        }

        .valid-checkmark {
          color: #10b981;
          font-weight: bold;
          margin-left: 8px;
        }

        .requirement-item {
          display: flex;
          align-items: center;
          padding: 8px 0;
          font-size: 13px;
          color: #666;
          transition: color 0.2s;
        }

        .requirement-item.met {
          color: #10b981;
        }

        .requirement-check {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid #ddd;
          border-radius: 4px;
          margin-right: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          transition: all 0.2s;
        }

        .requirement-item.met .requirement-check {
          border-color: #10b981;
          background-color: #10b981;
          color: white;
        }
      `}</style>

      {/* Confetti Animation */}
      {showConfetti && (
        <>
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: Math.random() * 100 + '%',
                backgroundColor: ['#667eea', '#764ba2', '#10b981', '#f59e0b'][Math.floor(Math.random() * 4)],
                delay: Math.random() * 0.2 + 's',
              }}
            />
          ))}
        </>
      )}

      {/* Language Selector */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        gap: '8px',
      }}>
        {['fr', 'en', 'es'].map(l => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{
              padding: '8px 12px',
              border: 'none',
              borderRadius: '6px',
              background: lang === l ? 'white' : 'rgba(255, 255, 255, 0.2)',
              color: lang === l ? '#667eea' : 'white',
              cursor: 'pointer',
              fontWeight: lang === l ? '600' : '400',
              transition: 'all 0.3s',
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Main Form Container */}
      <div className="form-container" style={{
        maxWidth: '420px',
        width: '100%',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        padding: '40px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>💼</div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#1f2937' }}>
            {t.createAccount}
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            {t.joinInvestors}
          </p>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>{t.progress}</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#667eea' }}>{formProgress}%</span>
          </div>
          <div style={{
            width: '100%',
            height: '4px',
            background: '#e5e7eb',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #667eea, #764ba2)',
              width: `${formProgress}%`,
              transition: 'width 0.3s ease',
              borderRadius: '2px',
            }} />
          </div>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Email Field */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
              {t.email}
              {isEmailValid && <span className="valid-checkmark">✓</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="exemple@email.com"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px solid ${isEmailValid ? '#10b981' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  backgroundColor: isEmailValid ? 'rgba(16, 185, 129, 0.05)' : '#f9fafb',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => !isEmailValid && (e.target.style.borderColor = '#e5e7eb')}
              />
              {checkingEmail && <span style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '14px' }}>⏳</span>}
              {emailSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderTop: 'none',
                  borderBottomLeftRadius: '8px',
                  borderBottomRightRadius: '8px',
                  zIndex: 10,
                }}>
                  {emailSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectEmailSuggestion(suggestion)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#667eea',
                        borderBottom: idx < emailSuggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                      }}
                      onMouseOver={(e) => e.target.style.background = '#f9fafb'}
                      onMouseOut={(e) => e.target.style.background = 'transparent'}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
              {t.password}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px solid ${password.length >= 8 ? '#10b981' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  paddingRight: '40px',
                  backgroundColor: password.length >= 8 ? 'rgba(16, 185, 129, 0.05)' : '#f9fafb',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => !(password.length >= 8) && (e.target.style.borderColor = '#e5e7eb')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px 8px',
                }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>

            {/* Password Requirements */}
            {password.length > 0 && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '600', color: '#1f2937' }}>
                  {t.passwordRequirements}
                </p>
                <div>
                  {[
                    { met: requirements.minLength, label: t.minLength },
                    { met: requirements.uppercase, label: t.uppercase },
                    { met: requirements.lowercase, label: t.lowercase },
                    { met: requirements.number, label: t.number },
                    { met: requirements.specialChar, label: t.specialChar },
                  ].map((req, idx) => (
                    <div key={idx} className={`requirement-item ${req.met ? 'met' : ''}`}>
                      <span className="requirement-check">{req.met ? '✓' : ''}</span>
                      {req.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Password Strength Indicator */}
          {password.length >= 6 && (
            <div style={{
              padding: '8px 12px',
              background: passwordStrength === 'fort' ? '#d1fae5' : passwordStrength === 'moyen' ? '#fef3c7' : '#fee2e2',
              border: `1px solid ${passwordStrength === 'fort' ? '#6ee7b7' : passwordStrength === 'moyen' ? '#fcd34d' : '#fca5a5'}`,
              borderRadius: '6px',
              fontSize: '13px',
              color: passwordStrength === 'fort' ? '#065f46' : passwordStrength === 'moyen' ? '#92400e' : '#991b1b',
            }}>
              {t.strength} {
                passwordStrength === 'fort' ? t.strong :
                passwordStrength === 'moyen' ? t.medium :
                t.weak
              }
            </div>
          )}

          {/* Confirm Password Field */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
              {t.passwordConfirm}
              {passwordsMatch && passwordConfirm.length > 0 && <span className="valid-checkmark">✓</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswordConfirm ? 'text' : 'password'}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px solid ${passwordsMatch && passwordConfirm.length > 0 ? '#10b981' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  paddingRight: '40px',
                  backgroundColor: passwordsMatch && passwordConfirm.length > 0 ? 'rgba(16, 185, 129, 0.05)' : '#f9fafb',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => !(passwordsMatch && passwordConfirm.length > 0) && (e.target.style.borderColor = '#e5e7eb')}
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px 8px',
                }}
              >
                {showPasswordConfirm ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {password.length > 0 && passwordConfirm.length > 0 && (
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '13px',
                color: passwordsMatch ? '#10b981' : '#ef4444',
              }}>
                {passwordsMatch ? '✓ ' + t.passwordsMatch : '✗ ' + t.passwordDontMatch}
              </p>
            )}
          </div>

          {/* hCaptcha */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <HCaptcha
              sitekey="7a3e40c6-1fb3-4f5f-9b2d-2f8f8d8c8c8c"
              onVerify={(token) => setCaptchaToken(token)}
              ref={captchaRef}
            />
          </div>

          {/* GDPR Consent */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              id="gdpr"
              checked={gdprConsent}
              onChange={(e) => setGdprConsent(e.target.checked)}
              style={{
                marginTop: '4px',
                cursor: 'pointer',
                width: '18px',
                height: '18px',
                accentColor: '#667eea',
              }}
            />
            <div>
              <label htmlFor="gdpr" style={{ fontSize: '13px', color: '#4b5563', cursor: 'pointer', margin: 0 }}>
                {t.gdprConsent}
              </label>
              <button
                type="button"
                onClick={() => setShowGdprModal(true)}
                style={{
                  marginTop: '4px',
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                {t.gdprDetails}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {message && (
            <div style={{
              padding: '12px',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              color: '#991b1b',
              fontSize: '13px',
            }}>
              {message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || loading}
            style={{
              width: '100%',
              padding: '12px',
              background: isFormValid ? 'linear-gradient(90deg, #667eea, #764ba2)' : '#d1d5db',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: isFormValid ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s',
              opacity: loading ? 0.8 : 1,
            }}
            onMouseOver={(e) => isFormValid && (e.target.style.transform = 'translateY(-2px)', e.target.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.4)')}
            onMouseOut={(e) => isFormValid && (e.target.style.transform = 'translateY(0)', e.target.style.boxShadow = 'none')}
          >
            {loading ? '⏳ ' + t.signup : t.signup}
          </button>
        </form>
      </div>

      {/* GDPR Modal */}
      {showGdprModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxHeight: '80vh',
            overflowY: 'auto',
          }}>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '20px', color: '#1f2937' }}>
              {t.gdprModal}
            </h2>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>
              {t.gdprText}
            </p>
            <button
              onClick={() => setShowGdprModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(90deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
              onMouseOver={(e) => (e.target.style.transform = 'translateY(-2px)', e.target.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.4)')}
              onMouseOut={(e) => (e.target.style.transform = 'translateY(0)', e.target.style.boxShadow = 'none')}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
