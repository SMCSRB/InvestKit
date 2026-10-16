# Analyse du « tout à crédit » en Immobilier

*Analyse sans code, le 3 octobre 2026, sur `release/design-complet` (commit `7e000de`). Aucun fichier du site n'est modifié. Les chiffres viennent du code actuel (`immoRules.ts`, `bankRules.ts`, `engine/immo/*`, `fictiveCatalog.ts`) et d'une simulation jetable, lancée hors du dépôt, qui réutilise les vraies fonctions du moteur.*

## En quelques phrases
1. **Non, le « tout à crédit » ne bat pas systématiquement les autres, avec les règles prévues pour la nouvelle économie** : sur 17 simulations de joueurs qui empruntent au maximum, 16 finissent ruinés (vente forcée, dettes). Il ne gagne que dans une seule configuration : une période de hausse, une entrée au bon moment et assez de pièces venues d'ailleurs pour payer des mensualités qui dépassent les loyers pendant 2 à 3 ans.
2. **Le vrai trou aujourd'hui est ailleurs : la récompense quotidienne.** Elle donne jusqu'à 340 🪙 par jour ; avec `EUROS_PER_COIN = 20`, cela fait 6 800 € de pouvoir d'achat immobilier par jour. Avec ça, n'importe quel déficit de loyers est comblé. Le passage à « 10 pièces plates, 3 jours par semaine » (PR 2 du bloc) règle l'essentiel du problème.
3. **Le point faible qui reste est le classement** : il affiche le rendement sur l'apport seulement, sans les frais de revente. Un joueur à fort levier voit afficher +312 % alors que son patrimoine réel est à +110 % (voir §3). Il faut corriger ça avant d'ouvrir la PR 8.
4. **Passer à 1 🪙 = 1 € (PR 8) ne change pas le pouvoir d'achat Immobilier** (500 × 20 € = 10 000 €), mais trois seuils exprimés en pièces deviennent faux et sont à corriger en même temps (§5).

---

## 1. Comment la banque limite le prêt aujourd'hui

### Prêt immobilier (le gros levier)
| Règle | Valeur actuelle | Où |
|---|---|---|
| Taux d'endettement maximal | **35 %** (mensualités avec assurance ÷ revenus retenus) | `BANK_RULES.maxDebtRatioPct` |
| Revenus retenus | salaire du profil + **70 %** des loyers déjà perçus + **70 %** du loyer prévu du bien | `rentalIncomeWeight`, `projectRentWeight` |
| Revenus du profil (fictifs) | étudiant 900 €, salarié 2 400 €, cadre 4 500 € par mois | `STARTING_PROFILES` |
| Reste à vivre minimal | 500 / 1 200 / 1 800 € — **mais s'il manque, la décision n'est que « accord sous réserve »** : l'achat reste possible | `assessLoanApplication` |
| **Apport minimal** | **les frais de notaire seulement** (7,5 % ancien, **2,5 % neuf**). Le prêt couvre donc 100 % du prix | `minDownPaymentPctOfNotaryFees = 100` |
| Durée | 25 ans maximum, 27 avec gros travaux | `maxLoanMonths` |
| Nombre de prêts immobiliers | **aucune limite** (seul l'apport en pièces et le taux d'endettement freinent) | pas de plafond sur `re_loans` |
| Plafond de dette en pièces | 50 000 🪙 (500 000 prévu), mais **ne compte pas** les prêts immobiliers | `BANK_LIMITS` |
| Frais de dossier / assurance | max(200 €, 0,2 %) / 0,36 % par an | `loanApplicationFee`, `LOAN_INSURANCE_RATE_PCT` |

À savoir : la banque calcule le taux d'endettement **avec** les crédits déjà en cours, et les loyers « comptent » pour 70 %, ce qui permet d'enchaîner les achats tant qu'on a de quoi payer les apports.

### Prêt personnel (fléché Immobilier)
Un seul actif à la fois, de 6 à 60 mois, plafond **6 mois de revenus** (salarié : 14 400 €), taux de base + 4,5 points. Il sert d'apport ou de travaux. Il ajoute une mensualité (14 400 € sur 60 mois ≈ 277 € par mois en 2010), donc du déficit, pas du gain gratuit.

### Autres garde-fous existants
- Une vente forcée se déclenche après **3 mois d'impayés + 2 mois de délai** : prix −25 %, frais de poursuite 6 % (entre 4 000 et 15 000 €).
- Si le prix de vente ne couvre pas la dette, **le solde est ajouté à tes impayés** : il n'est pas effacé.
- La procédure de rétablissement efface les dettes et remet **tout le domaine** à zéro, mais : 3 fois maximum par compte, 30 jours entre deux, interdiction de crédit 30 jours.

---

## 2. Un bien peut-il perdre de la valeur ? Les coûts sont-ils comptés ?

**Oui aux deux.**

**Les prix baissent dans le catalogue** (cycle national fictif, plus un aléa par ville) : −1 % en 2012, −2 % en 2013, −1,5 % en 2014, puis **−3 % en 2023, −4 % en 2024, −1 % en 2025**. Variation limitée à −15 % par an et par ville. L'état et la classe énergétique influencent aussi le prix (valeur verte).

| Coût | Compté ? | Valeur |
|---|---|---|
| Intérêts + assurance du prêt | oui | taux du catalogue 1,1 à 4,0 % + 0,36 % |
| Frais de notaire | oui | 7,5 % ancien / 2,5 % neuf (perdus à l'achat) |
| Frais de dossier | oui | max(200 €, 0,2 %) |
| Charges de copropriété non récupérables, taxe foncière, assurance propriétaire, entretien | oui | par bien et par an, indexés de 1,5 % par an |
| Vacance locative | oui | 0,5 à 5 mois, selon la tension du quartier |
| Loyers en retard, impayés, dégradations, frais de remise en location | oui | probabilités par type de locataire |
| Travaux imprévus | oui | 0,6 à 1,5 % de chance par mois, 25 à 120 €/m² |
| Impôt sur les loyers | oui | 28,2 % (salarié), 47,2 % (cadre) sur loyers moins charges moins intérêts |
| Vente : agence 5,78 %, diagnostics 300 €, indemnité de remboursement anticipé, plus-value, décote de 10 % si loué | oui | `SALE_PARAMS`, `CAPITAL_GAIN_RULES` |

**Si les loyers ne couvrent plus les mensualités** : la différence est prélevée sur le solde de pièces. Si le solde ne suffit pas, elle devient des **impayés** (la banque ne finance plus d'achat). Après 3 mois d'impayés, la banque propose une vente amiable rapide (−12 %) ; après 2 mois de plus, **vente forcée (−25 %)**. Il n'y a pas de « faillite » automatique : les dettes restantes restent dues jusqu'à la procédure de rétablissement.

Important : **le salaire du profil n'est jamais versé en pièces**. Il ne sert qu'à décider si la banque accorde le prêt. Seules les pièces du portefeuille paient les mensualités.

---

## 3. Simulation de trois joueurs

### Méthode (et ses limites, à lire)
- Capital de départ **10 000 €** (= 10 000 🪙 à 1:1 ; c'est aussi exactement l'équivalent de 500 🪙 × 20 € d'aujourd'hui), profil **salarié**, taux et prix du catalogue de l'année d'entrée.
- Calcul **mois par mois** avec les vraies fonctions du moteur (décision bancaire, échéancier, vente et plus-value). Les événements aléatoires sont remplacés par leur **espérance** (vacance moyenne, travaux imprévus moyens) : c'est un cas moyen, pas un tirage.
- **Pas de récompense quotidienne** (on suppose la nouvelle économie) ; pas d'autre revenu en pièces.
- Biens « en bon état » sans travaux, sans expertise ; bourse = panier de 8 valeurs à parts égales (prix annuels simplifiés du jeu).
- Les stratégies A sont des règles simples que j'ai écrites, pas l'optimum : un joueur plus malin pourrait faire un peu mieux ou un peu moins mal.
- Résultat = **patrimoine final** (liquidités + valeur des biens − dettes − impayés), en €. Un nombre négatif veut dire : capital perdu **et** dettes restantes.

**Joueurs**
- **A) 100 % crédit max** : apport = frais de notaire seulement, plusieurs biens tant que la banque accepte.
  - *A1* : prend toujours le bien le plus cher (le neuf à 2,5 % de frais), aucune réserve.
  - *A3* : choisit les biens au meilleur cash-flow et garde 18 mois de déficit en réserve.
  - *A4* : un seul gros bien à 100 % de prêt, le reste en réserve.
- **B) Mix prudent** : le bien le moins cher avec 60 % du capital en apport (prêt 73 à 81 % du prix), 25 % en actions, 15 % de réserve.
- **C) Sans crédit** : 100 % en actions.

### Résultats (patrimoine final en €, départ 10 000 €)
| Période | Contexte | A1 | A3 | A4 | **B** | **C** |
|---|---|---|---|---|---|---|
| 2010 → 2015 | légère baisse puis reprise | −48 200 | −26 100 | −35 400 | **+10 000** | **+16 900** |
| 2012 → 2017 | **baisse** puis hausse | −63 000 | −29 800 | −49 000 | **+10 800** | **+16 600** |
| 2014 → 2021 | hausse (entrée « au bon moment ») | n.c. | −26 100 | −39 700 | **+17 300** | **+21 800** |
| 2016 → 2021 | **hausse forte** | −61 800 | **+36 800** | −20 600 | **+17 000** | **+19 500** |
| 2021 → 2026 | pic puis **baisse 2023-25** | −72 600 | −27 100 | −47 500 | **+8 100** | **+13 100** |
| 2022 → 2026 | **baisse** | −62 600 | −37 400 | −62 600 | **+7 000** | **+13 500** |

*n.c. = non calculé pour A1 sur cette période.*

### Pire perte de chaque joueur
| Joueur | Pire point observé |
|---|---|
| A1 (naïf) | **−48 000 à −73 000 €** : 5 à 7 fois le capital de départ |
| A3 (avec réserve) | −26 000 à −37 000 € dans 5 cas sur 6 ; creux à 1 800 € même dans le cas gagnant (frais d'entrée perdus) |
| A4 (un seul gros bien) | −20 000 à −63 000 € |
| B (mix prudent) | entre 6 600 et 8 500 € : **−15 % à −34 %** du capital |
| C (sans crédit) | entre 9 600 et 10 000 € : **−4 % au pire** |

### Ce que ça montre
1. **Avec la nouvelle économie, A perd dans presque tous les cas**, même en période de hausse (2014 → 2021), parce que les mensualités et l'impôt sur les loyers dépassent les loyers dès le premier mois et qu'aucun salaire ne vient combler. Ça tient avant tout à trois règles du code : pas de salaire en pièces, impôt sur des loyers « fantômes » (le capital remboursé n'est pas déductible), vente forcée à −25 %.
2. **A gagne une fois** (2016 → 2021, +36 800 €, soit 1,9 fois C), et seulement en cumulant : entrée avant 5 ans de hausse, deux petits biens bien choisis, et réserve suffisante. Avec 20 000 € (Pro) et un grand bien acheté en 2014, on atteint +110 % fin 2020 contre +61 % pour C, **mais** il faut combler environ 24 mois de déficit avec des pièces venues d'ailleurs (ce que le moteur refuse de faire à lui seul).
3. **Le cycle est identique pour tous** (catalogue déterministe, départ 2010) : « acheter en 2014, vendre fin 2020 » sera vite connu de tous, des guildes et des amis. Ce n'est pas du talent, c'est de la mémoire. C'est le même sujet que l'horloge unique et les scénarios (6c).
4. **Le classement récompense l'illusion** (cas A à 20 000 €, entrée 2014) :

| Fin d'année | Classement affiché | Patrimoine réel si tout est revendu |
|---|---|---|
| 2016 | +2 % | −157 % (dettes) |
| 2018 | +131 % | −51 % |
| 2020 | **+312 %** | **+110 %** |

Le classement Immobilier mesure `(valeur − dette + loyers cumulés − apport) ÷ apport`, **sans les frais de revente ni la plus-value**, et divisé par l'apport seulement (ici 16 700 € sur 217 000 € de bien). Le levier gonfle le pourcentage affiché, et la minuscule base de calcul le démultiplie. À la même date, C est à +61 %.

5. **La perte est plafonnée par le rétablissement, le gain ne l'est pas.** Avec 3 procédures possibles, jouer le gros levier plusieurs fois est un pari à asymétrie positive pour qui ne regarde que le classement. Les 30 jours entre deux procédures freinent, ils n'empêchent pas.

6. **Aujourd'hui (avant le bloc économie)**, la récompense quotidienne (jusqu'à 340 🪙, soit 6 800 € de pouvoir d'achat par jour en Immobilier) comble n'importe quel déficit : les pertes de A1 ci-dessus **ne se produiraient pas** et le « tout à crédit » deviendrait la stratégie dominante en hausse. **La PR 2 (récompense de 10 pièces plates, 3 jours par semaine, soit environ 1 560 € par an) est donc la première protection.**

---

## 4. Garde-fous proposés

Le joueur A ne bat pas B et C de façon systématique, donc **pas besoin de mesures lourdes**. Mais trois faiblesses sont réelles : l'apport minimal très bas, le classement, et le cycle connu d'avance. Propositions classées par utilité :

| # | Garde-fou | Ce que ça change | Effort | Risque | Recommandation |
|---|---|---|---|---|---|
| G1 | **Apport minimal de 10 % du prix + frais de notaire** (au lieu de frais de notaire seuls) | Levier maximal ramené de ×13 (ancien) / ×40 (neuf) à environ ×5,7 / ×8. Avec 10 000 € : biens ≤ 57 000 € (ancien) ou 80 000 € (neuf) ; avec 20 000 € : 114 000 / 160 000 € | 0,5 j | faible | **Oui, dans la PR 8** |
| G2 | **Réserve de trésorerie obligatoire** : la banque refuse (ou met « sous réserve ») si les pièces restantes ne couvrent pas 12 mois de déficit prévisionnel | Bloque A1 et A4 dès l'achat, avec un message clair | 1 j | faible | **Oui, dans la PR 8** |
| G3 | **Test de résistance avant d'acheter** (affiché dans la simulation d'achat) : « et si 12 mois sans locataire et −15 % de prix ? perte maximale = … » | Pédagogie, aucune règle cachée | 1,5 j | très faible | Oui, après la PR 8 |
| G4 | **Classement sur le patrimoine net de liquidation** (valeur − dette − frais de revente et impôts) **rapporté au capital de départ** (10 000), pas à l'apport | Supprime l'effet de levier trompeur ; A et C deviennent comparables | 1,5 j | moyen (change les chiffres du classement) | **Oui, avant ou avec la PR 8** |
| G5 | **Afficher à côté du rang : levier moyen et pire baisse** (« plus basse valeur de ton patrimoine »), sans pénalité ni message alarmiste | Le risque est visible, pas puni | 1,5 j | faible | Oui |
| G6 | **Compter les prêts immobiliers dans le plafond de dette** (500 000) et limiter à 3 prêts immobiliers en cours pour un compte qui débute | Ferme l'enchaînement d'achats | 0,5 j | faible | Oui |
| G7 | **Levier limité pour les comptes qui débutent, levé par l'apprentissage** : prêt à 80 % au maximum tant que le chapitre « Crédit immobilier » du parcours Immobilier n'est pas terminé (aucun délai, aucune pression) | Protège sans faire attendre | 1 j | faible | Oui, à brancher sur le Lot Éducation |
| G8 | **Après un rétablissement, levier réduit** (80 %) pendant 12 mois de jeu, et le rétablissement apparaît dans l'historique du profil | Casse l'asymétrie « je perds, je recommence » | 1 j | faible | Oui |
| G9 | **Plusieurs scénarios de marché** (3 à 5 cycles de prix différents, tirés à la création de la partie, classement par scénario) | Supprime « acheter en 2014 » comme recette connue | 3 j | moyen | À décider avec l'horloge unique (6c) |
| G10 | Vacance, frais d'achat et de vente | **Déjà en place** (voir §2) | — | — | Rien à faire |
| G11 | Baisses de prix possibles | **Déjà en place** | — | — | Rien à faire |

Fidèle à la règle d'engagement sain : aucune de ces mesures ne repose sur une alerte qui presse, ni sur un message culpabilisant, ni sur un délai réel imposé au joueur.

---

## 5. Ce que la PR 8 (1 🪙 = 1 € en Immobilier) doit corriger en même temps

Le changement de `EUROS_PER_COIN` (20 → 1) ne modifie pas ce qu'un joueur peut acheter, mais fait **dériver trois seuils** :

| Seuil | Valeur actuelle | Effet à 1:1 | À faire |
|---|---|---|---|
| `MIN_RANKED_CAPITAL` (capital minimal pour apparaître au classement) | 100 🪙 = 2 000 € investis en Immobilier | devient **100 €** : tout le monde est classé, même avec un apport symbolique | relever à 1 000 🪙 (VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER) |
| `RECOVERY.baseCapitalCoins` (capital de base après rétablissement) | 500 🪙 | devient 500 € au lieu de 10 000 € : rétablissement 20 fois plus dur que le départ | aligner sur le capital de départ (10 000) |
| `BANK_LIMITS.maxOutstandingPrincipalCoins` | 50 000 🪙 = 1 000 000 € de dette équivalente | 500 000 🪙 = 500 000 € : **plus strict**, c'est voulu | garder 500 000 et y compter les prêts immobiliers (G6) |

À ajouter à la PR 8 : tests de cohérence (apport, plafond de prêt personnel de 6 mois de revenus, restes d'arrondi du registre en centimes d'euro) et un test qui vérifie que le pouvoir d'achat Immobilier du capital de départ reste de 10 000 € avant et après le changement.

---

## 6. Recommandation

1. **Ne pas bloquer le bloc économie** : le « tout à crédit » n'est pas la stratégie dominante avec la nouvelle récompense quotidienne.
2. **Ajouter à la PR 8** (ou juste avant, en PR 7b) : **G1** (10 % d'apport), **G2** (réserve de trésorerie), **G6** (plafond de dette incluant l'immobilier), et les trois corrections du §5.
3. **Corriger le classement (G4)** avant d'ouvrir le classement Immobilier aux nouveaux joueurs : c'est le seul endroit où le levier « gagne » à tort.
4. **Plus tard** : G3 et G5 (pédagogie et visibilité du risque), G7 et G8 (accès progressif) dans le lot Éducation / profil, G9 (scénarios de marché) avec l'horloge unique.

### Questions pour toi
1. **Apport minimum** : 10 % du prix en plus des frais de notaire, ça te va ? (je recommande oui)
2. **Réserve de trésorerie** : exiger 12 mois de déficit prévisionnel en pièces, refus net ou « accord sous réserve » ? (je recommande refus net)
3. **Classement Immobilier** : mesurer le patrimoine net de revente rapporté aux 10 000 de départ, ça te va ? (je recommande oui)
4. **Seuil de classement** : 1 000 🪙 minimum investis. D'accord ? (je recommande oui)
5. **Scénarios de marché multiples (G9)** : à étudier avec l'horloge unique, ou on laisse un seul cycle ? (je recommande d'étudier avec 6c)

*Simulation reproductible : les scripts utilisés (hors dépôt) réutilisent `fictiveCatalog.ts`, `evaluatePurchase`, `computeSaleClosing` et `stockPrices.ts`. Je peux les ajouter au dépôt comme outil de développement si tu le souhaites.*
