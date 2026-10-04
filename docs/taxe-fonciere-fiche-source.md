# Fiche de source : taxe foncière (taux par commune, jeu de données Terralyse)

**Source retenue (trouvée et relue par Andreja, 6 octobre 2026)** : data.gouv.fr, jeu « Taxe foncière par commune, taux et charge par local, 2022 à 2025 », publié par **Terralyse**, **Licence Ouverte 2.0**, **5 206 communes**, attribution **« Source : Terralyse »**. Je n'ai toujours pas pu ouvrir la page ni le fichier depuis ma session (accès réseau bloqué) : **le format des colonnes ci-dessous est SUPPOSÉ** et sera confirmé au premier import (le script refuse et affiche les colonnes trouvées s'il diffère).

| Point | Ce qui est confirmé (Andreja) | Ce qui reste à confirmer |
|---|---|---|
| Éditeur et licence | Terralyse ; Licence Ouverte 2.0 ✓ | — |
| Attribution | « Source : Terralyse » ✓ (`PROPERTY_TAX_ATTRIBUTION`) | — |
| Couverture | 5 206 communes ✓ | **Paris, Lyon et Marseille y figurent-elles (75056, 69123, 13055) ?** Le script le dit : il refuse le fichier et nomme la commune absente |
| Contenu | Sépare **taux communal**, **taux intercommunal** et **TEOM** ✓ ; années 2022 à 2025 ✓ | **Noms exacts des colonnes** (liste des noms acceptés : `REI_COLUMNS`, `backend/src/config/propertyTaxRules.ts`) ; une ligne par commune et par année (sinon refusé) |
| Taux global | **commune + intercommunalité** ✓ (décision d'Andreja) ; la **TEOM est à part** (récupérable sur le locataire, jamais ajoutée) ✓ | Un taux intercommunal **vide** compte 0 et est **signalé** dans le rapport (cas probable de Paris) : vérifier sur la page |
| Source primaire | **La donnée brute de la DGFiP reste à vérifier** si on veut la source primaire | Comparer quelques communes (taux globaux) avec la DGFiP / la fiche d'avis d'imposition |

## Procédure (rien n'est téléchargé par le jeu)
1. Télécharger **toi-même** le CSV dans `backend/data/taxe-fonciere-brut/` (dossier ignoré par git).
2. `npm --prefix backend run immo:import-taxe-fonciere -- --file backend/data/taxe-fonciere-brut/<fichier>.csv --check` : rapport (nombre de communes du fichier, 5 206 attendues ; Paris, Lyon, Marseille présentes ; taux communal + intercommunal = global et TEOM pour chaque ville ; liste des taux intercommunaux vides). Envoie-moi le rapport, ou les colonnes trouvées si le fichier est refusé.
3. Sans `--check` : écrit `backend/data/taxe-fonciere-terralyse.json`. Puis `npm --prefix backend run immo:load-taxe-fonciere -- --file backend/data/taxe-fonciere-terralyse.json` (simulation) et, sur la copie de test seulement, `-- --apply` (migration 061 incluse).

## Ce qui est réel et ce qui est ESTIMÉ
- **Réel** : le taux global voté (communal + intercommunal), par année ; la TEOM est stockée à part.
- **ESTIMÉ (valeur de jeu)** : la **base cadastrale** du bien. Elle n'est pas publiée par bien : on la remplace par `surface × 30 €/m²` (`CADASTRAL_BASE_NET_EUR_PER_SQM`), **la même pour toutes les villes**. **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER.** La revalorisation annuelle des bases n'est pas modélisée. La taxe affichée devra dire : « taux communal réel, base cadastrale estimée ».
- **Date d'usage** : le taux d'une année est utilisable à partir du **1er octobre** (`TAX_RATE_USABLE_FROM`, VALEUR DE JEU prudente) ; entre deux années il reste constant ; **avant la première année importée, aucun taux** (la taxe reste une valeur de jeu marquée).

## Pas branché au jeu
- `PROPERTY_TAX_ENABLED = false` : le catalogue fictif garde sa taxe de jeu (`taxPerSqm`) et la fiche d'annonce marque la taxe foncière « valeur de jeu ». Un test garde que ni moteur ni route n'importe ces modules.

## À relire par Andreja (liste précise)
1. **Noms des colonnes** du CSV (code commune, année, taux communal, taux intercommunal, TEOM) : à lire en ouvrant le fichier, ou dans le message d'erreur du script.
2. **Paris, Lyon, Marseille** présentes au niveau commune (le script le dit).
3. Que le taux communal **inclut déjà** la part qui était celle du département (transférée aux communes depuis 2021).
4. Que **taux intercommunal vide = 0** pour les communes concernées (Paris notamment).
5. **Source primaire** : comparer quelques taux globaux avec la DGFiP.
