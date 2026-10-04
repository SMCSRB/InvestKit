# Immobilier réel : étapes 1 et 2 (préparation, puis données)

*4 octobre 2026. Suite de `docs/analyse-carte-immobiliere-reelle.md`. Rien ne change pour les joueurs : aucune page, aucune règle, aucune base.*

> **Mise à jour du 4 octobre 2026 (soir) : voir la fin du document.** Les DVF 2014 à 2020 n'existent plus sur les sites officiels : l'Immobilier réel part de **2021**, sans aucune source non officielle. Les passages ci-dessous qui parlent de 2014 à 2022 sont l'état de départ.

## Décisions d'Andreja (4 octobre 2026)
1. **Fond de carte** : contours de communes en **SVG d'abord** (gratuit, aucun service extérieur). MapLibre seulement si le SVG limite vraiment.
2. **Douze villes** : Paris, Lyon, Marseille (par arrondissement), Bordeaux, Toulouse, Nantes, Lille, Montpellier, Nice, Rennes, Dijon, Saint-Étienne (`backend/src/data/realEstate/dvf/cities.ts`).
3. **Parties actuelles** : on garde le catalogue fictif jusqu'à la refonte. Si de vrais joueurs arrivent avant, on décidera d'une liquidation à valeur conservée (comme la migration M1).
4. Seules les étapes 1 et 2 sont lancées, pour vérifier que les vraies données tiennent avant de s'engager sur la carte.

## Étape 1 : préparation
- **Politique de sécurité du site** : le SVG est servi par notre site, donc **aucun changement** (pas d'adresse de tuiles à autoriser). Ce sera à revoir seulement si MapLibre arrive.
- **Aucune fuite d'adresse IP** vers un tiers avec un fond SVG : rien à ajouter à la politique de confidentialité.
- **Prototype de carte** : non fait, volontairement. Les vrais contours de communes ne se téléchargent pas depuis cette session (réseau fermé), et un prototype avec de faux contours ne prouverait rien. Il se fait à l'étape 5, quand les contours auront été récupérés.
- **Liste des sources et licences** : voir le tableau ci-dessous.

| Donnée | Source | Licence | Mention à afficher | Certitude |
|---|---|---|---|---|
| Ventes (DVF géolocalisées) | DGFiP via data.gouv.fr | Licence Ouverte 2.0 | « Source : DGFiP, Demandes de valeurs foncières » + date de dernière mise à jour | Licence **sûre** ; adresse des fichiers **connue, non revérifiée** (le script de téléchargement signale tout fichier introuvable) |
| Contours des communes et arrondissements | Etalab / IGN (Admin Express ou contours simplifiés de geo.api.gouv.fr) | Licence Ouverte 2.0 **[à vérifier pour le jeu exact choisi]** | « Source : IGN / Etalab » | **Incertain** : je n'ai pas pu ouvrir la fiche. Vérifier aussi que les **arrondissements** de Paris, Lyon, Marseille existent dans le jeu choisi |
| Loyers (Carte des loyers) | Ministère / ANIL | Licence Ouverte 2.0 | « Source : Ministère de la Transition écologique, ANIL, Carte des loyers » | Sûre (étape 4) |
| Taxe foncière, zones tendues | DGFiP, textes officiels | **[à vérifier]** | à définir | Incertain (étape 4) |
| Contours issus d'OpenStreetMap | : | ODbL (partage à l'identique) | : | **À éviter** : obligations plus lourdes que la Licence Ouverte |

**Point de vigilance (à faire relire par quelqu'un de compétent)** : DVF est ouvert, mais il contient des **adresses de ventes réelles**. Même si la loi l'autorise, afficher l'adresse exacte d'une vraie vente à des joueurs peut gêner les personnes concernées. **Proposition** : n'afficher que le quartier, la surface, le type et le prix (jamais le numéro et la rue) ; garder les coordonnées en interne. À confirmer avant l'étape 3.

## Étape 2 : pipeline de données hors ligne
Deux commandes, à lancer **par Andreja**, jamais automatiques. Aucune base, aucun secret, seul `files.data.gouv.fr` est contacté pour le téléchargement.

1. `npm --prefix backend run immo:download-dvf -- --from 2014 --to 2022` : un fichier par commune (ou arrondissement) et par année dans `backend/data/dvf-brut/AAAA/CODE.csv` (ignoré par git). `--dry` affiche les adresses sans rien télécharger ; les fichiers déjà là sont gardés. Les fichiers introuvables sont listés : ce serait un code commune ou une adresse à corriger.
2. `npm --prefix backend run immo:import-dvf -- --check` : nettoie, calcule et affiche le **rapport qualité** sans rien écrire. Sans `--check`, écrit `backend/data/dvf-marche.json` (une ligne par quartier, type de bien et mois).

**Nettoyage** : ventes simples seulement (un seul logement ; ni VEFA, ni échange, ni multi-logements) ; surface 9 à 400 m², prix 10 000 euros et plus, 500 à 40 000 euros du m² ; doublons retirés ; valeurs aberrantes écartées (hors de 0,35 à 3 fois la médiane de la commune, du type et de l'année, seulement s'il y a au moins 20 ventes).
**Marché** : médiane **glissante sur 12 mois** (avec quartiles) par quartier, type de bien et mois ; au moins **10 ventes**, sinon repli sur la **ville entière** (marqué `ville`), sinon **aucun** (jamais de chiffre inventé).
**Aucune fuite du futur** : le mois M n'utilise que des ventes datées au plus tard à la fin de M ; un test ajoute des ventes futures et vérifie que rien d'antérieur ne bouge.
**Rapport** : ventes par ville et type, part de mois fiables / en repli / sans médiane, sauts de plus de 15 % d'un mois à l'autre, et pour chaque année de départ combien de villes ont des médianes fiables en janvier.

### Ce qui est vérifié, et ce qui ne l'est PAS
- Vérifié (`backend/tests/dvfPipeline.test.ts`, 15 tests) : lecture CSV, chaque règle de nettoyage, fenêtre de 12 mois, repli, non-fuite du futur, les 12 villes (20, 9 et 16 arrondissements, pas d'Alsace-Moselle), et le script de bout en bout sur des fichiers **fabriqués**.
- **Non vérifié : les vraies données.** Le réseau de cette session est fermé, je n'ai téléchargé aucun fichier DVF. « Les vraies données tiennent-elles ? » ne se saura qu'après tes deux commandes : le rapport répondra (villes sans vente, années de départ trop minces, quartiers en repli). Risques déjà prévisibles : **2014 maigre** (la fenêtre de 12 mois est incomplète en janvier 2014), petits arrondissements (Paris 1er à 4e, Lyon 1er) souvent en repli sur la ville, codes communes (écrits de mémoire) à confirmer par le téléchargement.

## Mise à jour : années 2014 à 2020 (résultat réel du téléchargement)
Andreja a lancé `immo:download-dvf` sur le serveur : **2021 et 2022 téléchargés** (54 fichiers par année, arrondissements compris) ; **2014 à 2020 introuvables** (HTTP 404 pour toutes les communes). L'adresse « par commune » n'existe donc que pour 2021 et 2022. Pour les années plus anciennes, la page cadastre.data.gouv.fr/dvf proposerait des fichiers **par année pour toute la France** (130 à 430 Mo) : **non confirmé**, je n'ai pas pu ouvrir la page.

Le téléchargement a été refait ainsi :
- **Rien n'est deviné.** Pour chaque année, le script essaie des adresses dans l'ordre (fichier par commune, puis par département, puis national ; ou **ton adresse exacte avec `--url`**, essayée en premier) et écrit pour **chacune** le code HTTP ou l'erreur réseau. Seule l'adresse « par commune » est marquée confirmée ; les autres sont `[à vérifier]`. Si rien ne répond, l'année est notée « échec », le script **continue avec les années suivantes** et le rapport (affiché et écrit dans `backend/data/dvf-rapport-telechargement.txt`) liste **les adresses à vérifier**.
- **Gros fichiers filtrés au fil de l'eau** : le fichier national ou départemental n'est **jamais enregistré ni chargé en entier** (il traverse le programme par morceaux, décompression comprise). Seules les lignes utiles des 54 codes sont gardées (vente ; appartement, maison, dépendance, local d'activité ; surface, prix, date, code commune ou arrondissement, parcelle, lots, pièces, coordonnées), dans `dvf-brut/AAAA/CODE.csv`, écrits via un fichier temporaire. Comme rien de volumineux n'est écrit, il n'y a **rien à supprimer** ensuite.
- **Si tu télécharges toi-même le fichier** (navigateur ou `wget`) : `npm --prefix backend run immo:download-dvf -- --file chemin/du/fichier.csv.gz --year AAAA`. Le fichier est filtré, **jamais supprimé ni modifié** par le script.
- **2021 et 2022 ne sont pas retéléchargés** : un fichier déjà présent n'est jamais réécrit, et une année complète ne fait aucune requête.
- **Formats gérés** (testés avec des fichiers fabriqués dans chaque format) : DVF Etalab / géolocalisées (virgule, dates ISO, code commune sur 5 caractères) et **fichier brut de la DGFiP** (séparateur « | », date JJ/MM/AAAA, virgule décimale, code commune sur 3 chiffres + département, colonnes avec accents et espaces, pas d'identifiant de mutation). Séparateur détecté (`,` `;` `|` tabulation), encodage UTF-8 ou latin1 détecté sur **tout** le fichier (pas seulement le début), zéro de tête perdu rétabli (6088 → 06088), arrondissements de Paris, Lyon, Marseille compris. Si une colonne indispensable manque, l'adresse est signalée avec **la liste des colonnes trouvées**, sans rien écrire.
- **Limite du format brut** : il n'a pas d'identifiant de mutation ; on regroupe les lignes sur date + commune + valeur. Deux ventes distinctes au même prix le même jour dans la même commune sont alors **rejetées** (« plusieurs logements »), sans fausser les médianes.
- Nouveau rejet : un logement vendu **avec un local d'activité** (le prix ne dit rien du logement).

### Rapport qualité par année et par ville
`npm --prefix backend run immo:import-dvf -- --check` affiche maintenant, en plus du reste : le **nombre de ventes par année et par ville** (un « * » marque une année maigre : plus de la moitié des quartiers sous 10 ventes sur l'année), **les quartiers sous 10 ventes par année**, les **années sans aucune vente lue** et les années maigres pour au moins trois villes. L'import lit tout format reconnu, y compris tes fichiers 2021 et 2022 déjà là.

## Constats réels et état d'avancement (4 octobre 2026, soir)
**Résultat du téléchargement et du rapport qualité (lancés par Andreja sur la copie de test).**
- **2021 à 2025** téléchargés pour les 54 codes (communes et arrondissements) : de 2 400 à 33 000 ventes retenues par ville et par an. Les arrondissements fonctionnent très bien.
- **2014 à 2020 n'existent plus** sur les sites officiels (le jeu DGFiP de data.gouv.fr et celui d'Etalab/geo-dvf ne contiennent que 2021 à 2025 ; la page cadastre.data.gouv.fr/dvf ne donne plus de lien).
- **Décision d'Andreja : l'Immobilier réel part de 2021, aucune source non officielle.** Le téléchargement des années anciennes (adresses à essayer, filtrage en continu, formats bruts) reste dans le code mais ne servira que si une source officielle réapparaît ; il est inoffensif (il écrit un rapport « échec »).

**Rapport qualité corrigé.** Le pourcentage « X % des mois sans médiane fiable » comptait les années absentes (7 sur 12 = 58 %, identique partout). Il se calcule maintenant **uniquement sur les années présentes**, et le rapport affiche à part « Années absentes : 2014 à 2020 ». Quand aucun quartier n'est sous 10 ventes, le rapport le dit explicitement. Il affiche aussi un rappel sur les « mois de chauffe » (janvier à novembre de la première année : la fenêtre de 12 mois n'est pas encore pleine). La période du fichier de médianes commence à la première année présente.

**Étape 3 : prête, NON activée.**
- Migration 057 : `immo_dvf_imports` (journal des imports, source « dvf », somme de contrôle) et `immo_dvf_market` (médiane, quartiles, nombre de ventes, repli sur la ville ou non, par quartier, type de bien et mois). **Aucune colonne d'adresse ni de coordonnées** (un test le vérifie dans la base).
- `npm --prefix backend run immo:load-dvf` : **simulation par défaut** (valide le fichier, n'ouvre aucune base) ; `--apply` n'écrit que si la base visée finit par « _test » (sinon refus avant toute connexion) ; rejouable (le même fichier n'est jamais importé deux fois). Le fichier est lu **strictement** : un seul quartier inconnu, mois futur, prix incohérent, doublon ou seuil de ventes non respecté fait **refuser tout le fichier**.
- **Règle d'or testée** : le mois M n'utilise que des ventes datées au plus tard à la fin de M ; en plus, à la date D du joueur, le service ne lit que le **dernier mois entièrement passé** (jamais le mois de D, qui contient des ventes postérieures à D).
- **Jamais de rue ni de numéro** : le pipeline ne lit aucune colonne d'adresse (test sur le code), les tables n'en ont pas, et le prix exposé est une liste fermée de champs (quartier lisible comme « Paris 11e », type de bien, mois, nombre de ventes, prix au m²). Les coordonnées des fichiers bruts restent sur le serveur, hors base.
- **Activation** : `DVF_MARKET_ENABLED = false`, et un test vérifie qu'aucun moteur ni aucune route n'importe le service. Rien ne change pour les joueurs tant que le point « horloge » n'est pas validé : voir `docs/analyse-immobilier-reel-et-horloge.md`.

**Points restants**
1. **Décision horloge** (options A à E, recommandation A) : `docs/analyse-immobilier-reel-et-horloge.md`.
2. **Licence des contours de communes et arrondissements** (Etalab / IGN) : jeu exact non vérifié, présence des arrondissements à confirmer ; pas d'OpenStreetMap.
3. **Loyers** : la Carte des loyers existe pour 2018 et 2022 à 2025, donc 2021 est à estimer (marqué comme tel) ; taxe foncière et zones tendues : licence à vérifier.
4. **Relecture juridique** (quelqu'un de compétent) : adresses de ventes réelles dans DVF, absence d'identification de personnes, mentions de source (« DGFiP, Demandes de valeurs foncières », date de mise à jour).
5. **Équilibrage banque** avec les vrais prix de 2021, et sous-décision sur les mois de chauffe de 2021.
6. **Fin du jeu** : les DVF finissent en 2025 et se mettent à jour par semestre ; l'Immobilier réel fixe la fin pour tous si on garde la règle « plus petit plafond des domaines ».
