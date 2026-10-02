'use client';

import { createContext, useContext } from 'react';

// Données de la coque (compte, solde, série de jours, notifications) partagées avec les pages : une seule source,
// donc un clic sur « récompense du jour » met à jour la barre du haut ET la page en même temps.
export const ShellDataContext = createContext(null);
export const useShell = () => useContext(ShellDataContext);
