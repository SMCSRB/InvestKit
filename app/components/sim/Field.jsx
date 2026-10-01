'use client';

import { useId } from 'react';
import HelpTip from '@/app/components/HelpTip';

// Champ de simulation : libellé, saisie numérique (avec curseur facultatif), unité, aide. Valeurs toujours bornées par le moteur de calcul.
export function Field({ label, value, onChange, min = 0, max, step = 1, suffix, hint, slider = false, term }) {
  const id = useId();
  const set = (v) => onChange(v === '' ? '' : Number(v));
  return (
    <div className="sim-field">
      <label htmlFor={id} className="sim-field__label">{label}{term && <HelpTip term={term} />}</label>
      <div className="sim-field__row">
        <input id={id} className="ik-input ik-num" type="number" inputMode="decimal" value={value} min={min} max={max} step={step} onChange={(e) => set(e.target.value)} aria-describedby={hint ? `${id}-h` : undefined} />
        {suffix && <span className="sim-field__unit">{suffix}</span>}
      </div>
      {slider && max !== undefined && (
        <input className="sim-range" type="range" aria-label={`${label} (curseur)`} min={min} max={max} step={step} value={Number(value) || 0} onChange={(e) => set(e.target.value)} />
      )}
      {hint && <p id={`${id}-h`} className="sim-field__hint">{hint}</p>}
    </div>
  );
}

export function SelectField({ label, value, onChange, options, hint, term }) {
  const id = useId();
  return (
    <div className="sim-field">
      <label htmlFor={id} className="sim-field__label">{label}{term && <HelpTip term={term} />}</label>
      <select id={id} className="ik-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <p className="sim-field__hint">{hint}</p>}
    </div>
  );
}
