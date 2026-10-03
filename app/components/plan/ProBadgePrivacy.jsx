'use client';

import { useEffect, useState } from 'react';
import { social } from '@/app/lib/social';

// Option de confidentialité : montrer ou masquer la couronne Pro aux autres joueurs (classements, amis, guilde). Le choix est gardé par le serveur.
export default function ProBadgePrivacy() {
  const [state, setState] = useState(null); // { isPro, showProBadge }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { social.tag().then(setState).catch(() => setState(null)); }, []);
  if (!state?.isPro) return null;
  const toggle = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try { const r = await social.setProBadgeVisible(!state.showProBadge); setState((s) => ({ ...s, showProBadge: r.showProBadge })); }
    catch (e) { setError(e.message || 'Enregistrement impossible'); }
    finally { setBusy(false); }
  };
  return (
    <div className="tg-switch" style={{ paddingBottom: 16, borderBottom: '1px solid var(--ik-border)' }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px 0' }} id="pro-badge-label">Afficher ma couronne Pro aux autres joueurs</p>
        <p style={{ fontSize: 12, margin: 0, color: 'var(--ik-text-2)' }}>
          Elle apparaît à côté de ton pseudo dans les classements, chez tes amis et dans ta guilde. Tu la vois toujours chez toi.
        </p>
        {error ? <p className="tg-err" role="alert">{error}</p> : null}
      </div>
      <button type="button" role="switch" aria-checked={state.showProBadge} aria-labelledby="pro-badge-label" data-testid="pro-badge-switch" className="ik-switch" onClick={toggle} disabled={busy}
        style={{ minWidth: 52, height: 30, borderRadius: 999, border: '1px solid var(--ik-border)', background: state.showProBadge ? 'var(--ik-primary)' : 'var(--ik-surface-2)', position: 'relative', cursor: busy ? 'wait' : 'pointer' }}>
        <span aria-hidden="true" style={{ position: 'absolute', top: 3, left: state.showProBadge ? 25 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
      </button>
    </div>
  );
}
