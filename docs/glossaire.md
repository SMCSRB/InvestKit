# Glossaire

Page `/glossaire` (110 mots). Les définitions sont dans `app/lib/glossaire.js` (inchangé pour les autres écrans : icône « ? », palette de commandes, page d'accueil). Ce qui est propre à la nouvelle page :

| Fichier | Rôle |
|---|---|
| `app/lib/glossaireMeta.js` | domaines, niveaux, liens vers les simulateurs, **sources et date de contrôle** |
| `app/lib/glossaireFichesA.js`, `glossaireFichesB.js` | pour chaque mot : un **exemple concret** et des « **à ne pas confondre avec** » |
| `app/glossaire/page.jsx` | recherche instantanée, index A–Z, filtres, fiches repliables |
| `app/styles/glossaire.css` | styles (mobile à 390 px sans défilement horizontal) |
| `backend/tests/glossaire.test.ts` | vérifie que chaque mot a sa fiche, que les liens existent, que les définitions sensibles ont une source |

## Fonctionnement

- **Recherche** : sans accent ni majuscule, dans le terme, la définition courte, la définition longue et l'exemple ; les résultats commencent par les termes qui débutent par ce qu'on tape.
- **Filtres** : un domaine (Immobilier, Bourse et PEA, Crypto, Banque et crédit, Dans le jeu) et un niveau (débutant, intermédiaire, avancé), combinables. Les niveaux et domaines sont des choix pédagogiques (listes dans `glossaireMeta.js`).
- **Liens** `/glossaire#identifiant` (icône « ? ») : la fiche s'ouvre et le défilement s'y rend.
- **Leçons** : seule la crypto a des cours aujourd'hui (champ `quiz`). Les leçons Immobilier et Bourse seront reliées quand elles existeront (étape 4).
- Icônes Lucide (ISC), aucun emoji.

## Exactitude : ce qui a été corrigé (contrôle du 3 octobre 2026)

| Mot | Avant | Maintenant |
|---|---|---|
| Courtage | « sur un PEA, il ne peut pas dépasser 0,5 % d'un ordre en ligne » (non sourcé : retiré) | les barèmes varient d'un courtier à l'autre |
| PEA | « avant 5 ans, un retrait est taxé à la flat tax » | un retrait avant 5 ans entraîne en principe la **clôture** du plan (sauf cas particuliers) et les gains sont taxés à la flat tax |
| Prélèvements sociaux | « 17,2 % » seul | **18,6 %** sur les placements financiers depuis 2026, **17,2 %** sur les revenus fonciers et plus-values immobilières |
| Flat tax | « 17,2 % (18,6 % en 2026) » ambigu | « 18,6 % depuis 2026 (17,2 % auparavant), soit 31,4 % au total » |
| Taux d'endettement | aucun chiffre | plafond de **35 %** assurance comprise (HCSF), marge de souplesse limitée |
| GLI | « en général 2 à 4 % » | idem mais **présenté comme un ordre de grandeur non officiel** |
| Impôt crypto | « 305  InvestCoins » (espace en trop) | corrigé |

## Sources des définitions sensibles

Méthode : recherche web (les sites officiels ne pouvaient pas être ouverts directement depuis l'environnement de développement) : les chiffres viennent d'extraits de pages officielles, de notaires ou de l'ANIL. **Rien n'a été relu page entière sur le site officiel : à faire avant l'ouverture au public.** Les liens sont affichés dans chaque fiche, avec la date.

| Mot | Information | Statut | Page de référence |
|---|---|---|---|
| PEA | plafond 150 000 €, 5 ans, clôture avant 5 ans | vérifié par recherche | economie.gouv.fr (PEA) |
| Compte-titres | flat tax 12,8 % + prélèvements sociaux | vérifié par recherche | impots.gouv.fr (plus-values imposées), service-public F21618 |
| Flat tax | 12,8 % ; prélèvements sociaux 18,6 % en 2026 | **taux de 18,6 % : sources de presse et de conseil, à confirmer** | idem + service-public F2329 |
| Impôt crypto | seuil de 305 € de cessions, échange crypto-crypto non imposé | vérifié par recherche | impots.gouv.fr (actifs numériques), economie.gouv.fr |
| Prélèvements sociaux | 17,2 % immobilier ; 18,6 % placements | **à confirmer sur Urssaf ou impots.gouv.fr** | service-public F2329 |
| Taux d'endettement | 35 % assurance comprise | vérifié par recherche | Direction générale du Trésor (macroprudentiel) |
| Frais de notaire | environ 7–8 % ancien, 2–3 % neuf | vérifié par recherche (jeu : 7,5 % et 2,5 %) | economie.gouv.fr |
| Trêve hivernale | 1er novembre au 31 mars | vérifié par recherche | ANIL |
| Plus-value immobilière | principe de calcul, exonération de la résidence principale | vérifié par recherche | impots.gouv.fr, service-public F10864 |
| Abattement | IR : exonération à 22 ans ; prélèvements sociaux : à 30 ans | vérifié par recherche | impots.gouv.fr |
| Surtaxe | seuil de 50 000 € | seuil vérifié ; **lissage entre les paliers reconstitué, non relu** | Notaires de Paris |
| IRA | six mois d'intérêts ou 3 % du capital restant, le plus faible | vérifié par recherche | service-public F1669 |
| DPE | interdiction de louer : G, puis F, puis E | vérifié par recherche | economie.gouv.fr |
| Audit énergétique | maisons et immeubles entiers, pas les appartements en copropriété | vérifié par recherche | ANIL, service-public F37110 |
| Valeur verte | écart de prix selon la note | vérifié par recherche | Notaires de France |
| Impôt sur les loyers | barème de l'impôt sur le revenu 2026 | vérifié par recherche | service-public F1419 |

## Ce que je n'ai pas pu sourcer

- **GLI : fourchette de 2 à 4 %** et **les règles d'assurance du jeu** (carence 3 mois, plafond 70 000 €, refus des étudiants) : valeurs de jeu, non sourcées, à reconfirmer.
- **Courtage** : les taux du jeu (0,5 %, 0,35 %…) sont inspirés de courtiers réels, sans source.
- **Dépôt de garantie** et **préavis** : règles générales connues, non relues dans un texte officiel.
- **Taux de 18,6 %** des prélèvements sociaux sur les placements financiers en 2026 : sources de presse, à confirmer.
- **Lissage de la surtaxe**, **coût de l'audit énergétique (800 €)**, **décote de vente forcée** : valeurs de jeu, non sourcées.
- Les exemples chiffrés de chaque fiche sont **inventés et arrondis** pour faire comprendre : ils ne sont pas des taux officiels.

Toute valeur de jeu non sourcée reste signalée dans le code par `VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER` (voir `docs/PARAMETRES-A-RECONFIRMER.md`).
