import { env } from '../../config/env';
import { fictiveDataSource } from './fictiveCatalog';
import type { RealEstateDataSource } from './types';

export * from './types';

// Point d'entrée UNIQUE vers les données immobilières. Passer aux vraies
// données DVF = ajouter une source ici et régler REAL_ESTATE_SOURCE=dvf ;
// aucun autre fichier du jeu n'a à changer.
const SOURCES: Record<string, RealEstateDataSource> = {
  fictive: fictiveDataSource,
};

export const getRealEstateDataSource = (): RealEstateDataSource => {
  const wanted = env.realEstateSource;
  const source = SOURCES[wanted];
  if (!source) throw new Error(`Source immobilière inconnue : "${wanted}" (disponibles : ${Object.keys(SOURCES).join(', ')})`);
  return source;
};
