'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Avatar from '@/app/components/social/Avatar';
import Icon from '@/app/components/ui/Icon';
import {
  AVATAR_TYPES, confirmEmailChange, getProfile, removeAvatar, requestEmailChange, saveProfile, uploadAvatar,
} from '@/app/lib/profileApi';

// Paramètres > Profil : photo, nom, e-mail (lecture seule + procédure sécurisée), bio.
// Tout vient du serveur. Un champ vide reste vide (le texte grisé n'est qu'un exemple d'aide, jamais enregistré).
// L'enregistrement n'envoie QUE les champs modifiés : sans modification, rien n'est envoyé et rien ne change.
export const NAME_MAX = 80;
export const BIO_MAX = 280;

function EmailChange({ email, onDone }) {
  const [step, setStep] = useState('closed');          // closed | ask | code
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFa, setTwoFa] = useState('');
  const [needTwoFa, setNeedTwoFa] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ kind: '', text: '' });

  const close = () => { setStep('closed'); setPassword(''); setTwoFa(''); setCode(''); setNewEmail(''); setNeedTwoFa(false); setMsg({ kind: '', text: '' }); };

  const ask = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMsg({ kind: '', text: '' });
    const r = await requestEmailChange(newEmail, password, needTwoFa ? twoFa : undefined);
    setBusy(false);
    if (r.ok) { setPassword(''); setStep('code'); setMsg({ kind: 'ok', text: r.data.message }); return; }
    if (r.code === 'TWO_FACTOR_REQUIRED') setNeedTwoFa(true);
    setMsg({ kind: 'err', text: r.error });
  };
  const confirm = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMsg({ kind: '', text: '' });
    const r = await confirmEmailChange(code);
    setBusy(false);
    if (r.ok) { onDone(r.data.email); close(); setMsg({ kind: 'ok', text: 'Adresse e-mail modifiée. Ton ancienne adresse a été prévenue.' }); return; }
    setMsg({ kind: 'err', text: r.error });
  };

  return (
    <div className="pf-email">
      {step === 'closed' && <button type="button" className="pf-btn pf-btn--ghost" onClick={() => { setMsg({ kind: '', text: '' }); setStep('ask'); }}><Icon name="mail" size={16} />Changer mon adresse e-mail</button>}
      {step === 'ask' && (
        <form className="pf-box" onSubmit={ask} aria-label="Changer mon adresse e-mail">
          <p className="pf-hint">Un code sera envoyé à la <strong>nouvelle</strong> adresse, et ton adresse actuelle ({email}) sera prévenue. Pour ta sécurité, indique ton mot de passe.</p>
          <label className="pf-label" htmlFor="pf-new-email">Nouvelle adresse e-mail</label>
          <input id="pf-new-email" className="pf-input" type="email" autoComplete="off" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} maxLength={254} />
          <label className="pf-label" htmlFor="pf-pwd">Mot de passe actuel</label>
          <input id="pf-pwd" className="pf-input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {needTwoFa && (<>
            <label className="pf-label" htmlFor="pf-2fa">Code de double authentification</label>
            <input id="pf-2fa" className="pf-input" inputMode="numeric" autoComplete="one-time-code" required value={twoFa} onChange={(e) => setTwoFa(e.target.value)} />
          </>)}
          <div className="pf-actions">
            <button type="submit" className="pf-btn" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer le code'}</button>
            <button type="button" className="pf-btn pf-btn--ghost" onClick={close}>Annuler</button>
          </div>
        </form>
      )}
      {step === 'code' && (
        <form className="pf-box" onSubmit={confirm} aria-label="Confirmer la nouvelle adresse">
          <label className="pf-label" htmlFor="pf-code">Code reçu sur la nouvelle adresse (6 chiffres)</label>
          <input id="pf-code" className="pf-input" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          <div className="pf-actions">
            <button type="submit" className="pf-btn" disabled={busy || code.length !== 6}>{busy ? 'Vérification…' : 'Confirmer'}</button>
            <button type="button" className="pf-btn pf-btn--ghost" onClick={close}>Annuler</button>
          </div>
        </form>
      )}
      {msg.text && <p role={msg.kind === 'err' ? 'alert' : 'status'} className={`pf-msg pf-msg--${msg.kind}`}>{msg.text}</p>}
    </div>
  );
}

export default function ProfileForm() {
  const [state, setState] = useState('loading');       // loading | ready | error
  const [saved, setSaved] = useState(null);            // dernières valeurs connues du serveur
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [msg, setMsg] = useState({ kind: '', text: '' });
  const [photoMsg, setPhotoMsg] = useState({ kind: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileInput = useRef(null);

  const apply = useCallback((p) => { setSaved(p); setFullName(p.fullName); setBio(p.bio); }, []);
  const load = useCallback(async () => {
    setState('loading');
    const r = await getProfile();
    if (!r.ok) { setState('error'); return; }
    apply(r.data); setState('ready');
  }, [apply]);
  useEffect(() => { load(); }, [load]);

  const dirtyName = saved && fullName.trim() !== saved.fullName;
  const dirtyBio = saved && bio.trim() !== saved.bio;

  const save = async () => {
    if (busy) return;
    if (!dirtyName && !dirtyBio) { setMsg({ kind: 'ok', text: 'Aucune modification à enregistrer.' }); return; }
    setBusy(true); setMsg({ kind: '', text: '' });
    const body = {};
    if (dirtyName) body.fullName = fullName;
    if (dirtyBio) body.bio = bio;
    const r = await saveProfile(body);
    setBusy(false);
    if (!r.ok) { setMsg({ kind: 'err', text: r.error }); return; }
    apply({ ...saved, ...r.data });
    setMsg({ kind: 'ok', text: 'Profil enregistré.' });
  };

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || photoBusy) return;
    setPhotoBusy(true); setPhotoMsg({ kind: '', text: '' });
    const r = await uploadAvatar(file);
    setPhotoBusy(false);
    if (!r.ok) { setPhotoMsg({ kind: 'err', text: r.error }); return; }
    setSaved((s) => ({ ...s, avatarId: r.data.avatarId }));
    setPhotoMsg({ kind: 'ok', text: 'Photo enregistrée : elle apparaît déjà en haut à droite.' });
  };
  const drop = async () => {
    if (photoBusy) return;
    setPhotoBusy(true); setPhotoMsg({ kind: '', text: '' });
    const r = await removeAvatar();
    setPhotoBusy(false);
    if (!r.ok) { setPhotoMsg({ kind: 'err', text: r.error }); return; }
    setSaved((s) => ({ ...s, avatarId: null }));
    setPhotoMsg({ kind: 'ok', text: 'Photo supprimée.' });
  };

  if (state === 'loading') return <p className="pf-hint" role="status">Chargement de ton profil…</p>;
  if (state === 'error') return (
    <div className="pf-box">
      <p role="alert" className="pf-msg pf-msg--err">Impossible de charger ton profil pour le moment. Rien n&apos;a été modifié.</p>
      <button type="button" className="pf-btn" onClick={load}>Réessayer</button>
    </div>
  );

  const shownName = saved.username || 'Moi';
  return (
    <div className="pf">
      <section className="pf-photo" aria-label="Photo de profil">
        <Avatar avatarId={saved.avatarId} name={shownName} size={96} />
        <div className="pf-photo__side">
          <strong>Photo de profil</strong>
          <p className="pf-hint">JPG, PNG ou WebP. Elle est visible par les autres joueurs (classements, amis, guildes). La lettre de ton pseudo s&apos;affiche tant que tu n&apos;as pas de photo.</p>
          <input ref={fileInput} type="file" accept={AVATAR_TYPES.join(',')} onChange={pick} data-testid="photo-input" className="pf-file" aria-label="Choisir une photo de profil" />
          <div className="pf-actions">
            <button type="button" className="pf-btn" disabled={photoBusy} onClick={() => fileInput.current?.click()}>{photoBusy ? 'Envoi…' : saved.avatarId ? 'Changer la photo' : 'Choisir une photo'}</button>
            {saved.avatarId && <button type="button" className="pf-btn pf-btn--ghost" disabled={photoBusy} onClick={drop}>Supprimer ma photo</button>}
          </div>
          {photoMsg.text && <p role={photoMsg.kind === 'err' ? 'alert' : 'status'} className={`pf-msg pf-msg--${photoMsg.kind}`}>{photoMsg.text}</p>}
        </div>
      </section>

      <div className="pf-fields">
        <div>
          <label className="pf-label" htmlFor="pf-name">Nom complet</label>
          <input id="pf-name" className="pf-input" type="text" value={fullName} maxLength={NAME_MAX} autoComplete="name" placeholder="Facultatif : ton prénom et ton nom" onChange={(e) => setFullName(e.target.value)} />
          <p className="pf-hint">Ton pseudo public est <strong>{saved.username || 'à choisir'}</strong> : il ne change pas ici.</p>
        </div>
        <div>
          <label className="pf-label" htmlFor="pf-email">Adresse e-mail</label>
          <input id="pf-email" className="pf-input" type="email" value={saved.email} readOnly aria-describedby="pf-email-help" />
          <p id="pf-email-help" className="pf-hint">Elle sert à te connecter et à récupérer ton compte : elle ne se modifie que par la procédure sécurisée ci-dessous.</p>
          <EmailChange email={saved.email} onDone={(email) => setSaved((s) => ({ ...s, email }))} />
        </div>
        <div>
          <label className="pf-label" htmlFor="pf-bio">Bio</label>
          <textarea id="pf-bio" className="pf-input pf-bio" value={bio} maxLength={BIO_MAX} rows={3} placeholder="Facultatif : présente-toi en une phrase" onChange={(e) => setBio(e.target.value)} />
          <p className="pf-hint">{bio.length}/{BIO_MAX} caractères</p>
        </div>
        <div className="pf-actions">
          <button type="button" className="pf-btn" disabled={busy} onClick={save}>{busy ? 'Enregistrement…' : 'Enregistrer les modifications'}</button>
        </div>
        {msg.text && <p role={msg.kind === 'err' ? 'alert' : 'status'} className={`pf-msg pf-msg--${msg.kind}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
