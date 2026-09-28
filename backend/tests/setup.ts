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
