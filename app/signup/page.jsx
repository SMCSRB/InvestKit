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
          @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
          }
          .skeleton {
            background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.05) 75%);
            background-size: 1000px 100%;
            animation: shimmer 2s infinite;
            border-radius: 16px;
          }
        `}</style>

        <div style={{
          maxWidth: '460px',
          width: '100%',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
          borderRadius: '24px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3), 0 0 100px rgba(59, 130, 246, 0.1)',
          padding: '40px',
          backdropFilter: 'blur(10px)',
        }}>
          <div className="skeleton" style={{ width: '60px', height: '60px', borderRadius: '20px', margin: '0 auto 20px' }} />
          <div className="skeleton" style={{ width: '100%', height: '32px', marginBottom: '12px' }} />
          <div className="skeleton" style={{ width: '85%', height: '16px', marginBottom: '28px', margin: '0 auto 28px' }} />
          <div className="skeleton" style={{ width: '100%', height: '8px', marginBottom: '35px' }} />
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ marginBottom: '18px' }}>
              <div className="skeleton" style={{ width: '70px', height: '16px', marginBottom: '10px' }} />
              <div className="skeleton" style={{ width: '100%', height: '48px', marginBottom: '10px' }} />
            </div>
          ))}
          <div className="skeleton" style={{ width: '100%', height: '50px', marginTop: '25px' }} />
        </div>
      </div>
    );
  }

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
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes glow {
          0%, 100% { text-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
          50% { text-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }
        }

        .confetti {
          position: fixed;
          width: 12px;
          height: 12px;
          pointer-events: none;
          z-index: 9999;
          animation: confetti-fall 2s forwards;
          border-radius: 50%;
        }

        .form-container {
          animation: slideIn 0.6s ease-out;
        }

        .valid-checkmark {
          color: #10b981;
          font-weight: bold;
          margin-left: 8px;
          animation: glow 2s infinite;
        }

        .requirement-item {
          display: flex;
          align-items: center;
          padding: 10px 0;
          font-size: 13px;
          color: #64748b;
          transition: all 0.2s;
        }

        .requirement-item.met {
          color: #10b981;
        }

        .requirement-check {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border: 2px solid #cbd5e1;
          border-radius: 6px;
          margin-right: 10px;
          font-size: 13px;
          transition: all 0.2s;
          background: #f8fafc;
        }

        .requirement-item.met .requirement-check {
          border-color: #10b981;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        input:focus {
          outline: none;
        }

        button:hover:not(:disabled) {
          transform: translateY(-2px);
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

      {/* Confetti Animation */}
      {showConfetti && (
        <>
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: Math.random() * 100 + '%',
                backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][Math.floor(Math.random() * 5)],
                delay: Math.random() * 0.2 + 's',
              }}
            />
          ))}
        </>
      )}

      {/* Language Selector */}
      <div style={{
        position: 'absolute',
        top: '25px',
        right: '25px',
        display: 'flex',
        gap: '10px',
        zIndex: 100,
      }}>
        {['fr', 'en', 'es'].map(l => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: '10px',
              background: lang === l ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255, 255, 255, 0.15)',
              color: lang === l ? 'white' : 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              fontWeight: lang === l ? '600' : '500',
              fontSize: '13px',
              transition: 'all 0.3s',
              backdropFilter: 'blur(10px)',
              border: lang === l ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Main Form Container */}
      <div className="form-container" style={{
        maxWidth: '460px',
        width: '100%',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.97) 100%)',
        borderRadius: '28px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25), 0 0 120px rgba(59, 130, 246, 0.15)',
        padding: '45px',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '15px',
            animation: 'floatGradient 4s ease-in-out infinite',
          }}>
            💰
          </div>
          <h1 style={{
            margin: '0 0 10px 0',
            fontSize: '26px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #0f172a 0%, #3b82f6 50%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {t.createAccount}
          </h1>
          <p style={{
            margin: 0,
            color: '#64748b',
            fontSize: '14px',
            fontWeight: '500',
          }}>
            {t.joinInvestors}
          </p>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{t.progress}</span>
            <span style={{
              fontSize: '13px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {formProgress}%
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: '#e2e8f0',
            borderRadius: '3px',
            overflow: 'hidden',
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)',
          }}>
            <div style={{
              height: '100%',
              background: `linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)`,
              width: `${formProgress}%`,
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              borderRadius: '3px',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
            }} />
          </div>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Email Field */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '10px',
              color: '#1e293b',
              letterSpacing: '0.3px',
            }}>
              {t.email}
              {isEmailValid && <span className="valid-checkmark">✓</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="vous@exemple.com"
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  border: `2px solid ${isEmailValid ? '#10b981' : '#e2e8f0'}`,
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxSizing: 'border-box',
                  backgroundColor: isEmailValid ? 'rgba(16, 185, 129, 0.03)' : '#f8fafc',
                  color: '#1e293b',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none';
                  if (!isEmailValid) e.target.style.borderColor = '#e2e8f0';
                }}
              />
              {checkingEmail && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px' }}>⏳</span>}
              {emailSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '2px solid #e2e8f0',
                  borderTop: 'none',
                  borderBottomLeftRadius: '12px',
                  borderBottomRightRadius: '12px',
                  zIndex: 20,
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                  marginTop: '-2px',
                }}>
                  {emailSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectEmailSuggestion(suggestion)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#3b82f6',
                        borderBottom: idx < emailSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                        fontWeight: '500',
                      }}
                      onMouseOver={(e) => e.target.style.background = '#f8fafc'}
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
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '10px',
              color: '#1e293b',
              letterSpacing: '0.3px',
            }}>
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
                  padding: '13px 16px',
                  paddingRight: '45px',
                  border: `2px solid ${password.length >= 8 ? '#10b981' : '#e2e8f0'}`,
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxSizing: 'border-box',
                  backgroundColor: password.length >= 8 ? 'rgba(16, 185, 129, 0.03)' : '#f8fafc',
                  color: '#1e293b',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none';
                  if (password.length < 8) e.target.style.borderColor = '#e2e8f0';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '6px 8px',
                  transition: 'transform 0.2s',
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-50%) scale(1.2)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(-50%) scale(1)'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>

            {/* Password Requirements */}
            {password.length > 0 && (
              <div style={{
                marginTop: '14px',
                padding: '14px 16px',
                background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.8) 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
              }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>
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
              padding: '10px 14px',
              background: passwordStrength === 'fort' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))' : passwordStrength === 'moyen' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05))' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(185, 28, 28, 0.05))',
              border: `1px solid ${passwordStrength === 'fort' ? '#d1fae5' : passwordStrength === 'moyen' ? '#fef3c7' : '#fee2e2'}`,
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '600',
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
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '10px',
              color: '#1e293b',
              letterSpacing: '0.3px',
            }}>
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
                  padding: '13px 16px',
                  paddingRight: '45px',
                  border: `2px solid ${passwordsMatch && passwordConfirm.length > 0 ? '#10b981' : '#e2e8f0'}`,
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxSizing: 'border-box',
                  backgroundColor: passwordsMatch && passwordConfirm.length > 0 ? 'rgba(16, 185, 129, 0.03)' : '#f8fafc',
                  color: '#1e293b',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none';
                  if (!(passwordsMatch && passwordConfirm.length > 0)) e.target.style.borderColor = '#e2e8f0';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '6px 8px',
                  transition: 'transform 0.2s',
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-50%) scale(1.2)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(-50%) scale(1)'}
              >
                {showPasswordConfirm ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {password.length > 0 && passwordConfirm.length > 0 && (
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '13px',
                fontWeight: '600',
                color: passwordsMatch ? '#10b981' : '#ef4444',
              }}>
                {passwordsMatch ? '✓ ' + t.passwordsMatch : '✗ ' + t.passwordDontMatch}
              </p>
            )}
          </div>

          {/* hCaptcha */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '8px 0',
          }}>
            <HCaptcha
              sitekey="7a3e40c6-1fb3-4f5f-9b2d-2f8f8d8c8c8c"
              onVerify={(token) => setCaptchaToken(token)}
              ref={captchaRef}
            />
          </div>

          {/* GDPR Consent */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              id="gdpr"
              checked={gdprConsent}
              onChange={(e) => setGdprConsent(e.target.checked)}
              style={{
                marginTop: '6px',
                cursor: 'pointer',
                width: '20px',
                height: '20px',
                accentColor: '#3b82f6',
                borderRadius: '6px',
              }}
            />
            <div style={{ flex: 1 }}>
              <label htmlFor="gdpr" style={{
                fontSize: '13px',
                color: '#475569',
                cursor: 'pointer',
                margin: 0,
                fontWeight: '500',
              }}>
                {t.gdprConsent}
              </label>
              <button
                type="button"
                onClick={() => setShowGdprModal(true)}
                style={{
                  marginTop: '6px',
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: 0,
                  textDecoration: 'underline',
                  fontWeight: '500',
                }}
              >
                {t.gdprDetails}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {message && (
            <div style={{
              padding: '13px 16px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(185, 28, 28, 0.05))',
              border: '1px solid #fee2e2',
              borderRadius: '12px',
              color: '#991b1b',
              fontSize: '13px',
              fontWeight: '500',
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
              padding: '14px 16px',
              background: isFormValid ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)' : '#cbd5e1',
              color: 'white',
              border: 'none',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: isFormValid ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: loading ? 0.9 : 1,
              letterSpacing: '0.3px',
              boxShadow: isFormValid ? '0 10px 30px rgba(59, 130, 246, 0.3)' : 'none',
            }}
            onMouseOver={(e) => isFormValid && (e.target.style.transform = 'translateY(-3px)', e.target.style.boxShadow = '0 15px 40px rgba(59, 130, 246, 0.4)')}
            onMouseOut={(e) => isFormValid && (e.target.style.transform = 'translateY(0)', e.target.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.3)')}
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
          backdropFilter: 'blur(5px)',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
            maxHeight: '80vh',
            overflowY: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.3)',
          }}>
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: '22px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #0f172a 0%, #3b82f6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {t.gdprModal}
            </h2>
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '14px',
              color: '#475569',
              lineHeight: '1.7',
            }}>
              {t.gdprText}
            </p>
            <button
              onClick={() => setShowGdprModal(false)}
              style={{
                width: '100%',
                padding: '13px 16px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
              }}
              onMouseOver={(e) => (e.target.style.transform = 'translateY(-2px)', e.target.style.boxShadow = '0 15px 40px rgba(59, 130, 246, 0.4)')}
              onMouseOut={(e) => (e.target.style.transform = 'translateY(0)', e.target.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.3)')}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
