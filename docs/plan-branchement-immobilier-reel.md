# Plan : brancher l'Immobilier réel au moteur du jeu (6 petites PR)

Validé par Andreja le 6 octobre 2026. **Règle commune** : chaque PR est fusionnée seule, tous les drapeaux restent **désactivés** (`RENT_MARKET_ENABLED`, `PROPERTY_TAX_ENABLED`, `DVF_MARKET_ENABLED`) jusqu'à la PR 6, et **rien n'est activé sur le vrai site** sans l'accord explicite d'Andreja. Ce qui n'a pas de source reste « VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER ».

| PR | Contenu | Garde-fou |
|---|---|---|
| 1 | **Loyer ANIL d'une annonce** : série selon le bien (T1-T2, T3+, maisons ; parking : aucune), loyer mensuel = loyer au m² × surface, fourchette, mention de source, rendement brut avec le prix au m² (`engine/immo/listingRent.ts`, `services/listingRentService.ts`) | Aucun appel depuis le moteur (test de garde) ; pas de loyer = `null` |
| 2 | **Rentabilité et mentions** : `decorateListing` accepte un loyer réel ; sans loyer, **aucune rentabilité** (« Rentabilité non disponible ») ; sinon rendement brut indicatif et mention ANIL à l'écran | Sans loyer réel, le comportement actuel est inchangé |
| 3 | **Annonces issues des prix DVF** : une source de catalogue pour les 12 villes réelles (prix = médiane DVF de la zone × surface du type de bien ; loyer ANIL de la commune ; charges = valeurs de jeu marquées) ; la date de jeu = 1er janvier de l'année (dernier mois entièrement passé) | Désactivée par `DVF_MARKET_ENABLED` ; frise limitée à la période couverte par les données (aucun avant-2022 pour les loyers) |
| 4 | **Taxe foncière réelle** : taux Terralyse de la commune × base cadastrale **estimée et signalée** ; retrait de `propertyTax` des valeurs de jeu | `PROPERTY_TAX_ENABLED` ; avant la première année importée : valeur de jeu marquée |
| 5 | **Notaire par département** dans le calcul d'achat (ancien) | Neuf inchangé (2,5 %) ; seulement avec la source réelle |
| 6 | **Activation sur la copie de test seulement** : drapeaux lus dans la configuration d'environnement (désactivés par défaut), checklist pas à pas pour Andreja | Aucune activation sur `~/InvestKit` |

**Décisions d'architecture** (modifiables par Andreja) : l'IRL réel est déjà branché à la révision des loyers (PR séparée). Les annonces réelles sont calculées à une date par an (1er janvier) comme le catalogue actuel (interface par année) ; le loyer, le prix et la taxe sont ceux connus à cette date, jamais un futur.
