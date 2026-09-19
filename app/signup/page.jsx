'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HCaptcha from '@hcaptcha/react-hcaptcha';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
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
        body: JSON.stringify({ email, password, captchaToken }),
      });

      const data = await response.json();
      if (response.ok) {
        sessionStorage.setItem('verificationEmail', email);
        router.push('/verify-email');
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

        {/* Progress Bar */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '500', color: '#718096' }}>Progression</span>
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
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#2d3748', marginBottom: '6px', display: 'block' }}>📧 Email</label>
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
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#2d3748', marginBottom: '6px', display: 'block' }}>🔒 Mot de passe</label>
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
                title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
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
                  Force: <strong>{passwordStrength === 'fort' ? '💪 Fort' : passwordStrength === 'moyen' ? '⚠️ Moyen' : '❌ Faible'}</strong>
                </p>
              </>
            )}
            {!password && <p style={{ fontSize: '12px', color: '#cbd5e0', margin: '4px 0 0 0' }}>Minimum 6 caractères</p>}
          </div>

          {/* Confirmer Mot de passe */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#2d3748', marginBottom: '6px', display: 'block' }}>🔐 Confirmer le mot de passe</label>
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
                title={showPasswordConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPasswordConfirm ? '👁️' : '👁️‍🗨️'}
              </button>
              {passwordConfirm && <span style={{ fontSize: '18px', color: passwordsMatch ? '#48bb78' : '#f56565' }}>{passwordsMatch ? '✅' : '❌'}</span>}
            </div>
            {passwordConfirm && !passwordsMatch && <p style={{ fontSize: '12px', color: '#f56565', margin: '4px 0 0 0' }}>Les mots de passe ne correspondent pas</p>}
            {passwordConfirm && passwordsMatch && <p style={{ fontSize: '12px', color: '#48bb78', margin: '4px 0 0 0' }}>Les mots de passe correspondent</p>}
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
              🔒 Je consens au traitement de mes données personnelles selon le RGPD
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
              conditions d'utilisation
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
              '✨ S\'inscrire'
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
        <p style={{ margin: '0' }}>Vous avez un compte? <a href="/login" style={{ color: 'white', textDecoration: 'none', fontWeight: '600' }}>Se connecter</a></p>
      </div>

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="modal-overlay" onClick={() => setShowTermsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: '0', color: '#2d3748' }}>Conditions d'Utilisation</h2>

            <h3 style={{ color: '#667eea', marginTop: '20px' }}>1. Acceptation des Conditions</h3>
            <p>En utilisant InvestKit, vous acceptez ces conditions d'utilisation dans leur intégralité. Si vous n'acceptez pas ces conditions, vous ne pouvez pas utiliser notre plateforme.</p>

            <h3 style={{ color: '#667eea', marginTop: '20px' }}>2. Licence d'Utilisation</h3>
            <p>InvestKit vous accorde une licence limitée, non exclusive et révocable pour accéder et utiliser la plateforme à des fins personnelles et non commerciales.</p>

            <h3 style={{ color: '#667eea', marginTop: '20px' }}>3. Restrictions d'Utilisation</h3>
            <p>Vous ne devez pas reproduire, vendre, distribuer, transmettre ou exploiter le contenu de la plateforme sans autorisation écrite.</p>

            <h3 style={{ color: '#667eea', marginTop: '20px' }}>4. Disclaimer</h3>
            <p>Les informations fournies par InvestKit sont à titre informatif uniquement et ne constituent pas des conseils financiers. Consultez un professionnel avant de prendre toute décision d'investissement.</p>

            <h3 style={{ color: '#667eea', marginTop: '20px' }}>5. Limitation de Responsabilité</h3>
            <p>InvestKit n'est pas responsable des pertes ou dommages directs ou indirects résultant de l'utilisation de la plateforme.</p>

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
