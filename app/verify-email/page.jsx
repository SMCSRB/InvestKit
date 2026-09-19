'use client';

import { useState } from 'react';

export default function VerifyEmailPage() {
  const [userId, setUserId] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://192.168.1.201:5000/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, verificationCode: code }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('✅ Email vérifié! Vous pouvez maintenant vous connecter.');
        setUserId('');
        setCode('');
      } else {
        setMessage(`❌ ${data.error || 'Code invalide'}`);
      }
    } catch (error) {
      setMessage('❌ Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px', textAlign: 'center' }}>
      <h1>Vérifier Email</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input
          type="text"
          placeholder="ID Utilisateur"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Code de vérification"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Vérification...' : 'Vérifier Email'}
        </button>
      </form>
      {message && <p style={{ marginTop: '10px' }}>{message}</p>}
      <p style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        Vous recevrez l'ID et le code lors de votre inscription
      </p>
    </div>
  );
}
