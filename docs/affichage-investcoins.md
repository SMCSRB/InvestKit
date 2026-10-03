# Affichage en InvestCoins (1 pièce = 1 €)

Règle : dans le jeu, **tout est en InvestCoins**. Le symbole « € » est réservé à l'argent réel (prix de l'abonnement Pro). Le dollar d'origine des cryptos n'est montré qu'en information secondaire.

## Ce qui change
- **Immobilier** (liste, fiche, financement, mes biens, bilan, carte, filtres) : prix, loyers, mensualités et frais s'affichent avec la pièce, **une seule fois** (fini « 32 000 € ≈ 32 000 🪙 »). Les petites étiquettes de la carte n'ont que le nombre (« 32 k »). Les textes lus par les lecteurs d'écran disent « InvestCoins ». Les noms de champs serveur « …Euros » sont inchangés : leur valeur est déjà en pièces.
- **Banque** : la ligne « ≈ … € » de la mensualité (ancien taux de 20 € la pièce) est supprimée ; le reste à vivre est en pièces.
- **Bandeau de cours** : prix en InvestCoins ; le dollar d'origine s'affiche au survol. Sans taux de change, le bandeau reste en dollars.
- **Checklist d'accueil / bonus premiers pas** : ce sont **deux récompenses distinctes**. La checklist donne 10 pièces par étape (à récupérer sur la liste) ; les bonus « premiers pas » (30 / 30 / 40) sont versés **automatiquement** quand l'événement est validé par le serveur. L'écran le dit maintenant : « checklist : +10 » sur chaque ligne, une phrase d'explication sous la liste, et les descriptions des étapes « leçon » et « premier achat » citent le bonus séparé. Rien n'est cumulé ni fusionné.

## Hors périmètre (volontairement)
Les écrans de la Bourse dans le tableau de bord (prix des titres en €) ne sont pas touchés ici ; à traiter avec la refonte de la Bourse.

## Test
`backend/tests/affichageInvestCoins.test.ts` : aucun « € » dans les fichiers d'affichage de l'Immobilier, pas de doublon « ≈ pièces », plus de conversion à 20, bandeau en pièces, explication des deux récompenses.
