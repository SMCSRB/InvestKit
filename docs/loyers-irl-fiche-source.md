# Fiche de source : IRL (indice de référence des loyers, Insee)

**À lire par Andreja sur la page officielle AVANT tout import.** Mon environnement ne peut pas ouvrir `insee.fr` ni `data.gouv.fr` (accès réseau bloqué : testé le 5 octobre 2026) ; tout ce qui suit vient de **résumés de recherche** et reste **à confirmer**.

| À vérifier sur la page de la série | Ce que disent mes sources (non confirmé) | Doute |
|---|---|---|
| Page | [Insee, série 001515333](https://www.insee.fr/fr/statistiques/serie/001515333) (aussi : série 001515334 pour la version « indice pour la révision d'un loyer d'habitation ») | L'identifiant exact de la série à télécharger : `IRL_SERIES_ID` (`backend/src/config/irlRules.ts`) |
| Contenu | IRL trimestriel, publié chaque trimestre (mi-janvier, mi-avril, mi-juillet, mi-octobre), série complète depuis 1999 | Jour exact de publication : le code suppose le **16 du mois suivant** (`IRL_PUBLICATION_DAY`, hypothèse prudente à confirmer) |
| Dernière valeur | un résumé cite T2 2026 = 148,37 (+1,15 % sur un an) | À comparer avec le rapport de `immo:import-irl` (il affiche les 3e trimestres récents) |
| **Licence / réutilisation** | Données Insee sous Licence Ouverte (mention de la source et de la date) | **À confirmer sur la page « conditions d'utilisation »** : usage commercial permis ? formule de citation ? |
| **Fichier** | CSV de la série (bouton « Télécharger ») : quelques lignes d'en-tête (libellé, identifiant de série, mise à jour) puis une ligne par trimestre (période, valeur, code) | **Format supposé** : le script refuse le fichier et le dit si aucune période « AAAA-Tn » n'est lisible, s'il manque un trimestre, ou si une valeur est suspecte |

## Procédure (rien n'est téléchargé par le jeu)
1. Lire la page (tableau ci-dessus), noter tout écart.
2. Télécharger **toi-même** le CSV dans `backend/data/irl-brut/` (dossier ignoré par git).
3. `npm --prefix backend run immo:import-irl -- --file backend/data/irl-brut/<fichier>.csv --check` : compare les 3e trimestres récents avec la page, puis sans `--check` pour écrire `backend/data/irl-insee.json`.
4. `npm --prefix backend run immo:load-irl -- --file backend/data/irl-insee.json` (simulation), puis `-- --apply` sur la copie de test seulement.

## À quoi sert l'IRL réel dans le jeu (décision d'Andreja, 5 octobre 2026)
- **Recalage du loyer d'avant le 3e trimestre du premier millésime** : le loyer ANIL 2022 (3e trimestre) est utilisé dès janvier 2022 ; avec l'IRL, il est **recalé sur l'évolution réelle de l'IRL** entre la date de jeu (dernière valeur publiée) et le 3e trimestre 2022 : `loyer × IRL(date de jeu) ÷ IRL(3e trimestre 2022)`, fourchette comprise, et la mention le dit (« Loyer recalé sur l'évolution réelle de l'IRL entre la date de jeu et le 3e trimestre 2022 (−x,xx %). »). Sans IRL importé : loyer du millésime tel quel, mention d'approximation seule.
- **Entre deux millésimes : loyer constant** (un seul changement par an, au 30 septembre), jamais de valeur inventée ni interpolée.
- **Pas encore branché au moteur actuel** (`IRL_ENABLED = false`) : le catalogue fictif garde sa **série fictive** de révision annuelle des baux tant que les annonces réelles ne sont pas branchées (brancher l'IRL réel sur la révision des baux changerait les loyers du jeu actuel ; à décider avec le branchement). Le bouclier de 3,5 % (plafond légal de la hausse des loyers de 2022 à 2024) **n'est pas modélisé**.

## Ce que tu dois relire toi-même (aucune page n'est ouvrable depuis ma session)
### Carte des loyers (ANIL) : `docs/loyers-anil-fiche-source.md`
1. **Licence** : le champ « licence » de la page du millésime : est-ce bien « Licence Ouverte 2.0 » ? Aucune restriction d'usage commercial ?
2. **Attribution** : la phrase exacte à citer (recopie-la dans `RENT_ATTRIBUTION`, fichier `backend/src/config/rentMarketRules.ts`).
3. **Trimestre de référence** de chaque millésime (3e trimestre ?) et **date de publication** : elles fixent le 30 septembre.
4. **Noms des fichiers et des colonnes** des quatre séries (appartements, T1-T2, T3 et plus, maisons).
5. **Arrondissements** : Paris (75101 à 75120), Lyon (69381 à 69389), Marseille (13201 à 13216) y figurent-ils ?
6. **Pages des millésimes 2022, 2023 et 2024** : existent-elles, avec la même méthode ? (changement de méthode entre deux millésimes ?)
7. **Définition de la fourchette** (bas / haut) : intervalle de prédiction ou autre ?
### IRL (Insee) : ce document
8. **Conditions de réutilisation** de l'Insee (usage commercial, citation).
9. **Identifiant de la série** à télécharger et **format du CSV**.
10. **Dates de publication** des derniers trimestres (pour remplacer l'hypothèse du 16 du mois).
