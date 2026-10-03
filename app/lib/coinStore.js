// InvestCoins côté navigateur : UNE seule source de vérité pour toute la page (barre du haut, menu, carte Patrimoine, Liquidités, accueil).
//
// Règles :
// - Le serveur est la seule référence. Ce magasin n'ajoute, ne retire et ne calcule JAMAIS rien : il affiche le portefeuille que le serveur
//   renvoie (`wallet`, joint à la réponse de chaque action qui réussit, ou lu par GET /economy/balance). Aucun affichage « optimiste ».
// - Un instantané plus ancien (champ `at`, en ms, posé par le serveur) que celui déjà affiché est ignoré : deux réponses qui arrivent dans le
//   désordre (double clic, deux onglets) ne peuvent pas faire revenir un ancien chiffre.
// - Deux onglets ouverts : l'un diffuse son instantané à l'autre (BroadcastChannel), et on relit le serveur au retour sur l'onglet.
// - Échec d'une action (refus du serveur, réseau coupé) : on relit la vraie valeur et on laisse l'appelant afficher le message d'erreur.
import { useEffect, useSyncExternalStore } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const CHANNEL = 'ik-coins';

let state = { wallet: null, error: false, version: 0 };
const listeners = new Set();
const emit = () => { state = { ...state }; listeners.forEach((l) => l()); };
let channel = null;
const getChannel = () => {
  if (channel || typeof BroadcastChannel === 'undefined') return channel;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (e) => { if (e.data?.type === 'wallet') applyWallet(e.data.wallet, { broadcast: false }); };
  } catch { channel = null; }
  return channel;
};

export const getCoins = () => state;
export const subscribeCoins = (fn) => { listeners.add(fn); getChannel(); return () => listeners.delete(fn); };

const valid = (w) => w && typeof w === 'object' && Number.isFinite(w.balance) && Number.isFinite(w.netWorth);

// Applique un portefeuille reçu du serveur. Renvoie true s'il a été affiché (false : ancien instantané ou valeur invalide).
export function applyWallet(w, { broadcast = true } = {}) {
  if (!valid(w)) return false;
  const cur = state.wallet;
  if (cur && Number.isFinite(w.at) && Number.isFinite(cur.at) && w.at < cur.at) return false;
  state = { wallet: w, error: false, version: state.version + 1 };
  listeners.forEach((l) => l());
  if (broadcast) { try { getChannel()?.postMessage({ type: 'wallet', wallet: w }); } catch { /* ignore */ } }
  return true;
}

let inflight = null;
// Relit le portefeuille au serveur (un seul appel à la fois, même si dix composants le demandent).
export function refreshCoins() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (inflight) return inflight;
  inflight = fetch(`${API}/economy/balance`)
    .then((r) => (r.ok ? r.json() : null))
    .then((w) => { if (w && applyWallet(w)) return true; if (!w) { state = { ...state, error: true }; emit(); } return false; })
    .catch(() => { state = { ...state, error: true }; emit(); return false; })
    .finally(() => { inflight = null; });
  return inflight;
}

// Récompense du jour : une seule requête à la fois depuis cet onglet (double clic) ; le serveur, lui, ne la donne qu'une fois par jour.
let claiming = null;
export function claimDailyReward() {
  if (claiming) return claiming;
  claiming = (async () => {
    let res;
    try { res = await fetch(`${API}/economy/daily-reward`, { method: 'POST' }); } catch {
      refreshCoins();
      throw new Error('Connexion impossible : ta récompense n\'a peut-être pas été enregistrée. Ton solde affiché est celui du serveur.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { refreshCoins(); throw new Error(data.error || 'Récompense indisponible'); }
    if (!applyWallet(data.wallet)) refreshCoins();
    return data;
  })().finally(() => { claiming = null; });
  return claiming;
}

let started = false;
const start = () => {
  if (started || typeof window === 'undefined') return;
  started = true;
  let last = 0;
  const onVisible = () => { if (document.visibilityState === 'visible' && Date.now() - last > 5000) { last = Date.now(); refreshCoins(); } };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);
  if (typeof BroadcastChannel === 'undefined') window.addEventListener('storage', (e) => { if (e.key === 'ik-coins-ping') refreshCoins(); });
};

const SERVER_STATE = { wallet: null, error: false, version: 0 };
// Hook : { wallet, error, version }. Le premier composant monté déclenche la lecture initiale.
export function useCoins() {
  const s = useSyncExternalStore(subscribeCoins, getCoins, () => SERVER_STATE);
  useEffect(() => { start(); if (!getCoins().wallet) refreshCoins(); }, []);
  return s;
}
