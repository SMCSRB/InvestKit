export const educationDomains = [
  {
    id: 'crypto',
    name: 'Cryptomonnaies',
    description: 'Maîtriser Bitcoin, Ethereum et DeFi',
    icon: '₿',
    color: '#F7931A',
    badge: '🪙',
    totalChapters: 10,
    chapters: [
      {
        id: 1,
        title: 'Les Bases de la Crypto',
        duration: '45 min',
        description: 'Découvrez les fondamentaux des cryptomonnaies',
        content: `# Les Bases de la Crypto

## Qu'est-ce qu'une Cryptomonnaie ?

Une cryptomonnaie est une monnaie numérique qui utilise la cryptographie pour sécuriser les transactions. Contrairement aux monnaies traditionnelles, elle n'est pas contrôlée par une banque centrale.

### Caractéristiques principales :
- **Décentralisée** : Pas d'autorité centrale
- **Transparente** : Toutes les transactions sont visibles
- **Sécurisée** : Utilise la cryptographie
- **Rapide** : Transactions quasi-instantanées
- **Accessible** : Disponible 24h/24, 7j/7

## Bitcoin - La Première Cryptomonnaie

Bitcoin a été créé en 2009 par Satoshi Nakamoto. C'est la cryptomonnaie la plus grande et la plus populaire avec une capitalisation de plus de 500 milliards de dollars.

### Points clés :
- Maximum de 21 millions de Bitcoin
- Transactions irréversibles
- Fonctionne sans intermédiaire
- Proof of Work pour valider les transactions

## Ethereum et les Altcoins

Ethereum a été créé en 2015 par Vitalik Buterin. Contrairement à Bitcoin, Ethereum permet l'exécution de programmes (smart contracts) sur sa blockchain.

Les altcoins sont toutes les autres cryptomonnaies en dehors de Bitcoin.

## Portefeuilles (Wallets)

Un portefeuille est un logiciel ou un appareil qui stocke vos clés privées. Il vous permet d'envoyer et de recevoir des cryptomonnaies.

Types :
- Portefeuilles chauds (en ligne)
- Portefeuilles froids (hors ligne)
- Portefeuilles matériels (hardware wallets)

## Exchanges et Trading

Les exchanges sont des plateformes où vous pouvez acheter, vendre et échanger des cryptomonnaies contre d'autres cryptos ou monnaies traditionnelles.

Exemples populaires : Binance, Coinbase, Kraken
`,
        vocabulary: [
          { term: 'Cryptomonnaie', definition: 'Monnaie numérique sécurisée par cryptographie' },
          { term: 'Bitcoin', definition: 'Première et plus grande cryptomonnaie' },
          { term: 'Blockchain', definition: 'Technologie de registre distribué' },
          { term: 'Ethereum', definition: 'Blockchain programmable avec smart contracts' },
          { term: 'Wallet', definition: 'Portefeuille digital pour stocker les cryptos' },
          { term: 'Exchange', definition: 'Plateforme d\'échange de cryptomonnaies' },
          { term: 'Token', definition: 'Unité de valeur sur une blockchain' },
          { term: 'Altcoin', definition: 'Toute cryptomonnaie autre que Bitcoin' },
        ],
        quiz: {
          passingScore: 75,
          questions: [
            {
              id: 1,
              text: 'Qui a créé Bitcoin ?',
              options: ['Satoshi Nakamoto', 'Vitalik Buterin', 'Charlie Lee', 'Barry Silbert'],
              correct: 0,
              explanation: 'Satoshi Nakamoto a créé Bitcoin en 2009 via le whitepaper Bitcoin',
            },
            {
              id: 2,
              text: 'Qu\'est-ce qu\'une cryptomonnaie ?',
              options: [
                'Une monnaie numérique sécurisée par cryptographie',
                'Un type de banque',
                'Une action en bourse',
                'Un algorithme'
              ],
              correct: 0,
              explanation: 'Une cryptomonnaie est une monnaie numérique décentralisée',
            },
            {
              id: 3,
              text: 'Quel est le maximum de Bitcoin ?',
              options: ['21 millions', '100 millions', 'Illimité', '1 million'],
              correct: 0,
              explanation: 'Il y aura maximum 21 millions de Bitcoin jamais créés',
            },
            {
              id: 4,
              text: 'Qui a créé Ethereum ?',
              options: ['Vitalik Buterin', 'Satoshi Nakamoto', 'Changpeng Zhao', 'Brian Armstrong'],
              correct: 0,
              explanation: 'Vitalik Buterin a créé Ethereum en 2015',
            },
            {
              id: 5,
              text: 'Quel type de portefeuille est le plus sécurisé ?',
              options: [
                'Portefeuille matériel (hardware wallet)',
                'Portefeuille en ligne',
                'Portefeuille mobile',
                'Tous ont le même niveau de sécurité'
              ],
              correct: 0,
              explanation: 'Les portefeuilles matériels sont le plus sûr car ils stockent les clés hors ligne',
            },
            {
              id: 6,
              text: 'Qu\'est-ce qu\'un altcoin ?',
              options: [
                'Toute cryptomonnaie autre que Bitcoin',
                'Une monnaie ancienne',
                'Une fausse cryptomonnaie',
                'Un type d\'action'
              ],
              correct: 0,
              explanation: 'Altcoin signifie "alternative coin" - toutes les cryptos autres que Bitcoin',
            },
            {
              id: 7,
              text: 'Qu\'est-ce qu\'un wallet ?',
              options: [
                'Un logiciel ou appareil stockant vos clés privées',
                'Une banque crypto',
                'Un échange de cryptomonnaies',
                'Un type de blockchain'
              ],
              correct: 0,
              explanation: 'Un wallet est un portefeuille digital qui gère vos cryptomonnaies',
            },
            {
              id: 8,
              text: 'Une blockchian est-elle transparente ?',
              options: [
                'Oui, toutes les transactions sont visibles',
                'Non, tout est secret',
                'Seulement pour les administrateurs',
                'Cela dépend de la cryptomonnaie'
              ],
              correct: 0,
              explanation: 'La blockchain est transparente - quiconque peut voir toutes les transactions',
            },
          ],
        },
      },
      {
        id: 2,
        title: 'Comment Fonctionne la Blockchain',
        duration: '50 min',
        description: 'Comprendre la technologie blockchain en détail',
        content: `# Comment Fonctionne la Blockchain

## La Structure de la Blockchain

Une blockchain est une chaîne de blocs. Chaque bloc contient :
- **Les données** (transactions)
- **Un hash** (identifiant unique)
- **Le hash du bloc précédent** (crée la chaîne)
- **Un timestamp** (horodatage)

### Exemple de bloc :
\`\`\`
Bloc 100:
- Transactions: Alice → Bob (1 BTC)
- Hash: 3a4f5d9...
- Hash précédent: 2b1c3e8...
- Timestamp: 2024-01-15
\`\`\`

## Les Mécanismes de Consensus

Un mécanisme de consensus est la façon dont le réseau décide quelles transactions sont valides.

### Proof of Work (PoW)
- Les mineurs résolvent des problèmes mathématiques complexes
- Le premier à résoudre ajoute le bloc suivant
- Consomme beaucoup d'électricité
- Utilisé par Bitcoin et Ethereum (anciennement)

### Proof of Stake (PoS)
- Les validateurs sont choisis au hasard
- Basé sur la quantité de cryptos qu'ils possèdent
- Beaucoup plus efficace énergétiquement
- Utilisé par Ethereum depuis 2022

## L'Immuabilité de la Blockchain

Pourquoi la blockchain est immuable :
1. Chaque bloc est lié au précédent par son hash
2. Modifier un bloc change son hash
3. Cela invaliderait tous les blocs suivants
4. Le réseau rejetterait ces modifications

Cette propriété rend la blockchain extrêmement sûre contre la fraude.

## Mining et Validateurs

### Mining (Proof of Work)
- Les mineurs utilisent du matériel spécialisé
- Ils reçoivent des récompenses en nouvelles cryptos et frais
- Difficulté augmente avec plus de mineurs

### Validation (Proof of Stake)
- Les validateurs "stakent" leurs cryptos
- Risquent de perdre leurs fonds s'ils valident mal
- Plus rapide et efficace que le mining

## Transaction sur une Blockchain

Étapes d'une transaction Bitcoin :
1. Une personne envoie Bitcoin
2. La transaction est diffusée à tous les nœuds
3. Les mineurs collectent les transactions
4. Ils resolvent un problème mathématique
5. Le nouveau bloc est ajouté
6. La transaction est confirmée (irréversible après 6 confirmations)
`,
        vocabulary: [
          { term: 'Bloc', definition: 'Ensemble de transactions groupées' },
          { term: 'Hash', definition: 'Identifiant unique cryptographique' },
          { term: 'Mining', definition: 'Processus de création et validation de blocs' },
          { term: 'Mineur', definition: 'Participant qui valide les transactions (PoW)' },
          { term: 'Nœud', definition: 'Ordinateur stockant une copie de la blockchain' },
          { term: 'Consensus', definition: 'Mécanisme d\'accord sur les transactions valides' },
          { term: 'Proof of Work', definition: 'Consensus basé sur la résolution de problèmes' },
          { term: 'Proof of Stake', definition: 'Consensus basé sur la possession de cryptos' },
        ],
        quiz: {
          passingScore: 75,
          questions: [
            {
              id: 1,
              text: 'Qu\'est-ce qu\'un bloc de blockchain ?',
              options: [
                'Un ensemble de transactions groupées',
                'Une personne',
                'Une banque',
                'Une adresse de portefeuille'
              ],
              correct: 0,
              explanation: 'Un bloc est un ensemble de transactions avec un hash unique',
            },
            {
              id: 2,
              text: 'Qu\'est-ce qu\'un hash ?',
              options: [
                'Un identifiant unique cryptographique',
                'Une transaction',
                'Un portefeuille',
                'Un échange'
              ],
              correct: 0,
              explanation: 'Un hash est une empreinte digitale unique créée par cryptographie',
            },
            {
              id: 3,
              text: 'Pourquoi la blockchain est-elle immuable ?',
              options: [
                'Chaque bloc est lié au précédent, modifier l\'un invaliderait tous les suivants',
                'Parce que c\'est une loi',
                'Parce que personne ne peut modifier',
                'C\'est juste un concept théorique'
              ],
              correct: 0,
              explanation: 'La structure en chaîne rend les modifications impossibles',
            },
            {
              id: 4,
              text: 'Quel est la différence entre PoW et PoS ?',
              options: [
                'PoW utilise le mining, PoS utilise le staking',
                'Il n\'y a pas de différence',
                'PoW est plus rapide',
                'PoS est plus ancien'
              ],
              correct: 0,
              explanation: 'PoW = Proof of Work, PoS = Proof of Stake - deux mécanismes différents',
            },
            {
              id: 5,
              text: 'Qu\'est-ce qu\'un nœud ?',
              options: [
                'Un ordinateur stockant une copie de la blockchain',
                'Une personne',
                'Un type de portefeuille',
                'Un mineur'
              ],
              correct: 0,
              explanation: 'Les nœuds sont les ordinateurs du réseau qui maintiennent la blockchain',
            },
            {
              id: 6,
              text: 'Combien de confirmations rend une transaction Bitcoin irréversible ?',
              options: ['6 confirmations', '1 confirmation', '3 confirmations', '10 confirmations'],
              correct: 0,
              explanation: 'Après 6 confirmations, une transaction est pratiquement irréversible',
            },
            {
              id: 7,
              text: 'Quel est le mécanisme de consensus le plus efficace énergétiquement ?',
              options: ['Proof of Stake', 'Proof of Work', 'Proof of Authority', 'Tous consomment pareil'],
              correct: 0,
              explanation: 'PoS consume beaucoup moins d\'énergie que PoW',
            },
            {
              id: 8,
              text: 'Qu\'est-ce qui lie les blocs entre eux ?',
              options: [
                'Le hash du bloc précédent',
                'Une transaction commune',
                'L\'adresse du mineur',
                'Rien, ils sont indépendants'
              ],
              correct: 0,
              explanation: 'Chaque bloc contient le hash du bloc précédent, créant la chaîne',
            },
          ],
        },
      },
      {
        id: 3,
        title: 'Sécurité et Gestion des Clés',
        duration: '50 min',
        description: 'Protéger vos cryptomonnaies et gérer les clés',
        content: `# Sécurité et Gestion des Clés

## Les Clés Privées et Publiques

Une paire de clés cryptographiques est fondamentale :

### Clé Privée
- Code secret de 256 bits
- Contrôle vos fonds
- JAMAIS à partager
- Perdre = perdre les fonds à jamais

### Clé Publique
- Dérivée de la clé privée
- Visible publiquement
- Crée votre adresse
- Permet aux autres de vérifier vos signatures

## Adresses Bitcoin

Une adresse Bitcoin est une version hashée et encodée de votre clé publique.

Caractéristiques :
- Commence par 1 (P2PKH), 3 (P2SH), ou bc1 (SegWit)
- 34 caractères alphanumériques
- Chaque adresse est unique
- Vous pouvez en générer plusieurs

## Types de Portefeuilles

### Portefeuilles Chauds
- Connectés à Internet
- Faciles d'accès
- Plus vulnérables aux hackages
- Idéaux pour le trading actif

### Portefeuilles Froids
- Hors ligne
- Très sécurisés
- Idéaux pour le stockage long terme
- Exemples: Ledger, Trezor

## Phrases de Récupération (Seed Phrases)

Une phrase de 12 ou 24 mots qui génère toutes vos clés privées.

Règles d'or :
- Notez-la physiquement (pas d'emails, photos)
- Stockez en lieu sûr
- Jamais en ligne
- Utilisez pour récupérer le portefeuille

## Risques de Sécurité

### Phishing
- Faux sites d'exchanges
- Emails d'escroquerie
- Vérifiez l\'URL avant de vous connecter

### Malwares
- Keyloggers, screen recorders
- Gardez votre antivirus à jour
- Ne téléchargez que de sources fiables

### Social Engineering
- Les arnaqueurs se font passer pour le support
- Les projets légitimes ne demandent jamais les clés privées
- Soyez sceptique

## Bonnes Pratiques

1. **Utilisez des portefeuilles matériels** pour les gros montants
2. **N'stockez jamais sur un exchange** - transférez vers votre portefeuille
3. **Activez la 2FA** partout où c'est possible
4. **Sauvegardez votre seed** en plusieurs endroits physiques sécurisés
5. **Vérifiez les adresses** avant d'envoyer des fonds
6. **Mettez à jour régulièrement** vos logiciels
`,
        vocabulary: [
          { term: 'Clé Privée', definition: 'Code secret qui contrôle vos fonds' },
          { term: 'Clé Publique', definition: 'Code public dérivé de la clé privée' },
          { term: 'Adresse', definition: 'Identifiant unique pour recevoir des fonds' },
          { term: 'Seed Phrase', definition: 'Phrase de 12-24 mots pour récupérer les clés' },
          { term: 'Portefeuille Froid', definition: 'Portefeuille hors ligne très sécurisé' },
          { term: 'Portefeuille Chaud', definition: 'Portefeuille en ligne, facile d\'accès' },
          { term: 'Phishing', definition: 'Arnaque pour voler vos informations' },
          { term: '2FA', definition: 'Authentification à deux facteurs pour plus de sécurité' },
        ],
        quiz: {
          passingScore: 75,
          questions: [
            {
              id: 1,
              text: 'Que faut-il jamais partager ?',
              options: [
                'Votre clé privée',
                'Votre adresse',
                'Votre clé publique',
                'Votre nom d\'utilisateur'
              ],
              correct: 0,
              explanation: 'La clé privée doit rester secrète à tout prix',
            },
            {
              id: 2,
              text: 'Qu\'est-ce qu\'une phrase de récupération ?',
              options: [
                'Une phrase de 12-24 mots générant toutes les clés',
                'Un mot de passe simple',
                'Une adresse Bitcoin',
                'Un code PIN'
              ],
              correct: 0,
              explanation: 'La seed phrase est critique pour récupérer votre portefeuille',
            },
            {
              id: 3,
              text: 'Quel portefeuille est le plus sécurisé ?',
              options: [
                'Un portefeuille froid/matériel',
                'Un portefeuille mobile',
                'Un portefeuille en ligne',
                'Un portefeuille sur exchange'
              ],
              correct: 0,
              explanation: 'Les portefeuilles matériels sont les plus sûrs car hors ligne',
            },
            {
              id: 4,
              text: 'Quel est un bon endroit pour stocker votre seed ?',
              options: [
                'Dans un coffre-fort physique sécurisé',
                'Dans un email chiffré',
                'Écrit sur un post-it',
                'Partout en ligne'
              ],
              correct: 0,
              explanation: 'Votre seed ne doit jamais être en ligne - stockage physique seulement',
            },
            {
              id: 5,
              text: 'Que fait le phishing ?',
              options: [
                'Vol des informations via des faux sites',
                'Ralentit la blockchain',
                'Augmente les frais',
                'Crée des nouvelles cryptos'
              ],
              correct: 0,
              explanation: 'Le phishing est une attaque pour voler vos données',
            },
            {
              id: 6,
              text: 'Où faut-il stocker vos cryptos sur le long terme ?',
              options: [
                'Sur un portefeuille froid personnel',
                'Sur un exchange',
                'Sur votre téléphone',
                'Chez une banque traditionnelle'
              ],
              correct: 0,
              explanation: 'Les exchanges ne sont pas des portefeuilles de long terme',
            },
            {
              id: 7,
              text: 'Qu\'est-ce que la 2FA ?',
              options: [
                'Authentification à deux facteurs (ex: mot de passe + SMS)',
                'Deux portefeuilles',
                'Deux adresses',
                'Une deuxième blockchain'
              ],
              correct: 0,
              explanation: '2FA = Two-Factor Authentication pour plus de sécurité',
            },
            {
              id: 8,
              text: 'Qui demande jamais votre clé privée ?',
              options: [
                'Personne - jamais un support légitime',
                'Les exchanges',
                'Les portefeuilles',
                'Les mineurs'
              ],
              correct: 0,
              explanation: 'Les projets légitimes ne demandent JAMAIS les clés privées',
            },
          ],
        },
      },
      {
        id: 4,
        title: 'Analyse Technique et Charting',
        duration: '60 min',
        description: 'Lire et analyser les graphiques crypto',
        content: `# Analyse Technique et Charting

## Les Bases de l'Analyse Technique

L'analyse technique suppose que l'historique des prix peut prédire les mouvements futurs.

### Principes fondamentaux :
- Les tendances persistent
- L'histoire se répète
- Les prix reflètent toutes les informations disponibles
- Les traders réagissent de manière prévisible

## Les Différents Types de Graphiques

### Chandelier Japonais (Candlestick)
- Montre l'ouverture, fermeture, min, max
- Vert = prix montant, Rouge = prix baissant
- Chaque chandelier = une période (1h, 4h, 1j, etc)

### Graphique à Ligne
- Relie les prix de fermeture
- Simple mais moins d'informations
- Bon pour voir la tendance générale

### Graphique à Barres
- Ressemble aux chandeliers
- Moins populaire
- Montre les mêmes données

## Tendances et Support/Résistance

### Tendance Haussière
- Série de hauts et bas croissants
- Acheteurs plus forts que les vendeurs

### Tendance Baissière
- Série de hauts et bas décroissants
- Vendeurs dominent

### Support et Résistance
- **Support** : Niveau où le prix rebondit vers le haut
- **Résistance** : Niveau où le prix rebondit vers le bas
- Les niveaux clés répétés deviennent plus importants

## Indicateurs Techniques Populaires

### Moyennes Mobiles (MA)
- MA 50 : Tendance court terme
- MA 200 : Tendance long terme
- Croisement = signal d'achat/vente

### Relative Strength Index (RSI)
- Mesure si le prix est suracheté ou survendu
- 0-30 : Survendu (achat potentiel)
- 70-100 : Suracheté (vente potentielle)

### MACD
- Montre la tendance et le momentum
- Croisement de lignes = signaux
- Très populaire chez les traders

### Bandes de Bollinger
- Bandes autour d'une moyenne mobile
- Sortie = volatilité
- Montre les niveaux extrêmes

## Volumes et Ordres

### Volume
- Quantité de crypto échangée
- Volume élevé = confirmation de la tendance
- Divergence volume-prix = attention

### Types d'Ordres
- **Ordre de marché** : Exécuté immédiatement
- **Ordre limite** : À un prix spécifique
- **Ordre stop** : Vente si prix baisse à un niveau
- **Ordre stop-limite** : Combine les deux

## Patterns de Graphique

### Head and Shoulders
- Haut, bas, haut plus bas, bas
- Signal baissier

### Double Top/Bottom
- Deux pics/creux au même niveau
- Renversement de tendance

### Triangles
- Convergence de support/résistance
- Cassure = forte tendance

## Points Importants

- Ne traded jamais sur un seul indicateur
- Utilisez plusieurs indicateurs pour confirmer
- Gérez toujours votre risque
- Un stop-loss est esssentiel
- Laissez les profits courir, limiter les pertes
`,
        vocabulary: [
          { term: 'Candlestick', definition: 'Graphique montrant OHLC (ouverture, haut, bas, fermeture)' },
          { term: 'Support', definition: 'Niveau où le prix rebondit vers le haut' },
          { term: 'Résistance', definition: 'Niveau où le prix rebondit vers le bas' },
          { term: 'Moyenne Mobile', definition: 'Moyenne du prix sur une période' },
          { term: 'RSI', definition: 'Indicateur mesurant suracheté/survendu' },
          { term: 'Volume', definition: 'Quantité de crypto échangée' },
          { term: 'Ordre Limite', definition: 'Ordre d\'achat/vente à un prix précis' },
          { term: 'Stop-Loss', definition: 'Ordre pour limiter les pertes à un niveau' },
        ],
        quiz: {
          passingScore: 75,
          questions: [
            {
              id: 1,
              text: 'Qu\'est-ce qu\'un candlestick vert ?',
              options: [
                'Le prix a augmenté pendant la période',
                'Le prix a baissé',
                'Le volume était élevé',
                'Les échanges étaient fermés'
              ],
              correct: 0,
              explanation: 'Vert = prix de fermeture > prix d\'ouverture',
            },
            {
              id: 2,
              text: 'Qu\'est-ce que le support ?',
              options: [
                'Niveau où le prix rebondit vers le haut',
                'Niveau de résistance',
                'Ligne de tendance',
                'Un type de blockchain'
              ],
              correct: 0,
              explanation: 'Le support est où les acheteurs arrivent',
            },
            {
              id: 3,
              text: 'Qu\'est-ce que le RSI ?',
              options: [
                'Indicateur mesurant suracheté/survendu',
                'Un type de wallet',
                'Une cryptomonnaie',
                'Un protocole'
              ],
              correct: 0,
              explanation: 'RSI = Relative Strength Index',
            },
            {
              id: 4,
              text: 'Qu\'indique un RSI > 70 ?',
              options: [
                'Le prix est probablement suracheté',
                'Le prix va augmenter',
                'Volume faible',
                'Signal d\'achat'
              ],
              correct: 0,
              explanation: 'RSI > 70 généralement suracheté, potentiel de baisse',
            },
            {
              id: 5,
              text: 'Qu\'est-ce qu\'une moyenne mobile 200 ?',
              options: [
                'Moyenne du prix sur 200 périodes',
                'Récompense de mining',
                'Type de trading',
                'Une commission'
              ],
              correct: 0,
              explanation: 'MA 200 montre la tendance long terme',
            },
            {
              id: 6,
              text: 'Quel est le rôle du volume en analyse technique ?',
              options: [
                'Confirmer la force d\'une tendance',
                'Déterminer le prix',
                'Mesurer la sécurité',
                'Rien d\'important'
              ],
              correct: 0,
              explanation: 'Volume élevé = confirmation de la tendance',
            },
            {
              id: 7,
              text: 'Qu\'est-ce qu\'un stop-loss ?',
              options: [
                'Ordre pour vendre si le prix baisse à un niveau',
                'Ordre pour acheter',
                'Frais de transaction',
                'Une stratégie d\'achat'
              ],
              correct: 0,
              explanation: 'Stop-loss = limitation des pertes',
            },
            {
              id: 8,
              text: 'Pourquoi est-il important d\'utiliser plusieurs indicateurs ?',
              options: [
                'Pour confirmer les signaux et réduire les faux signaux',
                'Un suffit toujours',
                'Pour regarder plus de graphiques',
                'C\'est une perte de temps'
              ],
              correct: 0,
              explanation: 'Plusieurs indicateurs = meilleure confirmation',
            },
          ],
        },
      },
      {
        id: 5,
        title: 'Altcoins et Tokens ERC-20',
        duration: '55 min',
        description: 'Comprendre les altcoins et les tokens',
        content: `# Altcoins et Tokens ERC-20

## Qu'est-ce qu'un Altcoin ?

Altcoin = "Alternative Coin" = Toute cryptomonnaie autre que Bitcoin.

### Catégories :
- **Altcoins utilitaires** : Ethereum, Litecoin
- **Tokens** : Construits sur d'autres blockchains
- **Stablecoins** : Attachés à une devise (USDT, USDC)
- **Memecoins** : Dogecoin, Shiba Inu

## Ethereum et la Blockchain Programmable

Ethereum a révolutionné la crypto en permettant les smart contracts.

### Smart Contracts
- Code automatisé qui s'exécute sur la blockchain
- "Si X alors Y"
- Transparents et immuables
- Fondation de la DeFi

### Gas (Frais)
- Frais mesurés en "Wei"
- Varient selon la congestion du réseau
- Plus rapide = plus cher
- Remboursement des gaz non utilisés

## Les Tokens ERC-20

ERC-20 = Ethereum Request for Comment 20 = Standard de token.

### Caractéristiques :
- Contrats intelligents sur Ethereum
- Suivent une interface commune
- Compatible avec tous les portefeuilles
- Exemple : USDT, LINK, UNI

### Cas d'usage :
- Tokens utilitaires (gouvernance)
- Tokens de protocole (participation)
- Tokens d'échange (frais réduits)
- Tokens de reward (incitations)

## Autres Standards de Token

### BEP-20 (Binance Smart Chain)
- Similaire à ERC-20
- Plus rapide et moins cher
- Croissance rapide

### SPL (Solana)
- Sur blockchain Solana
- Très rapide et efficace

## Comment Évaluer un Altcoin

### Analyses Fondamentales :
- **Cas d'usage** : Le projet résout-il un problème ?
- **Équipe** : Expérience et antécédents ?
- **Communauté** : Engagement sur les réseaux ?
- **Partenariats** : Collaborations importantes ?
- **Technologie** : Innovation réelle ?

### Analyses de Risque :
- **Concentration** : Qui détient le plus de tokens ?
- **Tokens bloqués** : Combien sont libérés par mois ?
- **Vulnérabilités** : Audits de sécurité ?
- **Réglementation** : Risques légaux ?

## Pump & Dump et Arnaque

### Pompes et Déversements
- Groupes qui gonflent puis vendront le prix
- Prédateurs aux petites capitalisations
- À éviter absolument

### Red Flags :
- Promesses de gains garantis
- Pressions à acheter rapidement
- Influenceurs payés discrètement
- Pas d'équipe publique
- Technologie copiée d'autres projets

## Points de Prudence

- La plupart des altcoins disparaîtront
- Ne mettez que ce que vous pouvez perdre
- Diversifiez votre portefeuille
- Faites vos propres recherches (DYOR)
- Les petites capitalisations = grand risque
`,
        vocabulary: [
          { term: 'Altcoin', definition: 'Toute cryptomonnaie autre que Bitcoin' },
          { term: 'Ethereum', definition: 'Blockchain programmable avec smart contracts' },
          { term: 'Smart Contract', definition: 'Code autonome sur la blockchain' },
          { term: 'Gas', definition: 'Frais de transaction sur Ethereum' },
          { term: 'ERC-20', definition: 'Standard de token sur Ethereum' },
          { term: 'Stablecoin', definition: 'Cryptomonnaie attachée à une devise' },
          { term: 'Token', definition: 'Actif numérique sur une blockchain' },
          { term: 'DYOR', definition: 'Do Your Own Research (Faire ses propres recherches)' },
        ],
        quiz: {
          passingScore: 75,
          questions: [
            {
              id: 1,
              text: 'Qu\'est-ce qu\'un altcoin ?',
              options: [
                'Toute cryptomonnaie autre que Bitcoin',
                'Une fausse cryptomonnaie',
                'Une ancienne monnaie',
                'Un type de token'
              ],
              correct: 0,
              explanation: 'Altcoin = Alternative Coin',
            },
            {
              id: 2,
              text: 'Qu\'est-ce qu\'Ethereum ?',
              options: [
                'Une blockchain programmable permettant les smart contracts',
                'Un type de Bitcoin',
                'Un exchange',
                'Un portefeuille'
              ],
              correct: 0,
              explanation: 'Ethereum a introduit la programmabilité à la blockchain',
            },
            {
              id: 3,
              text: 'Qu\'est-ce qu\'un smart contract ?',
              options: [
                'Code autonome qui s\'exécute automatiquement sur la blockchain',
                'Un contrat légal',
                'Une transaction',
                'Un type de portefeuille'
              ],
              correct: 0,
              explanation: 'Smart contracts = programmation sur la blockchain',
            },
            {
              id: 4,
              text: 'Qu\'est-ce que le Gas sur Ethereum ?',
              options: [
                'Les frais de transaction mesurés en Wei',
                'Un type de combustible',
                'Une blockchain',
                'Un type de token'
              ],
              correct: 0,
              explanation: 'Gas = frais pour exécuter des opérations',
            },
            {
              id: 5,
              text: 'Qu\'est-ce qu\'ERC-20 ?',
              options: [
                'Un standard de token sur Ethereum',
                'Un type de blockchain',
                'Une cryptomonnaie',
                'Un échange'
              ],
              correct: 0,
              explanation: 'ERC-20 = Ethereum Request for Comment 20',
            },
            {
              id: 6,
              text: 'Qu\'est-ce qu\'un stablecoin ?',
              options: [
                'Cryptomonnaie attachée à une devise fiat',
                'Un token défaillant',
                'Une monnaie non stable',
                'Un type de blockchain'
              ],
              correct: 0,
              explanation: 'Exemple : USDT attaché au dollar américain',
            },
            {
              id: 7,
              text: 'Quel est le plus grand risque d\'investir dans les altcoins ?',
              options: [
                'La plupart disparaîtront et deviendront sans valeur',
                'Bitcoin diminuera',
                'Les exchanges fermeront',
                'La technologie sera hackée'
              ],
              correct: 0,
              explanation: 'Les altcoins ont un risque beaucoup plus élevé que Bitcoin',
            },
            {
              id: 8,
              text: 'Qu\'est-ce qu\'un "pump and dump" ?',
              options: [
                'Gonflage de prix puis vente massive par les manipulateurs',
                'Une stratégie d\'investissement legitime',
                'Une tendance haussière',
                'Un type de trading'
              ],
              correct: 0,
              explanation: 'Pump & dump = arnaque à éviter absolument',
            },
          ],
        },
      },
      {
        id: 6,
        title: 'Introduction à la DeFi et Smart Contracts',
        duration: '60 min',
        description: 'Comprendre la Finance Décentralisée et les contrats intelligents',
        content: `# Introduction à la DeFi et Smart Contracts

## La Finance Décentralisée (DeFi)

DeFi = Finance Décentralisée = Services financiers sans intermédiaires.

### Comparaison CeFi vs DeFi
- **CeFi** : Banques centralisées contrôlent les fonds
- **DeFi** : Vous contrôlez vos fonds via smart contracts

### Avantages de DeFi :
- Accès 24/7
- Pas de tiers de confiance
- Frais généralement plus bas
- Transparence complète
- Pas besoin de KYC pour la plupart

## Smart Contracts

Un smart contract est un programme automatisé sur la blockchain.

### Caractéristiques :
- **Autonome** : S'exécute seul quand les conditions sont remplies
- **Transparent** : Tout le monde peut voir le code
- **Immuable** : Ne peut pas être changé après déploiement
- **Déterministe** : Même résultat chaque fois

### Exemple :
\`\`\`
Si l'utilisateur A envoie 1 ETH
Et l'utilisateur B envoie 1 USDC
Alors : Échange les actifs automatiquement
\`\`\`

## Protocoles DeFi Majeurs

### Échanges Décentralisés (DEX)
- **Uniswap** : Swap de tokens sans intermédiaire
- **Curve** : Optimisé pour les stablecoins
- **SushiSwap** : Clone amélioré d'Uniswap

### Prêts et Emprunts
- **Aave** : Prêter et emprunter des cryptos
- **Compound** : Protocole de prêt autonome
- **MakerDAO** : Générer DAI stable

### Rendement (Yield Farming)
- Fournir des liquidités et recevoir des récompenses
- Risque : Perte impermanente
- Rendements très variables

## Liquidité et Pools de Liquidité

### Comment ça marche :
- Vous fournissez 2 actifs (ex: ETH + USDC)
- Vous recevez des frais de chaque trade utilisant votre liquidité
- Vous risquez une "perte impermanente" si les prix changent

### Exemple :
Vous fournissez 1 ETH + 2000 USDC
Plus tard, ETH = 3000 USDC
Vous auriez eu plus si vous aviez juste hodlé

## Risques de la DeFi

### Risques Techniques :
- **Bugs** : Failles dans les smart contracts
- **Hacks** : Exploitation de vulnérabilités
- **Rugs** : Développeurs qui disparaissent avec les fonds

### Risques Financiers :
- **Liquidations** : Positions fermées si elles baissent
- **Volatilité** : Pertes importantes possibles
- **Impermanent Loss** : Perte en fournissant la liquidité

### Risques Réglementaires :
- Régulation incertaine
- Risque de non-conformité

## Stratégies DeFi Communes

### Hodling
- Acheter et conserver long terme

### Staking
- Bloquer les fonds pour obtenir des récompenses

### Yield Farming
- Fournir de la liquidité pour des intérêts

### Arbitrage
- Profiter des différences de prix entre protocoles

## Points Important

- Vérifiez les audits de sécurité
- Commencez petit
- Comprenez les risques
- Ne mettez pas tout au même endroit
- Restez vigilant aux arnaque
`,
        vocabulary: [
          { term: 'DeFi', definition: 'Finance Décentralisée sans intermédiaires' },
          { term: 'Smart Contract', definition: 'Programme autonome sur la blockchain' },
          { term: 'DEX', definition: 'Exchange Décentralisé pour échanger des tokens' },
          { term: 'Liquidity Pool', definition: 'Pool de tokens fournissant de la liquidité' },
          { term: 'Yield Farming', definition: 'Fournir de la liquidité pour obtenir des récompenses' },
          { term: 'Staking', definition: 'Bloquer des cryptos pour obtenir des intérêts' },
          { term: 'Impermanent Loss', definition: 'Perte en fournissant de la liquidité' },
          { term: 'Liquidation', definition: 'Fermeture forcée de position en prêt' },
        ],
        quiz: {
          passingScore: 75,
          questions: [
            {
              id: 1,
              text: 'Qu\'est-ce que la DeFi ?',
              options: [
                'Finance Décentralisée sans intermédiaires',
                'Finance centralisée',
                'Un exchange',
                'Un portefeuille'
              ],
              correct: 0,
              explanation: 'DeFi = Finance Décentralisée utilisant des smart contracts',
            },
            {
              id: 2,
              text: 'Qu\'est-ce qu\'un smart contract ?',
              options: [
                'Programme autonome qui s\'exécute quand les conditions sont remplies',
                'Un contrat légal',
                'Une transaction',
                'Un type de blockchain'
              ],
              correct: 0,
              explanation: 'Les smart contracts sont la base de la DeFi',
            },
            {
              id: 3,
              text: 'Qu\'est-ce qu\'une pool de liquidité ?',
              options: [
                'Fonds que vous fournissez pour permettre les échanges',
                'Une banque',
                'Un portefeuille',
                'Une blockchain'
              ],
              correct: 0,
              explanation: 'Vous fournissez 2 actifs et recevez des frais',
            },
            {
              id: 4,
              text: 'Qu\'est-ce que le yield farming ?',
              options: [
                'Fournir de la liquidité pour obtenir des récompenses',
                'Miner des cryptos',
                'Acheter des actions',
                'Un type de staking'
              ],
              correct: 0,
              explanation: 'Rendements potentiellement élevés mais avec risques',
            },
            {
              id: 5,
              text: 'Qu\'est-ce que la "perte impermanente" ?',
              options: [
                'Perte qui peut survenir en fournissant de la liquidité si les prix changent',
                'Perte permanente',
                'Un hack',
                'Une liquidation'
              ],
              correct: 0,
              explanation: 'Peut être restituée si les prix reviennent',
            },
            {
              id: 6,
              text: 'Quel est le plus grand risque en DeFi ?',
              options: [
                'Les bugs et hacks des smart contracts',
                'La volatilité seulement',
                'Pas de risque réel',
                'Les frais de transaction'
              ],
              correct: 0,
              explanation: 'Risques techniques sont significants en DeFi',
            },
            {
              id: 7,
              text: 'Qu\'est-ce qu\'un DEX ?',
              options: [
                'Exchange Décentralisé sans contrôle central',
                'Un exchange centralisé',
                'Un portefeuille',
                'Un protocole de prêt'
              ],
              correct: 0,
              explanation: 'Exemples : Uniswap, Curve, SushiSwap',
            },
            {
              id: 8,
              text: 'Avant d\'utiliser un protocole DeFi, vous devez :',
              options: [
                'Vérifier les audits de sécurité et comprendre les risques',
                'Investir tout votre argent',
                'Ignorer les risques',
                'Suivre les influenceurs'
              ],
              correct: 0,
              explanation: 'Due diligence = clé du succès en DeFi',
            },
          ],
        },
      },
      {
        id: 7,
        title: 'Stratégies d\'Investissement Crypto',
        duration: '65 min',
        description: 'Stratégies et techniques d\'investissement en cryptomonnaies',
        content: `# Stratégies d'Investissement Crypto

## Hodling (Buy and Hold)

HODL = Hold On for Dear Life = Acheter et conserver longtemps.

### Avantages :
- Stress minimal
- Pas besoin de trader activement
- Bénéficie de la croissance long terme
- Avantages fiscaux dans certains pays

### Points clés :
- Ignorez les fluctuations court terme
- Restez investi pendant les "crypto hiver"
- Diversifiez votre portefeuille
- Restez patient

## Dollar Cost Averaging (DCA)

Investir un montant fixe régulièrement, peu importe le prix.

### Exemple :
- 100€ chaque mois dans Bitcoin
- Vous achetez plus cher certains mois, moins cher d'autres
- À long terme, lisse les prix d'achat

### Avantages :
- Réduit l'impact de la volatilité
- Discipliné
- Parfait pour les débutants

## Trading Actif

Acheter et vendre pour profiter des fluctuations.

### Stratégies :
- **Swing Trading** : Détenir quelques jours/semaines
- **Day Trading** : Multiples opérations par jour
- **Scalping** : Trades très courts (minutes)

### Défis :
- Nécessite beaucoup de temps
- Frais élevés
- Impôts complexes
- Psychologie difficile

## Diversification

Ne mettez jamais tous les œufs dans le même panier.

### Allocation suggérée :
- 60% Bitcoin (grande capitalisation)
- 20% Ethereum (deuxième plus grande)
- 10% Altcoins prometteurs
- 10% Cash/Stablecoins

### Types de diversification :
- Par capitalisation (grande, moyenne, petite)
- Par cas d'usage (paiements, smart contracts, etc)
- Par géographie (projets de différentes régions)

## Gestion du Risque

### Sizing de Position
- Commencez petit (1-5% du portefeuille)
- Augmentez avec confiance
- Jamais plus de 25% en une seule position

### Stop-Loss
- Vendre automatiquement à une certaine perte
- Protège contre les pertes catastrophiques
- Psychologiquement difficile mais important

### Prises de Bénéfices
- Vendre une partie après une forte hausse
- Cristallise les gains
- Réduit la volatilité émotionnelle

## Analyse Fondamentale

### Points à Analyser :
- **Problème résolu** : Le projet résout-il un réel besoin ?
- **Compétition** : Qui d'autre résout ce problème ?
- **Équipe** : Expérience et track record ?
- **Adoption** : Qui utilise le projet ?
- **Tokenomics** : Distribution et libération de tokens

### Questions à Poser :
- Le projet a-t-il été audité pour la sécurité ?
- Quel est le roadmap futur ?
- Comment se compare-t-il aux concurrents ?
- La communauté est-elle active ?

## Psychologie du Trading

### Erreurs Communes :
- **FOMO** : Acheter parce que ça monte (Fear of Missing Out)
- **FUD** : Vendre paniqué après une baisse (Fear, Uncertainty, Doubt)
- **Euphorie** : Risquer trop après des gains
- **Sunk Cost** : Conserver une mauvaise position "jusqu'au retour"

### Conseils :
- Définissez votre stratégie à l'avance
- Collez-la même si c'est difficile
- Prenez du recul émotionnellement
- Ne tradez pas en colère ou peur

## Impôts sur les Cryptomonnaies

### Points clés :
- Les gains sont généralement imposables
- Les pertes peuvent réduire les impôts
- Le holding long terme peut avoir des avantages
- Documentez tout

Consultez un fiscaliste pour votre juridiction.
`,
        vocabulary: [
          { term: 'HODL', definition: 'Acheter et conserver long terme' },
          { term: 'DCA', definition: 'Dollar Cost Averaging - investir régulièrement' },
          { term: 'Trading', definition: 'Acheter et vendre pour profiter des prix' },
          { term: 'Swing Trading', definition: 'Trading sur plusieurs jours/semaines' },
          { term: 'Diversification', definition: 'Spread des investissements sur plusieurs actifs' },
          { term: 'FOMO', definition: 'Fear of Missing Out - peur de rater' },
          { term: 'FUD', definition: 'Fear, Uncertainty, Doubt - peur et doute' },
          { term: 'Sizing de Position', definition: 'Taille d\'un investissement dans un actif' },
        ],
        quiz: {
          passingScore: 75,
          questions: [
            {
              id: 1,
              text: 'Qu\'est-ce que le HODL ?',
              options: [
                'Acheter et conserver long terme',
                'Trading actif',
                'Une stratégie de day trading',
                'Un type de portefeuille'
              ],
              correct: 0,
              explanation: 'HODL = Hold On for Dear Life',
            },
            {
              id: 2,
              text: 'Quel est l\'avantage du Dollar Cost Averaging ?',
              options: [
                'Lisse les prix d\'achat en investissant régulièrement',
                'Garantit un profit',
                'Élimine la volatilité',
                'Réduit les frais'
              ],
              correct: 0,
              explanation: 'DCA réduit l\'impact du timing de marché',
            },
            {
              id: 3,
              text: 'Quel est le risque du FOMO ?',
              options: [
                'Acheter sans réfléchir parce que le prix monte',
                'Manquer un profit',
                'Frais élevés',
                'Pas de risque'
              ],
              correct: 0,
              explanation: 'FOMO = Fear of Missing Out - mène à des décisions impulsives',
            },
            {
              id: 4,
              text: 'Quelle est une bonne allocation pour un débutant ?',
              options: [
                '60% BTC, 20% ETH, 10% alts, 10% cash',
                '100% Bitcoin',
                '100% Altcoins',
                'Pas d\'importance'
              ],
              correct: 0,
              explanation: 'Diversification = clé pour réduire le risque',
            },
            {
              id: 5,
              text: 'Quel est le rôle d\'un stop-loss ?',
              options: [
                'Vendre automatiquement pour limiter les pertes',
                'Garantir un profit',
                'Augmenter les gains',
                'Aucun rôle'
              ],
              correct: 0,
              explanation: 'Stop-loss = protection contre les pertes catastrophiques',
            },
            {
              id: 6,
              text: 'Qu\'est-ce que le swing trading ?',
              options: [
                'Détenir des positions plusieurs jours/semaines',
                'Trading intraday',
                'Stratégie long terme',
                'Une cryptomonnaie'
              ],
              correct: 0,
              explanation: 'Entre le day trading et le long terme',
            },
            {
              id: 7,
              text: 'Comment évaluer un projet en analysant les fondamentaux ?',
              options: [
                'Problème résolu, équipe, adoption, concurrence, tokenomics',
                'Juste le prix du coin',
                'La réputation du fondateur',
                'Les avis sur Twitter'
              ],
              correct: 0,
              explanation: 'Analyse fondamentale = recherche profonde',
            },
            {
              id: 8,
              text: 'Qu\'est-ce que le FUD ?',
              options: [
                'Fear, Uncertainty, Doubt - peur et sentiment négatif',
                'Un type de blockchain',
                'Un indicateur technique',
                'Une stratégie de trading'
              ],
              correct: 0,
              explanation: 'FUD = réactions émotionnelles négatives',
            },
          ],
        },
      },
      {
        id: 8,
        title: 'Sécurité Avancée et Risques',
        duration: '60 min',
        description: 'Approfondissez la sécurité et comprenez les risques en crypto',
        content: `# Sécurité Avancée et Risques

## Menaces Cyber Avancées

### Attaques par Malveillance

**Keyloggers** : Capturent ce que vous tapez
- Signes : Délai de frappe anormal
- Prévention : Antivirus, browser securisé

**Screen Recorders** : Enregistrent votre écran
- Risques : Voir vos clés
- Prévention : Logiciels de sécurité à jour

**Man in the Middle** : Interceptent les communications
- Risques : WiFi public compromis
- Prévention : VPN, HTTPS seulement

### Smart Contract Exploits

Même les contrats audités peuvent avoir des failles.

Exemples :
- **Re-entrancy** : Exploitation de boucles
- **Overflow/Underflow** : Débordement numérique
- **Logic Flaws** : Erreurs dans la logique

Mitigation :
- Vérifiez les audits
- Testez d'abord avec peu de fonds
- Regardez l'historique du projet

## Arnaque Sociales

### Phishing Avancé

Emails clonant parfaitement les services légitimes.

Protection :
- Vérifiez l'URL exacte (pas just-similaire.com)
- Utilisez les signets (bookmarks)
- Activez 2FA même sur les faux sites
- Méfiez-vous des emails non sollicités

### Usurpation d'Identité

Arnaqueurs se font passer pour le support ou des influenceurs.

Red Flags :
- Demandes de clés privées
- Demandes urgentes
- Messages directs surprises
- Liens de connexion dans les DMs

### Romance Scams Crypto

Créent une relation fictive puis demandent d'investir.

Protections :
- Faites une recherche inversée des photos
- Méfiez-vous des relations trop rapides
- Demandez à parler en vidéo
- Jamais d'argent à quelqu'un en ligne

## Risques de Marché

### Liquidations Futures

En trading avec levier, vous risquez une liquidation.

Exemple :
- 1000$ avec 10x levier = 10,000$ position
- 10% de baisse = liquidation complète
- Glissement à liquidation = perte totale

### Black Swan Events

Événements imprévisibles provoquant des crashes:
- Crash du marché général
- Nouvelles légales sévères
- Hack majeur d'un exchange
- Événement géopolitique

Mitigation :
- Diversifiez
- Gardez du cash
- Dimensionner les positions pour survivre
- Pas de levier excessif

### Volatilité Extrême

Bitcoin peut fluctuer de 20% en une journée.

À accepter :
- Pas de certitude
- Les tendances changent
- Les pertes arrivent
- Nécessite de la patience

## Risques Réglementaires

### Incertitude Légale

Les régulations évoluent rapidement.

Pays restrictifs :
- Chine : Interdiction complète (2021)
- Russie : Restrictions croissantes
- États-Unis : Réglementation fragmentée

Pays favorables :
- El Salvador : Bitcoin cours légal
- Suisse : Framework clair
- Portugal : Gains non imposés (ancien)

### Taxes Complexes

Les règles fiscales varient énormément:
- Certains pays imposent les gains
- Certains imposent les transferts
- Certains exemptent le long terme

Action :
- Consultez un fiscaliste
- Documentez vos transactions
- Respectez les lois locales

## Risques de Contrepartie

### Exchange Insolvency

L'exchange peut faire faillite ou disparaître.

2022 : FTX a volé 8 milliards de $ en fonds utilisateurs.

Protections :
- Ne stockez pas sur exchanges longtemps
- Utilisez des exchanges réputés
- Transférez vers votre portefeuille

### Hack d'Exchange

Les exchanges sont des cibles majeures.

Histoire :
- Mt Gox (2014) : 500M$ volés
- Binance (2019) : 40M$ volés
- Plusieurs autres...

Protections :
- Multi-sig wallets
- Assurances (où disponibles)
- Diversifiez les exchanges

## Gestion Holistique du Risque

### Portfolio Allocation
- 70% Actifs sûrs (Bitcoin, Ethereum)
- 20% Altcoins etablis
- 10% Expérimental (startup crypto)

### Position Sizing
- Jamais plus de 5-10% par altcoin
- Stop-loss défini à l'avance
- Prises de bénéfices régulières

### Plan B Réaliste
- Acceptez les pertes possibles
- Ne tradez qu'avec l'argent superflu
- Gardez 6 mois d'urgence de côté
- Pas d'endettement pour investir
`,
        vocabulary: [
          { term: 'Keylogger', definition: 'Malware capturant les frappes clavier' },
          { term: 'Phishing', definition: 'Arnaque pour voler les identifiants' },
          { term: 'Re-entrancy', definition: 'Exploit de smart contract' },
          { term: 'Liquidation', definition: 'Fermeture forcée de position leveragée' },
          { term: 'Black Swan', definition: 'Événement imprévisible et catastrophique' },
          { term: 'Slippage', definition: 'Glissement de prix pendant une transaction' },
          { term: 'Contrepartie', definition: 'Entité à qui vous confiez vos fonds' },
          { term: 'KYC', definition: 'Know Your Customer - vérification d\'identité' },
        ],
        quiz: {
          passingScore: 75,
          questions: [
            {
              id: 1,
              text: 'Qu\'est-ce qu\'un keylogger ?',
              options: [
                'Malware qui capture ce que vous tapez',
                'Un type de blockchain',
                'Un portefeuille',
                'Un exchange'
              ],
              correct: 0,
              explanation: 'Gardez votre antivirus à jour',
            },
            {
              id: 2,
              text: 'Comment se protéger du phishing ?',
              options: [
                'Vérifier l\'URL exacte et utiliser les signets',
                'Pas besoin de protection',
                'Faire confiance aux URLs similaires',
                'Cliquer sur les liens des emails'
              ],
              correct: 0,
              explanation: 'Le phishing reste la menace #1 en crypto',
            },
            {
              id: 3,
              text: 'Qu\'est-ce qu\'une liquidation dans le trading leveragé ?',
              options: [
                'Fermeture forcée de votre position avec perte totale',
                'Gain automatique',
                'Sécurité du trading',
                'Type de staking'
              ],
              correct: 0,
              explanation: 'Avec levier 10x, une baisse de 10% = liquidation',
            },
            {
              id: 4,
              text: 'Qu\'est-ce qu\'un "black swan event" ?',
              options: [
                'Événement imprévisible provoquant un crash',
                'Un type de cryptomonnaie',
                'Une stratégie de trading',
                'Une blockchain'
              ],
              correct: 0,
              explanation: 'Exemple : régulation sévère soudaine',
            },
            {
              id: 5,
              text: 'Où ne faut-il pas laisser les cryptos longtemps ?',
              options: [
                'Sur un exchange',
                'Dans un portefeuille personnel',
                'Dans un hardware wallet',
                'Pas de différence'
              ],
              correct: 0,
              explanation: 'Les exchanges ont des risques de hack et faillite',
            },
            {
              id: 6,
              text: 'Quel allocation de risque est raisonnable ?',
              options: [
                '70% sûrs, 20% médium, 10% risqués',
                '100% altcoins',
                'Pas d\'importance',
                '10% sûrs, 90% risqués'
              ],
              correct: 0,
              explanation: 'Gestion du risque = base du succès',
            },
            {
              id: 7,
              text: 'Qu\'est-ce qu\'une attaque "man in the middle" ?',
              options: [
                'Interception des communications sur WiFi public',
                'Un hack de blockchain',
                'Un type de phishing',
                'Une arnaque sociale'
              ],
              correct: 0,
              explanation: 'Utilisez un VPN sur WiFi public',
            },
            {
              id: 8,
              text: 'Le levier 10x est-il recommandé pour les débutants ?',
              options: [
                'Non, très dangereux, même pro évitent',
                'Oui, les profits sont garantis',
                'Peut-être, dépend du marché',
                'Le levier n\'a pas d\'impact'
              ],
              correct: 0,
              explanation: 'Le levier amplifie les pertes - à éviter pour les débutants',
            },
          ],
        },
      },
      {
        id: 9,
        title: 'Analyse Fondamentale Avancée',
        duration: '65 min',
        description: 'Analyses approfondies pour évaluer les projets crypto',
        content: `# Analyse Fondamentale Avancée

## On-Chain Analysis

L'analyse on-chain examine les données directes de la blockchain.

### Métriques de Transaction

**Transaction Volume**
- Volume élevé = adoption croissante
- À combiner avec le prix pour chercher les divergences
- Révèle si la hausse est appuyée par l'usage

**Nombre d'Adresses Actives**
- Plus d'adresses = plus d'utilisateurs
- Croissance = intérêt croissant
- Déclin = perte d'adoption

**Adresses Riches**
- Whales = grandes balances
- Concentration risquée si trop concentrée
- Mouvements peuvent signaler intentions

### Métriques de Santé

**Age Moyen des Coins**
- Coins jeunes = accumulés récemment
- Coins anciens = holders fidèles

**Réalisé vs Marked Price**
- Si markéd prix > prix réalisé = coins achetés haut
- Si markéd prix < prix réalisé = holders gagnants

**Stock to Flow**
- Bitcoin : Ratio de réserve / émission annuelle
- Prédicteur historique du prix

## Analyse Tokenomics

### Distribution des Tokens

**Allocation Initiale**
- Fondateurs : 10-20% idéal
- Équipe : 10-20%
- Community : Devrait être significatif
- Reservés : Dépend du use case

**Libération (Vesting)**
- Regarde quand les tokens sont libérés
- Vesting long = engagement équipe
- Libération massive prochaine = risque de dump

**Inflation**
- Taux d'émission annuel
- Haute inflation = dilution
- Basse inflation = rareté

### Gouvernance

**DAO (Decentralized Autonomous Organization)**
- Titulaires de tokens votent
- Plus transparent que développateurs centralisés
- Vitesse de changement peut être lente

**Centralisation des Votes**
- Si quelques adresses contrôlent les votes = risque
- Diversification nécessaire
- Histoire de participation

## Analyse de Marché

### Capitalisation et Ranking

**Market Cap** = Prix × Supply
- Met en perspective les tokens
- Beaucoup manipulable avec peu de volume

**Liquidité**
- Spread buy/sell
- Volume sur exchanges majeurs
- Illiquidité = risque de ne pas pouvoir vendre

### Relation avec Bitcoin

**Corrélation**
- Plupart des altcoins très corrélés avec Bitcoin
- Décorrélation = cas d'usage unique

**Dominance Bitcoin**
- % de Bitcoin dans le marché global
- Altseason = Bitcoin down, altcoins up

## Analyse Technique Avancée

### Volume Profile

Distribution du volume à différents prix.

Insights :
- Niveaux de support/résistance forts
- Points d'équilibre
- Directions probables de rupture

### Market Structure

**Higher Highs & Higher Lows** = Tendance haussière
**Lower Highs & Lower Lows** = Tendance baissière

Invalidation :
- Hausse = rupture du précédent bas
- Baisse = rupture du précédent haut

### Order Book Analysis

Commandes non exécutées à différents prix.

Signaux :
- Murs de vente = résistance
- Murs d'achat = support
- Déséquilibre = direction probable

## Analyse Fondamentale Complète

Checklist d'évaluation :

### Technologie
- [ ] Code bien documenté ?
- [ ] Équipe technique compétente ?
- [ ] Sécurité audité ?
- [ ] Avancées constantes ?

### Adoption
- [ ] Qui utilise réellement le projet ?
- [ ] Cas d'usage réels en production ?
- [ ] Partenariats significatifs ?
- [ ] Croissance utilisateurs ?

### Économie
- [ ] Model économique durable ?
- [ ] Sources de revenu ?
- [ ] Tokenomics équitable ?
- [ ] Équilibre offre/demande ?

### Équipe
- [ ] Fondateurs reconnus ?
- [ ] Track record de succès ?
- [ ] Équipe diverse et stable ?
- [ ] Transparence ?

### Communauté
- [ ] Engagement actif ?
- [ ] Pas juste des spéculateurs ?
- [ ] Diversité d'opinions ?
- [ ] Croissance organique ?

## Red Flags Avancés

🚩 Tokenomics
- Inflation très élevée (>50% annuel)
- Distribution centralisée
- Vesting court pour fondateurs

🚩 Technique
- Code non audité
- Pas de mise à jour depuis longtemps
- Bugs de sécurité reportés
- Forks constants

🚩 Marché
- Pump & dump patterns
- Washtrading apparent
- Liquidité illusoire
- Dominance d'une adresse

🚩 Équipe
- Développeurs anonymes
- Pas de track record
- Communication défensive
- Bannissement de questions
`,
        vocabulary: [
          { term: 'On-chain Analysis', definition: 'Analyse des données de la blockchain' },
          { term: 'Tokenomics', definition: 'Distribution et économie des tokens' },
          { term: 'Whales', definition: 'Adresses détenant de grands montants' },
          { term: 'Vesting', definition: 'Libération progressive des tokens' },
          { term: 'DAO', definition: 'Organisation autonome décentralisée' },
          { term: 'Market Cap', definition: 'Prix total de tous les tokens' },
          { term: 'Volume Profile', definition: 'Distribution du volume par prix' },
          { term: 'Order Book', definition: 'Liste des ordres d\'achat/vente' },
        ],
        quiz: {
          passingScore: 75,
          questions: [
            {
              id: 1,
              text: 'Qu\'est-ce que l\'analyse on-chain ?',
              options: [
                'Analyse des données publiques de la blockchain',
                'Trading intraday',
                'Analyse des prix seulement',
                'Une nouvelle cryptomonnaie'
              ],
              correct: 0,
              explanation: 'On-chain = données de la blockchain elle-même',
            },
            {
              id: 2,
              text: 'Qu\'est-ce que la tokenomics ?',
              options: [
                'Distribution et économie des tokens',
                'Technique de trading',
                'Type de blockchain',
                'Un portefeuille'
              ],
              correct: 0,
              explanation: 'Tokenomics crucial pour la viabilité',
            },
            {
              id: 3,
              text: 'Qu\'est-ce qu\'un "whale" ?',
              options: [
                'Une adresse détenant une énorme quantité de tokens',
                'Un type de pool',
                'Un exchange',
                'Un protocole DeFi'
              ],
              correct: 0,
              explanation: 'Les whales peuvent manipuler les prix',
            },
            {
              id: 4,
              text: 'Qu\'est-ce que le vesting ?',
              options: [
                'Libération progressive des tokens sur du temps',
                'Investissement court terme',
                'Un type de trading',
                'Une stratégie de prix'
              ],
              correct: 0,
              explanation: 'Vesting long = engagement équipe',
            },
            {
              id: 5,
              text: 'Qu\'est-ce qu\'une DAO ?',
              options: [
                'Organisation autonome décentralisée gouvernée par token holders',
                'Une entreprise centralisée',
                'Un exchange',
                'Une blockchain'
              ],
              correct: 0,
              explanation: 'Gouvernance démocratique par les titulaires',
            },
            {
              id: 6,
              text: 'Qu\'est-ce que la Market Cap ?',
              options: [
                'Prix × Supply en circulation',
                'Volume journalier',
                'Gains en pourcentage',
                'Nombre de transactions'
              ],
              correct: 0,
              explanation: 'Mesure de la taille relative du projet',
            },
            {
              id: 7,
              text: 'Qu\'indique une corrélation élevée avec Bitcoin ?',
              options: [
                'L\'altcoin suit Bitcoin, peu d\'utilité unique',
                'L\'altcoin est indépendant',
                'L\'altcoin a une technologie unique',
                'Rien de spécifique'
              ],
              correct: 0,
              explanation: 'Décorrélation = cas d\'usage unik',
            },
            {
              id: 8,
              text: 'Qu\'est-ce qu\'un "volume profile" ?',
              options: [
                'Distribution du volume de trading à différents niveaux de prix',
                'Ligne du volume',
                'Type de candlestick',
                'Un indicateur technique'
              ],
              correct: 0,
              explanation: 'Identifie niveaux clés support/résistance',
            },
          ],
        },
      },
      {
        id: 10,
        title: 'L\'Avenir de la Crypto et Cas d\'Usage Réels',
        duration: '70 min',
        description: 'Exploration des cas d\'usage réels et de l\'avenir de la crypto',
        content: `# L'Avenir de la Crypto et Cas d'Usage Réels

## Cas d'Usage Actuels Réussis

### Paiements Transfrontaliers

**Problem** : Envoyer de l'argent à l'étranger = cher et lent
**Solution** : Crypto permet transferts internationaux instant et cheap

Exemples réels :
- El Salvador : Bitcoin comme monnaie officielle
- Philippines : Remittances via crypto (5% frais vs 7-10% avec banques)
- Afrique : M-Pesa type services utilisant la blockchain

**Impact** : Milliards en frais économisés

### Smart City Infrastructure

**Problem** : Paiements automatisés, chaîne d'approvisionnement opaque
**Solution** : IoT + Blockchain pour transparence et automatisation

Cas d'usage :
- Péages automatiques utilisant des smart contracts
- Suivi des produits pharmaceutiques évitant les contrefaçons
- Gestion énergétique décentralisée

### Supply Chain Transparency

**Problem** : Impossible de vérifier l'authenticité et provenance
**Solution** : Blockchain enregistre chaque étape

Exemples :
- **Diamants** : Kimberley Process utilisant blockchain
- **Café** : Traçabilité de la ferme au café
- **Pharma** : Chaîne d'approvisionnement vérifiable

### Financial Inclusion

**Problem** : 1.7 milliards sans compte bancaire
**Solution** : Crypto accessible avec juste un téléphone

Réalité :
- Kenya/Uganda : Mobile money sur blockchain
- El Salvador : Bitcoin wallet pour underbanked
- Venezuela : Population utilisant crypto pour inflation

## Technologies Émergentes

### Layer 2 Solutions

Bitcoin et Ethereum deviennent rapides et pas chers:

**Lightning Network** (Bitcoin)
- Paiements off-chain
- Micro-transactions instantanées
- Coûte presque rien

**Rollups** (Ethereum)
- Arbitrum, Optimism, zkSync
- Transactions groupées
- 100x+ plus rapide que mainnet

### Interopérabilité Cross-Chain

**Problem** : Blockchains isolées
**Solution** : Bridges permettant transferts inter-chaînes

Projets :
- Cosmos : Hub de blockchains
- Polkadot : Relay chain connecting parachains
- Bridges : Wormhole, Stargate

Impact : Fragmentation réduite, plus d'options

### Privacy Coins

Bitcoin est transparent (mauvais pour la confidentialité)

Solutions :
- **Monero** : Confidentiel par défaut
- **Zcash** : Transactions discrètes optionnelles
- **Tornado Cash** : Mixer Ethereum (bannit par US)

Usage réel : Dissidents, protection financière

## Adoptions Institutionnelles

### Corporate Treasuries

Les entreprises accumulent Bitcoin comme réserve.

Exemples :
- **MicroStrategy** : 174,530 BTC acquis
- **Tesla** : 1.5 milliards $ Bitcoin
- **Square** : Investissement Bitcoin significatif

Raison : Inflation hedge, alternative à cash

### Banks & Financial Institutions

Les banques ajoutent services crypto:

Exemples :
- **Fidelity** : Custody crypto pour institutions
- **Goldman Sachs** : Trading desk crypto
- **Credit Suisse** : Services de banque d'investissement

Impact : Légitimité accrue, adoption mainstream

## Défis Futurs

### Régulation

Le plus grand risque pour la crypto actuellement.

Scénarios :
- **Optimiste** : Régulation claire favorisant innovation
- **Pessimiste** : Interdiction ou restriction sévère
- **Probable** : Régulation fragmentée par juridiction

### Scalabilité

Bitcoin = 7 tx/sec, Visa = 50,000 tx/sec

Solutions en progrès :
- Lightning, Rollups, Sidechains
- Consensus améliorés (PoS)
- Sharding (Ethereum 2.0)

### Défi Environnemental

PoW consomme beaucoup d'électricité.

Évolutions :
- Bitcoin : De plus en plus en énergies renouvelables
- Ethereum : Transition complète à PoS (99.95% moins énergie)
- Nouveaux projets : PoS dès le démarrage

### Adoption de la Couche Utilisateur

La plupart des utilisateurs ne comprennent pas la crypto.

Besoin :
- UX simplifiée
- Wallets plus faciles
- Less jargon
- Éducation

## Vision Positive pour l'Avenir

### Décentralisation Financière Généralisée

- Chacun contrôle ses propres fonds
- Accès égal au système financier mondial
- Transactions peer-to-peer sans intermédiaires
- Censure impossible

### Programmation Financière

- Toute personne peut créer des produits financiers
- Composition ("money legos")
- Innovation accélérée

### Propriété Numérique Vérifiée

- NFTs sérieux (au-delà du JPEG art)
- Propriété intellectuelle transparente
- Royalties automatiques pour créateurs

### Internet Monétaire Natif

- Micropaiements sans friction
- Économies entièrement peer-to-peer
- Valeur créée directement récompensée

## Vos Responsabilités comme Investisseur

1. **Comprendre ce que vous investissez**
2. **Gérer vos risques activement**
3. **Rester informé des développements**
4. **Respecter les lois locales**
5. **Contribuer positivement à l'écosystème**

La crypto est une révolution technologique ET financière.
Votre rôle n'est pas juste de faire du profit,
mais de participer à la construction d'un système meilleur.

## Prochain Chapitre

Continuez à apprendre, expérimenter, et grandir dans cet espace.
La crypto est plus une marathon qu'un sprint.

Bonne chance dans votre voyage !
`,
        vocabulary: [
          { term: 'Layer 2', definition: 'Solutions réduisant la charge sur la blockchain principale' },
          { term: 'Lightning Network', definition: 'Protocole de paiement rapide Bitcoin' },
          { term: 'Rollups', definition: 'Scaling solutions groupant les transactions' },
          { term: 'Bridge', definition: 'Connexion entre deux blockchains' },
          { term: 'Privacy Coin', definition: 'Cryptomonnaie confidentielle par défaut' },
          { term: 'Treasury', definition: 'Réserve de fonds d\'une entreprise' },
          { term: 'NFT', definition: 'Token non-fongible, propriété numérique unique' },
          { term: 'Sharding', definition: 'Technique de partitionnement de la blockchain' },
        ],
        quiz: {
          passingScore: 75,
          questions: [
            {
              id: 1,
              text: 'Quel est un cas d\'usage réel réussi des cryptomonnaies ?',
              options: [
                'Paiements transfrontaliers et remittances',
                'Spec ulation pure',
                'Blanchiment d\'argent',
                'Remplacer Internet'
              ],
              correct: 0,
              explanation: 'Les remittances en crypto sauvent milliards en frais',
            },
            {
              id: 2,
              text: 'Qu\'est-ce que le Lightning Network ?',
              options: [
                'Protocole de paiement Bitcoin ultra-rapide et cheap',
                'Nouvelle cryptomonnaie',
                'Un exchange',
                'Type de blockchain'
              ],
              correct: 0,
              explanation: 'Résout les problèmes de scalabilité Bitcoin',
            },
            {
              id: 3,
              text: 'Quel est le plus grand défi pour l\'adoption crypto ?',
              options: [
                'La régulation et la clarté légale',
                'La technologie',
                'Le prix du Bitcoin',
                'Les miners'
              ],
              correct: 0,
              explanation: 'Régulation = clé pour croissance institutionnelle',
            },
            {
              id: 4,
              text: 'Qu\'est-ce qu\'une "privacy coin" ?',
              options: [
                'Cryptomonnaie avec transactions confidentielles par défaut',
                'Monnaie pour les criminels',
                'Monnaie économique',
                'Une blockchain'
              ],
              correct: 0,
              explanation: 'Exemple : Monero, Zcash',
            },
            {
              id: 5,
              text: 'Combien consomme PoS vs PoW en énergie ?',
              options: [
                'PoS utilise 99.95% moins d\'énergie',
                'Pareil',
                'PoW est plus efficace',
                'Dépend de la cryptomonnaie'
              ],
              correct: 0,
              explanation: 'Ethereum 2.0 réduit 99.95% l\'utilisation',
            },
            {
              id: 6,
              text: 'Les NFTs ne sont-ils que de l\'art ?',
              options: [
                'Non, ils peuvent représenter n\'importe quelle propriété digitale',
                'Oui, juste de l\'art JPEG',
                'C\'est une arnaque',
                'Pas important'
              ],
              correct: 0,
              explanation: 'Licence, propriété intellectuelle, etc.',
            },
            {
              id: 7,
              text: 'Quel est le rôle des entreprises accumulant Bitcoin ?',
              options: [
                'Hedge contre l\'inflation et réserve de valeur',
                'Manipuler le marché',
                'Rien de spécifique',
                'Investissement court terme'
              ],
              correct: 0,
              explanation: 'Bitcoin = réserve de valeur moderne',
            },
            {
              id: 8,
              text: 'Quel est votre rôle en tant qu\'investisseur crypto ?',
              options: [
                'Comprendre, gérer les risques, rester légal, contribuer positivement',
                'Juste faire du profit',
                'Suivre les influenceurs',
                'Pas d\'importance'
              ],
              correct: 0,
              explanation: 'Responsabilité = base de l\'écosystème sain',
            },
          ],
        },
      },
    ],
    finalQuiz: {
      passingScore: 75,
      questions: [
        {
          id: 1,
          text: 'Quel est le maximum total de Bitcoin qui existera jamais ?',
          options: ['21 millions', '100 millions', 'Illimité', '1 million'],
          correct: 0,
          explanation: 'Il y aura exactement 21 millions de Bitcoin au maximum',
        },
        {
          id: 2,
          text: 'Quel mécanisme de consensus est le plus efficace énergétiquement ?',
          options: ['Proof of Stake', 'Proof of Work', 'Proof of Authority', 'Tous identiques'],
          correct: 0,
          explanation: 'PoS consume 99.95% moins que PoW',
        },
        {
          id: 3,
          text: 'Qu\'est-ce qu\'une clé privée ?',
          options: [
            'Code secret contrôlant vos fonds',
            'Adresse publique',
            'Code PIN du portefeuille',
            'Numéro de compte'
          ],
          correct: 0,
          explanation: 'La clé privée ne doit jamais être partagée',
        },
        {
          id: 4,
          text: 'Quel est le plus grand risque du trading avec levier ?',
          options: [
            'Liquidation complète',
            'Frais élevés',
            'Pas de risque réel',
            'Gains limités'
          ],
          correct: 0,
          explanation: 'Le levier amplifie énormément les pertes',
        },
        {
          id: 5,
          text: 'Qu\'est-ce que la DeFi ?',
          options: [
            'Finance Décentralisée sans intermédiaires',
            'Finance centralisée',
            'Un exchange',
            'Une blockchain'
          ],
          correct: 0,
          explanation: 'DeFi révolutionne l\'accès aux services financiers',
        },
        {
          id: 6,
          text: 'Quel est un avantage majeur de Dollar Cost Averaging ?',
          options: [
            'Lisse les prix d\'achat en investissant régulièrement',
            'Garantit un profit',
            'Élimine la volatilité complètement',
            'Réduit les frais'
          ],
          correct: 0,
          explanation: 'DCA réduit l\'impact du timing du marché',
        },
        {
          id: 7,
          text: 'Où ne faut-il pas stocker de gros montants de crypto longtemps ?',
          options: [
            'Sur un exchange',
            'Dans un hardware wallet',
            'Dans un portefeuille personnel',
            'Dans une banque'
          ],
          correct: 0,
          explanation: 'Les exchanges ne sont pas des vaults de stockage',
        },
        {
          id: 8,
          text: 'Qu\'est-ce que l\'analyse on-chain ?',
          options: [
            'Analyse des données publiques de la blockchain',
            'Trading rapide',
            'Analyse des prix seulement',
            'Une stratégie de trading'
          ],
          correct: 0,
          explanation: 'On-chain = données brutes du registre distribué',
        },
        {
          id: 9,
          text: 'Quel est un cas d\'usage réel majeur des cryptomonnaies ?',
          options: [
            'Remittances transfrontalières efficaces',
            'Spec ulation pure',
            'Crime uniquement',
            'Remplacer Internet'
          ],
          correct: 0,
          explanation: 'La crypto sauve milliards en frais de transfer',
        },
        {
          id: 10,
          text: 'Qu\'est-ce qu\'un smart contract ?',
          options: [
            'Code autonome qui s\'exécute automatiquement sur blockchain',
            'Un contrat légal électronique',
            'Une transaction',
            'Un type de portefeuille'
          ],
          correct: 0,
          explanation: 'Les smart contracts sont la base de la DeFi',
        },
      ],
    },
  },
];
