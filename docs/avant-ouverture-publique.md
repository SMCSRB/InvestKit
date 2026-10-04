# À faire avant l'ouverture publique

Liste des points à régler **avant** d'ouvrir le site au public (hors paramètres chiffrés, qui sont dans `docs/PARAMETRES-A-RECONFIRMER.md`). Ajouter ici tout point bloquant décidé en cours de route.

## Licence des données de marché Crypto (décision d'Andreja, 4 octobre 2026)
- [ ] **Lire les conditions exactes de data.binance.vision** (pas seulement des résumés) : usage commercial, plan **Pro payant**, redistribution (chandeliers bruts ou courbes seulement), conservation des données.
- [ ] **Demander un accord écrit à Binance** (ou la licence entreprise), **ou changer de source** de cours avec une licence claire (pistes dans `docs/analyse-scenarios-et-parties.md`, chapitres 4.0 et 4.0 bis).
- Cela concerne **aussi BTC, ETH, BNB, XRP et SOL, déjà importés** sur la copie de test.
- **Aucun nouvel import** (LUNA, UST, FTT, lots 1 à 3) tant que ce point n'est pas tranché. Terra/Luna et FTX restent « bloqués : données manquantes ».

## Autres points déjà identifiés
- [ ] Source de **cours réels pour la Bourse** (aucun scénario Bourse gratuit avant).
- [ ] Licences et sources de l'Immobilier réel (DVF : Licence Ouverte 2.0 ; contours de zones à choisir : licence à vérifier).
- [ ] Relire sur leurs pages d'origine les faits cités dans les scénarios (étiquette **[sûr]** = résumé de recherche, page à relire).
- [ ] **Loyers de l'Immobilier** : aujourd'hui des valeurs de jeu. Avant d'activer les prix DVF réels, éviter une rentabilité qui mélange un prix réel et un loyer de jeu : afficher « loyer : valeur de jeu », recaler les loyers de base, ou sourcer de vrais loyers (licence à vérifier).

- [ ] **Carte des loyers (ANIL)** : licence et attribution **confirmées** (6 octobre 2026) ; reste à lire la page de chaque millésime (trimestre, noms des fichiers et colonnes, arrondissements) avant l'import (voir `docs/loyers-anil-fiche-source.md`).
- [ ] **Frais de notaire par département** : relire le tableau officiel des droits de mutation, la date de la hausse à Paris et dans le Nord, le barème des émoluments, la CSI (voir `docs/frais-notaire-fiche-source.md`).
- [ ] **Frais de notaire par département** : relire le tableau officiel des droits de mutation, la date de la hausse dans le Nord (1er mai 2025 d'après les notaires : à confirmer sur la délibération du département), le barème des émoluments, la CSI (voir `docs/frais-notaire-fiche-source.md`).
- [ ] **IRL (Insee)** : lire les conditions de réutilisation et le format du CSV de la série, confirmer les dates de publication (voir `docs/loyers-irl-fiche-source.md`, lignes 8 à 10).
- [ ] **Fiscalité des revenus fonciers** : relire sur impots.gouv.fr l'abattement et le plafond du micro-foncier, le plafond du déficit foncier, les prélèvements sociaux (voir `docs/fiscalite-fonciere-fiche-source.md`), puis décider du branchement au moteur.
- [ ] **IRL réel branché aux loyers** : **importer l'IRL de l'Insee** (`immo:import-irl` puis `immo:load-irl`) sur chaque base avant l'ouverture, sinon aucun loyer n'est révisé ; relire le bouclier de 3,5 % (juillet 2022 à juin 2024) et le jour de publication (16 du mois suivant).
- [ ] **Taxe foncière (Terralyse)** : licence et attribution **confirmées** (6 octobre 2026) ; reste à confirmer au premier import les noms de colonnes, la présence de Paris, Lyon et Marseille, « taux intercommunal vide = 0 », et à comparer quelques taux avec la DGFiP, source primaire (voir `docs/taxe-fonciere-fiche-source.md`).
- [ ] **Fiscalité des revenus fonciers : à revérifier sur une page officielle** (service-public.gouv.fr, impots.gouv.fr, urssaf.fr) : le **plafond de déficit foncier de 10 700 €** imputable sur le revenu global ; le **report du déficit sur 10 ans** ; le **taux de prélèvements sociaux de 17,2 %** sur les revenus fonciers (**taux modifié récemment ?**). Voir `docs/fiscalite-fonciere-fiche-source.md`.
