# Sources de cours pour la Bourse : comparaison (note de préparation)

**Statut : note de réflexion. Rien n'est branché, aucune source n'a été contactée ni lancée.**
**Attention : cette note est rédigée de mémoire, sans avoir pu lire en ligne les conditions actuelles des fournisseurs. Chaque ligne « à confirmer » doit être vérifiée sur le site officiel du fournisseur (conditions d'utilisation et grille de prix du jour) avant toute décision.** Aucun prix n'est indiqué ici volontairement : ils changent et je ne les ai pas vérifiés.

## Pourquoi cette note
Aujourd'hui, les cours de la Bourse du jeu sont **annuels et simplifiés** (jeu de données pédagogique). Le point 15 de `docs/ROADMAP-v7.md` prévoit des cours **quotidiens réels** (bougies, plus bas de l'année pour les appels de marge). Avant d'importer quoi que ce soit, il faut une source dont la **licence autorise l'usage sur un site public**.

## Ce qui rend le sujet délicat pour InvestKit
1. **Stockage** : le jeu garde les séries de cours dans notre base (le joueur « voyage » dans le temps). Beaucoup de licences autorisent l'*affichage* mais interdisent de *conserver* ou *redistribuer* l'historique.
2. **Redistribution** : afficher des cours à des milliers de joueurs, c'est de la redistribution aux yeux de la plupart des fournisseurs, même gratuite.
3. **Différé** : un cours « en direct » exige en général une licence bien plus chère et des déclarations ; ici on veut seulement de l'**historique** (clôtures quotidiennes), ce qui est plus simple.
4. **Usage commercial** : l'abonnement Pro rend le site commercial ; les offres « personnelles » ou « non commerciales » ne conviennent donc pas.

## Les 3 pistes comparées

| Critère | A. Bourse officielle (Euronext, données historiques) | B. Fournisseur d'API financière commercial (type EOD Historical Data, Twelve Data, Financial Modeling Prep) | C. Sources gratuites grand public (Yahoo Finance, Stooq, exports de sites) |
|---|---|---|---|
| Nature | Données officielles de la place de cotation | Agrégateur : API + abonnement | Sites ouverts au public, sans contrat |
| Licence d'usage sur un site public | Oui, **sous contrat de licence** (à confirmer : catégorie « affichage », « redistribution », historique) | Oui, **selon le plan** : beaucoup distinguent usage personnel et usage commercial / affichage public (à confirmer plan par plan) | **Non** : conditions d'utilisation généralement réservées à un usage personnel, sans redistribution (à confirmer) |
| Coût | Payant, sur devis ou grille ; en général le plus cher (à confirmer) | Abonnement mensuel, souvent le plus accessible (à confirmer) | Gratuit, mais sans droit |
| Stockage de l'historique dans notre base | Se négocie dans la licence | Souvent limité ou interdit hors plan « redistribution » (à confirmer) | Interdit ou non prévu |
| Fiabilité / continuité | Très bonne, source primaire | Bonne ; dépend du fournisseur ; risque de changement de conditions | Aucune garantie, peut être coupé ou bloqué sans préavis |
| Couverture (CAC 40, ETF, historique long) | Excellente sur la place concernée | Large, avec ajustements dividendes/splits selon le fournisseur (à confirmer) | Variable, ajustements parfois faux |
| Délai de mise en place | Long (contrat) | Court (clé d'API) | Immédiat mais **risque juridique** |
| Risque pour le projet | Faible juridiquement, coût | Moyen : vérifier la clause de redistribution | **Élevé : à écarter** pour un site public |

## Ma lecture (à valider par Andreja)
- **C est à écarter** pour la production : ces sources conviennent pour tester en local, pas pour un site public avec un abonnement payant.
- **B est la voie la plus réaliste** pour démarrer, **à condition** de choisir un plan dont la licence couvre : usage commercial, **affichage au public**, **stockage de l'historique**. C'est la clause à demander par écrit au fournisseur avant de payer.
- **A est la référence** si le projet grandit ou si B refuse la redistribution ; plus long et plus cher.
- Alternative sans licence : **garder les cours fictifs calibrés** (état actuel) et améliorer seulement la granularité (mensuel au lieu d'annuel). C'est gratuit et sans risque, mais ce ne sont plus de vrais cours. Dans ce cas il faut le dire clairement dans l'interface (déjà le cas pour les données de démonstration).

## Questions à poser par écrit à un fournisseur (modèle)
1. Mon site affiche des clôtures quotidiennes historiques à des joueurs inscrits ; une partie des utilisateurs paie un abonnement. Quel plan me couvre ?
2. Ai-je le droit de **copier les séries dans ma base** et de les servir moi-même à mes utilisateurs ?
3. Y a-t-il une **limite de volume** (requêtes, nombre de titres) et une **attribution obligatoire** (mention de la source) ?
4. Que se passe-t-il si je **résilie** : dois-je supprimer les données déjà stockées ?
5. Les cours sont-ils **ajustés** (dividendes, divisions d'actions) ? Comment ?

## Ce que le code doit prévoir quand on choisira (sans le faire maintenant)
- Une interface de source comme pour l'Immobilier (`REAL_ESTATE_SOURCE=dvf`) : une variable de configuration et un script d'import, comme `npm run crypto:import`.
- La **mention de la source** affichée dans la page (comme `state.attribution` côté Crypto).
- Les données importées marquées « réelles » ; tant qu'aucun import n'a eu lieu, le jeu de démonstration reste étiqueté comme tel.
- Une valeur de jeu non sourcée éventuelle (frais, seuils) reste marquée `VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER`.

## Décision attendue
Choisir A, B ou « rester sur des cours fictifs améliorés », puis seulement après vérification écrite de la licence, lancer un import. **Rien n'est fait tant que cette décision n'est pas prise.**
