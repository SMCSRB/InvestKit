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
  const isFormValid = firstName && lastName && isEmailValid && password.length >= 6 && captchaToken;

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
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px', textAlign: 'center' }}>
      <h1>S'inscrire</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Prénom */}
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={{ flex: 1 }}
              required
            />
            {firstName && <span style={{ fontSize: '18px' }}>✅</span>}
          </div>
          {!firstName && <p style={{ fontSize: '12px', color: '#999', margin: '4px 0 0 0' }}>Requis</p>}
        </div>

        {/* Nom */}
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={{ flex: 1 }}
              required
            />
            {lastName && <span style={{ fontSize: '18px' }}>✅</span>}
          </div>
          {!lastName && <p style={{ fontSize: '12px', color: '#999', margin: '4px 0 0 0' }}>Requis</p>}
        </div>

        {/* Email */}
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ flex: 1 }}
              required
            />
            {checkingEmail && <span style={{ fontSize: '18px' }}>⏳</span>}
            {!checkingEmail && email && (isEmailValid ? <span style={{ fontSize: '18px' }}>✅</span> : <span style={{ fontSize: '18px' }}>❌</span>)}
          </div>
          {email && checkingEmail && <p style={{ fontSize: '12px', color: '#999', margin: '4px 0 0 0' }}>Vérification en cours...</p>}
          {email && !checkingEmail && !isEmailFormatValid && <p style={{ fontSize: '12px', color: '#ff6b6b', margin: '4px 0 0 0' }}>Format invalide</p>}
          {email && !checkingEmail && isEmailFormatValid && emailAvailable === false && <p style={{ fontSize: '12px', color: '#ff6b6b', margin: '4px 0 0 0' }}>Email déjà utilisé</p>}
          {email && !checkingEmail && isEmailValid && <p style={{ fontSize: '12px', color: '#51cf66', margin: '4px 0 0 0' }}>Email disponible</p>}
          {!email && <p style={{ fontSize: '12px', color: '#999', margin: '4px 0 0 0' }}>Requis</p>}
        </div>

        {/* Mot de passe */}
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ flex: 1 }}
              required
            />
            {password.length >= 6 && <span style={{ fontSize: '18px' }}>✅</span>}
          </div>
          {password && (
            <>
              <div style={{ display: 'flex', gap: '4px', margin: '6px 0', height: '4px' }}>
                <div style={{ flex: 1, background: passwordStrength !== 'faible' ? '#ff6b6b' : '#ddd', borderRadius: '2px' }} />
                <div style={{ flex: 1, background: passwordStrength === 'fort' ? '#51cf66' : '#ddd', borderRadius: '2px' }} />
                <div style={{ flex: 1, background: passwordStrength === 'fort' ? '#51cf66' : '#ddd', borderRadius: '2px' }} />
              </div>
              <p style={{ fontSize: '12px', color: passwordStrength === 'fort' ? '#51cf66' : '#ffa502', margin: '0' }}>
                Force: {passwordStrength}
              </p>
            </>
          )}
          {!password && <p style={{ fontSize: '12px', color: '#999', margin: '4px 0 0 0' }}>Min 6 caractères</p>}
        </div>
        <div style={{ margin: '15px 0', padding: '10px', minHeight: '80px', display: 'flex', justifyContent: 'center' }}>
          {process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY ? (
            <HCaptcha
              ref={captchaRef}
              sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY}
              onVerify={(token) => setCaptchaToken(token)}
            />
          ) : (
            <p style={{ color: '#ff6b6b' }}>⚠️ hCaptcha key not configured</p>
          )}
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading || !isFormValid} style={{ opacity: isFormValid ? 1 : 0.6, cursor: isFormValid ? 'pointer' : 'not-allowed' }}>
          {loading ? 'Inscription...' : 'S\'inscrire'}
        </button>
      </form>
      {message && <p style={{ marginTop: '10px' }}>{message}</p>}
      {verificationInfo && (
        <div style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '5px', textAlign: 'left' }}>
          <p><strong>ID Utilisateur:</strong> {verificationInfo.userId}</p>
          <p><strong>Code de vérification:</strong> {verificationInfo.verificationCode}</p>
          <p style={{ fontSize: '12px', marginTop: '10px' }}>
            ➡️ <a href="/verify-email" style={{ color: '#ff6b6b' }}>Vérifier votre email ici</a>
          </p>
        </div>
      )}
    </div>
  );
}
