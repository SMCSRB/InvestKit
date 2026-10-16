# Analyses du lot 2 (sans code)

*3 octobre 2026. Aucun fichier du site n'a été modifié : ce sont des documents de réflexion pour que tu choisisses avant que je code.*

| Sujet | Document |
|---|---|
| 6a. Badges et XP | [6a-badges-et-xp.md](6a-badges-et-xp.md) |
| 6b. 1 InvestCoin = 1 € | [6b-un-investcoin-un-euro.md](6b-un-investcoin-un-euro.md) |
| 6c. Horloge unique | [6c-horloge-unique.md](6c-horloge-unique.md) |
| 6g. Tableau de bord | [6g-tableau-de-bord.md](6g-tableau-de-bord.md) |

**Règle d'engagement sain (valable pour toutes les propositions)** : aucune fausse urgence, aucune culpabilisation, aucune pression pour garder une série ; les récompenses sont décidées et plafonnées par le serveur, tracées dans le registre, sans gain en boucle.

## Tableau de priorités

| Sujet | Effort | Risque | Valeur | Dépend de | Remarque |
|---|---|---|---|---|---|
| **6b-lite** (PR 1 à 3 : config d'économie unique, corrections de textes « cours réels », règle d'affichage) | ~4 j | Faible | Élevée (honnêteté, clarté) | rien | À faire en premier |
| **6a-début** (PR 1 à 3 et 5 : XP serveur, niveaux, badges serveur, vie privée du profil) | ~9 j | Faible à moyen | Élevée (rétention saine, éducation) | rien | Indépendant des horloges |
| **6g-début** (G1, G2, G4 : historique, composant, disposition) | ~5 j | Faible | Moyenne | rien | Prépare la suite, invisible pour le joueur |
| **6c** Horloge unique (9 PR) | ~27 j | **Élevé** (ordres, prêts, loyers, classements) | **Très élevée** (supprime l'avantage d'info entre domaines) | 6b-lite | Migration « neutre en valeur » |
| **6b-fin** (PR 5 et 6 : nouvelles valeurs, migration des soldes) | ~11 j | **Élevé** (touche tous les soldes) | Élevée | 6c (cutover commun) | À déployer avec la migration 6c |
| **6g-fin** (G3, G5, G6) | ~7,5 j | Moyen, G6 élevé | Élevée | 6c (G3 juste), 6b (G6) | |
| 6a-fin (PR 4, 6, 7 : saisons, extras) | ~7 j | Faible | Moyenne | 6a-début | Facultatif |

**Total** ≈ 70 jours si tout est fait ; le premier bloc utile (6b-lite + 6a-début + 6g-début) ≈ 18 jours.

**Ordre conseillé** : 6b-lite → 6a-début → 6g-début → 6c → 6b-fin (cutover avec 6c) → 6g-fin → 6a-fin.
Raison : on commence par ce qui est sûr et indépendant, on prépare le terrain, puis on fait **une seule grosse bascule** (horloge + valeurs) pour ne déranger les joueurs qu'une fois.

## Décisions à prendre (questions simples, avec ma recommandation)

**Valeurs et monnaie (6b)**
1. *Capital de départ : 500 ou 10 000 InvestCoins ?* → **10 000** (Pro : +10 000), avec 1 🪙 = 1 €. Valeur de jeu non sourcée.
2. *Récompense quotidienne : garder la montée progressive (jusqu'à 340/jour) ou une valeur plate ?* → **10 🪙 plats, payés au plus 3 jours par semaine**, sans série à protéger.
3. *Crypto : cours en dollars. Convertir en euros ?* → **Oui**, avec le taux BCE du jour de jeu (option A).
4. *Migration des soldes : repartir au nouveau capital (M1) ou convertir proportionnellement (M2) ?* → **M1** : archiver le registre, repartir du nouveau capital, **garder les biens immobiliers**.
5. *Afficher les prix du bandeau de cours en InvestCoins ?* → **Oui**, devise d'origine en second ; le symbole € est réservé à l'argent réel.
6. *Corriger tout de suite les textes « cours réels » (glossaire, plafond PEA) ?* → **Oui**, c'est de l'honnêteté, sans risque.

**Horloge (6c)**
7. *Une seule horloge, avec pas +1 jour/semaine/mois/trimestre/an ?* → **Oui**, mode Accéléré d'abord ; lecture auto x1/x10/x100 avec pause, arrêt automatique avec récapitulatif.
8. *Dates de départ proposées : 2014, 2017, 2020, 2021, 2022 ?* → **Garder cette liste** ; plage commune = 2014 → dernier jour importé.
9. *Bourse : garder les prix annuels simplifiés (palier) ou acheter/importer des données journalières réelles ?* → **Palier annuel d'abord**, clairement affiché comme simplifié ; données réelles quand une source libre de droits est validée.
10. *Joueurs existants à dates différentes : comment migrer ?* → **M1 neutre en valeur** : on fixe la date commune et on revalorise sans gain ni perte.
11. *Mode Direct (temps réel) : maintenant ou plus tard ?* → **Plus tard**, après stabilisation de l'Accéléré et choix d'une source de données.

**Badges et XP (6a)**
12. *Profil privé : « Joueur anonyme » dans les classements ou masqué ?* → **Anonyme** (le joueur reste classé, sans nom ni photo) avec trois niveaux public / amis / privé.
13. *Séries (« streak ») ?* → **Non**. À la place « jours actifs » sans perte à l'arrêt, ni rappel culpabilisant.
14. *Reprendre les badges locaux existants ?* → **Oui**, recalculés à partir de faits serveur ; l'XP ancienne est importée une fois, sans perte.
15. *Afficher la rareté des badges ?* → **Seulement la vraie** (à partir de 50 joueurs) ; on supprime les pourcentages inventés.

**Tableau de bord (6g)**
16. *L'Immobilier dans le patrimoine global ?* → **Option C** : deux chiffres (financier, total), classement inchangé ; le total vient après 6b et 6c.
17. *Qui peut personnaliser son tableau de bord ?* → **Tous choisissent un modèle ; seul le plan Pro modifie librement.**
18. *Ordre de réalisation ?* → celui du tableau ci-dessus.

Je ne code rien tant que tu n'as pas répondu.
