'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import AuthLayout, { AuthHeader } from '@/app/components/landing/AuthLayout';
import { LogoMark } from '@/app/components/ui/Logo';
import Icon from '@/app/components/ui/Icon';
import { Button, Modal, Segmented } from '@/app/components/ui/primitives';
import { useTheme } from '@/app/context/ThemeContext';

const TRANSLATIONS = {
  fr: {
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
    haveAccount: 'Déjà un compte ?',
    login: 'Se connecter',
    checking: 'Vérification…',
    acceptTerms: 'En t\'inscrivant, tu acceptes les',
    and: 'et la',
    privacy: 'politique de confidentialité',
    createAccount: 'Créer ton compte',
    joinInvestors: 'Rejoins InvestKit et apprends à investir sans risque',
    progress: 'Progression',
    email: 'Email',
    emailAvailable: 'Email disponible',
    password: 'Mot de passe',
    passwordConfirm: 'Confirmer le mot de passe',
    passwordsMatch: 'Les mots de passe correspondent',
    passwordDontMatch: 'Les mots de passe ne correspondent pas',
    strength: 'Force:',
    weak: 'Faible',
    medium: 'Moyen',
    strong: 'Fort',
    iamHuman: 'Je suis un humain',
    gdprConsent: 'Je consens au traitement de mes données personnelles',
    gdprDetails: 'Voir les détails RGPD',
    terms: 'conditions d\'utilisation',
    signup: 'S\'inscrire',
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
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    haveAccount: 'Already have an account?',
    login: 'Log in',
    checking: 'Checking…',
    acceptTerms: 'By signing up you accept the',
    and: 'and the',
    privacy: 'privacy policy',
    createAccount: 'Create your account',
    joinInvestors: 'Join InvestKit and learn to invest without risk',
    progress: 'Progress',
    email: 'Email',
    emailAvailable: 'Email available',
    password: 'Password',
    passwordConfirm: 'Confirm password',
    passwordsMatch: 'Passwords match',
    passwordDontMatch: 'Passwords don\'t match',
    strength: 'Strength:',
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
    iamHuman: 'I\'m human',
    gdprConsent: 'I consent to the processing of my personal data',
    gdprDetails: 'See GDPR details',
    terms: 'terms of service',
    signup: 'Sign up',
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
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
    haveAccount: '¿Ya tienes cuenta?',
    login: 'Iniciar sesión',
    checking: 'Comprobando…',
    acceptTerms: 'Al registrarte aceptas los',
    and: 'y la',
    privacy: 'política de privacidad',
    createAccount: 'Crear tu cuenta',
    joinInvestors: 'Únete a InvestKit y aprende a invertir sin riesgo',
    progress: 'Progreso',
    email: 'Correo electrónico',
    emailAvailable: 'Correo disponible',
    password: 'Contraseña',
    passwordConfirm: 'Confirmar contraseña',
    passwordsMatch: 'Las contraseñas coinciden',
    passwordDontMatch: 'Las contraseñas no coinciden',
    strength: 'Fuerza:',
    weak: 'Débil',
    medium: 'Media',
    strong: 'Fuerte',
    iamHuman: 'Soy humano',
    gdprConsent: 'Doy mi consentimiento para el tratamiento de mis datos personales',
    gdprDetails: 'Ver detalles RGPD',
    terms: 'términos de servicio',
    signup: 'Registrarse',
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
  const [referralCode, setReferralCode] = useState(null);
  const [inviteOnly, setInviteOnly] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setReferralCode(ref);
    const invite = params.get('invite');
    if (invite) setInviteCode(invite);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/signup-config`)
      .then((r) => r.json())
      .then((c) => setInviteOnly(!!c.inviteOnly))
      .catch(() => {});
  }, []);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [showGdprModal, setShowGdprModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const captchaRef = useRef(null);
  const emailCheckTimeoutRef = useRef(null);

  const t = TRANSLATIONS[lang];
  const { motionEnabled } = useTheme();

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/check-email/${encodeURIComponent(emailToCheck)}`);
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
  const isFormValid = isEmailValid && passwordsMatch && allRequirementsMet && gdprConsent && !!captchaToken;

  const formSteps = [
    isEmailValid,
    password.length >= 6,
    passwordsMatch,
    allRequirementsMet,
    gdprConsent,
  ];
  const completedSteps = formSteps.filter(Boolean).length;
  const formProgress = Math.round((completedSteps / formSteps.length) * 100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!isFormValid) {
      setMessage(t.signupError);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, captchaToken, referralCode, inviteCode }),
      });

      const data = await response.json();
      if (response.ok) {
        triggerConfetti();
        setTimeout(() => {
          sessionStorage.setItem('verificationEmail', email);
          router.push('/verify-email');
        }, 1500);
      } else {
        setMessage(data.error || t.signupError);
        console.error('Signup error:', data);
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
      }
    } catch (error) {
      setMessage(t.serverError);
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    // Entrée valide le formulaire seulement depuis un champ de saisie (pas depuis un bouton, une option ou une case à cocher).
    if (e.key === 'Enter' && isFormValid && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const COLORS = ['#6d4ff0', '#c15bf0', '#3ddc97', '#ffc14d', '#5cc8ff'];
  const strengthLabel = passwordStrength === 'fort' ? t.strong : passwordStrength === 'moyen' ? t.medium : t.weak;
  const strengthLevel = passwordStrength === 'fort' ? 3 : passwordStrength === 'moyen' ? 2 : 1;
  const strengthColor = strengthLevel === 3 ? 'var(--ik-positive)' : strengthLevel === 2 ? 'var(--ik-warning)' : 'var(--ik-negative)';

  return (
    <AuthLayout wide>
      {showConfetti && motionEnabled && [...Array(40)].map((_, i) => (
        <span key={i} className="ik-confetti" aria-hidden="true" style={{ left: `${Math.random() * 100}%`, background: COLORS[i % COLORS.length], animationDelay: `${Math.random() * 0.4}s`, '--dx': `${Math.random() * 160 - 80}px` }} />
      ))}

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
        <Segmented ariaLabel="Langue" value={lang} onChange={setLang} options={['fr', 'en', 'es'].map((l) => ({ value: l, label: l.toUpperCase() }))} />
      </div>

      <AuthHeader icon={<div style={{ display: 'grid', placeItems: 'center', marginBottom: 14 }}><LogoMark size={52} /></div>} title={t.createAccount} subtitle={t.joinInvestors} />

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="ik-muted">{t.progress}</span>
          <span className="ik-num" style={{ fontWeight: 800, color: 'var(--ik-accent)' }}>{formProgress}%</span>
        </div>
        <div className="ik-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={formProgress} aria-label={t.progress}>
          <div className="ik-progress__bar" style={{ width: `${formProgress}%`, transition: 'width var(--ik-dur) var(--ik-ease)' }} />
        </div>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} style={{ display: 'grid', gap: 16 }}>
        {referralCode && (
          <div className="ik-notice ik-notice--info" style={{ margin: 0 }} role="status">
            <Icon name="gift" size={20} /><p>Invité(e) par un ami : code {referralCode}</p>
          </div>
        )}

        {inviteOnly && (
          <div className="ik-field">
            <label className="ik-label" htmlFor="invite">Code d&apos;invitation (site en phase de test)</label>
            <input id="invite" className="ik-input" type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="XXXXX-XXXXX" autoComplete="off" />
          </div>
        )}

        <div className="ik-field">
          <label className="ik-label" htmlFor="su-email" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.email}
            {isEmailValid && <Icon name="check" size={16} className="ik-up" strokeWidth={2.6} />}
          </label>
          <div style={{ position: 'relative' }}>
            <input id="su-email" className="ik-input" type="email" autoComplete="email" value={email} onChange={(e) => handleEmailChange(e.target.value)} placeholder="toi@exemple.com" aria-invalid={isEmailFormatValid && emailAvailable === false ? 'true' : undefined} />
            {emailSuggestions.length > 0 && (
              <div className="ik-menu" role="listbox" style={{ top: 'calc(100% + 6px)', left: 0, right: 0 }}>
                {emailSuggestions.map((suggestion) => (
                  <button key={suggestion} type="button" role="option" aria-selected="false" className="ik-menu__item" onClick={() => selectEmailSuggestion(suggestion)}>{suggestion}</button>
                ))}
              </div>
            )}
          </div>
          {checkingEmail && <span className="ik-muted" role="status">{t.checking}</span>}
          {isEmailValid && !checkingEmail && <span className="ik-up" style={{ fontSize: 'var(--ik-fs-sm)', fontWeight: 700 }}>{t.emailAvailable}</span>}
        </div>

        <div className="ik-field">
          <label className="ik-label" htmlFor="su-pass">{t.password}</label>
          <div className="ik-input-wrap">
            <input id="su-pass" className="ik-input" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <Button variant="ghost" size="sm" icon={showPassword ? 'eyeOff' : 'eye'} className="ik-input-wrap__btn" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? t.hidePassword : t.showPassword} />
          </div>
          {password.length > 0 && (
            <div style={{ padding: '12px 14px', borderRadius: 'var(--ik-radius-sm)', background: 'var(--ik-surface-2)', border: '1px solid var(--ik-border)' }}>
              <p style={{ margin: '0 0 8px', fontSize: 'var(--ik-fs-xs)', fontWeight: 800, color: 'var(--ik-text-2)' }}>{t.passwordRequirements}</p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
                {[
                  { met: requirements.minLength, label: t.minLength },
                  { met: requirements.uppercase, label: t.uppercase },
                  { met: requirements.lowercase, label: t.lowercase },
                  { met: requirements.number, label: t.number },
                  { met: requirements.specialChar, label: t.specialChar },
                ].map((req) => (
                  <li key={req.label} className={req.met ? 'ik-up' : ''} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--ik-fs-sm)', color: req.met ? undefined : 'var(--ik-text-3)' }}>
                    <Icon name={req.met ? 'check' : 'x'} size={15} strokeWidth={2.4} />{req.label}
                    <span className="ik-sr-only">{req.met ? ' (rempli)' : ' (à remplir)'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {password.length >= 6 && (
          <div aria-live="polite" style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', gap: 4 }} aria-hidden="true">
              {[1, 2, 3].map((n) => <span key={n} style={{ flex: 1, height: 6, borderRadius: 6, background: n <= strengthLevel ? strengthColor : 'var(--ik-surface-3)', transition: 'background var(--ik-dur) var(--ik-ease)' }} />)}
            </div>
            <span style={{ fontSize: 'var(--ik-fs-sm)', fontWeight: 700, color: strengthColor }}>{t.strength} {strengthLabel}</span>
          </div>
        )}

        <div className="ik-field">
          <label className="ik-label" htmlFor="su-pass2" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.passwordConfirm}
            {passwordsMatch && passwordConfirm.length > 0 && <Icon name="check" size={16} className="ik-up" strokeWidth={2.6} />}
          </label>
          <div className="ik-input-wrap">
            <input id="su-pass2" className="ik-input" type={showPasswordConfirm ? 'text' : 'password'} autoComplete="new-password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="••••••••" />
            <Button variant="ghost" size="sm" icon={showPasswordConfirm ? 'eyeOff' : 'eye'} className="ik-input-wrap__btn" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)} aria-label={showPasswordConfirm ? t.hidePassword : t.showPassword} />
          </div>
          {password.length > 0 && passwordConfirm.length > 0 && (
            <p className={passwordsMatch ? 'ik-up' : 'ik-error'} role="status" style={{ margin: 0, fontSize: 'var(--ik-fs-sm)', fontWeight: 700 }}>
              {passwordsMatch ? t.passwordsMatch : t.passwordDontMatch}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
          <HCaptcha sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY} onVerify={(token) => setCaptchaToken(token)} onExpire={() => setCaptchaToken(null)} ref={captchaRef} />
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <input type="checkbox" id="gdpr" checked={gdprConsent} onChange={(e) => setGdprConsent(e.target.checked)} style={{ width: 20, height: 20, marginTop: 2, accentColor: 'var(--ik-primary)', flex: 'none' }} />
          <div style={{ flex: 1 }}>
            <label htmlFor="gdpr" style={{ fontSize: 'var(--ik-fs-sm)', color: 'var(--ik-text-2)', lineHeight: 1.5 }}>{t.gdprConsent}</label>
            <button type="button" className="ik-link" style={{ display: 'block', background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick={() => setShowGdprModal(true)}>{t.gdprDetails}</button>
          </div>
        </div>

        {message && (
          <div className="ik-notice ik-notice--danger" role="alert" style={{ margin: 0 }}>
            <Icon name="alert" size={20} /><p>{message}</p>
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={!isFormValid || loading}>{t.signup}</Button>
        <p className="ik-muted" style={{ margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
          {t.acceptTerms} <Link href="/conditions" className="ik-link">{t.terms}</Link> {t.and} <Link href="/privacy" className="ik-link">{t.privacy}</Link>.
        </p>
      </form>

      <p className="ik-muted" style={{ margin: '20px 0 0', textAlign: 'center', paddingTop: 16, borderTop: '1px solid var(--ik-border)' }}>
        {t.haveAccount} <Link href="/login" className="ik-link">{t.login}</Link>
      </p>

      <Modal open={showGdprModal} onClose={() => setShowGdprModal(false)} title={t.gdprModal} footer={<Button variant="primary" onClick={() => setShowGdprModal(false)}>{t.close}</Button>}>
        <p style={{ margin: 0, color: 'var(--ik-text-2)', lineHeight: 1.65 }}>{t.gdprText}</p>
      </Modal>
    </AuthLayout>
  );
}
