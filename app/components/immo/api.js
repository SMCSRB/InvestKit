// Outils communs de l'écran Immobilier : appels à l'API, formats, libellés, annonces rédigées.
// RIEN ici ne calcule de règle du jeu : les calculs viennent du serveur. Les textes d'annonce sont rédigés à partir des champs réels
// de l'annonce (type, quartier, état, DPE, charges, tension) : aucune donnée n'est inventée pour l'affichage.
import { createElement, Fragment } from 'react';
import Coin from '@/app/components/ui/Coin';
const API = `${process.env.NEXT_PUBLIC_API_URL}/realestate`;

export async function call(path, method = 'GET', body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || 'Erreur'); e.code = data.code; e.details = data.details; e.status = res.status; throw e; }
  return data;
}

export const clean = (n) => (Math.abs(Number(n ?? 0)) < 0.005 ? 0 : Number(n ?? 0));
// Tout le jeu se compte en InvestCoins (1 pièce = 1 €) : plus aucun « € » dans l'Immobilier, l'euro est réservé à l'argent réel (abonnement Pro).
// eur / eur2 : élément avec l'icône de pièce (à placer dans du JSX) ; eurText / eurText2 : chaîne (info-bulle, message, étiquette d'accessibilité).
// Les noms gardent « eur » car les champs du serveur sont aussi nommés ainsi (…Euros) : leur valeur est déjà en pièces.
const fixed0 = (n) => clean(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const fixed2 = (n) => clean(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const eur = (n) => createElement(Fragment, null, fixed0(n), ' ', createElement(Coin));
export const eur2 = (n) => createElement(Fragment, null, fixed2(n), ' ', createElement(Coin));
export const eurText = (n) => `${fixed0(n)} InvestCoins`;
export const eurText2 = (n) => `${fixed2(n)} InvestCoins`;
export const pct = (n, d = 1) => `${Number(n ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })} %`;
const coinNumber = (n) => Math.round(Number(n ?? 0)).toLocaleString('fr-FR');
// Montant en InvestCoins : élément avec l'icône de pièce (à placer dans du JSX) ; coinsText pour une chaîne (info-bulle, message).
export const coins = (n) => createElement(Fragment, null, coinNumber(n), ' ', createElement(Coin));
export const coinsText = (n) => `${coinNumber(n)} InvestCoins`;
export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export const TYPE_LABEL = { studio: 'Studio', apartment: 'Appartement', house: 'Maison' };
export const CONDITION_LABEL = { good: 'Bon état', to_refresh: 'À rafraîchir', to_renovate: 'À rénover' };
export const STATUS_LABEL = { let: 'Loué', vacant: 'Vide', notice: 'Préavis donné' };
export const DPE_COLORS = { A: '#2f9e5b', B: '#5fb04a', C: '#a6c13a', D: '#e6c52b', E: '#f0a229', F: '#e8742a', G: '#d6453d' };
export const DPE_TEXT = { A: '#06210f', B: '#0c2208', C: '#1d2406', D: '#2a2305', E: '#2e1c03', F: '#2e1403', G: '#fff' };

import { hash, rng, describeListing } from './describe';
export { hash, rng, describeListing };

export const listingAlt = (l, city) => `Illustration d’un ${TYPE_LABEL[l.type]?.toLowerCase()} de ${l.surfaceSqm} m² à ${city?.name ?? l.cityId}, ${CONDITION_LABEL[l.condition]?.toLowerCase()}, DPE ${l.energyClass}.`;
