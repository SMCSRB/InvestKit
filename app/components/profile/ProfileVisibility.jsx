'use client';

import { useEffect, useState } from 'react';
import { social } from '@/app/lib/social';

// Confidentialité du profil : public, amis ou privé. Le choix est gardé et appliqué par le serveur (classements publics, recherche par pseudo).
const CHOICES = [
  { id: 'public', label: 'Public', text: 'Ton pseudo, ta photo et ton # apparaissent partout, y compris dans les classements.' },
  { id: 'amis', label: 'Amis', text: 'Tes amis et ta guilde te voient normalement. Dans les classements publics, tu apparais comme « Joueur anonyme », avec ton rang.' },
  { id: 'prive', label: 'Privé', text: 'Comme « Amis » pour les classements, et on ne peut plus te trouver par ton pseudo : seulement avec ton code ami.' },
];

export default function ProfileVisibility() {
  const [value, setValue] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => { social.me().then((m) => setValue(m.profileVisibility ?? 'public')).catch(() => setValue(null)); }, []);
  if (value === null) return null;
  const choose = async (id) => {
    if (busy || id === value) return;
    setBusy(true); setMsg('');
    try { const r = await social.setProfileVisibility(id); setValue(r.profileVisibility); setMsg('Enregistré.'); }
    catch (e) { setMsg(e.message || 'Enregistrement impossible'); }
    finally { setBusy(false); }
  };
  return (
    <div className="p-4 rounded-lg bg-slate-800/50 border border-gray-700/50" data-testid="profile-visibility">
      <h3 className="text-white font-semibold mb-1" id="profile-visibility-label">Confidentialité du profil</h3>
      <p className="text-gray-400 text-sm mb-3">Tu continues toujours à voir ton propre rang. Rien n'est perdu quand tu changes d'avis.</p>
      <div role="radiogroup" aria-labelledby="profile-visibility-label" style={{ display: 'grid', gap: 8 }}>
        {CHOICES.map((c) => (
          <label key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: busy ? 'wait' : 'pointer' }}>
            <input type="radio" name="profile-visibility" value={c.id} checked={value === c.id} onChange={() => choose(c.id)} disabled={busy} data-testid={`visibility-${c.id}`} style={{ marginTop: 4 }} />
            <span><strong className="text-white">{c.label}</strong><br /><span className="text-gray-400 text-sm">{c.text}</span></span>
          </label>
        ))}
      </div>
      {msg ? <p role="status" className="text-gray-400 text-sm mt-2">{msg}</p> : null}
    </div>
  );
}
