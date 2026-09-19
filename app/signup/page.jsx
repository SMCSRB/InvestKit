'use client';

import { useState, useRef } from 'react';
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
  const captchaRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

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
        <input
          type="text"
          placeholder="Prénom"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Nom"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
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
        <button type="submit" className="btn btn-primary" disabled={loading}>
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
