'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Icon from '@/app/components/ui/Icon';
import { Button } from '@/app/components/ui/primitives';

// ---- Règles de mot de passe : alignées sur le serveur (backend/src/utils/passwordPolicy.ts). Le serveur reste juge. ----
export const PASSWORD_RULES = [
  { id: 'len', label: '8 caractères au moins', test: (p) => p.length >= 8 },
  { id: 'up', label: 'Une majuscule', test: (p) => /[A-Z]/.test(p) },
  { id: 'low', label: 'Une minuscule', test: (p) => /[a-z]/.test(p) },
  { id: 'num', label: 'Un chiffre', test: (p) => /[0-9]/.test(p) },
];
export const passwordOk = (p) => PASSWORD_RULES.every((r) => r.test(p)) && p.length <= 128;

// Force : 0 vide, 1 faible, 2 correct, 3 solide (longueur et variété ; ce n'est qu'une indication).
export const passwordStrength = (p) => {
  if (!p) return 0;
  const variety = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
  if (!passwordOk(p)) return 1;
  return p.length >= 12 && variety >= 3 ? 3 : 2;
};
const STRENGTH = [null, { label: 'Faible', color: 'var(--ik-negative)' }, { label: 'Correct', color: 'var(--ik-warning)' }, { label: 'Solide', color: 'var(--ik-positive)' }];

export function StrengthMeter({ password }) {
  const level = passwordStrength(password);
  if (!level) return null;
  const s = STRENGTH[level];
  return (
    <div className="au-strength" aria-live="polite">
      <div className="au-strength__bars" aria-hidden="true">
        {[1, 2, 3].map((n) => <span key={n} style={n <= level ? { background: s.color } : undefined} />)}
      </div>
      <span className="au-strength__label" style={{ color: s.color }}>Force du mot de passe : {s.label}</span>
    </div>
  );
}

// Règles : visibles pendant la saisie, repliées une fois toutes remplies.
export function PasswordRules({ password }) {
  const done = PASSWORD_RULES.every((r) => r.test(password));
  return (
    <div className={`au-rules ${done || !password ? 'is-done' : ''}`} aria-hidden={done || !password}>
      <div>
        <ul>
          {PASSWORD_RULES.map((r) => {
            const met = r.test(password);
            return (
              <li key={r.id} className={met ? 'is-met' : ''}>
                <Icon name={met ? 'check' : 'x'} size={14} strokeWidth={2.4} />{r.label}
                <span className="ik-sr-only">{met ? ' (rempli)' : ' (à remplir)'}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// Champ mot de passe avec bouton afficher/masquer ; autocomplete correct pour les gestionnaires de mots de passe.
export function PasswordField({ label, value, onChange, autoComplete = 'new-password', placeholder = '••••••••', valid, invalid, describedBy, autoFocus, name, id: idProp }) {
  const auto = useId();
  const id = idProp || auto;
  const [show, setShow] = useState(false);
  return (
    <div className="ik-field">
      <label className="ik-label" htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}
        {valid && <span className="au-pop ik-up" aria-hidden="true"><Icon name="check" size={16} strokeWidth={2.6} /></span>}
      </label>
      <div className="ik-input-wrap">
        <input id={id} name={name} className={`ik-input ${valid ? 'is-ok' : ''}`} type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)} aria-invalid={invalid ? 'true' : undefined} aria-describedby={describedBy} autoFocus={autoFocus} spellCheck={false} autoCapitalize="none" />
        <Button variant="ghost" size="sm" icon={show ? 'eyeOff' : 'eye'} className="ik-input-wrap__btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={show} />
      </div>
    </div>
  );
}

// Code à N chiffres en cases séparées : saisie qui avance seule, retour arrière, flèches, collage du code entier.
export function CodeInput({ length = 6, value, onChange, onComplete, label, status, disabled, autoFocus = true }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');
  const focusAt = (i) => { const el = refs.current[Math.max(0, Math.min(length - 1, i))]; el?.focus(); el?.select?.(); };
  useEffect(() => { if (autoFocus) focusAt(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const commit = (next) => { onChange(next); if (next.length === length) onComplete?.(next); };
  const handleChange = (i, raw) => {
    const clean = raw.replace(/\D/g, '');
    if (!clean) { commit(digits.map((d, k) => (k === i ? '' : d)).join('').replace(/\s/g, '')); return; }
    const arr = [...digits];
    // Plusieurs chiffres d'un coup (collage, saisie automatique du SMS) : on les répartit à partir de la case courante.
    clean.split('').slice(0, length - i).forEach((c, k) => { arr[i + k] = c; });
    const next = arr.join('');
    commit(next);
    focusAt(Math.min(i + clean.length, length - 1));
  };
  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) { e.preventDefault(); commit(digits.slice(0, i - 1).join('')); focusAt(i - 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); focusAt(i - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); focusAt(i + 1); }
  };
  const onPaste = (e) => {
    const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, length);
    if (!text) return;
    e.preventDefault();
    commit(text);
    focusAt(text.length >= length ? length - 1 : text.length);
  };
  return (
    <div role="group" aria-label={label} className="au-code">
      {digits.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} className={`ik-input ${d ? 'is-filled' : ''} ${status === 'ok' ? 'is-ok' : ''}`}
          type="text" inputMode="numeric" pattern="[0-9]*" maxLength={length} value={d} disabled={disabled}
          autoComplete={i === 0 ? 'one-time-code' : 'off'} aria-label={`Chiffre ${i + 1} sur ${length}`}
          aria-invalid={status === 'error' ? 'true' : undefined}
          onChange={(e) => handleChange(i, e.target.value)} onKeyDown={(e) => onKeyDown(i, e)} onPaste={onPaste} onFocus={(e) => e.target.select()} />
      ))}
    </div>
  );
}

export function Notice({ kind = 'danger', children }) {
  const icon = kind === 'success' ? 'check' : kind === 'danger' ? 'alert' : kind === 'info' ? 'shield' : 'info';
  return (
    <div className={`ik-notice ik-notice--${kind} ${kind === 'danger' ? 'au-shake' : ''}`} role={kind === 'danger' ? 'alert' : 'status'} style={{ margin: 0 }}>
      <Icon name={icon} size={20} /><p>{children}</p>
    </div>
  );
}

// Coche animée de succès.
export function SuccessMark() {
  return (
    <svg viewBox="0 0 76 76" aria-hidden="true" focusable="false"><circle cx="38" cy="38" r="30" /><path d="M25 39l9 9 18-20" /></svg>
  );
}

const COLORS = ['#6d4ff0', '#c15bf0', '#3ddc97', '#ffc14d', '#5cc8ff'];
// Confettis sobres (30 pièces, 2 s) : seulement si les animations sont permises.
export function Confetti({ run }) {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    if (!run) { setPieces([]); return undefined; }
    setPieces(Array.from({ length: 30 }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 0.4, dx: Math.random() * 160 - 80, color: COLORS[i % COLORS.length] })));
    const t = setTimeout(() => setPieces([]), 2400);
    return () => clearTimeout(t);
  }, [run]);
  return pieces.map((p, i) => <span key={i} className="ik-confetti" aria-hidden="true" style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, '--dx': `${p.dx}px` }} />);
}
