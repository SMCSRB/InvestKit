'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { AuthFrame, AuthHeader } from '@/app/components/landing/AuthLayout';
import { LogoMark } from '@/app/components/ui/Logo';
import Icon from '@/app/components/ui/Icon';
import { Button } from '@/app/components/ui/primitives';
import { useTheme } from '@/app/context/ThemeContext';
import { Confetti, Notice, PasswordField, PasswordRules, StrengthMeter, SuccessMark, passwordOk } from '@/app/components/auth/fields';
import { authPost, errorText } from '@/app/lib/authApi';

// Inscription en 3 étapes courtes : (1) code d'invitation + e-mail, (2) mot de passe, (3) consentements et validation.
// Sécurité : l'écran ne dit JAMAIS si une adresse a déjà un compte (le serveur répond pareil dans tous les cas).
const API = process.env.NEXT_PUBLIC_API_URL;
const STEPS = ['Ton accès', 'Mot de passe', 'Validation'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_DOMAINS = ['gmail.com', 'outlook.com', 'yahoo.fr', 'hotmail.com', 'icloud.com'];
const NEUTRAL = 'Si l’adresse est valide, un code de vérification vient d’être envoyé.';

function SignupForm() {
  const router = useRouter();
  const { motionEnabled } = useTheme();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState('next');
  const [inviteOnly, setInviteOnly] = useState(null); // null = pas encore connu
  const [invite, setInvite] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [referral, setReferral] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const captchaRef = useRef(null);
  const redirectRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('ref')) setReferral(params.get('ref'));
    if (params.get('invite')) setInvite(params.get('invite').toUpperCase());
    fetch(`${API}/auth/signup-config`).then((r) => r.json()).then((c) => setInviteOnly(!!c.inviteOnly)).catch(() => setInviteOnly(true));
    return () => clearTimeout(redirectRef.current);
  }, []);

  // Une erreur affichée n'a plus lieu d'être dès que la personne corrige sa saisie.
  useEffect(() => { setError(''); }, [invite, email, password, confirm, terms, privacy]);

  const go = (n) => { setDir(n > step ? 'next' : 'back'); setError(''); setStep(n); };
  const emailOk = EMAIL_RE.test(email.trim());
  const match = password.length > 0 && password === confirm;
  const suggestions = (() => {
    const [name, domain] = email.split('@');
    if (!name || domain === undefined || !domain || domain.length > 6 || EMAIL_DOMAINS.includes(domain)) return [];
    return EMAIL_DOMAINS.filter((d) => d.startsWith(domain)).map((d) => `${name}@${d}`);
  })();

  const next1 = async () => {
    if (inviteOnly && !invite.trim()) { setError('Entre ton code d’invitation (le site est en phase de test sur invitation).'); return; }
    if (!emailOk) { setError('Entre une adresse e-mail valide.'); return; }
    setBusy(true); setError('');
    if (inviteOnly) {
      const r = await authPost('validate-invite', { code: invite });
      if (r.status === 429) { setBusy(false); setError(errorText(r)); return; }
      if (!r.ok || !r.data.valid) { setBusy(false); setError('Ce code n’est pas reconnu ou n’est plus valable.'); return; }
    }
    setBusy(false); go(1);
  };
  const next2 = () => {
    if (!passwordOk(password)) { setError('Ton mot de passe ne respecte pas encore toutes les règles.'); return; }
    if (!match) { setError('Les deux mots de passe doivent être identiques.'); return; }
    go(2);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!terms || !privacy) { setError('Coche les deux cases pour continuer.'); return; }
    setBusy(true); setError('');
    // Captcha invisible : aucune case à cocher ; un défi n'apparaît que si le service le juge nécessaire.
    let token = null;
    try {
      const res = await Promise.race([captchaRef.current.execute({ async: true }), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000))]);
      token = res?.response || null;
    } catch { token = null; }
    if (!token) { setBusy(false); setError('La vérification anti-robot n’a pas abouti. Réessaie dans un instant.'); return; }
    const r = await authPost('register', { email: email.trim(), password, captchaToken: token, referralCode: referral, inviteCode: invite });
    try { captchaRef.current?.resetCaptcha(); } catch { /* ignore */ }
    if (!r.ok) { setBusy(false); setError(errorText(r, 'L’inscription a échoué. Réessaie.')); return; }
    try { sessionStorage.setItem('verificationEmail', email.trim()); } catch { /* ignore */ }
    setDone(true); setBusy(false);
    redirectRef.current = setTimeout(() => router.push('/verify-email'), motionEnabled ? 1800 : 600);
  };

  if (done) {
    return (
      <>
        <Confetti run={motionEnabled} />
        <div className="au-success" role="status">
          <SuccessMark />
          <h1 style={{ margin: 0, fontSize: 'var(--ik-fs-xl)' }}>C’est presque fini !</h1>
          <p className="ik-muted" style={{ margin: 0 }}>{NEUTRAL}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <AuthHeader icon={<div style={{ display: 'grid', placeItems: 'center', marginBottom: 14 }}><LogoMark size={52} /></div>} title="Crée ton compte" subtitle="Rejoins InvestKit et apprends à investir sans risque." />
      <ol className="au-steps" aria-label={`Étape ${step + 1} sur 3`}>
        {STEPS.map((s, i) => (
          <li key={s} className={i < step ? 'is-done' : i === step ? 'is-current' : ''} aria-current={i === step ? 'step' : undefined}>{i < step ? '✓ ' : `${i + 1}. `}{s}</li>
        ))}
      </ol>

      <form onSubmit={submit} noValidate>
        {referral && <div style={{ marginBottom: 14 }}><Notice kind="info">Invité(e) par un ami : code {referral}</Notice></div>}

        {step === 0 && (
          <div className="au-step" data-dir={dir} key="s0">
            {inviteOnly !== false && (
              <div className="ik-field">
                <label className="ik-label" htmlFor="su-invite">Code d’invitation</label>
                <input id="su-invite" className="ik-input" type="text" value={invite} onChange={(e) => setInvite(e.target.value.toUpperCase())} placeholder="XXXXX-XXXXX" autoComplete="off" autoCapitalize="characters" spellCheck={false} autoFocus aria-describedby="su-invite-h" />
                <p id="su-invite-h" className="au-hint">Le site est en phase de test, sur invitation.</p>
              </div>
            )}
            <div className="ik-field">
              <label className="ik-label" htmlFor="su-email" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Adresse e-mail{emailOk && <span className="au-pop ik-up" aria-hidden="true"><Icon name="check" size={16} strokeWidth={2.6} /></span>}
              </label>
              <input id="su-email" className={`ik-input ${emailOk ? 'is-ok' : ''}`} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.com" autoCapitalize="none" spellCheck={false} />
              {suggestions.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {suggestions.map((s) => <button key={s} type="button" className="ik-chip" onClick={() => setEmail(s)} style={{ cursor: 'pointer' }}>{s}</button>)}
                </div>
              )}
            </div>
            {error && <Notice>{error}</Notice>}
            <div className="au-nav au-nav--single"><Button type="button" variant="primary" size="lg" block loading={busy} disabled={busy} onClick={next1}>Continuer</Button></div>
          </div>
        )}

        {step === 1 && (
          <div className="au-step" data-dir={dir} key="s1">
            <input className="ik-sr-only" type="email" name="username" autoComplete="username" value={email} readOnly aria-hidden="true" tabIndex={-1} />
            <div>
              <PasswordField label="Mot de passe" value={password} onChange={setPassword} valid={passwordOk(password)} autoFocus describedBy="su-rules" />
              <div id="su-rules" style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                <StrengthMeter password={password} />
                <PasswordRules password={password} />
              </div>
            </div>
            <div>
              <PasswordField label="Confirme ton mot de passe" value={confirm} onChange={setConfirm} valid={match && passwordOk(password)} invalid={confirm.length > 0 && !match} describedBy="su-match" />
              <p id="su-match" role="status" className={confirm ? (match ? 'ik-up au-hint' : 'ik-error au-hint') : 'au-hint'} style={{ fontWeight: 700 }}>
                {confirm ? (match ? 'Les mots de passe correspondent.' : 'Les mots de passe ne correspondent pas encore.') : ''}
              </p>
            </div>
            {error && <Notice>{error}</Notice>}
            <div className="au-nav">
              <Button type="button" onClick={() => go(0)} icon="chevronLeft" aria-label="Retour à l’étape précédente" />
              <Button type="button" variant="primary" size="lg" block onClick={next2}>Continuer</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="au-step" data-dir={dir} key="s2">
            <div className="au-consent">
              <input type="checkbox" id="su-terms" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              <label htmlFor="su-terms">J’ai lu et j’accepte les <Link href="/conditions" target="_blank" rel="noopener" className="ik-link">conditions d’utilisation</Link>.</label>
            </div>
            <div className="au-consent">
              <input type="checkbox" id="su-privacy" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} />
              <label htmlFor="su-privacy">Je consens au traitement de mes données personnelles décrit dans la <Link href="/privacy" target="_blank" rel="noopener" className="ik-link">politique de confidentialité</Link> (RGPD). Je peux les consulter, les exporter ou les supprimer à tout moment.</label>
            </div>
            <HCaptcha sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY} size="invisible" ref={captchaRef} languageOverride="fr" />
            <p className="au-hint" style={{ margin: 0 }}>Protégé par hCaptcha : vérification invisible contre les robots. Ses <a className="ik-link" href="https://www.hcaptcha.com/privacy" target="_blank" rel="noopener noreferrer">règles de confidentialité</a> s’appliquent.</p>
            {error && <Notice>{error}</Notice>}
            <div className="au-nav">
              <Button type="button" onClick={() => go(1)} icon="chevronLeft" aria-label="Retour à l’étape précédente" disabled={busy} />
              <Button type="submit" variant="primary" size="lg" block loading={busy} disabled={busy || !terms || !privacy}>{busy ? 'Création…' : 'Créer mon compte'}</Button>
            </div>
          </div>
        )}
      </form>

      <p className="au-alt">Déjà un compte ? <Link href="/login" className="ik-link">Se connecter</Link></p>
    </>
  );
}

export default function SignupPage() {
  return (
    <AuthFrame>
      <div className="au-card-wrap"><div className="au-card"><Suspense fallback={null}><SignupForm /></Suspense></div></div>
    </AuthFrame>
  );
}
