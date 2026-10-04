import { env } from '../../config/env';
import { fictiveDataSource } from './fictiveCatalog';
import { dvfDataSource } from './dvfSource';
import { realDataState } from '../../config/realSourceRules';
import type { RealEstateDataSource } from './types';

export * from './types';

// Point d'entrée UNIQUE vers les données immobilières. Données réelles = REAL_ESTATE_SOURCE=dvf
// ET IMMO_REAL_DATA=true ET base « _test » (config/realSourceRules.ts) ; sinon le serveur refuse de servir l'Immobilier.
const SOURCES: Record<string, RealEstateDataSource> = {
  fictive: fictiveDataSource,
  dvf: dvfDataSource,        // Immobilier RÉEL : refusé tant que realDataState().enabled est faux (voir ci-dessous)
};

export const getRealEstateDataSource = (): RealEstateDataSource => {
  const wanted = env.realEstateSource;
  const source = SOURCES[wanted];
  if (source === dvfDataSource) {
    const state = realDataState();
    if (!state.enabled) throw new Error(`REAL_ESTATE_SOURCE=dvf refusé : ${state.reason}`);
  }
  if (!source) throw new Error(`Source immobilière inconnue : "${wanted}" (disponibles : ${Object.keys(SOURCES).join(', ')})`);
  return source;
};
