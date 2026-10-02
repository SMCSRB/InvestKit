'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@/app/lib/session';
import AppShell from '@/app/components/shell/AppShell';
import Coin from '@/app/components/ui/Coin';
import Icon from '@/app/components/ui/Icon';

const API = process.env.NEXT_PUBLIC_API_URL;

// Appel API d'administration : cookies + CSRF ajoutés automatiquement (voir app/lib/session.js).
const api = async (path, opts = {}) => {
  const res = await fetch(`${API}/admin${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || 'Erreur'); e.code = data.code; e.status = res.status; throw e; }
  return data;
};

const C = { bg: 'linear-gradient(135deg, var(--ik-surface-1) 0%, var(--ik-surface-2) 50%, #0f4c75 100%)', card: 'color-mix(in srgb, var(--ik-text) 6%, transparent)', border: 'color-mix(in srgb, var(--ik-text) 12%, transparent)', muted: 'var(--ik-text-3)', accent: 'var(--ik-primary)', bad: 'var(--ik-negative)', warn: 'var(--ik-warning)', good: 'var(--ik-positive)' };
const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 };
const btn = (variant = 'default') => ({ padding: '8px 14px', borderRadius: 8, border: `1px solid ${variant === 'danger' ? 'color-mix(in srgb, var(--ik-negative) 50%, transparent)' : C.border}`, background: variant === 'primary' ? C.accent : variant === 'danger' ? 'color-mix(in srgb, var(--ik-negative) 15%, transparent)' : 'color-mix(in srgb, var(--ik-text) 8%, transparent)', color: variant === 'danger' ? 'var(--ik-negative)' : 'var(--ik-text)', cursor: 'pointer', fontSize: 13, fontWeight: 600 });
const input = { width: 'auto', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'var(--ik-surface-2)', color: 'var(--ik-text)', fontSize: 13 };
const fr = (n) => Number(n ?? 0).toLocaleString('fr-FR');
const date = (d) => (d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const LEVEL = { critique: { c: C.bad, i: 'ban' }, attention: { c: C.warn, i: 'triangleAlert' }, info: { c: C.accent, i: 'info' } };

function Stat({ label, value, sub }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Inscriptions par jour : une seule série, une seule teinte, valeurs lisibles au survol et dans le tableau accessible en dessous.
function SignupsChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  const w = 720, h = 140, bw = w / data.length;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h + 22}`} role="img" aria-label="Inscriptions par jour sur les 30 derniers jours" style={{ width: '100%', height: 'auto' }}>
        <line x1="0" y1={h} x2={w} y2={h} stroke="color-mix(in srgb, var(--ik-text) 25%, transparent)" />
        {data.map((d, i) => (
          <g key={d.day}>
            <title>{`${d.day} : ${d.n} inscription(s)`}</title>
            <rect x={i * bw + 2} y={h - (d.n / max) * (h - 8)} width={bw - 4} height={(d.n / max) * (h - 8)} rx="3" fill={C.accent} />
          </g>
        ))}
        <text x="0" y={h + 16} fill={C.muted} fontSize="11">{data[0]?.day}</text>
        <text x={w} y={h + 16} fill={C.muted} fontSize="11" textAnchor="end">{data[data.length - 1]?.day}</text>
        <text x={w} y="10" fill={C.muted} fontSize="11" textAnchor="end">max {max}/jour</text>
      </svg>
      <details style={{ fontSize: 12, color: C.muted }}><summary style={{ cursor: 'pointer' }}>Voir sous forme de tableau</summary>
        <table style={{ marginTop: 8, borderCollapse: 'collapse' }}><tbody>{data.map((d) => <tr key={d.day}><td style={{ padding: '2px 12px 2px 0' }}>{d.day}</td><td>{d.n}</td></tr>)}</tbody></table>
      </details>
    </div>
  );
}

function Overview() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { Promise.all([api('/stats'), api('/alerts')]).then(([s, a]) => { setStats(s); setAlerts(a.alerts); }).catch((e) => setErr(e.message)); }, []);
  if (err) return <p role="alert" style={{ color: C.bad }}>{err}</p>;
  if (!stats) return <p style={{ color: C.muted }}>Chargement…</p>;
  const u = stats.users;
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section aria-label="Alertes" style={{ display: 'grid', gap: 8 }}>
        {alerts?.length === 0 && <div style={{ ...card, borderColor: 'color-mix(in srgb, var(--ik-positive) 40%, transparent)' }}>Aucune alerte.</div>}
        {alerts?.map((a) => (
          <div key={a.code} style={{ ...card, borderColor: LEVEL[a.level].c }}>
            <strong><Icon name={LEVEL[a.level].i} size={16} /> {a.title}</strong>
            <div style={{ fontSize: 13, color: 'var(--ik-text-2)', marginTop: 4 }}>{a.detail}</div>
          </div>
        ))}
      </section>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <Stat label="Utilisateurs" value={fr(u.total)} sub={`${fr(u.verified)} vérifiés · +${fr(u.new_7d)} sur 7 j`} />
        <Stat label="Actifs (24 h / 7 j / 30 j)" value={`${fr(u.active_1d)} / ${fr(u.active_7d)} / ${fr(u.active_30d)}`} />
        <Stat label="Abonnés Pro" value={fr(u.pro)} sub={`${u.total ? Math.round((u.pro / u.total) * 100) : 0} % des comptes`} />
        <Stat label="Avec 2FA" value={fr(u.with_2fa)} sub={`${fr(u.disabled)} compte(s) suspendu(s)`} />
        <Stat label="Pièces en circulation" value={`${fr(stats.coins.inCirculation)} InvestCoins`} />
      </div>
      <div style={card}>
        <h3 style={{ margin: '0 0 8px', fontSize: 15, color: 'var(--ik-text)' }}>Inscriptions — 30 derniers jours</h3>
        <SignupsChart data={stats.signupsLast30Days} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
        <div style={card}>
          <h3 style={{ margin: '0 0 8px', fontSize: 15, color: 'var(--ik-text)' }}>Joueurs par domaine</h3>
          {stats.players.trading.map((p) => <div key={p.domain} style={{ fontSize: 13 }}>{p.domain === 'stocks' ? 'Bourse' : p.domain === 'crypto' ? 'Crypto' : p.domain === 'crypto_market' ? 'Marché Crypto' : p.domain} : {fr(p.players)}</div>)}
          <div style={{ fontSize: 13 }}>Immobilier : {fr(stats.players.realEstate)}</div>
        </div>
        <div style={card}>
          <h3 style={{ margin: '0 0 8px', fontSize: 15, color: 'var(--ik-text)' }}>Puits d'InvestCoins (pièces détruites)</h3>
          {Object.entries(stats.coins.sinks).map(([domain, reasons]) => Object.entries(reasons).map(([reason, v]) => (
            <div key={domain + reason} style={{ fontSize: 13 }}>{domain} · {reason} : {fr(v.destroyed)}</div>
          )))}
          {Object.keys(stats.coins.sinks).length === 0 && <div style={{ fontSize: 13, color: C.muted }}>Aucun encore.</div>}
        </div>
        <div style={card}>
          <h3 style={{ margin: '0 0 8px', fontSize: 15, color: 'var(--ik-text)' }}>Abonnements et prêts</h3>
          {stats.subscriptions.map((s) => <div key={s.status} style={{ fontSize: 13 }}>Abonnement {s.status} : {s.n}</div>)}
          {stats.loans.map((l) => <div key={l.product + l.status} style={{ fontSize: 13 }}>Prêt {l.product} · {l.status} : {l.n}</div>)}
        </div>
      </div>
    </div>
  );
}

function UserDetail({ id, onClose, onChanged }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const load = useCallback(() => api(`/users/${id}`).then(setD).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { load(); }, [load]);
  const act = async (fn, okMsg) => { setErr(''); setMsg(''); try { await fn(); setMsg(okMsg); await load(); onChanged(); } catch (e) { setErr(e.message); } };
  if (!d) return <div style={card}>{err ? <p role="alert" style={{ color: C.bad }}>{err}</p> : 'Chargement…'} <button style={btn()} onClick={onClose}>Fermer</button></div>;
  const u = d.user;
  const isAdmin = u.role === 'admin';
  return (
    <div style={{ ...card, borderColor: C.accent }} role="region" aria-label="Fiche utilisateur">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--ik-text)' }}>{u.email}</h3>
          <div style={{ fontSize: 12, color: C.muted }}>{u.username || '(pas de pseudo)'} · {isAdmin ? 'administrateur' : 'utilisateur'} · {(u.pro_override || u.subscription_tier === 'pro') ? 'Pro' : 'gratuit'}{u.pro_override ? ' (manuel)' : ''} · 2FA {u.enable_2fa ? 'oui' : 'non'} · {u.verified ? 'e-mail vérifié' : 'non vérifié'}</div>
          <div style={{ fontSize: 12, color: C.muted }}>Inscrit le {date(u.created_at)} · dernière connexion {date(u.last_login_at)} · solde <Coin /> {fr(u.balance)}</div>
          {u.disabled_at && <div style={{ color: C.bad, fontSize: 13, marginTop: 4 }}>Suspendu le {date(u.disabled_at)} — {u.disabled_reason}</div>}
        </div>
        <button style={btn()} onClick={onClose}>Fermer</button>
      </div>
      {err && <p role="alert" style={{ color: C.bad, fontSize: 13 }}>{err}</p>}
      {msg && <p role="status" style={{ color: C.good, fontSize: 13 }}><Icon name="circleCheck" size={18} /> {msg}</p>}
      {!isAdmin && (
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button style={btn()} onClick={() => { if (confirm(`Voir le site comme ${u.email} ? Lecture seule, 15 minutes, action tracée.`)) act(async () => { await api(`/users/${id}/impersonate`, { method: 'POST' }); window.location.href = '/dashboard'; }, 'Impersonation démarrée'); }}>Voir comme cet utilisateur</button>
            <button style={btn()} onClick={() => act(() => api(`/users/${id}/pro`, { method: 'POST', body: { proOverride: !u.pro_override } }), u.pro_override ? 'Statut Pro manuel retiré' : 'Statut Pro manuel accordé')}>
              {u.pro_override ? 'Retirer le Pro manuel' : 'Accorder le Pro manuel'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input aria-label="Motif" placeholder="Motif (obligatoire)" value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...input, flex: '1 1 220px' }} />
            {u.disabled_at
              ? <button style={btn('primary')} onClick={() => act(() => api(`/users/${id}/enable`, { method: 'POST' }), 'Compte réactivé')}>Réactiver le compte</button>
              : <button style={btn('danger')} onClick={() => { if (confirm(`Suspendre ${u.email} ?`)) act(() => api(`/users/${id}/disable`, { method: 'POST', body: { reason } }), 'Compte suspendu'); }}>Suspendre le compte</button>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input aria-label="Montant en pièces" type="number" placeholder="± pièces" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ ...input, width: 120 }} />
            <span style={{ fontSize: 12, color: C.muted }}>utilise le motif ci-dessus · max ±100 000 · inscrit au registre</span>
            <button style={btn('primary')} onClick={() => { if (confirm(`Ajuster de ${amount} InvestCoins ?`)) act(() => api(`/users/${id}/coins`, { method: 'POST', body: { amount: Number(amount), reason } }), 'Pièces ajustées'); }} disabled={!amount || Number(amount) === 0}>Ajuster</button>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 16, fontSize: 12 }}>
        <div><strong>Derniers mouvements de pièces</strong>{d.recentLedger.map((l, i) => <div key={i} style={{ color: C.muted }}>{date(l.created_at)} · {l.amount > 0 ? '+' : ''}{l.amount} · {l.reason}{l.domain ? ` (${l.domain})` : ''}</div>)}</div>
        <div><strong>Journal de sécurité</strong>{d.recentAudit.map((l, i) => <div key={i} style={{ color: C.muted }}>{date(l.created_at)} · {l.action}{l.ip_address ? ` · ${l.ip_address}` : ''}</div>)}</div>
        <div><strong>Banque</strong>
          <div style={{ color: C.muted }}>{d.bank ? `Crédit ${d.bank.credit_blocked ? `bloqué (${d.bank.blocked_reason})` : 'ouvert'} · ${d.bank.defaults} défaut(s)` : 'Pas de compte bancaire'}</div>
          {d.loans.map((l) => <div key={l.id} style={{ color: C.muted }}>{l.product} · {l.status} · {l.months} mois</div>)}
          <strong style={{ display: 'block', marginTop: 8 }}>Abonnements</strong>
          {d.subscriptions.length === 0 && <div style={{ color: C.muted }}>Aucun</div>}
          {d.subscriptions.map((s, i) => <div key={i} style={{ color: C.muted }}>{s.tier} · {s.status} · jusqu'au {date(s.current_period_end)}</div>)}
        </div>
      </div>
    </div>
  );
}

function Users() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [tier, setTier] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(null);
  const load = useCallback(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (q) p.set('q', q); if (status) p.set('status', status); if (tier) p.set('tier', tier);
    api(`/users?${p}`).then(setData).catch((e) => setErr(e.message));
  }, [q, status, tier, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input aria-label="Rechercher" placeholder="Rechercher (e-mail ou pseudo)" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} style={{ ...input, flex: '1 1 240px' }} />
        <select aria-label="Statut" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={input}><option value="">Tous</option><option value="disabled">Suspendus</option><option value="unverified">Non vérifiés</option><option value="admin">Administrateurs</option></select>
        <select aria-label="Offre" value={tier} onChange={(e) => { setTier(e.target.value); setPage(1); }} style={input}><option value="">Gratuit + Pro</option><option value="free">Gratuit</option><option value="pro">Pro</option></select>
      </div>
      {err && <p role="alert" style={{ color: C.bad }}>{err}</p>}
      {open && <UserDetail id={open} onClose={() => setOpen(null)} onChanged={load} />}
      <div style={{ ...card, overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ textAlign: 'left', color: C.muted }}>{['E-mail', 'Pseudo', 'Offre', 'Solde', 'Inscrit', 'État'].map((h) => <th key={h} style={{ padding: '10px 12px' }}>{h}</th>)}</tr></thead>
          <tbody>
            {data?.users.map((u) => (
              <tr key={u.id} onClick={() => setOpen(u.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(u.id)} style={{ cursor: 'pointer', borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: '10px 12px' }}>{u.email}</td>
                <td style={{ padding: '10px 12px' }}>{u.username || '—'}</td>
                <td style={{ padding: '10px 12px' }}>{(u.pro_override || u.subscription_tier === 'pro') ? 'Pro' : 'Gratuit'}</td>
                <td style={{ padding: '10px 12px' }}><Coin /> {fr(u.balance)}</td>
                <td style={{ padding: '10px 12px' }}>{date(u.created_at)}</td>
                <td style={{ padding: '10px 12px' }}>{u.disabled_at ? 'suspendu' : u.role === 'admin' ? 'admin' : u.verified ? '' : 'non vérifié'}</td>
              </tr>
            ))}
            {data && data.users.length === 0 && <tr><td colSpan="6" style={{ padding: 16, color: C.muted }}>Aucun résultat.</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: C.muted }}>
        <button style={btn()} disabled={page <= 1} onClick={() => setPage(page - 1)}>← Précédent</button>
        <span>Page {page} / {pages} · {fr(data?.total ?? 0)} utilisateur(s)</span>
        <button style={btn()} disabled={page >= pages} onClick={() => setPage(page + 1)}>Suivant →</button>
      </div>
    </div>
  );
}

function Audit() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: '50' }); if (action) p.set('action', action);
    api(`/audit?${p}`).then(setData).catch((e) => setErr(e.message));
  }, [action, page]);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <select aria-label="Type d'événement" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} style={{ ...input, maxWidth: 320 }}>
        <option value="">Tous les événements</option>
        {data?.actions.map((a) => <option key={a.action} value={a.action}>{a.action} ({a.n})</option>)}
      </select>
      {err && <p role="alert" style={{ color: C.bad }}>{err}</p>}
      <div style={{ ...card, overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ textAlign: 'left', color: C.muted }}>{['Date', 'Événement', 'Utilisateur', 'IP', 'Détail'].map((h) => <th key={h} style={{ padding: '10px 12px' }}>{h}</th>)}</tr></thead>
          <tbody>{data?.entries.map((e) => (
            <tr key={e.id} style={{ borderTop: `1px solid ${C.border}` }}>
              <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{date(e.created_at)}</td>
              <td style={{ padding: '8px 12px' }}>{e.action}</td>
              <td style={{ padding: '8px 12px' }}>{e.user_email || (e.user_id ? '—' : 'compte supprimé / anonyme')}</td>
              <td style={{ padding: '8px 12px' }}>{e.ip_address || ''}</td>
              <td style={{ padding: '8px 12px', color: C.muted, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={JSON.stringify(e.metadata)}>{Object.keys(e.metadata || {}).length ? JSON.stringify(e.metadata) : ''}</td>
            </tr>))}</tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: C.muted }}>
        <button style={btn()} disabled={page <= 1} onClick={() => setPage(page - 1)}>← Précédent</button>
        <span>Page {page} / {pages} · {fr(data?.total ?? 0)} événement(s)</span>
        <button style={btn()} disabled={page >= pages} onClick={() => setPage(page + 1)}>Suivant →</button>
      </div>
    </div>
  );
}

function Flags() {
  const [flags, setFlags] = useState([]);
  const [err, setErr] = useState('');
  const [f, setF] = useState({ key: '', description: '', rolloutPercentage: 100, enabled: false });
  const load = useCallback(() => api('/flags').then((d) => setFlags(d.flags)).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const save = async (flag) => { setErr(''); try { await api(`/flags/${flag.key}`, { method: 'PUT', body: { enabled: flag.enabled, rolloutPercentage: Number(flag.rolloutPercentage ?? flag.rollout_percentage), description: flag.description } }); await load(); } catch (e) { setErr(e.message); } };
  const remove = async (key) => { if (!confirm(`Supprimer le drapeau ${key} ?`)) return; try { await api(`/flags/${key}`, { method: 'DELETE' }); await load(); } catch (e) { setErr(e.message); } };
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Un drapeau active ou coupe une fonction sans redéployer. Le pourcentage déploie progressivement (le même joueur a toujours le même résultat).</p>
      {err && <p role="alert" style={{ color: C.bad }}>{err}</p>}
      {flags.map((x) => (
        <div key={x.key} style={{ ...card, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 220px' }}><strong>{x.key}</strong><div style={{ fontSize: 12, color: C.muted }}>{x.description || '—'}</div></div>
          <label style={{ fontSize: 13 }}><input type="checkbox" checked={x.enabled} onChange={(e) => save({ ...x, enabled: e.target.checked })} /> Activé</label>
          <label style={{ fontSize: 13 }}>Déployé à <input type="number" min="0" max="100" defaultValue={x.rollout_percentage} onBlur={(e) => save({ ...x, rollout_percentage: e.target.value })} style={{ ...input, width: 70 }} /> %</label>
          <button style={btn('danger')} onClick={() => remove(x.key)}>Supprimer</button>
        </div>
      ))}
      {flags.length === 0 && <div style={{ ...card, color: C.muted }}>Aucun drapeau pour l'instant.</div>}
      <form style={{ ...card, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }} onSubmit={(e) => { e.preventDefault(); save(f).then(() => setF({ key: '', description: '', rolloutPercentage: 100, enabled: false })); }}>
        <input aria-label="Clé" placeholder="cle_du_drapeau" value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} style={{ ...input, flex: '1 1 180px' }} required />
        <input aria-label="Description" placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} style={{ ...input, flex: '2 1 240px' }} />
        <input aria-label="Pourcentage" type="number" min="0" max="100" value={f.rolloutPercentage} onChange={(e) => setF({ ...f, rolloutPercentage: e.target.value })} style={{ ...input, width: 80 }} />
        <label style={{ fontSize: 13 }}><input type="checkbox" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} /> Activé</label>
        <button style={btn('primary')} type="submit">Créer</button>
      </form>
    </div>
  );
}


const FB_STATUS = { new: 'Nouveau', seen: 'Vu', done: 'Traité', wontfix: 'Refusé' };

function Feedback() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('new');
  const [kind, setKind] = useState('');
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    const p = new URLSearchParams({ pageSize: '50' }); if (status) p.set('status', status); if (kind) p.set('kind', kind);
    api(`/feedback?${p}`).then(setData).catch((e) => setErr(e.message));
  }, [status, kind]);
  useEffect(() => { load(); }, [load]);
  const setSt = async (id, st) => { try { await api(`/feedback/${id}`, { method: 'POST', body: { status: st } }); load(); } catch (e) { setErr(e.message); } };
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {data && <div style={{ ...card, fontSize: 13 }}><Icon name="thumbsUp" size={18} /> {data.thumbs.up} ·{data.thumbs.down} · {data.summary.filter((s) => s.kind !== 'thumb').map((s) => `${s.kind === 'bug' ? 'bugs' : 'idées'} ${FB_STATUS[s.status].toLowerCase()} : ${s.n}`).join(' · ') || 'aucun bug ni idée'}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select aria-label="Statut" value={status} onChange={(e) => setStatus(e.target.value)} style={input}><option value="">Tous les statuts</option>{Object.entries(FB_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value)} style={input}><option value="">Tous les types</option><option value="bug">Bugs</option><option value="idea">Idées</option><option value="thumb">/</option></select>
      </div>
      {err && <p role="alert" style={{ color: C.bad }}>{err}</p>}
      {data?.feedback.map((f) => (
        <div key={f.id} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontSize: 12, color: C.muted }}>
            <span>{f.kind === 'bug' ? 'Bug' : f.kind === 'idea' ? 'Idée' : f.rating === 1 ? 'Utile' : 'Pas utile'} · {f.user_email || 'compte supprimé'} · {f.page || ''} · {date(f.created_at)}</span>
            <span>{FB_STATUS[f.status]}</span>
          </div>
          {f.message && <p style={{ margin: '8px 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{f.message}</p>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{Object.entries(FB_STATUS).filter(([k]) => k !== f.status).map(([k, v]) => <button key={k} style={btn()} onClick={() => setSt(f.id, k)}>Marquer « {v} »</button>)}</div>
        </div>
      ))}
      {data && data.feedback.length === 0 && <div style={{ ...card, color: C.muted }}>Aucun retour pour ce filtre.</div>}
    </div>
  );
}

const KINDS = { info: 'Information', new: 'Nouveauté (page des nouveautés)', maintenance: 'Maintenance' };

function Announcements() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [f, setF] = useState({ kind: 'info', title: '', body: '', published: true });
  const load = useCallback(() => api('/announcements').then((d) => setList(d.announcements)).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const save = async (a, patch) => { setErr(''); try { await api(`/announcements/${a.id}`, { method: 'PUT', body: { kind: a.kind, title: a.title, body: a.body, published: a.published, ...patch } }); await load(); } catch (e) { setErr(e.message); } };
  const remove = async (a) => { if (!confirm(`Supprimer « ${a.title} » ?`)) return; try { await api(`/announcements/${a.id}`, { method: 'DELETE' }); await load(); } catch (e) { setErr(e.message); } };
  const create = async (e) => { e.preventDefault(); setErr(''); try { await api('/announcements', { method: 'POST', body: f }); setF({ kind: 'info', title: '', body: '', published: true }); await load(); } catch (e2) { setErr(e2.message); } };
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Les annonces « info » et « maintenance » publiées s'affichent en bandeau en haut du site (fermable). Les « nouveautés » apparaissent dans la page /changelog. Texte brut uniquement.</p>
      {err && <p role="alert" style={{ color: C.bad }}>{err}</p>}
      <form onSubmit={create} style={{ ...card, display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select aria-label="Type" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} style={input}>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input aria-label="Titre" placeholder="Titre" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} style={{ ...input, flex: '1 1 240px' }} required minLength={3} maxLength={120} />
        </div>
        <textarea aria-label="Texte" placeholder="Texte (facultatif)" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} rows={3} maxLength={2000} style={{ ...input, width: '100%', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ fontSize: 13 }}><input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} /> Publier tout de suite</label>
          <button type="submit" style={btn('primary')}>Créer l'annonce</button>
        </div>
      </form>
      {list.map((a) => (
        <div key={a.id} style={{ ...card, display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 300px' }}>
            <strong>{KINDS[a.kind]?.split(' ')[0]} {a.title}</strong> <span style={{ fontSize: 12, color: a.published ? C.good : C.muted }}>{a.published ? '● publiée' : '○ brouillon'}</span>
            {a.body && <div style={{ fontSize: 13, color: 'var(--ik-text-2)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{a.body}</div>}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={btn()} onClick={() => save(a, { published: !a.published })}>{a.published ? 'Dépublier' : 'Publier'}</button>
            <button style={btn('danger')} onClick={() => remove(a)}>Supprimer</button>
          </div>
        </div>
      ))}
      {list.length === 0 && <div style={{ ...card, color: C.muted }}>Aucune annonce.</div>}
    </div>
  );
}

function Billing() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/billing').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <p role="alert" style={{ color: C.bad }}>{err}</p>;
  if (!d) return <p style={{ color: C.muted }}>Chargement…</p>;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ ...card, fontSize: 13 }}>
        Stripe : {d.stripeConfigured ? 'configuré' : 'non configuré'} · {d.summary.map((s) => `${s.status} : ${s.n}`).join(' · ') || 'aucun abonnement'}
        <div style={{ color: C.muted, marginTop: 4 }}>Remboursements et factures : dans le tableau de bord Stripe (dashboard.stripe.com).</div>
      </div>
      <div style={{ ...card, overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ textAlign: 'left', color: C.muted }}>{['Utilisateur', 'Offre', 'Statut', 'Échéance', 'Résilié'].map((h) => <th key={h} style={{ padding: '10px 12px' }}>{h}</th>)}</tr></thead>
          <tbody>{d.subscriptions.map((s, i) => <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}><td style={{ padding: '8px 12px' }}>{s.email}</td><td style={{ padding: '8px 12px' }}>{s.tier}</td><td style={{ padding: '8px 12px' }}>{s.status}</td><td style={{ padding: '8px 12px' }}>{date(s.current_period_end)}</td><td style={{ padding: '8px 12px' }}>{s.canceled_at ? date(s.canceled_at) : ''}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function System() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const load = () => api('/system').then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);
  if (err) return <p role="alert" style={{ color: C.bad }}>{err}</p>;
  if (!d) return <p style={{ color: C.muted }}>Chargement…</p>;
  const h = Math.floor(d.uptimeSeconds / 3600), m = Math.floor((d.uptimeSeconds % 3600) / 60);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <Stat label="Base de données" value={d.database.ok ? 'OK' : 'Hors service'} sub={`${d.database.pingMs} ms · connexions ${d.database.pool.total} (${d.database.pool.waiting} en attente)`} />
        <Stat label="En marche depuis" value={`${h} h ${m} min`} sub={`Node ${d.node} · ${d.environment}`} />
        <Stat label="Mémoire de l'API" value={`${d.memory.rssMb} Mo`} sub={`Système : ${fr(d.memory.systemFreeMb)} libres / ${fr(d.memory.systemTotalMb)} Mo`} />
        <Stat label="Charge (1 / 5 / 15 min)" value={d.loadAverage.join(' / ')} sub={`${d.cpus} processeur(s)`} />
      </div>
      <div style={card}>
        <h3 style={{ margin: '0 0 8px', fontSize: 15, color: 'var(--ik-text)' }}>Contrôles de configuration</h3>
        {d.config.map((c) => (
          <div key={c.key} style={{ fontSize: 13, padding: '4px 0' }}>
            <Icon name={c.status === 'ok' ? 'circleCheck' : c.status === 'ko' ? 'triangleAlert' : 'info'} size={16} /> {c.label}
            {c.status === 'ko' && <span style={{ color: C.muted }}> — {c.hint}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

const TABS = [
  { id: 'overview', label: 'Vue d\'ensemble', C: Overview },
  { id: 'users', label: 'Utilisateurs', C: Users },
  { id: 'audit', label: 'Journal', C: Audit },
  { id: 'feedback', label: 'Retours', C: Feedback },
  { id: 'announcements', label: 'Annonces', C: Announcements },
  { id: 'flags', label: 'Drapeaux', C: Flags },
  { id: 'billing', label: 'Facturation', C: Billing },
  { id: 'system', label: 'Système', C: System },
];

export default function AdminPage() {
  const router = useRouter();
  const [state, setState] = useState('checking'); // checking | ok | denied | no2fa
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    api('/system').then(() => setState('ok')).catch((e) => setState(e.code === 'ADMIN_2FA_REQUIRED' ? 'no2fa' : e.status === 401 ? 'login' : 'denied'));
  }, [router]);
  useEffect(() => { if (state === 'login') router.push('/login'); }, [state, router]);

  const Current = useMemo(() => TABS.find((t) => t.id === tab).C, [tab]);

  return (
    <AppShell>
    <div style={{ color: 'var(--ik-text-2)', minWidth: 0 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 26px)', color: 'var(--ik-text)' }}>Administration</h1>
          <Link href="/dashboard" style={{ color: 'var(--ik-accent)', textDecoration: 'none', fontSize: 14 }}>← Retour au site</Link>
        </div>
        {state === 'checking' && <p style={{ color: C.muted }}>Vérification des droits…</p>}
        {state === 'no2fa' && <div style={{ ...card, borderColor: C.warn }}><strong>Double authentification requise.</strong><p style={{ margin: '8px 0 0', fontSize: 14 }}>Active la 2FA sur ton compte (Dashboard → Paramètres → Sécurité) : elle est obligatoire pour accéder à l'administration.</p></div>}
        {state === 'denied' && <div style={{ ...card, borderColor: C.bad }}><strong>Accès refusé.</strong><p style={{ margin: '8px 0 0', fontSize: 14 }}>Cette page est réservée aux administrateurs.</p></div>}
        {state === 'ok' && (
          <>
            <nav aria-label="Sections" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
                  style={{ ...btn(tab === t.id ? 'primary' : 'default'), borderRadius: 20 }}>{t.label}</button>
              ))}
            </nav>
            <Current />
          </>
        )}
      </div>
    </div>
    </AppShell>
  );
}
