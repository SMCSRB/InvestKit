// Activation de l'Immobilier RÉEL (branchement 6/6). TOUT est désactivé par défaut.
// Il faut DEUX conditions en même temps : IMMO_REAL_DATA=true dans l'environnement ET une base dont le nom finit par « _test » (copie de test : investkit_design_test).
// Sur le vrai site (base « investkit »), même avec IMMO_REAL_DATA=true, l'Immobilier réel reste ÉTEINT : le verrou ne dépend d'aucun réglage.
import { env, databaseNameFromUrl } from './env';

export const REAL_DATA_ENV_VAR = 'IMMO_REAL_DATA';
export const isTestDatabaseName = (name: string): boolean => /_test$/.test(name);

// Années jouables avec les données réelles : les loyers ANIL commencent en 2022 ; la dernière année = dernier millésime importé.
// VALEUR À RECONFIRMER après l'import (docs/checklists-apres-deploiement.md) : réglable par IMMO_REAL_MIN_YEAR / IMMO_REAL_MAX_YEAR.
export const REAL_DEFAULT_MIN_YEAR = 2022;
export const REAL_DEFAULT_MAX_YEAR = 2025;

const year = (raw: string | undefined, fallback: number): number => {
  const n = raw ? Number(raw) : NaN;
  return Number.isInteger(n) && n >= 1999 && n <= 2100 ? n : fallback;
};

export interface RealDataState { enabled: boolean; reason: string; databaseName: string; minYear: number; maxYear: number }

export const realDataState = (
  flag: string | undefined = process.env[REAL_DATA_ENV_VAR],
  databaseName: string = databaseNameFromUrl(env.database.url, env.database.name),
  minRaw: string | undefined = process.env.IMMO_REAL_MIN_YEAR,
  maxRaw: string | undefined = process.env.IMMO_REAL_MAX_YEAR,
): RealDataState => {
  const minYear = year(minRaw, REAL_DEFAULT_MIN_YEAR);
  const maxYear = Math.max(minYear, year(maxRaw, REAL_DEFAULT_MAX_YEAR));
  if (flag !== 'true') return { enabled: false, reason: `${REAL_DATA_ENV_VAR} n'est pas « true » : Immobilier réel éteint.`, databaseName, minYear, maxYear };
  if (!isTestDatabaseName(databaseName)) return { enabled: false, reason: `Base « ${databaseName} » : son nom ne finit pas par « _test », l'Immobilier réel reste éteint.`, databaseName, minYear, maxYear };
  return { enabled: true, reason: 'Allumé sur une base de test.', databaseName, minYear, maxYear };
};
export const realDataEnabled = (): boolean => realDataState().enabled;
