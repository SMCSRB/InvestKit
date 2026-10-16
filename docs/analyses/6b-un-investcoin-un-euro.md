# 6b. « 1 InvestCoin = 1 € » : inventaire, migration, affichage

*Analyse sans code, le 3 octobre 2026, sur `release/design-complet`. La décision « 1 InvestCoin = 1 € » est prise ; ce document dit ce qu'elle change et comment la faire sans casser l'économie.*

## En deux phrases
Le 1 pour 1 existe **déjà** pour la Bourse (cours en pièces) et presque pour la Crypto (1 pièce = 1 dollar de jeu) ; **seule l'Immobilier utilise 1 pièce = 20 €**. Passer au 1 pour 1 multiplie donc par 20 les montants en pièces de l'Immobilier, ce qui rend **toute l'économie actuelle trop petite** (capital de départ 500, plafond de dette 50 000) et révèle un vrai problème : **la récompense quotidienne peut rapporter jusqu'à 119 750 pièces par an**.

---

## 1. Inventaire : tout ce qui crée, détruit ou convertit des pièces

Valeurs lues dans le code (`backend/src/config/*`, services). Toutes sont des **VALEURS DE JEU, NON SOURCÉES, À RECONFIRMER** sauf mention contraire.

### 1.1 Création de pièces (entrées)
| Flux | Raison au registre | Valeur actuelle | Remarque |
|---|---|---|---|
| Capital de départ | `starting_capital` | 500 | à l'activation du compte |
| Complément Pro | `pro_starting_bonus` | +500 (une seule fois par compte) | multiplicateur ×2 |
| **Récompense quotidienne** | `daily_reward` | `50 + 10 × (jour de série − 1)`, plafond **340/jour** | 1er mois à série pleine : 5 850 ; **1 an : 119 750** |
| Quiz de chapitre | `quiz_…` | 20 par chapitre (une fois) | |
| Quiz final de domaine | `quiz_domain_complete` | 100 (une fois) | total du contenu actuel : 500 |
| Checklist d'accueil | `checklist_reward` | 10 par étape × 6 | |
| Parrainage | `referral_bonus` | 100 par filleul vérifié, **sans plafond** | acceptable en test fermé |
| Prêt bancaire (déblocage) | `bank_disburse` | principal du prêt | crée des pièces **et** une dette égale |
| Aide après rétablissement | `bank_recovery_grant` | selon le dossier | |
| Ajustement administrateur | `admin_adjustment` | libre | tracé, avec motif |

### 1.2 Destruction de pièces (sorties définitives)
| Flux | Raison | Valeur |
|---|---|---|
| Courtage Bourse | `fee_brokerage` | 0,5 % (actions), 0,35 % (ETF), minimum 1 pièce |
| Frais Crypto | `fee_brokerage` | 0,10 à 0,60 % selon le palier de liquidité, minimum 1 ; écart achat/vente 0,02 à 0,80 % ; glissement plafonné à 5 % |
| Impôt sur les plus-values | `tax_capital_gains` | règles Bourse (PEA, CTO, flat tax) et Crypto (impôt à la sortie vers l'euro) |
| Frais Immobilier | `re_notary_fees`, `re_loan_fees`, `re_expertise` | notaire 7,5 % ancien / 2,5 % neuf ; expertise `300 € + 0,15 % du prix` ; audit énergétique 800 € |
| Impôt et charges Immobilier | `re_cashflow_out` | calculés en euros puis convertis |
| Intérêts de prêts | `bank_repayment` (part intérêts) | taux de base de l'année + écart (personnel +4,5 pts, portefeuille +2 pts) |
| Pièces saisies | `bank_recovery_seizure` | après défaut |

### 1.3 Conversions (échanges, pas de création)
- **Bourse** : `trade_buy` / `trade_sell` : prix en pièces, **1 pièce = 1 unité de cours** (les cours sont des séries simplifiées : voir 3.4).
- **Crypto** : `trade_buy` / `trade_sell` ; prix en **dollars** ; `usdPerCoin = 1` : **1 pièce = 1 $** (pas 1 €).
- **Immobilier** : `re_exchange_*`, `re_cashflow_in/out` ; **1 pièce = 20 €** (`EUROS_PER_COIN`), arrondi avec un reliquat conservé pour ne rien créer ni perdre.
- **Banque** : dettes en centièmes de pièce, par domaine (voir 6c pour les horloges).

### 1.4 Ce qui n'est pas lié aux pièces
- **Abonnement Pro** : 7,99 €/mois ou 79 €/an en **vrais euros** via Stripe. Aucun lien avec les pièces, et il doit le rester (règle produit : pas d'achat de pièces, pas de retrait).
- Les simulateurs publics (prêt, investissement locatif, PEA) travaillent en euros, sans pièces.

---

## 2. Ce que change le 1 pour 1

### 2.1 Immobilier : les chiffres explosent
Un bien à 200 000 € vaut **10 000 pièces aujourd'hui**, il vaudrait **200 000 pièces**. L'apport minimum (frais de notaire, environ 15 000 € sur un bien ancien de 200 000 €) passe de 750 à 15 000 pièces. Avec 500 pièces de départ, **plus aucun achat n'est possible** sans prêt, et le plafond de dette (50 000 pièces) interdit un prêt immobilier réaliste.

### 2.2 Les récompenses deviennent démesurées
À 1 pièce = 1 €, la récompense quotidienne maximale (340) équivaut à **340 € gratuits par jour**, soit 68 % du capital de départ chaque jour. Même aujourd'hui, en 1 an de série pleine, un joueur reçoit 240 fois son capital de départ sans rien investir. C'est le premier problème à régler, avant toute migration.

### 2.3 Crypto : dollar ou euro ?
Les cours Crypto sont en dollars. Si 1 pièce = 1 € partout, **un bitcoin à 60 000 $ vaut environ 55 000 pièces** (le taux euro/dollar a varié entre 1,05 et 1,45 depuis 2010 : 25 % d'écart). Trois options :
- **A. Convertir** chaque prix en euros avec le taux euro/dollar du jour (source officielle : Banque centrale européenne, à importer comme les cours). Cohérent, un peu de travail de données.
- **B. Garder 1 pièce = 1 $ pour la Crypto** et l'écrire clairement. Simple mais contredit « 1 pièce = 1 € » : à éviter.
- **C. Ignorer la différence** et appeler « pièces » les dollars. Incohérent (un joueur qui compare deux domaines voit un écart de valeur caché).
**Recommandation : A**, avec le taux importé et daté (jamais écrit à la main), appliqué côté serveur.

---

## 3. Propositions

### 3.1 Une seule source de vérité pour les valeurs
Créer un fichier unique `config/economy.ts` qui rassemble : capital de départ, récompenses, plafonds, `EUROS_PER_COIN = 1`, taux dollar/euro. Aujourd'hui ces valeurs sont dispersées dans six fichiers (`game.ts`, `immoRules.ts`, `bankRules.ts`, `tradingRules.ts`, `cryptoMarketRules.ts`, des constantes dans les services). Toute valeur y porte la mention `VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER`.

### 3.2 Valeurs proposées (à valider par toi)
| Réglage | Actuel | Proposé | Raison |
|---|---|---|---|
| Capital de départ | 500 | **10 000** | rend possibles un premier achat de Bourse et un apport immobilier modeste via prêt |
| Complément Pro | +500 | +10 000 (une fois) | garde le « environ le double » |
| Récompense quotidienne | 50 → 340 croissante | **10 par jour, plate**, et au plus 3 jours par semaine rémunérés | ≈ 0,1 % du capital par jour ; supprime la pression de la série (voir 6a) |
| Quiz de chapitre | 20 | 100 | ~1 % du capital ; une fois par chapitre |
| Quiz final de domaine | 100 | 500 | une fois par domaine |
| Étape de checklist | 10 | 50 | |
| Parrainage | 100 | 500, **plafonné à 10 filleuls** | évite l'inflation à l'ouverture au public |
| Plafond de dette totale | 50 000 | **500 000** | un prêt immobilier réaliste |
| Récompense de badge rare | — | 0 à 200, plafond global | voir 6a |

Principe : **les récompenses de jeu restent petites devant le capital** (quelques pour cent au total par semaine) ; le jeu se gagne par l'investissement, pas par le temps passé à cliquer.

### 3.3 Migration des soldes et du registre
Le plus important : **le registre existant ne se réécrit pas**.
1. **On ne touche pas aux lignes passées** (le registre est la preuve). On ajoute une écriture-repère `economy_cutover` et un numéro de version d'économie.
2. **Joueurs sans Immobilier** : leurs soldes sont déjà en 1 pour 1 (Bourse) : **aucun changement**. Pour ne pas les désavantager face au nouveau capital de départ, on peut leur verser un complément unique (écriture `economy_cutover_grant`, tracée, plafonnée) égal à la différence avec le nouveau départ.
3. **Joueurs avec Immobilier** : leurs biens sont en euros (inchangés), mais leurs flux en pièces étaient comptés à 20 € par pièce. Deux options :
   - **M1 (recommandée en phase de test fermé)** : *remise à plat claire* : on archive le registre en totaux anonymes (mécanisme déjà utilisé pour la suppression de compte), on remet chaque joueur au nouveau capital de départ, on **conserve** ses biens immobiliers et ses prêts convertis à la nouvelle unité, et on lui explique tout dans une notification. Simple et sans risque d'enrichissement.
   - **M2** : conversion proportionnelle de l'Immobilier seul : plus fidèle mais **risquée** (on peut créer de l'argent si une pièce est comptée deux fois) ; à réserver à une ouverture publique avec des joueurs réels engagés.
4. **Dettes** (en centièmes de pièce) : les prêts personnels fléchés Immobilier sont recalculés à la nouvelle unité (×20) avec leur échéancier ; les prêts Bourse/Crypto ne changent pas.
5. **Interrupteur** : le cutover est piloté par un drapeau serveur ; **sauvegarde de la base obligatoire juste avant** ; retour arrière possible par restauration tant que personne n'a rejoué.

### 3.4 Honnêteté sur les données (à corriger en même temps)
Les cours de Bourse sont des **séries annuelles simplifiées « plausibles », pas des cours réels** (c'est écrit en tête de `stockPrices.ts`), et le catalogue immobilier est fictif. Pourtant la fiche du glossaire « Action » dit « aux cours historiques réels de l'année simulée ». **Texte à corriger** (même chose pour toute phrase qui présente ces données comme réelles). Le courtage de 0,5 % est aussi présenté dans le code comme « plafond légal PEA » : source non vérifiée, à retirer du commentaire comme je l'ai retiré du glossaire.

### 3.5 Affichage : une règle unique
**Règle : tous les montants du site sont en InvestCoins (icône pièce). La devise d'origine n'apparaît qu'en second plan, plus petite, quand elle aide à comprendre.**
- Page Crypto, bandeau de cours, onglet Marché : `61 234 🪙` en gros, `≈ 61 234 $` en petit gris au survol ou à côté (la devise d'origine peut différer légèrement du nombre de pièces à cause du taux, d'où l'intérêt de la montrer).
- Page Bourse : déjà en pièces ; les cours viennent de séries sans devise réelle : **ne rien afficher en devise d'origine**.
- Immobilier : prix en pièces, **euro entre parenthèses** seulement dans les fiches de bien (utile pour reconnaître les ordres de grandeur).
- Simulateurs publics : restent en euros (outils pédagogiques indépendants du jeu), avec la mention « ces outils ne touchent pas à tes InvestCoins ».
- **Question restée ouverte : faut-il afficher les prix du bandeau de cours en monnaie du jeu ? Oui.** Raisons : le joueur achète en pièces, un seul langage évite les erreurs de lecture, et c'est exactement ce que le prochain ordre débitera. Le dollar reste visible en second plan.

### 3.6 Risque de confusion avec de l'argent réel
- Ne jamais écrire « 1 InvestCoin = 1 € » à l'écran sans précision : cette phrase peut être lue comme une promesse de valeur. À l'écran on écrit : « Les prix du jeu suivent les ordres de grandeur du marché, en InvestCoins, la monnaie du jeu ».
- Le **symbole €** est réservé aux vrais euros : abonnement, simulateurs publics, textes qui parlent du monde réel. Les montants du jeu portent l'icône pièce, jamais « € ».
- Phrase permanente, courte, dans l'aide, les conditions et la fiche du glossaire : « Les InvestCoins n'ont aucune valeur réelle : on ne peut ni les acheter, ni les retirer, ni les échanger entre joueurs » (déjà dans le code Crypto, à généraliser).
- Pas de vocabulaire de gain d'argent réel (« gagne X € », « encaisse »…) dans les titres de badges, notifications ou mails ; on parle de « pièces » et de « patrimoine de jeu ».
- Les mails et la page de tarifs distinguent explicitement « paiement en euros » et « pièces du jeu ».

### 3.7 Simulateur de prêt et Immobilier
- Le **simulateur de prêt public** est en euros et le reste : aucun impact technique.
- Dans le jeu, les prêts et loyers sont déjà calculés en **euros** puis convertis en pièces à la frontière. Avec `EUROS_PER_COIN = 1`, la conversion devient l'identité : la fonction de conversion reste (utile pour un éventuel changement futur), seul le taux change. Les textes « 1 InvestCoin = 20 € » (glossaire, fiche de bien, info-bulles) sont à retirer.
- Les plafonds en pièces de la banque (dette totale, prêt personnel = 6 mois de revenus du profil) doivent être revus en même temps (3.2).

---

## 4. Risques de faille et tests à prévoir
| Risque | Test |
|---|---|
| Création de pièces par erreur d'arrondi lors du cutover | somme du registre = somme des soldes avant et après ; test sur 1 000 joueurs simulés |
| Gain en boucle (récompense quotidienne, parrainage) | tests de concurrence ; plafonds testés |
| Ancien taux encore codé en dur quelque part | test qui interdit le nombre `20` dans les conversions (recherche de `EUROS_PER_COIN` unique) |
| Dettes mal converties | échéanciers avant/après : capital restant dû identique en euros |
| Crypto : taux euro/dollar manquant un jour | repli sur le dernier taux connu, jamais sur zéro ; test de continuité |
| Affichage incohérent | test automatique qui scanne l'interface : aucun « € » collé à un montant de jeu |
| Statistiques d'administration faussées | `ledgerStatsByDomain` identique avant/après (le journal d'archive anonyme existe déjà) |

## 5. Estimation et découpage en PR
| # | PR | Effort | Risque |
|---|---|---|---|
| 1 | `config/economy.ts` : valeurs regroupées + test « plus aucune valeur dispersée » (sans changer le comportement) | 1,5 j | faible |
| 2 | Correction des textes (glossaire, « cours réels », 20 €, courtage) + règle d'affichage + règle « € réservé aux vrais euros » | 1,5 j | faible |
| 3 | Rééquilibrage des récompenses (récompense quotidienne plate, quiz, parrainage plafonné) | 2 j | moyen (équilibrage) |
| 4 | Import des taux euro/dollar + conversion des prix Crypto + bandeau et page Crypto en pièces avec dollar en second plan | 4 j | moyen |
| 5 | `EUROS_PER_COIN = 1`, capital de départ, plafonds de banque, adaptation de l'Immobilier | 3 j | **élevé** (cœur de l'économie) |
| 6 | Cutover : script de migration, archive du registre, notification, drapeau, test de répétition sur copie de la base | 3 j | **élevé** |
Total : environ **15 jours**. Les PR 1 à 3 sont sans danger et utiles tout de suite ; **les PR 5 et 6 doivent partir ensemble, avec une sauvegarde juste avant**.
