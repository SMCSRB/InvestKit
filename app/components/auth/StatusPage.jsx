'use client';

import { AuthFrame } from '@/app/components/landing/AuthLayout';

// Page d'état (erreur, introuvable) : même fond animé que les pages de compte, message court, actions claires.
export default function StatusPage({ code, title, children, actions }) {
  return (
    <AuthFrame minimal footer>
      <div className="au-status">
        <div className="au-card">
          {code && <div className="au-status__code" aria-hidden="true">{code}</div>}
          <h1>{title}</h1>
          <p>{children}</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>{actions}</div>
        </div>
      </div>
    </AuthFrame>
  );
}
