process.env.AUTH_MIN_RESPONSE_MS = process.env.AUTH_MIN_RESPONSE_MS ?? '0'; // pas d'attente artificielle dans les tests (sauf ceux qui la testent)
// Redirige l'application vers la base de TEST avant tout import de ../src.
// Garde-fou : on refuse de tourner sur une base dont le nom ne contient pas
// "test" (pour ne jamais effacer de vraies données par erreur).
const url = process.env.TEST_DATABASE_URL;
if (url) {
  const dbName = url.split('/').pop()?.split('?')[0] ?? '';
  if (!dbName.includes('test')) {
    throw new Error(`TEST_DATABASE_URL doit pointer vers une base dont le nom contient "test" (reçu : ${dbName})`);
  }
  process.env.DATABASE_URL = url;
}

// Frais et impôts Bourse/Crypto : coupés par défaut pour que les tests des autres modules (banque, portefeuille…)
// restent sur des montants ronds. tests/tradingCosts.test.ts les réactive explicitement.
import { TRADING_COSTS, TRADING_TAX } from '../src/config/tradingRules';
TRADING_COSTS.enabled = false;
TRADING_TAX.enabled = false;
