# Textes honnêtes : « simulé », pas « réel » ni « en direct »

Principe : le jeu rejoue des données **simplifiées, fictives ou historiques**. Aucun texte visible ne doit laisser croire à des cours réels, en direct, ou à une simulation « identique à la vraie vie ». Les règles s'**inspirent** du réel, en version simplifiée, et les pertes sont virtuelles.

## Ce qui a été corrigé
| Où | Avant | Après |
|---|---|---|
| Bandeau de cours (barre sous le haut de page) | « Marché », libellé accessible « Cours du marché » | Étiquette visible inchangée (« Marché », discrète, comme décidé au lot précédent) ; **« Données fictives »** seulement si les données le sont vraiment ; info-bulle et lecteur d'écran : « cours historiques rejoués à ta date de jeu : ils ne sont pas en direct » |
| Accueil du site, titre | « tout se passe comme dans la vraie vie, sauf les pertes » | « les règles s'inspirent de la vraie vie, en version simplifiée, et les pertes restent virtuelles » |
| Accueil, étape 3 | « Je simule comme dans la vraie vie » | « Je m'entraîne sur des règles inspirées du réel » |
| Accueil, fonctionnalités | « taux historiques … et les vrais risques » | « taux inspirés de l'histoire … et les risques à comprendre » (les taux du jeu sont fictifs, calés sur l'histoire) |
| Onglet Marché du tableau de bord | « arrivent avec leurs données réelles » | « ne sont pas disponibles pour l'instant : aucune source de données fiable n'est branchée » (on ne promet plus de données réelles) |
| Estimation d'un ordre Crypto | « le prix réel est celui de la date simulée » | « le prix de référence est celui de la date simulée » |
| Courtage de 0,5 % | présenté comme « plafond légal PEA en ligne » pour tout | plafond légal des ordres **en ligne sur PEA** (loi Pacte, décret n° 2020-95) ; repris pour le compte-titres **par simplification** (VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER) |

Déjà honnêtes (inchangés) : bandeau « DONNÉES FICTIVES » de la page Crypto, FAQ « D'où viennent les données de marché ? », « Cours historiques, rejoués à ta date de jeu (ils ne sont pas en direct) » sur l'onglet Marché, « Le mode temps réel n'est pas encore disponible ».

## Garde-fou
`backend/tests/textesHonnetes.test.ts` cherche dans les textes visibles (hors commentaires) les formulations « cours réels », « prix réels », « données réelles », « vrais cours », « marché réel », « en direct », « temps réel », « taux historiques », « comme dans la vraie vie ». Seules les phrases qui disent l'inverse sont admises (liste explicite dans le test).
