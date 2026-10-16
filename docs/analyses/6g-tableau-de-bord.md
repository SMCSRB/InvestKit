# 6g. Vérification du tableau de bord (patrimoine global et personnalisation)

*Analyse sans code, le 3 octobre 2026, sur `release/design-complet`. Rien n'a été modifié.*

## En deux phrases
**Ni le graphique de patrimoine global en aires empilées, ni le tableau de bord personnalisable (mode édition, widgets, modèles, disposition enregistrée côté serveur) ne sont dans la branche.** Le tableau de bord actuel est fixe : un bandeau de chiffres (`DashHero`), des cartes par domaine (la carte d'un domaine non débloqué est floutée, c'est le seul flou « freemium » existant) et un onglet Marché ; il n'y a aucun historique du patrimoine enregistré, donc rien à dessiner dans le temps.

---

## 1. Ce qui existe (vérifié dans le code)

| Élément demandé | État dans la branche | Preuve |
|---|---|---|
| Patrimoine total (un chiffre) | **Oui** : liquidités + titres − dettes, Immobilier exclu | `backend/src/engine/wealth.ts` (`netWorthCoins`), `overviewService.ts` |
| Graphique de patrimoine dans le temps | **Non** | aucune table d'historique ; aucune migration « snapshot » |
| Aires empilées par domaine, net des dettes | **Non** | `app/components/ui/charts.jsx` offre `LineChart`, `StackedBars` (barres), `Donut`, `SegmentedBar`, `Sparkline` : pas de graphique en aires empilées |
| Flou freemium sur ce graphique | **Non** | le flou (`dash-blur`) ne s'applique qu'aux cartes de domaine |
| Mode édition, widgets, modèles | **Non** | `app/dashboard/page.jsx` a une disposition écrite en dur |
| Disposition enregistrée côté serveur | **Non** | aucune colonne ni table de disposition |

## 2. Ce qui manque et comment le construire

### 2.1 Un historique du patrimoine (la base de tout)
Sans historique, pas de courbe. Il faut une table `wealth_snapshots` : un joueur, une date de jeu, un montant par domaine (Bourse, Crypto, Immobilier, liquidités, dettes). Règles :
- écrite **par le serveur** quand le joueur avance dans le temps ou fait une opération (jamais par le navigateur) ;
- un point par jour de jeu au maximum (le dernier gagne), pour que la table reste petite ;
- au départ, une migration crée un premier point « aujourd'hui » pour chaque joueur : **l'historique commence le jour du déploiement**, on n'invente pas le passé ;
- supprimée avec le compte (voir la suppression de compte déjà en place).

Dépendance : avec **trois horloges**, un point « à la même date » n'a pas de sens (2010 en Bourse, 2020 en Crypto). **Le graphique n'est vraiment lisible qu'avec l'horloge unique (6c).** Avant, on ne pourrait tracer que par « étape de jeu », ce qui est trompeur.

### 2.2 Le graphique en aires empilées
- Un nouveau composant `StackedArea` dans `charts.jsx`, sans bibliothèque, comme les autres.
- Une couche par domaine, plus une couche « Liquidités ». **Les dettes sont déduites** : la hauteur totale = patrimoine net. Si les dettes dépassent un domaine, on les affiche en une bande négative séparée plutôt qu'une aire qui disparaît, pour rester honnête.
- Info-bulle au survol, tableau équivalent pour l'accessibilité, couleurs vérifiées (daltonisme), mobile 390 px sans défilement horizontal.

### 2.3 Le flou freemium
Règle proposée, simple et sans pression : un compte gratuit voit **le total et la courbe de son domaine gratuit** ; les couches des autres domaines sont floutées avec la mention « Débloqué avec le plan Pro ». Important : **le flou ne doit pas être qu'un style** (le navigateur peut le retirer). Le serveur n'envoie pas les valeurs des domaines non débloqués (il envoie `null`), le flou n'habille que des formes factices.

### 2.4 Le tableau de bord personnalisable
- **Widgets** : un catalogue fermé et défini par nous (patrimoine, courbe, liquidités, positions, progression, actualités, rappel d'objectif…). Pas de widget libre.
- **Mode édition** : bouton « Personnaliser », on déplace, masque, ajoute ; « Enregistrer » ou « Annuler ». Aucun effet tant qu'on n'a pas enregistré (pas de surprise).
- **Modèles** : 3 modèles de départ (Débutant, Investisseur, Complet). Un compte gratuit choisit un modèle ; le plan Pro peut les modifier librement *(à décider, voir question G3)*.
- **Disposition côté serveur** : table `dashboard_layouts` (joueur, version, JSON validé). Le serveur **valide** le JSON (liste blanche des widgets, taille maximale, pas de HTML) et le propose sur tous les appareils. Si un widget est retiré un jour du catalogue, il est simplement ignoré.
- Accessibilité : déplacement possible au clavier (pas seulement au glisser-déposer) ; chaque bouton a un effet visible.

## 3. L'Immobilier doit-il entrer dans le patrimoine global ?

Aujourd'hui l'Immobilier est **hors** du total (il a son propre monde : horloge en mois, cash propre, catalogue fictif). Trois options :

| Option | Principe | Avantages | Inconvénients |
|---|---|---|---|
| **A. Rester séparé** (état actuel) | Total = liquidités + titres − dettes ; l'immobilier a son propre tableau | Aucun risque, aucun changement de classement | Un joueur très riche en immobilier paraît pauvre ; incohérent avec « un seul patrimoine » |
| **B. Entrer au total** | Ajouter la valeur nette des biens (valeur − capital restant dû) | Vision complète, cohérente avec la monnaie unique (6b) | Valeur des biens = estimation fictive, non liquide ; change les classements ; gros risque d'incohérence tant que les horloges et le taux ×20 existent |
| **C. Deux totaux** | « Patrimoine financier » (actuel) et « Patrimoine total » (avec immobilier), le classement reste sur le financier | Progressif, aucun classement cassé, le joueur voit les deux | Deux chiffres à expliquer |

**Conséquences à connaître**
- **Classements** : l'option B change le total de tous les joueurs ayant un bien ; il faudrait soit recalculer les périodes en cours, soit repartir d'une saison propre. L'option C ne touche à rien.
- **Cohérence entre domaines** : B n'a de sens **qu'après** 6b (1 InvestCoin = 1 €, fini le ×20) et 6c (une seule date) ; sinon on additionne des valeurs à des dates et des échelles différentes.
- **Honnêteté** : les prix de l'immobilier sont fictifs ; les mettre dans un total « patrimoine » sans l'écrire serait trompeur. À afficher : « estimation de jeu ».

**Recommandation : option C.** Maintenant : on garde le total financier (aucun risque). Après 6b et 6c : on ajoute « Patrimoine total (avec immobilier) » en deuxième chiffre et dans le graphique (couche Immobilier, nette du prêt), et le classement reste sur le patrimoine financier jusqu'à ce que tu décides d'un classement « total ».

## 4. Estimation et découpage en petites PR

| PR | Contenu | Effort | Dépend de |
|---|---|---|---|
| G1 | Table `wealth_snapshots` + écriture serveur + tests + suppression de compte | 2 j | rien (utile seule) |
| G2 | Composant `StackedArea` + tests visuels mobile | 1,5 j | rien |
| G3 | Endpoint historique + graphique sur le tableau de bord + flou serveur | 2 j | G1, G2 ; **6c pour être juste** |
| G4 | Table `dashboard_layouts`, validation, API | 1,5 j | rien |
| G5 | Widgets, mode édition, modèles (clavier, mobile) | 4 j | G4 |
| G6 | Second chiffre « patrimoine total » avec immobilier | 1,5 j | 6b + 6c |

Total : environ 12,5 jours. **Risque faible** (G1, G2, G4) à **moyen** (G3, G5 : interface complexe), **élevé seulement pour G6** (change des chiffres existants).

## 5. Engagement sain
Le graphique montre l'évolution **sans** message de perte alarmiste ni compte à rebours ; pas de notification « ton patrimoine a baissé ». Le flou est accompagné d'une explication claire, pas d'un appel pressant.
