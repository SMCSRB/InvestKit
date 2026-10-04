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
- **Branché à la révision annuelle des loyers** (décision d'Andreja, 6 octobre 2026, `IRL_ENABLED = true`) ; **la série fictive est supprimée**. Règles (`backend/src/engine/immo/irl.ts`, `leaseRevision`) :
  - **Date de révision = anniversaire du bail** (jamais le premier mois), une fois par an.
  - **Trimestre de référence = dernier IRL PUBLIÉ au début du bail** (premier jour du mois de début). À chaque anniversaire, hausse = IRL de ce même trimestre cette année ÷ IRL de ce trimestre l'an dernier. Exemple : bail de mai 2025, référence T1 2025 ; anniversaire de mai 2026 : IRL T1 2026 ÷ IRL T1 2025. L'explication du relevé cite les deux trimestres.
  - **Aucune valeur inventée** : si l'IRL réel n'est pas importé, ou si une valeur manque ou n'est pas encore publiée, **aucune révision n'a lieu**, le loyer reste inchangé et le relevé le dit (« Indexation impossible cette année… rien n'est inventé »). **Il faut donc importer l'IRL de l'Insee (série complète depuis 1999) pour que les loyers évoluent.**
  - **Bouclier de 3,5 %** (modélisé, [à relire]) : pour une révision dont le mois d'anniversaire est entre **juillet 2022 et juin 2024**, la hausse est plafonnée à 3,5 % (métropole ; les 12 villes le sont) ; le relevé affiche l'indice réel et le plafonnement. Simplification : granularité au mois.
  - **Source officielle à relire (bouclier de 3,5 %)** : Légifrance, **loi n° 2022-1158 du 16 août 2022 portant mesures d'urgence pour la protection du pouvoir d'achat**, article 12 (plafonnement de la hausse de l'IRL à 3,5 % pour les révisions de loyer à partir du 3 juillet 2022) ; la prolongation jusqu'au **30 juin 2024** est citée **de mémoire** (texte de prolongation à retrouver sur Légifrance). Lecture simplifiée : service-public.gouv.fr, fiche « Révision du loyer d'un logement ». **À relire** : dates de début et de fin, taux de 3,5 %, application à la métropole seulement, et le fait que le plafond joue sur la hausse appliquée à la révision (et non sur l'indice publié).
  - Classe énergie F ou G : loyer gelé (règle inchangée). Variation négative : aucune baisse.

## Ce que tu dois relire toi-même (aucune page n'est ouvrable depuis ma session)
### Carte des loyers (ANIL) : `docs/loyers-anil-fiche-source.md`
1. ~~**Licence**~~ ✓ **Licence Ouverte 2.0, confirmée par Andreja le 6 octobre 2026.**
2. ~~**Attribution**~~ ✓ **« Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin »**, déjà dans `RENT_ATTRIBUTION`.
3. **Trimestre de référence** de chaque millésime (3e trimestre ?) et **date de publication** : elles fixent le 30 septembre.
4. **Noms des fichiers et des colonnes** des quatre séries (appartements, T1-T2, T3 et plus, maisons).
5. **Arrondissements** : Paris (75101 à 75120), Lyon (69381 à 69389), Marseille (13201 à 13216) y figurent-ils ?
6. **Pages des millésimes 2022, 2023 et 2024** : existent-elles, avec la même méthode ? (changement de méthode entre deux millésimes ?)
7. **Définition de la fourchette** (bas / haut) : intervalle de prédiction ou autre ?
### IRL (Insee) : ce document
8. **Conditions de réutilisation** de l'Insee (usage commercial, citation).
9. **Identifiant de la série** à télécharger et **format du CSV**.
10. **Dates de publication** des derniers trimestres (pour remplacer l'hypothèse du 16 du mois).
