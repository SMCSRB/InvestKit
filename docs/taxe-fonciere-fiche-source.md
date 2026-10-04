# Fiche de source : taxe foncière (taux communal réel, DGFiP)

**À lire par Andreja sur la page officielle AVANT tout import.** Mon environnement ne peut pas ouvrir `data.gouv.fr` ni `impots.gouv.fr` (accès réseau bloqué : testé le 5 octobre 2026) ; tout ce qui suit vient de **résumés de recherche** et reste **à confirmer**.

| À vérifier sur la page du jeu de données | Ce que disent mes sources (non confirmé) | Doute |
|---|---|---|
| Page | data.gouv.fr, jeu « Taxe foncière par commune, taux et charge par local, 2022 à 2025, millésime 2026 » (DGFiP) | Le titre exact et le lien du fichier à télécharger |
| Contenu | Taux de taxe foncière par commune et par année, et « charge par local » (montant moyen) | **Quelle colonne est le taux GLOBAL de taxe foncière bâtie** (commune + intercommunalité + syndicats…) ? Le script cherche : `taux_global_tfb`, `taux_tfb_global`, `taux_global_tfpb`, `taux_global_foncier_bati`, `taux_global_fb`, `taux_tfb` (liste dans `REI_COLUMNS`, `backend/src/config/propertyTaxRules.ts`) |
| **Licence** | Licence Ouverte 2.0 (mention de la source) | **À confirmer sur la page** : usage commercial permis ? formule de citation exacte à recopier dans `PROPERTY_TAX_ATTRIBUTION` |
| **Fichier** | CSV, une ligne par commune et par année | **Format supposé** : colonnes code commune, année, taux global. Si une colonne manque, le script **refuse** et affiche les colonnes trouvées ; il ne devine rien |
| Codes communes | Paris 75056, Lyon 69123, Marseille 13055 (communes entières, pas les arrondissements) ; autres villes : code INSEE habituel | Un code absent du fichier : le script refuse |
| Taxe d'enlèvement des ordures (TEOM) | Elle est **récupérable sur le locataire** (charges récupérables) : elle n'entre **pas** dans le coût du propriétaire | À confirmer ; le script n'importe aucune colonne TEOM |

## Procédure (rien n'est téléchargé par le jeu)
1. Lire la page (tableau ci-dessus), noter tout écart.
2. Télécharger **toi-même** le CSV dans `backend/data/taxe-fonciere-brut/` (dossier ignoré par git).
3. `npm --prefix backend run immo:import-taxe-fonciere -- --file backend/data/taxe-fonciere-brut/<fichier>.csv --check` : si le format n'est pas celui attendu, le script refuse et le dit ; sinon il affiche le taux de la dernière année pour chaque ville : **compare avec la page** et envoie-moi le rapport.
4. Sans `--check` : écrit `backend/data/taxe-fonciere-dgfip.json`. Puis `npm --prefix backend run immo:load-taxe-fonciere -- --file backend/data/taxe-fonciere-dgfip.json` (simulation) et, sur la copie de test seulement, `-- --apply`.

## Ce qui est réel et ce qui est ESTIMÉ
- **Réel** : le taux global voté de la commune, par année.
- **ESTIMÉ (valeur de jeu)** : la **base cadastrale** du bien (valeur locative cadastrale revalorisée, réduite de 50 %). Elle n'est pas publiée par bien : on la remplace par `surface × 30 €/m²` (`CADASTRAL_BASE_NET_EUR_PER_SQM`), **la même pour toutes les villes** (on n'invente aucune différence entre communes). **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER.** La revalorisation annuelle forfaitaire des bases n'est **pas** modélisée. La taxe affichée devra donc dire : « taux communal réel, base cadastrale estimée ».
- **Date d'usage** : le taux d'une année est utilisable à partir du **1er octobre** de cette année (`TAX_RATE_USABLE_FROM`, VALEUR DE JEU prudente) ; entre deux années il reste constant ; **avant la première année importée, aucun taux** : la taxe reste alors une valeur de jeu marquée.

## Pas branché au jeu
- `PROPERTY_TAX_ENABLED = false` : le catalogue fictif garde sa taxe de jeu (`taxPerSqm`) et la fiche d'annonce continue de marquer la taxe foncière « valeur de jeu ». Un test garde que ni moteur ni route n'importe ces modules. Le champ `propertyTax` ne sortira de la liste des valeurs de jeu (`engine/immo/dataSources.ts`) que le jour où une annonce réelle l'utilisera.

## À relire par Andreja (liste précise)
1. **Licence** du jeu de données et **phrase d'attribution** exacte.
2. **Nom de la colonne du taux global de taxe foncière bâtie** et de celles du code commune et de l'année.
3. Que le fichier contient bien **Paris, Lyon et Marseille au niveau commune** (75056, 69123, 13055).
4. Que le taux global **inclut déjà** la part qui était celle du département (transférée aux communes depuis 2021) et la part intercommunale.
