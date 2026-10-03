'use client';

import { useCallback, useEffect, useState } from 'react';
import { onUserChanged } from '@/app/lib/profileApi';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const getJson = async (path) => {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
};

// Données réelles de la coque : compte, solde d'InvestCoins, notifications, droit d'administration.
// Aucune valeur inventée : en cas d'échec, le champ reste vide et l'interface l'indique honnêtement.
export default function useShellData() {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null); // { balance, dailyStreak, canClaimToday }
  const [notif, setNotif] = useState({ notifications: [], unread: 0 });
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshWallet = useCallback(() => getJson('/economy/balance').then(setWallet).catch(() => {}), []);
  // Recharge le compte (nom, photo...) depuis le serveur : appelée après chaque enregistrement du profil, sans recharger la page.
  const refreshUser = useCallback(() => getJson('/auth/me').then((me) => { setUser(me.user); setIsAdmin(!!me.user?.isAdmin); }).catch(() => {}), []);
  useEffect(() => onUserChanged(refreshUser), [refreshUser]);
  const refreshNotifs = useCallback(() => getJson('/notifications?limit=10').then(setNotif).catch(() => {}), []);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([getJson('/auth/me'), getJson('/economy/balance'), getJson('/notifications?limit=10')]).then(([me, bal, nt]) => {
      if (!alive) return;
      if (me.status === 'fulfilled') { setUser(me.value.user); setIsAdmin(!!me.value.user?.isAdmin); }
      if (bal.status === 'fulfilled') setWallet(bal.value);
      if (nt.status === 'fulfilled') setNotif(nt.value);
      setLoading(false);
    });
    const id = setInterval(refreshNotifs, 120000);
    return () => { alive = false; clearInterval(id); };
  }, [refreshNotifs]);

  const claimDaily = useCallback(async () => {
    const res = await fetch(`${API}/economy/daily-reward`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Récompense indisponible');
    setWallet((w) => ({ ...(w || {}), balance: data.balance, dailyStreak: data.newStreak, canClaimToday: false }));
    return data;
  }, []);

  const markAllRead = useCallback(async () => {
    await fetch(`${API}/notifications/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) }).catch(() => {});
    setNotif((n) => ({ notifications: n.notifications.map((x) => ({ ...x, read: true })), unread: 0 }));
  }, []);

  return { user, wallet, notif, isAdmin, loading, refreshWallet, refreshNotifs, refreshUser, claimDaily, markAllRead };
}
