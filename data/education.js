export const educationDomains = [
  {
    id: 'crypto',
    name: 'Cryptomonnaies',
    description: 'Maîtriser Bitcoin, Ethereum et DeFi',
    icon: '₿',
    color: '#F7931A',
    badge: '🪙',
    totalChapters: 4,
    chapters: [
      {
        id: 1,
        title: 'Fondamentaux du Bitcoin',
        duration: '45 min',
        description: 'Découvrez les bases de Bitcoin et de la blockchain',
        content: `
# Fondamentaux du Bitcoin

## Qu'est-ce que Bitcoin ?

Bitcoin est une monnaie numérique créée en 2009 par une personne (ou groupe) utilisant le pseudonyme Satoshi Nakamoto. C'est la première cryptomonnaie décentralisée basée sur la technologie blockchain.

### Caractéristiques principales :
- **Décentralisé** : Pas de banque centrale ni d'autorité unique
- **Transparent** : Toutes les transactions sont visibles sur la blockchain
- **Sécurisé** : Utilise la cryptographie pour sécuriser les transactions
- **Limité** : Maximum 21 millions de Bitcoin (rareté)

## La Blockchain

La blockchain est un registre digital distribué où toutes les transactions sont enregistrées. Chaque bloc contient :
- Les transactions récentes
- Un hash unique (empreinte numérique)
- Le hash du bloc précédent (crée une chaîne)

Cette structure rend impossible la modification des données historiques sans que tout le monde le remarque.

## Mining (Minage)

Le mining est le processus par lequel les nouveaux Bitcoin sont créés et les transactions sont validées.

### Comment ça fonctionne :
1. Les mineurs collectent les transactions non validées
2. Ils résolvent un problème mathématique complexe
3. Le premier à le résoudre ajoute un nouveau bloc
4. Le mineur reçoit une récompense en Bitcoin

## Halving

Tous les 4 ans, la récompense de minage est divisée par 2. Cela contrôle la création de nouveaux Bitcoin et maintient la rareté.

Timeline des halvings :
- 2012 : 50 BTC → 25 BTC
- 2016 : 25 BTC → 12.5 BTC
- 2020 : 12.5 BTC → 6.25 BTC
- 2024 : 6.25 BTC → 3.125 BTC

## Portefeuille et Clés

### Clés Privées
- Secrète, unique, contrôle vos Bitcoin
- À JAMAIS partager avec quiconque
- Perte = perte définitive des fonds

### Clés Publiques / Adresses
- Dérivée de la clé privée
- Utilisée pour recevoir des Bitcoin
- Partager avec d'autres pour recevoir des fonds

## Volatilité et Valeur

Le prix de Bitcoin fluctue énormément. Facteurs influençant le prix :
- Adoption institutionnelle
- Régulation gouvernementale
- Sentiment du marché
- Offre et demande
- Nouvelles macroéconomiques

Bitcoin est à la fois :
- Un actif de spéculation (volatile)
- Une réserve de valeur (store of value)
- Un moyen de paiement décentralisé
        `,
        vocabulary: [
          { term: 'Bitcoin', definition: 'Première cryptomonnaie décentralisée créée en 2009' },
          { term: 'Blockchain', definition: 'Registre digital distribué contenant toutes les transactions' },
          { term: 'Hash', definition: 'Empreinte numérique unique d\'un bloc' },
          { term: 'Mining', definition: 'Processus de création de nouveaux Bitcoin et validation des transactions' },
          { term: 'Satoshi', definition: 'Plus petite unité de Bitcoin (0.00000001 BTC)' },
          { term: 'Halving', definition: 'Réduction de moitié de la récompense de minage tous les 4 ans' },
          { term: 'Clé Privée', definition: 'Code secret qui contrôle vos Bitcoin' },
          { term: 'Clé Publique', definition: 'Adresse derivée de la clé privée, utilisée pour recevoir des fonds' },
        ],
        quiz: {
          questions: [
            {
              id: 1,
              text: 'Qui a créé Bitcoin ?',
              options: ['Satoshi Nakamoto', 'Vitalik Buterin', 'Charlie Lee', 'Barry Silbert'],
              correct: 0,
              explanation: 'Satoshi Nakamoto est le créateur anonyme de Bitcoin (whitepaper 2008)'
            },
            {
              id: 2,
              text: 'Quel est le nombre maximum de Bitcoin qui existera ?',
              options: ['21 millions', '100 millions', 'Illimité', '1 million'],
              correct: 0,
              explanation: 'Bitcoin a une limite de 21 millions pour maintenir la rareté'
            },
            {
              id: 3,
              text: 'Que se passe-t-il lors du halving ?',
              options: [
                'La récompense de minage est divisée par 2',
                'Le prix double',
                'La blockchain se divise',
                'Les transactions deviennent plus rapides'
              ],
              correct: 0,
              explanation: 'Le halving réduit la récompense de minage tous les 4 ans'
            },
            {
              id: 4,
              text: 'Qu\'est-ce qu\'une clé privée ?',
              options: [
                'Un code secret qui contrôle vos Bitcoin',
                'Votre adresse Bitcoin',
                'Un identifiant public',
                'Une transaction encryptée'
              ],
              correct: 0,
              explanation: 'La clé privée est secrète et ne doit JAMAIS être partagée'
            },
            {
              id: 5,
              text: 'Combien de satoshis égalent 1 Bitcoin ?',
              options: ['100 000 000', '1 000 000', '10 000 000', '1 000'],
              correct: 0,
              explanation: '1 BTC = 100 000 000 satoshis (sat)'
            },
            {
              id: 6,
              text: 'Quel est le rôle principal du mining ?',
              options: [
                'Créer de nouveaux Bitcoin et valider les transactions',
                'Stocker les données',
                'Gérer les portefeuilles',
                'Échanger des monnaies'
              ],
              correct: 0,
              explanation: 'Le mining crée les nouveaux Bitcoin et valide les transactions'
            },
            {
              id: 7,
              text: 'La blockchain est-elle transparente ?',
              options: [
                'Oui, toutes les transactions sont visibles',
                'Non, c\'est complètement privé',
                'Seulement pour les mineurs',
                'Seulement pour les autorités'
              ],
              correct: 0,
              explanation: 'La blockchain est publique et transparente par design'
            },
            {
              id: 8,
              text: 'Si vous perdez votre clé privée, que se passe-t-il ?',
              options: [
                'Vous perdez l\'accès définitif à vos Bitcoin',
                'Vous pouvez la récupérer via email',
                'Le réseau vous la renvoie',
                'Vous devez attendre 30 jours'
              ],
              correct: 0,
              explanation: 'Perte de clé privée = perte définitive et irrécupérable des fonds'
            }
          ],
          passingScore: 75,
        }
      },
      {
        id: 2,
        title: 'Ethereum et Smart Contracts',
        duration: '60 min',
        description: 'Découvrez Ethereum et la programmation décentralisée',
        locked: true,
        content: `
# Ethereum et Smart Contracts

## Qu'est-ce qu'Ethereum ?

Ethereum est une blockchain créée en 2015 par Vitalik Buterin. Contrairement à Bitcoin qui est principalement une monnaie, Ethereum est une plateforme qui permet de créer des applications décentralisées.

### Différences avec Bitcoin :
- **Bitcoin** : Monnaie et store of value
- **Ethereum** : Plateforme complète pour les dApps

## Smart Contracts

Un smart contract est un programme qui s'exécute automatiquement sur la blockchain quand certaines conditions sont remplies.

### Caractéristiques :
- Auto-exécution : Pas besoin d'intermédiaire
- Immuable : Impossible à modifier une fois déployé
- Transparent : Code visible sur la blockchain
- Trustless : Pas besoin de faire confiance

### Exemple simple :
\`\`\`
Si Bob envoie 1 ETH à Alice,
Alors Alice reçoit automatiquement 10 tokens
\`\`\`

## Ether (ETH)

Ether est le token natif d'Ethereum. Il est utilisé pour :
- Payer les frais de transaction (gas)
- Récompenser les validateurs
- Interagir avec les smart contracts

## Gas et Frais

Le gas est une unité qui mesure la complexité d'une transaction.

### Calcul des frais :
\`Frais = Gas Used × Gas Price\`

Exemple :
- Transaction simple : ~21,000 gas
- Interaction smart contract : ~100,000+ gas
- Gas Price : 20 Gwei (peut fluctuer)
- Frais totaux = 21,000 × 20 = 420,000 Gwei = 0.0042 ETH

## dApps (Applications Décentralisées)

Les dApps utilisent les smart contracts d'Ethereum pour offrir des services sans intermédiaire.

### Exemples :
- **Uniswap** : Exchange décentralisé
- **Aave** : Lending décentralisé
- **MakerDAO** : Stablecoin décentralisé
- **OpenSea** : Marché NFT

## Proof of Stake (PoS)

Depuis 2022, Ethereum utilise PoS au lieu de Proof of Work.

### Comment ça fonctionne :
- Les validateurs "mettent en jeu" 32 ETH
- Ils gagnent des récompenses en validant les transactions
- Ils peuvent perdre leurs ETH s'ils sont malhonnêtes (slashing)

## ERC Standards

ERC (Ethereum Request for Comments) sont des standards pour les tokens.

### Principaux :
- **ERC-20** : Tokens fongibles (identiques)
- **ERC-721** : NFTs (non-fongibles, uniques)
- **ERC-1155** : Tokens semi-fongibles
        `,
        vocabulary: [
          { term: 'Ethereum', definition: 'Plateforme blockchain permettant les smart contracts et dApps' },
          { term: 'Smart Contract', definition: 'Programme auto-exécutable sur la blockchain' },
          { term: 'Ether (ETH)', definition: 'Token natif d\'Ethereum' },
          { term: 'Gas', definition: 'Unité de mesure pour le coût des transactions' },
          { term: 'dApp', definition: 'Application décentralisée basée sur les smart contracts' },
          { term: 'Proof of Stake', definition: 'Mécanisme de consensus où les validateurs mettent en jeu leurs fonds' },
          { term: 'ERC-20', definition: 'Standard pour les tokens fongibles sur Ethereum' },
          { term: 'ERC-721', definition: 'Standard pour les NFTs (tokens non-fongibles)' },
        ],
        quiz: {
          questions: [
            {
              id: 1,
              text: 'Qui a créé Ethereum ?',
              options: ['Vitalik Buterin', 'Satoshi Nakamoto', 'Charlie Lee', 'Andreas M. Antonopoulos'],
              correct: 0,
              explanation: 'Vitalik Buterin a créé Ethereum en 2015'
            },
            {
              id: 2,
              text: 'Quelle est la principale différence entre Bitcoin et Ethereum ?',
              options: [
                'Ethereum supporte les smart contracts',
                'Bitcoin est plus rapide',
                'Ethereum n\'a pas de limite de supply',
                'Bitcoin utilise Proof of Stake'
              ],
              correct: 0,
              explanation: 'Ethereum est conçu pour exécuter des smart contracts'
            },
            {
              id: 3,
              text: 'Qu\'est-ce qu\'un smart contract ?',
              options: [
                'Un programme auto-exécutable sur la blockchain',
                'Un contrat signé numériquement',
                'Un accord entre deux personnes',
                'Une transaction encryptée'
              ],
              correct: 0,
              explanation: 'Les smart contracts s\'exécutent automatiquement quand les conditions sont remplies'
            },
            {
              id: 4,
              text: 'À quoi sert le gas sur Ethereum ?',
              options: [
                'À payer les frais de transaction',
                'À créer de nouveaux ETH',
                'À valider les blocs',
                'À stocker les données'
              ],
              correct: 0,
              explanation: 'Le gas est utilisé pour mesurer et payer la complexité des transactions'
            },
            {
              id: 5,
              text: 'Combien d\'ETH sont nécessaires pour devenir validateur ?',
              options: ['32 ETH', '1 ETH', '100 ETH', '1000 ETH'],
              correct: 0,
              explanation: 'Les validateurs doivent mettre en jeu exactement 32 ETH'
            },
            {
              id: 6,
              text: 'Quel est le standard ERC-721 ?',
              options: [
                'Standard pour les NFTs (tokens non-fongibles)',
                'Standard pour les tokens fongibles',
                'Standard pour les paiements',
                'Standard pour les contrats'
              ],
              correct: 0,
              explanation: 'ERC-721 est le standard pour les NFTs, chacun unique'
            },
            {
              id: 7,
              text: 'Qu\'est-ce qu\'une dApp ?',
              options: [
                'Une application décentralisée basée sur les smart contracts',
                'Une application téléchargeable',
                'Une base de données centralisée',
                'Un portefeuille de trading'
              ],
              correct: 0,
              explanation: 'Les dApps fonctionnent sur la blockchain sans serveur central'
            },
            {
              id: 8,
              text: 'Quel mécanisme de consensus utilise Ethereum depuis 2022 ?',
              options: [
                'Proof of Stake (PoS)',
                'Proof of Work (PoW)',
                'Proof of Authority',
                'Proof of History'
              ],
              correct: 0,
              explanation: 'Ethereum a migré vers PoS lors du Merge en septembre 2022'
            }
          ],
          passingScore: 75,
        }
      },
      {
        id: 3,
        title: 'DeFi et Protocoles Décentralisés',
        duration: '50 min',
        description: 'Comprenez la finance décentralisée et les protocoles',
        locked: true,
        content: `
# DeFi et Protocoles Décentralisés

## Qu'est-ce que la DeFi ?

DeFi (Decentralized Finance) est la finance sans intermédiaire. Au lieu de banques et courtiers, les transactions se font directement entre utilisateurs via des smart contracts.

### Avantages de la DeFi :
- **Pas d'intermédiaire** : Économies directes
- **Accès global** : Pas besoin de compte bancaire
- **Transparence** : Tous les frais visibles
- **Rendements élevés** : Taux compétitifs

## DEX (Échanges Décentralisés)

Un DEX permet d'échanger des tokens sans intermédiaire central.

### Comment ça fonctionne ?
- Vous envoyez vos tokens au smart contract
- Vous recevez les tokens que vous aviez demandés
- Tout est automatique et transparent

### Exemples : Uniswap, Curve, 1inch

## Lending / Borrowing

Les protocoles de lending permettent de prêter vos cryptos pour gagner des intérêts.

### Processus :
1. Vous déposez vos cryptos
2. Les emprunteurs les utilisent
3. Vous recevez des intérêts
4. Vous pouvez retirer à tout moment

### Risques :
- Risque de smart contract
- Risque de liquidation (prix baisse)

### Exemples : Aave, Compound, Curve

## Staking

Le staking consiste à "verrouiller" vos cryptos pour valider le réseau et gagner des récompenses.

### Rendements typiques : 4-20% par an

## Rendement Agricole (Yield Farming)

L'agriculture de rendement consiste à fournir de la liquidité et gagner des frais + tokens de gouvernance.

### Risque : Impermanent Loss (perte temporaire de valeur en cas de forte volatilité)

## TVL (Total Value Locked)

Le TVL mesure la valeur totale verrouillée dans un protocole DeFi.

- TVL élevé = protocole populaire et supposément sûr
- TVL faible = protocole nouveau ou moins utilisé
        `,
        vocabulary: [
          { term: 'DeFi', definition: 'Finance décentralisée sans intermédiaire' },
          { term: 'DEX', definition: 'Exchange décentralisé pour échanger les tokens' },
          { term: 'Lending', definition: 'Prêter ses cryptos pour gagner des intérêts' },
          { term: 'Staking', definition: 'Verrouiller ses cryptos pour valider le réseau' },
          { term: 'Yield Farming', definition: 'Fournir de la liquidité pour gagner des frais' },
          { term: 'Impermanent Loss', definition: 'Perte temporaire due à la volatilité' },
          { term: 'TVL', definition: 'Valeur totale verrouillée dans un protocole' },
          { term: 'Liquidité', definition: 'Capacité à échanger rapidement sans glissement' },
        ],
        quiz: {
          questions: [
            {
              id: 1,
              text: 'Qu\'est-ce que la DeFi ?',
              options: [
                'Finance sans intermédiaire basée sur la blockchain',
                'Finance traditionnelle numérique',
                'Finance virtuelle fictive',
                'Finance déclinante'
              ],
              correct: 0,
              explanation: 'DeFi = Decentralized Finance, élimine les intermédiaires'
            },
            {
              id: 2,
              text: 'Qu\'est-ce qu\'un DEX ?',
              options: [
                'Exchange décentralisé peer-to-peer',
                'Exchange centralisé',
                'Portefeuille hardware',
                'Logiciel de mining'
              ],
              correct: 0,
              explanation: 'DEX = Decentralized Exchange pour échanger les tokens directement'
            },
            {
              id: 3,
              text: 'Quel est l\'avantage du lending DeFi ?',
              options: [
                'Gagner des intérêts sur vos cryptos',
                'Acheter moins cher',
                'Miner plus rapide',
                'Payer moins de taxes'
              ],
              correct: 0,
              explanation: 'Le lending DeFi offre des rendements sans intermédiaire bancaire'
            },
            {
              id: 4,
              text: 'Qu\'est-ce que le staking ?',
              options: [
                'Verrouiller ses cryptos pour valider le réseau',
                'Acheter et vendre rapidement',
                'Emprunter des fonds',
                'Trader sur marge'
              ],
              correct: 0,
              explanation: 'Le staking récompense les validateurs qui sécurisent le réseau'
            },
            {
              id: 5,
              text: 'Qu\'est-ce que l\'Impermanent Loss ?',
              options: [
                'Perte temporaire due à la volatilité en yield farming',
                'Perte permanente d\'argent',
                'Frais de transaction',
                'Taxe gouvernementale'
              ],
              correct: 0,
              explanation: 'L\'impermanent loss peut devenir permanent si le prix change énormément'
            },
            {
              id: 6,
              text: 'Que signifie TVL ?',
              options: [
                'Total Value Locked (valeur verrouillée)',
                'Trading Volume Limit',
                'Token Validation Layer',
                'Transaction Value Line'
              ],
              correct: 0,
              explanation: 'TVL mesure la confiance et l\'utilisation d\'un protocole'
            },
            {
              id: 7,
              text: 'Quel est le principal risque en DeFi ?',
              options: [
                'Vulnérabilité des smart contracts',
                'Volatilité normale',
                'Transactions lentes',
                'Pas de risque'
              ],
              correct: 0,
              explanation: 'Les smart contracts peuvent contenir des bugs ou être exploités'
            },
            {
              id: 8,
              text: 'Pourquoi les rendements DeFi sont-ils élevés ?',
              options: [
                'Haute demande et compensation du risque',
                'Pas de raison, c\'est impossible',
                'Frais cachés',
                'Fausse publicité'
              ],
              correct: 0,
              explanation: 'Les hauts rendements reflètent le risque et l\'opportunité'
            }
          ],
          passingScore: 75,
        }
      },
      {
        id: 4,
        title: 'Trading et Sécurité',
        duration: '55 min',
        description: 'Maîtrisez le trading et sécurisez vos actifs',
        locked: true,
        content: `
# Trading et Sécurité

## Stratégies de Trading

### HODLing
Acheter et conserver à long terme pour bénéficier de l'adoption.

### Day Trading
Acheter et vendre le même jour pour profiter des mouvements quotidiens.

### Swing Trading
Conserver quelques jours/semaines pour profiter des tendances.

### Grid Trading
Acheter bas et vendre haut automatiquement à plusieurs niveaux.

## Analyse Technique Basique

### Support et Résistance
- **Support** : Niveau où le prix rebondit vers le haut
- **Résistance** : Niveau où le prix rebondit vers le bas

### Moyennes Mobiles
- **20MA** : Court terme
- **50MA** : Moyen terme
- **200MA** : Long terme

### Indicateurs clés
- RSI (Relative Strength Index) : Suracheté/Survendu
- MACD : Momentum et tendance
- Bandes de Bollinger : Volatilité

## Gestion du Risque

### Position Sizing
Ne jamais risquer plus de 2-5% de votre portefeuille par trade.

### Stop Loss
Définir un prix d'arrêt pour limiter les pertes.

### Take Profit
Définir un prix cible pour réaliser les gains.

## Sécurité des Cryptos

### Types de Portefeuilles

**Portefeuilles Chauds (Hot Wallets)**
- Connectés à Internet
- Faciles d'accès
- Moins sûrs (mais pratiques pour le trading)
- Exemples : MetaMask, Coinbase Wallet

**Portefeuilles Froids (Cold Wallets)**
- Déconnectés d'Internet
- Très sûrs
- Plus lents à accéder
- Exemples : Ledger, Trezor

### Règles d'Or

1. **Jamais partager les clés privées**
2. **Vérifier deux fois les adresses avant d'envoyer**
3. **Utiliser un cold wallet pour les gros montants**
4. **Activer l'authentification 2FA**
5. **Écrire les seed phrases sur papier**
6. **Garder les seed phrases dans un endroit sûr (coffre, etc.)**

### Attaques Courantes

- **Phishing** : Fausses pages Web
- **Malware** : Virus volant vos clés
- **Rug Pull** : Développeurs qui s'enfuient avec les fonds
- **Flash Loans** : Exploitations de smart contracts

## KYC et Conformité

- Les exchanges centralisés demandent KYC (Know Your Customer)
- Nécessaire pour convertir en monnaie fiduciaire
- Important pour la traçabilité fiscale
        `,
        vocabulary: [
          { term: 'HODLing', definition: 'Stratégie d\'achat et de conservation à long terme' },
          { term: 'Day Trading', definition: 'Achat et vente le même jour' },
          { term: 'Support', definition: 'Niveau de prix où le prix rebondit vers le haut' },
          { term: 'Résistance', definition: 'Niveau de prix où le prix rebondit vers le bas' },
          { term: 'Stop Loss', definition: 'Ordre automatique pour limiter les pertes' },
          { term: 'Take Profit', definition: 'Ordre automatique pour réaliser les gains' },
          { term: 'Cold Wallet', definition: 'Portefeuille offline très sûr' },
          { term: 'Seed Phrase', definition: 'Liste de mots pour récupérer votre portefeuille' },
        ],
        quiz: {
          questions: [
            {
              id: 1,
              text: 'Qu\'est-ce que le HODLing ?',
              options: [
                'Acheter et conserver à long terme',
                'Vendre rapidement',
                'Emprunter des fonds',
                'Miner des cryptos'
              ],
              correct: 0,
              explanation: 'HODL = Hold On for Dear Life, une stratégie long terme'
            },
            {
              id: 2,
              text: 'Quel est le principal avantage d\'un cold wallet ?',
              options: [
                'Sécurité maximale contre les hacks',
                'Transactions plus rapides',
                'Frais moins élevés',
                'Interface plus facile'
              ],
              correct: 0,
              explanation: 'Les cold wallets sont déconnectés donc protégés contre les attaques en ligne'
            },
            {
              id: 3,
              text: 'Que doit-on JAMAIS faire avec une clé privée ?',
              options: [
                'La partager avec quiconque',
                'La copier dans un portefeuille',
                'L\'utiliser pour les transactions',
                'L\'écrire dans un fichier'
              ],
              correct: 0,
              explanation: 'Les clés privées doivent rester absolument secrètes'
            },
            {
              id: 4,
              text: 'Qu\'est-ce qu\'une seed phrase ?',
              options: [
                'Liste de mots pour récupérer un portefeuille',
                'Une graine pour planter',
                'Un code de transaction',
                'Une clé publique'
              ],
              correct: 0,
              explanation: 'La seed phrase (12-24 mots) permet de restaurer votre portefeuille'
            },
            {
              id: 5,
              text: 'Quel pourcentage du portefeuille risquer par trade ?',
              options: [
                '2-5% maximum',
                '50%',
                '100%',
                'Pas d\'importance'
              ],
              correct: 0,
              explanation: 'La gestion du risque est cruciale en trading'
            },
            {
              id: 6,
              text: 'Qu\'est-ce qu\'un Stop Loss ?',
              options: [
                'Ordre automatique pour limiter les pertes',
                'Fermeture du portefeuille',
                'Attaque de hacker',
                'Bug de smart contract'
              ],
              correct: 0,
              explanation: 'Le stop loss vend automatiquement quand le prix baisse trop'
            },
            {
              id: 7,
              text: 'Qu\'est-ce que le phishing en crypto ?',
              options: [
                'Fausses pages Web qui volent les clés',
                'Poisson électrique',
                'Problème de connectivité',
                'Perte d\'électricité'
              ],
              correct: 0,
              explanation: 'Le phishing est une attaque où on vous dirige vers des faux sites'
            },
            {
              id: 8,
              text: 'Pourquoi le KYC est-il important ?',
              options: [
                'Pour convertir en monnaie fiduciaire et traçabilité fiscale',
                'Pour hacker votre compte',
                'Pour envoyer des pubs',
                'Pas d\'importance'
              ],
              correct: 0,
              explanation: 'KYC (Know Your Customer) est légalement obligatoire pour les exchanges'
            }
          ],
          passingScore: 75,
        }
      },
    ],
    finalQuiz: {
      title: 'Quiz Final - Maître Crypto',
      questions: [
        {
          id: 1,
          text: 'Bitcoin a une limite de supply à :',
          options: ['21 millions', '100 millions', 'Illimité', '10 millions'],
          correct: 0
        },
        {
          id: 2,
          text: 'Le halving de Bitcoin se produit tous les :',
          options: ['4 ans', '2 ans', '10 ans', '6 mois'],
          correct: 0
        },
        {
          id: 3,
          text: 'Ethereum a migré vers quel consensus en 2022 ?',
          options: ['Proof of Stake', 'Proof of Work', 'Delegated PoS', 'Proof of Authority'],
          correct: 0
        },
        {
          id: 4,
          text: 'Quel est le standard pour les NFTs ?',
          options: ['ERC-721', 'ERC-20', 'ERC-1155', 'BEP-721'],
          correct: 0
        },
        {
          id: 5,
          text: 'DeFi signifie :',
          options: ['Decentralized Finance', 'Digital Finance', 'Distributed Funds', 'Defense Finance'],
          correct: 0
        },
      ],
      passingScore: 80,
      reward: { badge: '🪙 Maître Crypto', xp: 500 }
    }
  },
  {
    id: 'bourse',
    name: 'Bourse & PEA',
    description: 'Investir en bourse intelligemment via PEA',
    icon: '📈',
    color: '#1E40AF',
    badge: '📊',
    totalChapters: 3,
    chapters: [
      {
        id: 1,
        title: 'Fondamentaux de la Bourse',
        duration: '50 min',
        description: 'Les bases de l\'investissement en bourse',
        content: `
# Fondamentaux de la Bourse

## Qu'est-ce que la Bourse ?

La bourse est un marché où s'échangent les titres (actions, obligations) entre investisseurs. C'est un mécanisme permettant aux entreprises de lever des capitaux et aux investisseurs de diversifier.

### Principales bourses mondiales :
- **NYSE** : New York Stock Exchange (États-Unis)
- **NASDAQ** : Nasdaq (États-Unis, tech)
- **Euronext Paris** : CAC 40 (France)
- **LSE** : London Stock Exchange (Royaume-Uni)
- **TSE** : Tokyo Stock Exchange (Japon)

## Actions

Une action représente une part d'ownership dans une entreprise.

### Avantages :
- Participation aux bénéfices (dividendes)
- Potentiel de croissance
- Droit de vote aux assemblées

### Comment ça fonctionne :
- Vous achetez une action de Apple à 150€
- Si Apple monte à 200€, votre action vaut 200€
- Vous pouvez la vendre ou la conserver

## PEA (Plan d'Épargne en Actions)

Le PEA est un compte enveloppe fiscale française permettant d'investir en bourse sans payer d'impôts (sous conditions).

### Avantages du PEA :
- **Exonération fiscale** (après 5 ans)
- **Pas de frais de courtage** (sur certaines bourses)
- **Rendements réinvestis**

### Conditions :
- Résidence fiscale en France
- Versement maximum : 225 000€
- Durée minimum : 5 ans sans retrait
- Investissements : Actions EU principalement

## ETF (Exchange Traded Funds)

Un ETF est un fonds qui suit un indice ou une thématique.

### Exemple :
- ETF CAC 40 = Votre argent est réparti entre les 40 plus grandes entreprises françaises
- ETF World = Investissement diversifié mondialement

### Avantages :
- **Diversification instantanée**
- **Frais très faibles** (0.05-0.5% par an)
- **Rebalancement automatique**

## Indices Boursiers

Un indice est une mesure de la performance d'un groupe d'actions.

### Indices français :
- **CAC 40** : 40 plus grandes entreprises
- **CAC Next 20** : 20 entreprises de taille moyenne

### Indices mondiaux :
- **S&P 500** : 500 plus grandes US companies
- **MSCI World** : 1500+ plus grandes mondiales
- **STOXX Europe 600** : 600 plus grandes européennes

## Rendement et Dividendes

### Rendement d'une action :
Rendement = (Prix final - Prix initial + Dividendes) / Prix initial × 100

### Exemple :
- Achat à 100€
- Vente à 120€
- Dividende reçu : 5€
- Rendement = (120 - 100 + 5) / 100 × 100 = 25%
        `,
        vocabulary: [
          { term: 'Action', definition: 'Part d\'une entreprise cotée en bourse' },
          { term: 'PEA', definition: 'Plan d\'Épargne en Actions avec avantages fiscaux' },
          { term: 'ETF', definition: 'Fonds suivant un indice ou thématique' },
          { term: 'Dividende', definition: 'Distribution de bénéfices aux actionnaires' },
          { term: 'Indice', definition: 'Mesure de performance d\'un panier d\'actions' },
          { term: 'CAC 40', definition: 'Indice des 40 plus grandes entreprises françaises' },
          { term: 'Rendement', definition: 'Pourcentage de gain sur un investissement' },
          { term: 'Blue Chips', definition: 'Grandes entreprises stables et fiables' },
        ],
        quiz: {
          questions: [
            {
              id: 1,
              text: 'Qu\'est-ce qu\'une action ?',
              options: [
                'Une part d\'ownership dans une entreprise',
                'Une transaction bancaire',
                'Un type de crédit',
                'Une crypto-monnaie'
              ],
              correct: 0,
              explanation: 'Une action vous rend propriétaire d\'une fraction d\'entreprise'
            },
            {
              id: 2,
              text: 'Quel est l\'avantage fiscal principal du PEA ?',
              options: [
                'Exonération d\'impôts après 5 ans',
                'Pas de limite de versement',
                'Pas de limite de durée',
                'Investissements illimités'
              ],
              correct: 0,
              explanation: 'Le PEA offre l\'exonération fiscale après 5 ans de conservation'
            },
            {
              id: 3,
              text: 'Qu\'est-ce qu\'un ETF ?',
              options: [
                'Fonds suivant un indice ou thématique',
                'Une action individuelle',
                'Une obligation gouvernementale',
                'Un compte bancaire'
              ],
              correct: 0,
              explanation: 'Les ETFs offrent diversification instantanée et frais faibles'
            },
            {
              id: 4,
              text: 'Que représente le CAC 40 ?',
              options: [
                '40 plus grandes entreprises françaises',
                'Indice mondial',
                '40 petites entreprises',
                'Les 40 plus riches Français'
              ],
              correct: 0,
              explanation: 'CAC 40 est l\'indice phare de la bourse de Paris'
            },
            {
              id: 5,
              text: 'Qu\'est-ce qu\'un dividende ?',
              options: [
                'Distribution de bénéfices aux actionnaires',
                'Fee du courtier',
                'Impôt sur les gains',
                'Frais de transaction'
              ],
              correct: 0,
              explanation: 'Les dividendes récompensent les investisseurs patient'
            },
            {
              id: 6,
              text: 'Quel est le frais typique d\'un ETF ?',
              options: [
                '0.05-0.5% par an',
                '5-10% par an',
                '20% par transaction',
                '50% des gains'
              ],
              correct: 0,
              explanation: 'Les ETFs ont les frais les plus faibles du marché'
            },
            {
              id: 7,
              text: 'Qu\'est-ce que la diversification ?',
              options: [
                'Répartir l\'argent entre plusieurs investissements',
                'Acheter la même action',
                'Trader rapidement',
                'Emprunter de l\'argent'
              ],
              correct: 0,
              explanation: 'La diversification réduit le risque en spread l\'investissement'
            },
            {
              id: 8,
              text: 'Quelle est la durée minimale du PEA ?',
              options: [
                '5 ans sans retrait',
                '1 an',
                '10 ans',
                'Pas de limite'
              ],
              correct: 0,
              explanation: 'Les 5 ans sont nécessaires pour bénéficier de l\'exonération'
            }
          ],
          passingScore: 75,
        }
      },
      {
        id: 2,
        title: 'Analyse Fondamentale et Sélection',
        duration: '60 min',
        description: 'Comment choisir les meilleures actions',
        locked: true,
        content: `
# Analyse Fondamentale et Sélection

## Analyse Fondamentale

L'analyse fondamentale examine la santé financière réelle d'une entreprise.

### Indicateurs clés :

#### P/E Ratio (Price to Earnings)
P/E = Prix de l'action / Bénéfice par action

- P/E < 15 : Potentiellement sous-évalué
- P/E 15-25 : Valorisation normale
- P/E > 25 : Potentiellement sur-évalué

#### PER vs Croissance (PEG)
PEG = P/E / Taux de croissance des bénéfices

- PEG < 1 : Bonne affaire
- PEG > 2 : Potentiellement cher

#### Ratio D/E (Dette/Équité)
D/E = Dettes totales / Capitaux propres

- D/E < 1 : Endettement sain
- D/E > 2 : Endettement élevé

#### ROE (Retour sur Capitaux)
ROE = Bénéfice net / Capitaux propres

- ROE > 15% : Très bon
- ROE 5-15% : Acceptable
- ROE < 5% : Faible

## Lecture d'un Bilan

### Actif
Ce que l'entreprise possède :
- Argent
- Immobilier
- Stocks
- Équipements

### Passif
Ce que l'entreprise doit :
- Dettes
- Obligations
- Comptes créditeurs

### Capitaux Propres
Actif - Passif = Valeur réelle de l'entreprise

## Croissance vs Valeur

### Actions de Croissance
- Jeunes entreprises
- Croissance rapide
- Peu de dividendes
- Plus volatiles
- Risque plus élevé
- Exemples : Tech startups

### Actions de Valeur
- Entreprises établies
- Croissance lente
- Bons dividendes
- Moins volatiles
- Risque plus faible
- Exemples : Banques, Utilities

## Secteurs Boursiers

Chaque secteur a ses caractéristiques :
- **Tech** : Croissance élevée, volatilité
- **Healthcare** : Stable, defensive
- **Finance** : Dépendant des taux
- **Énergie** : Cyclique, dividendes
- **Consommation** : Defensive
- **Industrielles** : Cyclique
        `,
        vocabulary: [
          { term: 'P/E Ratio', definition: 'Rapport prix/bénéfice d\'une action' },
          { term: 'PEG', definition: 'P/E ajusté par la croissance' },
          { term: 'ROE', definition: 'Retour sur capitaux propres' },
          { term: 'Bilan', definition: 'Document financier d\'une entreprise' },
          { term: 'Actif', definition: 'Ce que possède l\'entreprise' },
          { term: 'Passif', definition: 'Ce que doit l\'entreprise' },
          { term: 'Action de Croissance', definition: 'Action d\'entreprise en forte croissance' },
          { term: 'Action de Valeur', definition: 'Action d\'entreprise établie et stable' },
        ],
        quiz: {
          questions: [
            {
              id: 1,
              text: 'Qu\'est-ce que le P/E Ratio ?',
              options: [
                'Prix / Bénéfice par action',
                'Profit / Employés',
                'Production / Entreprise',
                'Performance / Engagement'
              ],
              correct: 0,
              explanation: 'Le P/E indique si une action est sous ou sur-évaluée'
            },
            {
              id: 2,
              text: 'Un P/E < 15 signifie généralement :',
              options: [
                'L\'action est potentiellement sous-évaluée',
                'L\'action est sur-évaluée',
                'L\'entreprise perd de l\'argent',
                'Pas d\'information'
              ],
              correct: 0,
              explanation: 'Un P/E faible peut indiquer une bonne opportunité d\'achat'
            },
            {
              id: 3,
              text: 'Qu\'est-ce que le ROE ?',
              options: [
                'Retour sur capitaux propres',
                'Rendement des Obligations',
                'Risque des Entreprises',
                'Rendement des Obligations d\'État'
              ],
              correct: 0,
              explanation: 'ROE mesure l\'efficacité de l\'entreprise à générer des bénéfices'
            },
            {
              id: 4,
              text: 'Un ratio D/E > 2 signifie :',
              options: [
                'L\'entreprise est très endettée',
                'L\'entreprise n\'a pas de dettes',
                'L\'entreprise est très rentable',
                'L\'entreprise doit se diviser'
              ],
              correct: 0,
              explanation: 'Un ratio D/E élevé augmente le risque financier'
            },
            {
              id: 5,
              text: 'Quelle est la différence entre actions de croissance et de valeur ?',
              options: [
                'Croissance = risqué, Valeur = stable',
                'Croissance = stable, Valeur = risqué',
                'Aucune différence',
                'C\'est la même chose'
              ],
              correct: 0,
              explanation: 'Les actions de croissance sont plus volatiles que les actions de valeur'
            },
            {
              id: 6,
              text: 'Qu\'est-ce que le PEG ?',
              options: [
                'P/E ajusté par le taux de croissance',
                'Prix d\'une action',
                'Pourcentage du gain',
                'Pas d\'importance'
              ],
              correct: 0,
              explanation: 'PEG < 1 indique généralement une bonne valeur'
            },
            {
              id: 7,
              text: 'Quel secteur est généralement le plus défensif ?',
              options: [
                'Consommation stable (Utilities)',
                'Technologie',
                'Énergie',
                'Finance'
              ],
              correct: 0,
              explanation: 'Les secteurs défensifs performent bien en crise économique'
            },
            {
              id: 8,
              text: 'Qu\'est-ce que le bilan d\'une entreprise ?',
              options: [
                'Résumé financier : Actif, Passif, Capitaux',
                'Liste des clients',
                'Planning annuel',
                'Stratégie marketing'
              ],
              correct: 0,
              explanation: 'Le bilan montre la santé financière d\'une entreprise'
            }
          ],
          passingScore: 75,
        }
      },
      {
        id: 3,
        title: 'Stratégies d\'Investissement',
        duration: '45 min',
        description: 'Maîtrisez les stratégies d\'investissement boursier',
        locked: true,
        content: `
# Stratégies d'Investissement

## Dollar-Cost Averaging (DCA)

Investir un montant fixe régulièrement (ex: 500€ par mois).

### Avantages :
- Réduit l'impact de la volatilité
- Pas besoin de timer le marché
- Discipline d'investissement
- Accumulation progressive

### Exemple :
- Jan: 500€ à 100€ = 5 actions
- Fév: 500€ à 80€ = 6.25 actions
- Mar: 500€ à 120€ = 4.17 actions
- Vous avez 15.42 actions sans avoir besoin de trouver le bon timing

## Buy and Hold

Acheter des bons actifs et les conserver longtemps (5-20+ ans).

### Idée : Les dividendes réinvestis génèrent de la valeur composée

### Exemple avec MSCI World :
- 2000€ investi en 1990
- Après 30 ans : 15000€+ (sans ajouter d'argent)

## Rébalancement

Périodiquement, ajuster le portefeuille pour garder la bonne allocation.

### Exemple :
- Allocation cible : 70% actions, 30% obligations
- Après 1 an : 80% actions, 20% obligations (les actions ont monté)
- Action : Vendre 10% d'actions, acheter 10% d'obligations

## Dividend Growth Investing

Acheter des actions avec dividendes croissants.

### Avantages :
- Revenus passifs
- Couverture inflation
- Moins volatile

## Contrarian Investing

Investir à contre-courant du marché.

### Idée : Acheter quand tout le monde panique, vendre quand tout le monde FOMO

### Risques : Nécessite discipline et patience

## Portefeuille Équilibré

Une bonne diversification pour débuter :

### Core Holdings (80%) :
- 40% ETF MSCI World
- 30% ETF Obligations
- 10% ETF Europe

### Opportunités (20%) :
- 15% Actions à fort dividende
- 5% Secteurs en croissance

## Éviter les Erreurs Courantes

### À NE PAS faire :
- **Panic Selling** : Vendre en panique lors des krach
- **FOMO** : Acheter en bulle spéculative
- **Market Timing** : Essayer de prédire le marché
- **Concentration** : Mettre tout dans 1-2 stocks
- **Leviers** : Trader sur marge sans expérience
- **Suivre les influenceurs** : Investir juste parce que X le dit
        `,
        vocabulary: [
          { term: 'DCA', definition: 'Dollar-Cost Averaging : investir régulièrement' },
          { term: 'Buy and Hold', definition: 'Acheter et conserver longtemps' },
          { term: 'Rebalancement', definition: 'Ajuster régulièrement la composition du portefeuille' },
          { term: 'Rendement Composé', definition: 'Effet boule de neige des réinvestissements' },
          { term: 'FOMO', definition: 'Fear of Missing Out : peur de rater une opportunité' },
          { term: 'Panic Selling', definition: 'Vendre en panique lors des baisses' },
          { term: 'Diversification', definition: 'Répartir l\'argent entre plusieurs actifs' },
          { term: 'Portefeuille', definition: 'Collection totale d\'investissements' },
        ],
        quiz: {
          questions: [
            {
              id: 1,
              text: 'Qu\'est-ce que le DCA ?',
              options: [
                'Investir un montant régulier à intervalles fixes',
                'Vendre tout d\'un coup',
                'Acheter au plus bas',
                'Vendre au plus haut'
              ],
              correct: 0,
              explanation: 'DCA réduit l\'impact de la volatilité en investissant régulièrement'
            },
            {
              id: 2,
              text: 'Quel est l\'avantage du Buy and Hold ?',
              options: [
                'Bénéficier du rendement composé sur long terme',
                'Gagner rapidement',
                'Pas besoin d\'argent',
                'Pas de risque'
              ],
              correct: 0,
              explanation: 'Le temps est votre meilleur ami en investissement'
            },
            {
              id: 3,
              text: 'Qu\'est-ce que le Dividend Growth Investing ?',
              options: [
                'Acheter des actions avec dividendes croissants',
                'Acheter tout pour les dividendes',
                'Diviser les actions',
                'Diviser les profits'
              ],
              correct: 0,
              explanation: 'Cibler les entreprises augmentant régulièrement leurs dividendes'
            },
            {
              id: 4,
              text: 'Pourquoi le rebalancement est-il important ?',
              options: [
                'Maintenir l\'allocation cible et vendre haut/acheter bas',
                'Pour changer tout le temps',
                'C\'est compliqué',
                'Pas nécessaire'
              ],
              correct: 0,
              explanation: 'Le rebalancement force à vendre ce qui a bien performé'
            },
            {
              id: 5,
              text: 'Qu\'est-ce que le FOMO ?',
              options: [
                'Peur de rater une opportunité (mauvaise raison d\'investir)',
                'Un type de risque',
                'Une stratégie',
                'Une obligation'
              ],
              correct: 0,
              explanation: 'FOMO mène souvent à des décisions mauvaises et coûteuses'
            },
            {
              id: 6,
              text: 'Qu\'est-ce que le Panic Selling ?',
              options: [
                'Vendre en panique lors des chutes du marché',
                'Vendre rapidement pour gains rapides',
                'Stratégie contrarian',
                'Bon timing'
              ],
              correct: 0,
              explanation: 'Le panic selling cristallise les pertes au pire moment'
            },
            {
              id: 7,
              text: 'Allocation recommandée pour débuter :',
              options: [
                '60-70% actions, 30-40% obligations',
                '100% actions',
                '100% obligations',
                'Pas d\'importance'
              ],
              correct: 0,
              explanation: 'La diversification dépend de votre âge et tolérance au risque'
            },
            {
              id: 8,
              text: 'Quel est le plus grand ennemi d\'un investisseur ?',
              options: [
                'Émotions et impulsivité',
                'Manque d\'argent',
                'Taxes',
                'Volatilité'
              ],
              correct: 0,
              explanation: 'Les meilleures décisions viennent de la discipline, pas des émotions'
            }
          ],
          passingScore: 75,
        }
      },
    ],
    finalQuiz: {
      title: 'Quiz Final - Expert Bourse',
      questions: [
        {
          id: 1,
          text: 'Le P/E ratio idéal pour une action undervalued est :',
          options: ['< 15', '15-25', '> 25', 'Aucun'],
          correct: 0
        },
        {
          id: 2,
          text: 'L\'avantage fiscal du PEA s\'active après :',
          options: ['5 ans', '3 ans', '10 ans', '1 an'],
          correct: 0
        },
        {
          id: 3,
          text: 'Le frais typique d\'un ETF est :',
          options: ['0.05-0.5%', '2-3%', '10%', 'Variable'],
          correct: 0
        },
        {
          id: 4,
          text: 'DCA signifie :',
          options: ['Dollar-Cost Averaging', 'Direct Currency Access', 'Delayed Compound Analysis', 'Daily Cash Addition'],
          correct: 0
        },
        {
          id: 5,
          text: 'Le rendement composé fonctionne mieux sur :',
          options: ['Long terme (10+ ans)', 'Court terme', 'Avec levier', 'Pas important'],
          correct: 0
        },
      ],
      passingScore: 80,
      reward: { badge: '📊 Expert Bourse', xp: 500 }
    }
  },
  {
    id: 'immobilier',
    name: 'Immobilier',
    description: 'Investissement immobilier et immobilier locatif',
    icon: '🏠',
    color: '#8B4513',
    badge: '🏗️',
    totalChapters: 0,
    chapters: [],
    locked: true,
    lockReason: 'Débloquez après maîtriser un autre domaine'
  },
  {
    id: 'obligations',
    name: 'Obligations',
    description: 'Emprunts et obligations pour revenus stables',
    icon: '💼',
    color: '#16A34A',
    badge: '📜',
    totalChapters: 0,
    chapters: [],
    locked: true,
    lockReason: 'Débloquez après maîtriser un autre domaine'
  },
  {
    id: 'forex',
    name: 'Forex & Devises',
    description: 'Trading de devises et marché des changes',
    icon: '💱',
    color: '#DC2626',
    badge: '💸',
    totalChapters: 0,
    chapters: [],
    locked: true,
    lockReason: 'Débloquez après maîtriser un autre domaine'
  },
  {
    id: 'options',
    name: 'Options & Dérivés',
    description: 'Stratégies avancées avec les options',
    icon: '📊',
    color: '#7C3AED',
    badge: '🎯',
    totalChapters: 0,
    chapters: [],
    locked: true,
    lockReason: 'Débloquez après maîtriser les bases'
  }
];
