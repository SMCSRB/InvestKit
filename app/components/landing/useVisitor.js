'use client';

import { useEffect, useState } from 'react';
import { isLoggedIn } from '@/app/lib/session';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// État du visiteur : connecté ou non, et inscription sur invitation ou ouverte (lu auprès de l'API, jamais supposé).
export default function useVisitor() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [inviteOnly, setInviteOnly] = useState(true);
  useEffect(() => {
    setLoggedIn(isLoggedIn());
    fetch(`${API}/auth/signup-config`).then((r) => (r.ok ? r.json() : null)).then((c) => { if (c && typeof c.inviteOnly === 'boolean') setInviteOnly(c.inviteOnly); }).catch(() => {});
  }, []);
  return { loggedIn, inviteOnly, ctaLabel: inviteOnly ? 'Rejoindre avec un code d\'invitation' : 'Créer mon compte' };
}
