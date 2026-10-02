'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardHead, EmptyState, Modal, Skeleton, Tabs } from '@/app/components/ui/primitives';
import Icon, { Medal } from '@/app/components/ui/Icon';
import { Reveal } from '@/app/components/ui/motion';
import { copyText, social } from '@/app/lib/social';

const fr = (n) => Number(n ?? 0).toLocaleString('fr-FR');

function Avatar({ name }) {
  return <span className="soc-avatar" aria-hidden="true">{(name || '?').trim().slice(0, 1).toUpperCase()}</span>;
}
function Person({ p, children, rank }) {
  return (
    <div className="soc-row">
      {rank ? <span className="soc-rank" aria-label={`Rang ${rank}`}><Medal rank={rank} /></span> : null}
      <Avatar name={p.name} />
      <div className="soc-row__main">
        <strong className="soc-row__name">{p.name}{p.isMe ? ' (toi)' : ''}</strong>
        {p.level !== undefined && <span className="ik-muted">Niveau {p.level} · <span className="ik-num">{fr(p.xp)}</span> XP</span>}
      </div>
      {p.role === 'owner' && <span className="ik-chip"><Icon name="crown" size={13} />Chef</span>}
      <div className="soc-row__actions">{children}</div>
    </div>
  );
}

// Amis et guildes RÉELS (serveur). Aucune donnée d'exemple. Utilisé par /friends et par l'onglet Amis du tableau de bord.
export default function SocialHub({ tab, onTab }) {
  const [me, setMe] = useState(null);
  const [friends, setFriends] = useState(null);
  const [reqs, setReqs] = useState(null);
  const [blocks, setBlocks] = useState(null);
  const [guild, setGuild] = useState(undefined); // undefined = chargement, null = aucune guilde
  const [error, setError] = useState('');
  const [msg, setMsg] = useState({ text: '', bad: false });
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null); // { title, body, label, danger, run }
  const [code, setCode] = useState('');
  const [gName, setGName] = useState('');
  const [gDesc, setGDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [m, f, r, b, g] = await Promise.all([social.me(), social.friends(), social.requests(), social.blocks(), social.guild()]);
      setMe(m); setFriends(f.friends); setReqs(r); setBlocks(b.blocks); setGuild(g.guild); setError('');
    } catch (e) { setError(e.status === 429 ? 'Trop de requêtes pour le moment : réessaie dans quelques minutes.' : 'Impossible de charger tes amis. Réessaie dans un instant.'); }
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  const act = async (fn, okText) => {
    if (busy) return;
    setBusy(true); setMsg({ text: '', bad: false });
    try { const r = await fn(); await loadAll(); if (okText) setMsg({ text: typeof okText === 'function' ? okText(r) : okText, bad: false }); return r; }
    catch (e) { setMsg({ text: e.message || 'Action impossible', bad: true }); }
    finally { setBusy(false); }
    return undefined;
  };
  const copy = async (what, text) => { if (await copyText(text)) { setCopied(what); setTimeout(() => setCopied(''), 2000); } };
  const ask = (c) => setConfirm(c);
  const runConfirm = async () => { const c = confirm; setConfirm(null); await act(c.run, c.done); };

  const incoming = reqs?.incoming ?? [];
  const tabs = [
    { value: 'friends', label: `Amis${friends ? ` (${friends.length})` : ''}` },
    { value: 'requests', label: `Demandes${incoming.length ? ` (${incoming.length})` : ''}` },
    { value: 'add', label: 'Ajouter' },
    { value: 'guild', label: 'Guilde' },
    { value: 'blocked', label: `Bloqués${blocks?.length ? ` (${blocks.length})` : ''}` },
  ];

  if (error && !me) return <Card><EmptyState icon="alert" title="Amis indisponibles" action={<Button onClick={loadAll}>Réessayer</Button>}>{error}</EmptyState></Card>;

  return (
    <div className="soc">
      <Reveal>
        <Card hero className="soc-code">
          <div>
            <p className="soc-code__label">Ton code ami</p>
            <p className="soc-code__value ik-num" aria-live="polite">{me ? me.friendCode : '········'}</p>
            <p className="soc-code__hint">Donne-le à quelqu'un pour qu'il t'ajoute. Personne ne peut te trouver sans lui.</p>
          </div>
          <Button icon={copied === 'code' ? 'check' : 'copy'} disabled={!me} onClick={() => copy('code', me.friendCode)} style={{ background: '#fff', color: '#2c1d7a', border: 0 }}>
            {copied === 'code' ? 'Copié !' : 'Copier mon code'}
          </Button>
        </Card>
      </Reveal>

      <Tabs ariaLabel="Amis et guilde" value={tab} onChange={onTab} tabs={tabs} />
      <div role="status" aria-live="polite" className={msg.text ? `soc-msg ${msg.bad ? 'soc-msg--bad' : ''}` : 'ik-sr-only'}>{msg.text}</div>

      <div key={tab} className="soc-panel">
        {tab === 'friends' && (friends === null ? <Skeleton height={180} style={{ borderRadius: 16 }} /> : friends.length === 0 ? (
          <Card><EmptyState icon="users" title="Pas encore d'ami" action={<Button variant="primary" onClick={() => onTab('add')}>Ajouter un ami</Button>}>
            Échange ton code ami avec quelqu'un et vous pourrez comparer vos niveaux.
          </EmptyState></Card>
        ) : (
          <Card><CardHead title="Mes amis" icon="users" />
            <div className="soc-list">
              {friends.map((f, i) => (
                <Reveal key={f.userId} index={i}>
                  <Person p={f}>
                    <Button size="sm" variant="ghost" onClick={() => ask({ title: `Retirer ${f.name} ?`, body: 'Vous ne serez plus amis. Tu pourras le redemander plus tard.', label: 'Retirer', run: () => social.removeFriend(f.userId), done: `${f.name} a été retiré.` })}>Retirer</Button>
                    <Button size="sm" variant="ghost" onClick={() => ask({ title: `Bloquer ${f.name} ?`, body: 'Il ne pourra plus t\'envoyer de demande et vous ne serez plus amis. Il ne sera pas prévenu.', label: 'Bloquer', danger: true, run: () => social.block(f.userId), done: `${f.name} est bloqué.` })}>Bloquer</Button>
                  </Person>
                </Reveal>
              ))}
            </div>
          </Card>
        ))}

        {tab === 'requests' && (reqs === null ? <Skeleton height={140} style={{ borderRadius: 16 }} /> : (
          <div style={{ display: 'grid', gap: 16 }}>
            <Card><CardHead title="Demandes reçues" icon="mail" />
              {incoming.length === 0 ? <p className="ik-muted" style={{ margin: 0 }}>Aucune demande pour l'instant.</p> : (
                <div className="soc-list">{incoming.map((r) => (
                  <Person key={r.id} p={r}>
                    <Button size="sm" variant="primary" disabled={busy} onClick={() => act(() => social.accept(r.id), `Tu es maintenant ami avec ${r.name}.`)}>Accepter</Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(() => social.decline(r.id), 'Demande refusée.')}>Refuser</Button>
                  </Person>))}
                </div>)}
            </Card>
            <Card><CardHead title="Demandes envoyées" icon="arrowUpRight" />
              {reqs.outgoing.length === 0 ? <p className="ik-muted" style={{ margin: 0 }}>Aucune demande en attente.</p> : (
                <div className="soc-list">{reqs.outgoing.map((r) => (
                  <Person key={r.id} p={r}><Button size="sm" variant="ghost" disabled={busy} onClick={() => act(() => social.cancel(r.id), 'Demande annulée.')}>Annuler</Button></Person>))}
                </div>)}
            </Card>
          </div>
        ))}

        {tab === 'add' && (
          <Card><CardHead title="Ajouter un ami" icon="plus" />
            <form className="soc-form" onSubmit={(e) => { e.preventDefault(); if (!code.trim()) return; act(async () => { const r = await social.sendRequest(code.trim()); setCode(''); return r; }, (r) => (r.status === 'accepted' ? `Vous êtes maintenant amis avec ${r.name} !` : `Demande envoyée à ${r.name}.`)); }}>
              <label htmlFor="soc-code" className="ik-muted">Code ami de la personne</label>
              <div className="soc-form__row">
                <input id="soc-code" className="ik-input ik-num" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ex. K7M2QX9P" maxLength={11} autoComplete="off" spellCheck={false} />
                <Button variant="primary" type="submit" loading={busy} disabled={!code.trim()}>Envoyer la demande</Button>
              </div>
              <p className="ik-muted" style={{ margin: 0, fontSize: 'var(--ik-fs-sm)' }}>On ne trouve quelqu'un qu'avec son code exact : il n'existe pas de liste de joueurs à parcourir.</p>
            </form>
          </Card>
        )}

        {tab === 'guild' && (guild === undefined ? <Skeleton height={220} style={{ borderRadius: 16 }} /> : guild === null ? (
          <div className="soc-two">
            <Card><CardHead title="Créer une guilde" icon="crown" />
              <form className="soc-form" onSubmit={(e) => { e.preventDefault(); act(() => social.createGuild(gName, gDesc), 'Guilde créée !'); }}>
                <label htmlFor="g-name" className="ik-muted">Nom (3 à 24 caractères)</label>
                <input id="g-name" className="ik-input" value={gName} onChange={(e) => setGName(e.target.value)} maxLength={24} />
                <label htmlFor="g-desc" className="ik-muted">Description (facultative, 140 caractères)</label>
                <input id="g-desc" className="ik-input" value={gDesc} onChange={(e) => setGDesc(e.target.value)} maxLength={140} />
                <Button variant="primary" type="submit" loading={busy} disabled={gName.trim().length < 3}>Créer ma guilde</Button>
              </form>
            </Card>
            <Card><CardHead title="Rejoindre une guilde" icon="users" />
              <form className="soc-form" onSubmit={(e) => { e.preventDefault(); act(() => social.joinGuild(joinCode.trim()), 'Bienvenue dans la guilde !'); }}>
                <label htmlFor="g-code" className="ik-muted">Code d'invitation donné par le chef</label>
                <input id="g-code" className="ik-input ik-num" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={11} autoComplete="off" spellCheck={false} />
                <Button variant="primary" type="submit" loading={busy} disabled={!joinCode.trim()}>Rejoindre</Button>
              </form>
            </Card>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            <Card>
              <CardHead title={guild.name} icon="crown" actions={<span className="ik-chip">{guild.members.length} / {guild.memberCap} membres</span>} />
              {guild.description && <p style={{ margin: '0 0 12px' }}>{guild.description}</p>}
              <p className="ik-muted" style={{ margin: 0 }}>XP total de la guilde : <strong className="ik-num">{fr(guild.totalXp)}</strong> · classement interne par XP d'éducation.</p>
              {guild.role === 'owner' && (
                <div className="soc-invite">
                  <span className="ik-muted">Code d'invitation</span>
                  <strong className="ik-num soc-invite__code">{guild.inviteCode}</strong>
                  <Button size="sm" icon={copied === 'inv' ? 'check' : 'copy'} onClick={() => copy('inv', guild.inviteCode)}>{copied === 'inv' ? 'Copié' : 'Copier'}</Button>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => ask({ title: 'Changer le code d\'invitation ?', body: 'L\'ancien code ne fonctionnera plus. Les membres actuels restent dans la guilde.', label: 'Changer le code', run: () => social.regenerateInvite(), done: 'Nouveau code créé.' })}>Changer le code</Button>
                </div>
              )}
            </Card>
            <Card><CardHead title="Classement de la guilde" icon="trophy" />
              <div className="soc-list">
                {guild.members.map((m, i) => (
                  <Reveal key={m.userId} index={i}>
                    <Person p={m} rank={m.rank}>
                      {guild.role === 'owner' && !m.isMe && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => ask({ title: `Passer la guilde à ${m.name} ?`, body: 'Tu deviendras simple membre. Cette action est immédiate.', label: 'Passer la guilde', run: () => social.transfer(m.userId), done: `${m.name} est le nouveau chef.` })}>Passer chef</Button>
                          <Button size="sm" variant="ghost" onClick={() => ask({ title: `Retirer ${m.name} ?`, body: 'Il sera prévenu et pourra rejoindre une autre guilde.', label: 'Retirer', danger: true, run: () => social.kick(m.userId), done: `${m.name} a été retiré.` })}>Retirer</Button>
                        </>
                      )}
                    </Person>
                  </Reveal>
                ))}
              </div>
            </Card>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button variant="ghost" onClick={() => ask({ title: 'Quitter la guilde ?', body: guild.role === 'owner' ? 'Tu es le chef : le membre le plus ancien reprendra la guilde (elle disparaît s\'il n\'y a personne d\'autre).' : 'Tu pourras la rejoindre à nouveau avec un code.', label: 'Quitter', run: () => social.leaveGuild(), done: 'Tu as quitté la guilde.' })}>Quitter la guilde</Button>
              {guild.role === 'owner' && <Button variant="ghost" onClick={() => ask({ title: 'Dissoudre la guilde ?', body: 'La guilde sera supprimée pour tous ses membres. C\'est définitif.', label: 'Dissoudre', danger: true, run: () => social.disband(), done: 'Guilde dissoute.' })}>Dissoudre la guilde</Button>}
            </div>
          </div>
        ))}

        {tab === 'blocked' && (
          <Card><CardHead title="Joueurs bloqués" icon="lock" />
            {blocks === null ? <Skeleton height={80} /> : blocks.length === 0 ? <p className="ik-muted" style={{ margin: 0 }}>Personne n'est bloqué.</p> : (
              <div className="soc-list">{blocks.map((b) => (
                <Person key={b.userId} p={{ ...b, level: undefined, xp: undefined }}>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(() => social.unblock(b.userId), `${b.name} est débloqué.`)}>Débloquer</Button>
                </Person>))}
              </div>)}
          </Card>
        )}
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.title || ''}
        footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>Annuler</Button><Button variant="primary" onClick={runConfirm} style={confirm?.danger ? { background: 'var(--ik-negative)', color: 'var(--ik-text-on-negative)' } : undefined}>{confirm?.label}</Button></>}>
        <p style={{ margin: 0 }}>{confirm?.body}</p>
      </Modal>
    </div>
  );
}
