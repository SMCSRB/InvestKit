# Immobilier réel : étapes 1 et 2 (préparation, puis données)

*4 octobre 2026. Suite de `docs/analyse-carte-immobiliere-reelle.md`. Rien ne change pour les joueurs : aucune page, aucune règle, aucune base.*

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
