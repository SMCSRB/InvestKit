# Banque aux règles françaises (Immobilier et prêt personnel)

**Principe (décision d'Andreja, 3 octobre 2026)** : la banque suit la vraie vie. Il **n'existe pas de règle officielle française de « réserve de 4 mensualités »** : elle est **supprimée**. Ne restent comme refus que les règles réellement françaises ou de pratique bancaire reconnue ; l'épargne restante n'est plus qu'un **avertissement non bloquant**.

## Ce qui refuse (et d'où ça vient)
| Règle | Valeur | Statut | Source |
|---|---|---|---|
| **Taux d'endettement maximal** | 35 % des revenus, assurance emprunteur comprise | **SOURCÉ** (règle HCSF) | Décision n° D-HCSF-2021-7 du Haut Conseil de stabilité financière (29 septembre 2021), applicable depuis le 1er janvier 2022, rapportée par des sources secondaires (Meilleurtaux, Mafusee, Selectra, etc.). **Le texte officiel n'a pas pu être relu ici** (accès réseau aux sites officiels bloqué) : à vérifier sur le site du HCSF / economie.gouv.fr. |
| **Durée maximale** | 25 ans ; 27 ans avec travaux importants | **SOURCÉ** (même décision HCSF) | Même source. Le code applique « travaux ≥ 10 % du montant emprunté » ; la décision citée par les sources secondaires parle aussi de VEFA (neuf) et de seuils de travaux : **détail à reconfirmer sur le texte officiel**. Le neuf (VEFA) n'existe pas dans le catalogue du jeu. |
| **Apport minimal : frais de notaire** | 100 % des frais de notaire | **NON SOURCÉE** (pratique bancaire) | Pas de texte officiel : un prêt immobilier finance le bien, les banques n'avancent en pratique pas les frais de notaire. À reconfirmer. |
| **Apport minimal : part du prix** | **10 % du prix**, en plus des frais de notaire | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** | Pratique courante des banques (environ 10 %), mais aucune règle officielle : valeur d'équilibrage du jeu. |
| **Reste à vivre minimal** | étudiant 500 · salarié 1 200 · cadre 1 800 InvestCoins par mois | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** | Les banques regardent un « reste à vivre », mais sans seuil officiel : valeurs de jeu. |
| **Loyers retenus** | 70 % des loyers (existants et prévisionnel du bien) | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** | Pratique des courtiers, pas de texte officiel. |

Chaque refus est expliqué avec ses chiffres, en InvestCoins : apport manquant (notaire + 10 %), reste à vivre avec la **mensualité maximale compatible**, endettement avec la **mensualité maximale acceptable**, durée maximale. Plus de « caution » ni d'« accord sous réserve » : accordé ou refusé.

## Ce qui n'est plus un refus : l'avertissement d'épargne restante
- **Avant l'achat** (aperçu), **sur la fiche du bien**, et dans la **Banque** (prêt personnel) :
  « Après cet achat, il te restera X pièces, soit Y mensualités. Moins de 3 mensualités expose à un impayé. » Le joueur peut acheter quand même ; la décision de la banque n'en dépend jamais.
- **Y** = pièces PROPRES restantes ÷ (mensualités de tous les prêts, assurance comprise, existants + le nouveau).
- **Les pièces d'un prêt personnel non remboursé ne comptent pas comme de l'épargne** (le message le dit). Règle prudente : on retire le capital restant dû même si les pièces ont été dépensées. Les pièces d'un prêt sur portefeuille fléché ne comptent pas non plus.
- **Seuil de 3 mensualités** (`BANK_RULES.lowSavingsWarningMonths`, 0 = désactivé) : **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER**. Aucune règle officielle ; c'est un repère de prudence du jeu.
- Si les pièces ne suffisent pas à payer l'achat, c'est « solde insuffisant » qui s'affiche (pas un refus de la banque, pas d'avertissement).

## Tests
`backend/tests/immoEngine.test.ts` (règles pures : apport au centime, endettement, durée, motifs cumulés, avertissement d'épargne, jamais un refus, seuil désactivable, prêt personnel non remboursé signalé) et `backend/tests/banqueReglesFrancaises.test.ts` (parcours réel : refus d'apport sans mouvement de pièces, refus au-dessus de 35 %, **achat avec peu de pièces restantes accepté avec avertissement**, aucun avertissement avec beaucoup de pièces, prêt personnel non remboursé non compté, prêt personnel accepté avec avertissement).
