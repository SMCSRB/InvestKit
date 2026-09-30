'use client';

import { useEffect, useState } from 'react';
import { isLoggedIn } from '@/app/lib/session';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// Une seule requête partagée par tous les boutons de la page. Sans réponse du serveur, on garde la valeur par défaut du serveur
// (inscription sur invitation) : c'est la plus prudente.
let configPromise = null;
const loadConfig = () => {
  if (!configPromise) {
    configPromise = fetch(`${API}/auth/signup-config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => (c && typeof c.inviteOnly === 'boolean' ? c.inviteOnly : null))
      .catch(() => null);
  }
  return configPromise;
};

// État du visiteur : connecté ou non, et inscription sur invitation ou ouverte.
export default function useVisitor() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [inviteOnly, setInviteOnly] = useState(true);
  useEffect(() => {
    setLoggedIn(isLoggedIn());
    let alive = true;
    loadConfig().then((v) => { if (alive && v !== null) setInviteOnly(v); });
    return () => { alive = false; };
  }, []);
  return { loggedIn, inviteOnly, ctaLabel: inviteOnly ? 'Rejoindre avec un code d\'invitation' : 'Créer mon compte' };
}
