// Parcours « Crypto : le marché simulé » — texte rédigé pour ce projet. Chaque chapitre correspond au marché simulé de /crypto et renvoie vers le glossaire
// (glossaryId). Les chiffres historiques sont arrondis ; les paramètres du jeu (frais, seuils) sont des valeurs de jeu, à reconfirmer.
const Q = (id, text, options, correct, explanation) => ({ id, text, options, correct, explanation });

export const cryptoMarketDomain = {
  id: 'crypto_market',
  name: 'Crypto : le marché simulé',
  description: 'Lire un marché, comprendre les risques, passer des ordres, utiliser un levier — avec le simulateur',
  icon: 'trendingUp',
  color: '#38bdf8',
  badge: 'trendingUp',
  totalChapters: 5,
  chapters: [
    {
      id: 1,
      title: 'Lire un marché : prix, volume, capitalisation, liquidité',
      duration: '20 min',
      description: 'Ce que disent (et ne disent pas) les chiffres affichés sur le marché',
      content: `# Lire un marché crypto

## Le prix ne dit pas tout
Le prix d'une unité ne dit rien de la taille d'un actif. Un jeton à 0,002 $ n'est pas « moins cher » qu'un jeton à 50 000 $ : tout dépend du nombre d'unités en circulation.

## La capitalisation
Capitalisation = prix × nombre d'unités en circulation. Elle donne la **taille** d'un actif, pas la quantité d'argent réellement investie dedans.

## Le volume et la liquidité
Le **volume** est le montant échangé sur 24 heures. La **liquidité** est la facilité à acheter ou vendre vite sans déplacer le prix. Sur un actif très liquide, ton ordre passe presque sans effet ; sur un petit actif, il peut déplacer le cours, et en période de panique il peut être impossible de vendre au prix affiché.

## Les coûts cachés
- L'**écart achat/vente** (spread) : tu achètes un peu plus cher que le prix « milieu » et tu revends un peu moins cher.
- Le **glissement** : un gros ordre obtient un prix moyen moins bon que le prix affiché.
Dans le jeu, le **palier de liquidité** (T1 à T4) résume le volume moyen d'un actif : plus il est bas, plus ces coûts sont élevés.

## Les records
Le plus haut historique est un fait du passé. Beaucoup d'actifs ne l'ont jamais retrouvé.`,
      vocabulary: [
        { term: 'Capitalisation', definition: 'Prix × nombre d\'unités en circulation', glossaryId: 'capitalisation' },
        { term: 'Volume', definition: 'Montant échangé sur une période', glossaryId: 'volume' },
        { term: 'Liquidité', definition: 'Facilité à acheter ou vendre sans déplacer le prix', glossaryId: 'liquidite' },
        { term: 'Écart achat/vente', definition: 'Différence entre prix d\'achat et de vente', glossaryId: 'ecart-achat-vente' },
        { term: 'Glissement', definition: 'Prix moyen dégradé par la taille de l\'ordre', glossaryId: 'glissement' },
        { term: 'Palier de liquidité', definition: 'Classement du jeu de T1 (très liquide) à T4', glossaryId: 'palier-liquidite' },
      ],
      quiz: { passingScore: 75, questions: [
        Q(1, 'Que mesure la capitalisation d\'une crypto ?', ['Le prix d\'une unité × le nombre d\'unités en circulation', 'L\'argent réellement investi dedans', 'Le volume des dernières 24 h', 'Les bénéfices du projet'], 0, 'C\'est une mesure de taille : prix × unités en circulation. Elle ne dit pas combien d\'argent a été réellement investi.'),
        Q(2, 'Un jeton à 0,002 $ est-il forcément « moins cher » qu\'un jeton à 50 000 $ ?', ['Oui, son prix est plus faible', 'Non : il faut regarder le nombre d\'unités en circulation', 'Oui, il a plus de potentiel', 'Non, ils ont toujours la même valeur'], 1, 'Le prix unitaire dépend du nombre d\'unités. Seule la capitalisation permet de comparer la taille.'),
        Q(3, 'Sur un actif peu liquide, un gros ordre d\'achat au marché…', ['Est exécuté exactement au prix affiché', 'Obtient souvent un prix moyen moins bon (glissement)', 'Fait baisser le prix', 'Est toujours gratuit'], 1, 'Un gros ordre consomme les offres successives : le prix moyen se dégrade.'),
        Q(4, 'Que représente l\'écart achat/vente ?', ['Un coût implicite à chaque aller-retour', 'Un impôt', 'Une récompense', 'Le salaire de la plateforme'], 0, 'On achète un peu plus cher et on revend un peu moins cher que le prix milieu : c\'est un coût.'),
        Q(5, 'Dans le jeu, quel palier a les coûts les plus élevés ?', ['T1', 'T2', 'T3', 'T4'], 3, 'T4 regroupe les actifs les moins échangés : frais, écart et glissement y sont les plus forts.'),
      ] },
    },
    {
      id: 2,
      title: 'Les risques propres à la crypto',
      duration: '25 min',
      description: 'Garde des actifs, stablecoins, escroqueries, corrélation : les leçons de l\'histoire',
      content: `# Les risques propres à la crypto

## Le risque de marché
Les grandes cryptos ont déjà perdu 70 à 85 % de leur valeur (2014, 2018, 2022). Avant d'acheter, demande-toi : « quelle baisse puis-je supporter ? ».

## Qui garde tes actifs ?
Laissés sur une plateforme, tes actifs sont gardés par elle. Mt. Gox (2014), Celsius et FTX (2022) ont montré que des clients peuvent tout perdre alors que le cours n'avait pas bougé. Dans un portefeuille personnel, la **clé privée** (et sa phrase de récupération) est le seul secret : jamais communiquée, jamais saisie sur un site.

## Les stablecoins
Un stablecoin vise 1 $, mais n'est sûr que si ses réserves le sont. UST (2022) a décroché définitivement ; USDC (2023) a décroché brièvement quand une banque abritant une partie de ses réserves a fait faillite.

## Escroqueries et projets sans substance
Un rendement « garanti » élevé, une hausse fulgurante, un créateur anonyme qui vend : signaux d'alerte (Bitconnect, rug pulls). Les ICO de 2017 ont levé des fonds sur des promesses ; beaucoup n'ont jamais livré.

## La corrélation
En crise (mars 2020, 2022), les cryptos ont beaucoup suivi les actions technologiques : diversifier entre dix cryptos protège peu.

## Le risque réglementaire
Une décision dans un grand pays (Chine 2013, 2017, 2021) peut déplacer tout le marché en un jour.`,
      vocabulary: [
        { term: 'Portefeuille', definition: 'Outil qui garde les clés de tes cryptos', glossaryId: 'wallet' },
        { term: 'Clé privée', definition: 'Le secret qui donne le contrôle des fonds', glossaryId: 'cle-privee' },
        { term: 'Stablecoin', definition: 'Crypto visant 1 $', glossaryId: 'stablecoin' },
        { term: 'Décrochage', definition: 'Un stablecoin perd son ancrage', glossaryId: 'depeg' },
        { term: 'Risque de plateforme', definition: 'Faillite, piratage ou blocage des retraits', glossaryId: 'risque-plateforme' },
        { term: 'Baisse depuis un sommet', definition: 'Perte entre le plus haut et le point bas suivant', glossaryId: 'drawdown' },
        { term: 'Corrélation', definition: 'Actifs qui bougent ensemble', glossaryId: 'correlation' },
      ],
      quiz: { passingScore: 75, questions: [
        Q(1, 'La faillite d\'une plateforme peut te faire perdre tes cryptos même si leur cours ne baisse pas.', ['Vrai : les actifs laissés sur la plateforme sont gardés par elle', 'Faux : les cryptos sont toujours à l\'abri', 'Faux : les plateformes sont assurées par l\'État', 'Vrai seulement pour les stablecoins'], 0, 'C\'est le risque de contrepartie : Mt. Gox, Celsius, FTX.'),
        Q(2, 'À qui faut-il communiquer sa phrase de récupération ?', ['À personne, jamais', 'Au support d\'une plateforme', 'À un conseiller en ligne', 'À un ami de confiance'], 0, 'Aucun service sérieux ne la demande : qui l\'a contrôle les fonds.'),
        Q(3, 'Un stablecoin est…', ['Sans risque', 'Conçu pour valoir environ 1 $, mais peut décrocher', 'Toujours adossé à des dollars', 'Garanti par l\'État'], 1, 'Stable ne veut pas dire sans risque : UST et USDC l\'ont montré.'),
        Q(4, 'Pendant une crise comme mars 2020, que font souvent les cryptos ?', ['Elles montent car elles sont indépendantes', 'Elles baissent avec les actions : corrélation forte', 'Elles ne bougent pas', 'Elles sont suspendues'], 1, 'La corrélation monte en période de panique.'),
        Q(5, 'Un projet promet un rendement quotidien « garanti » élevé. Que penser ?', ['C\'est une bonne affaire', 'C\'est un signal d\'alerte classique d\'escroquerie', 'C\'est normal en crypto', 'C\'est garanti par la loi'], 1, 'Aucun rendement élevé n\'est garanti : Bitconnect en est l\'exemple.'),
      ] },
    },
    {
      id: 3,
      title: 'Passer des ordres : marché, limite, stop-loss, take-profit',
      duration: '25 min',
      description: 'Quel type d\'ordre pour quel objectif, et ce que coûte chaque exécution',
      content: `# Passer des ordres

## Au marché
Immédiat, mais tu ne maîtrises pas le prix exact : tu paies l'écart achat/vente et le glissement, et des frais de plateforme (preneur de liquidité).

## Ordre limite
Tu fixes ton prix. Tu es sûr du prix, pas de l'exécution. Un ordre limite qui attend paie des frais réduits (il « apporte » de la liquidité).

## Stop-loss
Un ordre de vente déclenché sous un seuil pour limiter une perte. Il ne garantit **pas** le prix : si le marché ouvre sous ton seuil, la vente se fait plus bas. Un stop trop proche est déclenché par des variations normales.

## Take-profit
Un ordre de vente déclenché par un objectif de gain. Il évite de décider sous l'euphorie, mais te prive de la hausse suivante.

## Échanger une crypto contre une autre
Sans repasser par les euros : pas d'impôt au moment de l'échange (en France, l'impôt vise la vente contre euros, au-delà d'un seuil de cessions annuelles). Tu paies seulement les frais et ton prix d'achat d'origine est conservé. Taux et seuils exacts : à vérifier sur service-public.fr.

## Dans le jeu
Les ordres sont exécutés par le serveur au prix de ta date simulée. Les ordres en attente sont évalués quand tu avances dans le temps, sur les bougies de la période.`,
      vocabulary: [
        { term: 'Ordre au marché', definition: 'Exécution immédiate au prix disponible', glossaryId: 'ordre-marche' },
        { term: 'Ordre limite', definition: 'Exécution seulement au prix choisi', glossaryId: 'ordre-limite' },
        { term: 'Stop-loss', definition: 'Vente déclenchée sous un seuil', glossaryId: 'stop-loss' },
        { term: 'Take-profit', definition: 'Vente déclenchée à un objectif de gain', glossaryId: 'take-profit' },
        { term: 'Échange crypto/crypto', definition: 'Sans impôt au moment de l\'échange', glossaryId: 'echange-crypto' },
        { term: 'Frais de réseau', definition: 'Payés au réseau pour inscrire une transaction', glossaryId: 'frais-reseau' },
      ],
      quiz: { passingScore: 75, questions: [
        Q(1, 'Un stop-loss garantit-il le prix de vente ?', ['Oui, exactement le seuil', 'Non : en cas de saut du marché, la vente se fait plus bas', 'Oui, avec des frais supplémentaires', 'Non, il ne se déclenche jamais'], 1, 'Un stop devient un ordre au marché quand il est déclenché : le prix peut être inférieur au seuil.'),
        Q(2, 'Quel ordre te garantit un prix mais pas l\'exécution ?', ['Au marché', 'Limite', 'Stop-loss', 'Aucun'], 1, 'L\'ordre limite ne s\'exécute que si le prix le touche.'),
        Q(3, 'Pourquoi un ordre limite qui attend paie-t-il moins de frais ?', ['Il apporte de la liquidité au carnet', 'Il est moins risqué', 'Il est plus petit', 'Il est imposé plus bas'], 0, 'Il ne « prend » pas la liquidité existante : il l\'apporte.'),
        Q(4, 'Que fait un take-profit ?', ['Vend quand un objectif de gain est atteint', 'Achète quand le prix baisse', 'Bloque les pertes', 'Garantit un gain'], 0, 'Il sécurise un gain, mais tu ne profites plus de la hausse suivante.'),
        Q(5, 'En France, un échange crypto contre crypto est imposé au moment de l\'échange ?', ['Oui, toujours', 'Non : l\'impôt intervient à la vente contre euros (seuils et taux à vérifier)', 'Oui au-delà de 10 euros', 'Jamais, même en vendant'], 1, 'C\'est le principe appliqué dans le jeu, avec des barèmes de jeu à reconfirmer.'),
      ] },
    },
    {
      id: 4,
      title: 'Levier, appel de marge et liquidation',
      duration: '25 min',
      description: 'Pourquoi emprunter sur ses cryptos amplifie les gains… et les pertes',
      content: `# Levier, appel de marge et liquidation

## L'effet de levier
Emprunter pour investir davantage amplifie le résultat dans les deux sens : un gain de 20 % sur un portefeuille financé à moitié par emprunt rapporte plus de 20 % sur ton capital propre, mais une perte aussi.

## Le prêt sur portefeuille du jeu
La banque prête jusqu'à **30 %** de la valeur de tes cryptos. Si ta dette dépasse **65 %** de cette valeur : **appel de marge** (tu dois rembourser ou acheter avant d'avancer dans le temps). Au-delà de **80 %** : **liquidation** — tes cryptos sont vendues de force avec une décote.

## Pourquoi c'est dangereux en crypto
Les prix peuvent chuter de moitié en un jour (jeudi noir, mars 2020). Le jeu évalue la garantie au **plus bas de la période** : plus sévère que la réalité, mais il montre que c'est le pire moment, pas la clôture, qui compte.

## Bonnes pratiques
Emprunte peu, garde une marge large, évite d'utiliser tout le prêt, et sache à l'avance ce que tu feras en cas d'appel de marge.`,
      vocabulary: [
        { term: 'Effet de levier', definition: 'Investir plus que son capital propre grâce à l\'emprunt', glossaryId: 'levier' },
        { term: 'Ratio dette/garantie', definition: 'Dette ÷ valeur de la garantie', glossaryId: 'ltv' },
        { term: 'Appel de marge', definition: 'Demande de régulariser une garantie insuffisante', glossaryId: 'appel-de-marge' },
        { term: 'Liquidation', definition: 'Vente forcée quand la garantie est insuffisante', glossaryId: 'liquidation' },
        { term: 'Prêt sur portefeuille', definition: 'Emprunt garanti par tes actifs', glossaryId: 'pret-portefeuille' },
      ],
      quiz: { passingScore: 75, questions: [
        Q(1, 'Que fait l\'effet de levier ?', ['Il réduit le risque', 'Il amplifie les gains et les pertes sur ton capital propre', 'Il supprime les frais', 'Il garantit un rendement'], 1, 'Le levier agit dans les deux sens.'),
        Q(2, 'Dans le jeu, jusqu\'à quelle part de la valeur de tes cryptos peux-tu emprunter ?', ['10 %', '30 %', '65 %', '100 %'], 1, '30 % à l\'ouverture ; 65 % = appel de marge ; 80 % = liquidation.'),
        Q(3, 'Que se passe-t-il quand la dette dépasse 80 % de la valeur de la garantie ?', ['Rien', 'Appel de marge seulement', 'Vente forcée de tes cryptos avec une décote', 'La banque efface la dette'], 2, 'C\'est la liquidation.'),
        Q(4, 'Pourquoi le jeu évalue-t-il la garantie au plus bas de la période ?', ['Pour te punir', 'Parce qu\'un krach se produit à un instant précis, pas à la clôture', 'Parce que les prix baissent toujours', 'Ce n\'est pas le cas'], 1, 'En réalité c\'est le pire moment qui déclenche l\'appel de marge ; le jeu le signale comme une simplification sévère.'),
        Q(5, 'Quelle bonne pratique réduit le risque de liquidation ?', ['Emprunter le maximum', 'Garder une large marge et emprunter peu', 'Ne jamais regarder le prix', 'Acheter uniquement des petits actifs'], 1, 'Une marge large laisse de la place aux baisses brutales.'),
      ] },
    },
    {
      id: 5,
      title: 'Lire un graphique : bougies, échelles, indicateurs',
      duration: '25 min',
      description: 'Bougies, échelle logarithmique, base 100, moyennes mobiles, RSI, MACD',
      content: `# Lire un graphique

## La bougie
Une bougie résume une période : ouverture, plus haut, plus bas, clôture. Corps vert si le prix a monté, rouge s'il a baissé. La dernière bougie peut être « en cours ».

## Les échelles
En **logarithmique**, une même variation en pourcentage a la même hauteur (10→20 comme 100→200). C'est l'échelle adaptée aux longues périodes. En **pourcentage**, on lit directement l'évolution depuis le début de la période affichée.

## Comparer des actifs
En **base 100**, tous les actifs partent de 100 : on compare des évolutions, pas des prix.

## Les indicateurs
- **Moyenne mobile (SMA, EMA)** : lisse les variations ; l'EMA réagit plus vite.
- **Bandes de Bollinger** : enveloppe autour d'une moyenne ; elle s'élargit quand le marché s'agite.
- **RSI** : de 0 à 100 ; au-dessus de 70 « surachat », sous 30 « survente » — mais une tendance forte reste longtemps dans ces zones.
- **MACD** : écart entre deux moyennes mobiles, comparé à sa propre moyenne.
Un indicateur **décrit le passé** ; aucun ne prédit l'avenir.

## Garde-fou du jeu
Le graphique ne montre jamais de données postérieures à ta date simulée.`,
      vocabulary: [
        { term: 'Bougie', definition: 'Ouverture, plus haut, plus bas, clôture', glossaryId: 'bougie' },
        { term: 'Échelle logarithmique', definition: 'Même pourcentage = même hauteur', glossaryId: 'echelle-log' },
        { term: 'Base 100', definition: 'Comparer des évolutions, pas des prix', glossaryId: 'base-100' },
        { term: 'Moyennes mobiles', definition: 'Lissent les prix (SMA, EMA)', glossaryId: 'moyenne-mobile' },
        { term: 'Bandes de Bollinger', definition: 'Enveloppe autour d\'une moyenne', glossaryId: 'bollinger' },
        { term: 'RSI', definition: 'Indicateur de 0 à 100', glossaryId: 'rsi' },
        { term: 'MACD', definition: 'Écart entre deux moyennes mobiles', glossaryId: 'macd' },
        { term: 'Halving', definition: 'Division par deux de la création de bitcoins', glossaryId: 'halving' },
      ],
      quiz: { passingScore: 75, questions: [
        Q(1, 'Sur une échelle logarithmique, passer de 10 à 20 et de 100 à 200 apparaissent…', ['Avec des hauteurs très différentes', 'Avec la même hauteur', 'Impossibles à afficher', 'Comme une baisse'], 1, 'Chaque doublement a la même hauteur : c\'est l\'intérêt de l\'échelle logarithmique.'),
        Q(2, 'Que montre la comparaison en base 100 ?', ['Les prix réels', 'Les évolutions relatives depuis une date commune', 'Les volumes', 'Les frais'], 1, 'Tous les actifs partent de 100 : on compare des pourcentages.'),
        Q(3, 'Un RSI à 80 signifie forcément qu\'une baisse va suivre ?', ['Oui', 'Non : une tendance forte peut y rester longtemps', 'Oui dans la semaine', 'Non, le RSI ne dépasse jamais 50'], 1, 'Le RSI décrit le passé récent, il ne prédit pas.'),
        Q(4, 'Que fait l\'EMA par rapport à la SMA ?', ['Elle est plus lente', 'Elle donne plus de poids aux prix récents', 'Elle est identique', 'Elle ignore les prix récents'], 1, 'L\'EMA réagit plus vite aux derniers prix.'),
        Q(5, 'Pourquoi le halving est-il « déjà intégré » dans le prix ?', ['Parce qu\'il est connu des années à l\'avance', 'Parce qu\'il est secret', 'Parce qu\'il n\'existe pas', 'Parce qu\'il est imposé'], 0, 'Un événement connu à l\'avance est anticipé par le marché.'),
      ] },
    },
  ],
  finalQuiz: {
    passingScore: 75,
    questions: [
      Q(1, 'Que dit la capitalisation d\'un actif ?', ['Sa taille (prix × unités en circulation)', 'Son bénéfice', 'Son volume', 'Sa sécurité'], 0, 'C\'est une mesure de taille.'),
      Q(2, 'Quel coût caché s\'ajoute à chaque aller-retour sur un actif peu liquide ?', ['L\'écart achat/vente et le glissement', 'Un impôt', 'Une cotisation', 'Aucun'], 0, 'Ces coûts sont plus forts sur les actifs peu échangés.'),
      Q(3, 'Quel est le risque d\'une plateforme qui garde tes cryptos ?', ['Faillite, piratage ou blocage des retraits', 'Aucun', 'Seulement la hausse des frais', 'Un changement de couleur'], 0, 'Mt. Gox, Celsius, FTX.'),
      Q(4, 'Un stop-loss…', ['Garantit le prix', 'Limite une perte mais peut s\'exécuter plus bas que le seuil', 'Empêche toute perte', 'Augmente les gains'], 1, 'Il devient un ordre au marché une fois déclenché.'),
      Q(5, 'Quel ordre utiliser pour sécuriser un gain à un objectif fixé ?', ['Take-profit', 'Stop-loss d\'achat', 'Aucun', 'Ordre limite d\'achat'], 0, 'Le take-profit vend quand l\'objectif est atteint.'),
      Q(6, 'Dans le jeu, à partir de quelle dette (÷ garantie) tes cryptos sont-elles vendues de force ?', ['30 %', '65 %', '80 %', '100 %'], 2, '30 % emprunt maximal, 65 % appel de marge, 80 % liquidation.'),
      Q(7, 'Un indicateur technique comme le RSI…', ['Prédit l\'avenir', 'Décrit le passé récent', 'Est garanti', 'Remplace l\'analyse des risques'], 1, 'Il décrit, il ne prédit pas.'),
      Q(8, 'Pendant une crise, les cryptos…', ['Sont indépendantes des actions', 'Ont souvent baissé en même temps que les actions', 'Montent toujours', 'Ne bougent pas'], 1, 'La corrélation monte en période de panique.'),
    ],
  },
};
