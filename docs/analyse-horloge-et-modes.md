# 6c. Horloge unique et trois modes de jeu : Histoire, En ligne, Bac à sable

*Analyse sans code, le 4 octobre 2026. Complète `docs/analyses/6c-horloge-unique.md` (branche d'analyses, PR #96). Rien n'est modifié dans le jeu.*

## En deux phrases
Je propose **trois modes qui partagent la même mécanique d'horloge** mais pas les mêmes règles : **Histoire** (le jeu actuel : tu avances dans le passé, classé), **En ligne** (temps réel, Bourse et Crypto seulement, portefeuille et classement séparés) et **Bac à sable** (tu fais ce que tu veux, y compris revenir en arrière, mais **aucun classement, aucun badge, aucune récompense**). Rien de tout cela ne doit être codé avant la bascule de l'horloge unique (6c) ; ce document dit quoi décider d'abord.

## 1. Les trois modes en un tableau

| | **Histoire** | **En ligne** | **Bac à sable** |
|---|---|---|---|
| Idée | Rejouer 2014 → aujourd'hui, à ton rythme | Jouer au présent, avec de vrais cours du jour | S'entraîner et tester sans enjeu |
| Horloge | Avance seulement quand tu le demandes (jour, semaine, mois, trimestre, année) | Date réelle, **tu ne l'avances pas** | Avance **et recule**, ou repart de zéro |
| Domaines | Bourse, Crypto, Immobilier, Banque | **Bourse et Crypto seulement** (pas de données immobilières réelles au jour le jour) ; Banque (prêts) liée à ces deux domaines | Tous |
| Portefeuille | Un par joueur | **Séparé** de celui d'Histoire | Séparé, **jetable** |
| InvestCoins | Le registre actuel | Capital de départ propre, **aucun transfert** vers ou depuis Histoire (décision déjà prise : pas d'échange entre « mondes ») | Pièces **hors registre** : n'entrent jamais dans les statistiques |
| Classement, badges, XP | Oui | Oui, classement **séparé** | **Non** |
| Données | Historiques (Crypto : cours réels après import ; Bourse : escalier annuel) | **Source de cours en direct à choisir** (licence à vérifier) | Mêmes données qu'Histoire |
| Risque principal | Triche par avance de domaine en domaine (réglé par l'horloge unique) | Dépendance à une source externe, coût, licence | Servir de **laboratoire de triche** pour Histoire (voir 3) |

## 2. Ce que chaque mode demande techniquement

**Base commune** : la table `sim_clocks(user_id, mode, start_date, current_date)` du plan 6c, avec **une ligne par joueur et par mode**. La colonne `mode` existe déjà dans les portefeuilles et les classements (valeur actuelle `accelerated`) : elle sert de séparation. Un seul point d'entrée serveur change la date (`advanceTo`).

- **Histoire** = le mode « accéléré » du plan 6c, tel quel.
- **En ligne** : la date n'est pas stockée comme un état que le joueur change : c'est « maintenant » côté serveur. Il faut (a) une source de cours en direct, (b) des ordres évalués à chaque cotation, (c) des heures d'ouverture pour la Bourse (la Crypto est 24 h/24), (d) un plan pour les pannes de source (marché « fermé », pas de cours inventé). **Gros chantier et dépendance externe** : à ne lancer qu'après stabilisation d'Histoire, comme déjà décidé (question 11 de l'analyse).
- **Bac à sable** : même moteur qu'Histoire, avec trois différences : une **remise à zéro** (nouveau capital, nouvelle date), un **retour en arrière** autorisé (restaurer une copie de l'état), et **aucune écriture** dans le registre InvestCoins, le classement, l'XP, les badges et l'historique du patrimoine. Le plus simple et le plus sûr : un **état séparé** (tables ou lignes marquées `sandbox`) que les statistiques et le classement ignorent par construction.

## 3. Les points délicats (avec ma recommandation)

1. **Bac à sable et triche.** Si le bac à sable utilise les mêmes données qu'Histoire, un joueur peut « essayer l'année suivante » puis rejouer en connaissant le résultat. *Recommandation* : l'autoriser **seulement sur des périodes que le joueur a déjà passées en Histoire** (il ne voit jamais le futur de son Histoire), ou sur des périodes fixes. Les deux se vérifient côté serveur.
2. **Argent.** Aucune pièce du bac à sable ne doit pouvoir devenir une pièce du registre (pas d'échange, déjà décidé pour les joueurs). Les pièces du bac à sable ne sont **pas** des InvestCoins du registre : elles ne comptent dans aucune statistique ni alerte de dérive.
3. **Classements séparés par mode.** La séparation existe déjà (`mode` dans `leaderboard_rankings`) ; En ligne aura son propre classement, jamais mélangé avec Histoire.
4. **Engagement sain.** En ligne ne doit pas créer de pression : pas de notification de « marché ouvert », pas de série à entretenir, pas de message de perte alarmiste. La règle s'applique aussi à la lecture automatique d'Histoire.
5. **Le tableau de bord et le patrimoine** : un seul patrimoine par mode ; le graphique (6g) affiche **le mode actif**, jamais une somme de modes.
6. **Pro et gratuit.** Aujourd'hui un compte gratuit choisit **un** domaine. À décider : le bac à sable est-il gratuit (bon pour l'apprentissage) et En ligne réservé au Pro (coût de la source) ?

## 4. Plan 6c affiné (aucun code dans ce lot)

Le plan en 9 étapes (~27 jours) reste valable ; ce que cette analyse change :
1. **`sim_clocks.mode` prend trois valeurs prévues** (`history`, `live`, `sandbox`) ; seule `history` est utilisée au départ (la valeur actuelle `accelerated` est conservée comme alias de `history` le temps de la migration).
2. **Le bac à sable est une étape tardive** (après le basculement), car il dépend d'un état séparé et d'un retour en arrière : **ne pas le mélanger au basculement**.
3. **En ligne reste hors plan** tant que la source de cours n'est pas choisie (analyse séparée, comme `docs/sources-cours-bourse.md`).
4. **Le basculement (6c) reste lié à 6b-fin et à la migration M1** (valeur neutre : personne ne gagne ni ne perd de valeur).

## 5. Décisions d'Andreja (4 octobre 2026)

**Noms** : Histoire, En ligne, Bac à sable (validés).

| Mode | Qui peut jouer | Règles vérifiées côté serveur |
|---|---|---|
| **Histoire** | Tous | Mode de base : classement, XP, badges. |
| **En ligne** | **Comptes Pro seulement** | Bourse et Crypto. Classement et portefeuille séparés. |
| **Bac à sable** | Tous | **Gratuit** : seulement les périodes déjà jouées en Histoire (une période se débloque en jouant son scénario). **Pro** : choix libre de la période et de la date de départ. |

- **Toutes ces limites sont vérifiées par le serveur**, jamais seulement par l'interface (le droit Pro se lit en base, la liste des périodes débloquées aussi).
- **À prévoir dans l'architecture (ne pas coder maintenant)** : plus tard, un joueur gratuit pourra voir le classement et les événements d'En ligne **en lecture seule**, sans y participer. Conséquence de conception : les lectures d'En ligne (classement, événements) passent par des routes séparées des routes d'action, avec un contrôle d'accès distinct (`lecture` ouverte à tous, `participation` réservée au Pro).
- **Question A** : Bac à sable limité aux périodes jouées (sauf Pro). **Question B** : remplacée par le tableau ci-dessus. **Question C** : noms validés. **Question D** : la source de cours en direct sera choisie **juste avant** le mode En ligne, qui vient **en dernier** ; rien à faire maintenant.
- **Bonus « premier essai » (+50 XP)** : ne pas l'importer.

### Conséquences sur le plan 6c
1. `sim_clocks.mode` : `history` (utilisé), `sandbox` et `live` (réservés, créés plus tard).
2. Les périodes jouées en Histoire sont enregistrées par le serveur (table dédiée) : une période est « débloquée » dès que le joueur a **terminé son scénario** (règle exacte à fixer avec le scénario : VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER).
3. Ordre de construction : horloge Histoire (6c) → Bac à sable → En ligne (en dernier, après choix de la source).
