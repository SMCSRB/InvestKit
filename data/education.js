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
    "id": 1,
    "title": "Fondamentaux du Bitcoin",
    "duration": "45 min",
    "description": "Découvrez les bases de Bitcoin et de la blockchain",
    "content": "\n# Fondamentaux du Bitcoin\n\n## Qu'est-ce que Bitcoin ?\n\nBitcoin est une monnaie numérique créée en 2009 par une personne (ou groupe) utilisant le pseudonyme Satoshi Nakamoto. C'est la première cryptomonnaie décentralisée basée sur la technologie blockchain.\n\n### Caractéristiques principales :\n- **Décentralisé** : Pas de banque centrale ni d'autorité unique\n- **Transparent** : Toutes les transactions sont visibles sur la blockchain\n- **Sécurisé** : Utilise la cryptographie pour sécuriser les transactions\n- **Limité** : Maximum 21 millions de Bitcoin (rareté)\n\n## La Blockchain\n\nLa blockchain est un registre digital distribué où toutes les transactions sont enregistrées. Chaque bloc contient les transactions récentes, un hash unique et le hash du bloc précédent. Cette structure rend impossible la modification des données historiques sans que tout le monde le remarque.\n\n## Mining et Consensus\n\nLe mining est le processus par lequel les nouveaux Bitcoin sont créés et les transactions sont validées. Les mineurs résolvent des problèmes mathématiques complexes pour ajouter de nouveaux blocs.\n\n## Halving\n\nTous les 4 ans, la récompense de minage est divisée par 2. Cela contrôle la création de nouveaux Bitcoin et maintient la rareté.\n\n## Portefeuille et Clés\n\nLes clés privées contrôlent vos Bitcoin. Jamais les partager! Les clés publiques/adresses reçoivent les fonds.\n",
    "vocabulary": [
      {
        "term": "Bitcoin",
        "definition": "Première cryptomonnaie décentralisée"
      },
      {
        "term": "Blockchain",
        "definition": "Registre digital distribué"
      },
      {
        "term": "Mining",
        "definition": "Processus de création de nouveaux Bitcoin"
      },
      {
        "term": "Hash",
        "definition": "Empreinte numérique unique"
      },
      {
        "term": "Halving",
        "definition": "Réduction de moitié de la récompense"
      },
      {
        "term": "Clé Privée",
        "definition": "Code secret qui contrôle vos Bitcoin"
      },
      {
        "term": "Satoshi",
        "definition": "Plus petite unité de Bitcoin"
      },
      {
        "term": "Wallet",
        "definition": "Portefeuille pour stocker les cryptos"
      }
    ],
    "quiz": {
      "questions": [
        {
          "id": 1,
          "text": "Qui a créé Bitcoin ?",
          "options": [
            "Satoshi Nakamoto",
            "Vitalik Buterin",
            "Charlie Lee",
            "Barry Silbert"
          ],
          "correct": 0,
          "explanation": "Satoshi Nakamoto a créé Bitcoin en 2009"
        },
        {
          "id": 2,
          "text": "Quel est le maximum de Bitcoin ?",
          "options": [
            "21 millions",
            "100 millions",
            "Illimité",
            "1 million"
          ],
          "correct": 0,
          "explanation": "Bitcoin a une limite de 21 millions"
        },
        {
          "id": 3,
          "text": "Que se passe-t-il lors du halving ?",
          "options": [
            "La récompense est divisée par 2",
            "Le prix double",
            "La blockchain se divise",
            "Les transactions sont plus rapides"
          ],
          "correct": 0,
          "explanation": "Le halving réduit la récompense tous les 4 ans"
        },
        {
          "id": 4,
          "text": "Qu'est-ce qu'une clé privée ?",
          "options": [
            "Code secret qui contrôle vos Bitcoin",
            "Votre adresse Bitcoin",
            "Un identifiant public",
            "Une transaction"
          ],
          "correct": 0,
          "explanation": "La clé privée est secrète et ne doit jamais être partagée"
        },
        {
          "id": 5,
          "text": "Qu'est-ce que la blockchain ?",
          "options": [
            "Registre distribué",
            "Une banque",
            "Une agence gouvernementale",
            "Un type de portefeuille"
          ],
          "correct": 0,
          "explanation": "La blockchain est un registre distribué transparent"
        },
        {
          "id": 6,
          "text": "Le mining crée-t-il des Bitcoin ?",
          "options": [
            "Oui",
            "Non",
            "Seulement en 2009",
            "Seulement pour les entreprises"
          ],
          "correct": 0,
          "explanation": "Le mining crée de nouveaux Bitcoin et valide les transactions"
        },
        {
          "id": 7,
          "text": "1 Bitcoin égale combien de satoshis ?",
          "options": [
            "100 000 000",
            "1 000 000",
            "10 000 000",
            "1 000"
          ],
          "correct": 0,
          "explanation": "1 BTC = 100 000 000 satoshis"
        },
        {
          "id": 8,
          "text": "Bitcoin est-il décentralisé ?",
          "options": [
            "Oui, complètement",
            "Non",
            "Partiellement",
            "Ça dépend"
          ],
          "correct": 0,
          "explanation": "Bitcoin est complètement décentralisé, sans autorité centrale"
        }
      ],
      "passingScore": 75
    }
  },
  {
    "id": 2,
    "title": "Ethereum et Smart Contracts",
    "duration": "60 min",
    "description": "Découvrez Ethereum et la programmation décentralisée",
    "locked": false,
    "content": "\n# Ethereum et Smart Contracts\n\n## Qu'est-ce qu'Ethereum ?\n\nEthereum est une blockchain créée en 2015 par Vitalik Buterin. Contrairement à Bitcoin, Ethereum est une plateforme complète pour les applications décentralisées (dApps).\n\n## Smart Contracts\n\nUn smart contract est un programme qui s'exécute automatiquement sur la blockchain quand certaines conditions sont remplies. Ils sont immuables et transparents.\n\n## Avantages d'Ethereum :\n- Flexibilité pour créer des applications\n- Transactions rapides\n- Écosystème DeFi riche\n- Ecosystem de développeurs actif\n\n## Ether (ETH)\n\nEther est la monnaie native d'Ethereum. Elle est utilisée pour payer les frais de transaction (gas).\n\n## Consensus Proof of Stake\n\nEthereum a migré vers le Proof of Stake (PoS), où les validateurs verrouillent des fonds pour valider les transactions.\n",
    "vocabulary": [
      {
        "term": "Ethereum",
        "definition": "Plateforme de blockchain pour dApps"
      },
      {
        "term": "Smart Contract",
        "definition": "Programme auto-exécutable sur blockchain"
      },
      {
        "term": "Ether (ETH)",
        "definition": "Monnaie native d'Ethereum"
      },
      {
        "term": "Gas",
        "definition": "Frais de transaction sur Ethereum"
      },
      {
        "term": "Proof of Stake",
        "definition": "Mécanisme de consensus sans mining"
      },
      {
        "term": "dApp",
        "definition": "Application décentralisée"
      },
      {
        "term": "Solidity",
        "definition": "Langage de programmation pour smart contracts"
      },
      {
        "term": "ERC-20",
        "definition": "Standard pour les tokens sur Ethereum"
      }
    ],
    "quiz": {
      "questions": [
        {
          "id": 1,
          "text": "Qui a créé Ethereum ?",
          "options": [
            "Vitalik Buterin",
            "Satoshi Nakamoto",
            "Gavin Wood",
            "Charles Hoskinson"
          ],
          "correct": 0,
          "explanation": "Vitalik Buterin a créé Ethereum"
        },
        {
          "id": 2,
          "text": "Qu'est-ce qu'un smart contract ?",
          "options": [
            "Programme auto-exécutable",
            "Contrat papier",
            "Une police d'assurance",
            "Une transaction"
          ],
          "correct": 0,
          "explanation": "Un smart contract est un programme qui s'exécute automatiquement"
        },
        {
          "id": 3,
          "text": "Quelle est la monnaie d'Ethereum ?",
          "options": [
            "Ether (ETH)",
            "Bitcoin",
            "Coin",
            "Token"
          ],
          "correct": 0,
          "explanation": "Ether est la monnaie native d'Ethereum"
        },
        {
          "id": 4,
          "text": "Qu'est-ce que le Gas ?",
          "options": [
            "Frais de transaction",
            "Essence",
            "Pollution",
            "Carburant"
          ],
          "correct": 0,
          "explanation": "Le Gas est le frais payé pour exécuter une transaction"
        },
        {
          "id": 5,
          "text": "Ethereum utilise-t-il Proof of Work ?",
          "options": [
            "Non, Proof of Stake maintenant",
            "Oui",
            "Les deux",
            "Ni l'un ni l'autre"
          ],
          "correct": 0,
          "explanation": "Ethereum a migré vers Proof of Stake en 2022"
        },
        {
          "id": 6,
          "text": "Qu'est-ce qu'une dApp ?",
          "options": [
            "Application décentralisée",
            "Une app mobile",
            "Un jeu vidéo",
            "Un navigateur"
          ],
          "correct": 0,
          "explanation": "dApp signifie application décentralisée"
        },
        {
          "id": 7,
          "text": "ERC-20 est utilisé pour quoi ?",
          "options": [
            "Créer des tokens",
            "Miner",
            "Valider",
            "Stocker"
          ],
          "correct": 0,
          "explanation": "ERC-20 est un standard pour créer des tokens sur Ethereum"
        },
        {
          "id": 8,
          "text": "Ethereum est-il meilleur que Bitcoin ?",
          "options": [
            "Ils ont des usages différents",
            "Oui",
            "Non",
            "Aucune importance"
          ],
          "correct": 0,
          "explanation": "Bitcoin et Ethereum ont des objectifs et usages différents"
        }
      ],
      "passingScore": 75
    }
  },
  {
    "id": 3,
    "title": "DeFi (Décentralized Finance)",
    "duration": "50 min",
    "description": "Explorez le monde de la finance décentralisée",
    "locked": false,
    "content": "\n# DeFi - Décentralized Finance\n\n## Qu'est-ce que la DeFi ?\n\nLa DeFi est un écosystème de services financiers construits sur la blockchain sans intermédiaires. Cela inclut les prêts, les échanges et les dérivés.\n\n## Avantages de la DeFi :\n- Pas d'intermédiaires (banques)\n- Transparence totale\n- Accessibilité mondiale\n- Rendements plus élevés\n- Contrôle total de vos assets\n\n## Services DeFi courants :\n\n### Lending Protocols\nLes utilisateurs prêtent leurs crypto et reçoivent des intérêts. Les emprunteurs payent des frais.\n\n### Decentralized Exchanges (DEX)\nLes échanges décentralisés permettent de trader directement sans intermédiaire.\n\n### Yield Farming\nLes liquidités sont récompensées pour fournir de la liquidité aux pools.\n\n### Stablecoins\nDes crypto-monnaies reliées à des devises fiat (USD, EUR) pour réduire la volatilité.\n\n## Risques de la DeFi :\n- Risques de smart contracts\n- Volatilité des prix\n- Liquidation des positions\n- Arnaques et rug pulls\n",
    "vocabulary": [
      {
        "term": "DeFi",
        "definition": "Finance décentralisée sans intermédiaires"
      },
      {
        "term": "Lending Pool",
        "definition": "Protocol où on prête des cryptos"
      },
      {
        "term": "DEX",
        "definition": "Échange décentralisé"
      },
      {
        "term": "Yield Farming",
        "definition": "Générer des rendements via la liquidité"
      },
      {
        "term": "Liquidity Pool",
        "definition": "Réserve de deux assets pour les trades"
      },
      {
        "term": "Stablecoin",
        "definition": "Crypto reliée à une devise fiat"
      },
      {
        "term": "Slippage",
        "definition": "Différence de prix lors d'un trade"
      },
      {
        "term": "APY",
        "definition": "Rendement annuel en pourcentage"
      }
    ],
    "quiz": {
      "questions": [
        {
          "id": 1,
          "text": "Qu'est-ce que la DeFi ?",
          "options": [
            "Finance décentralisée",
            "Finance défaillante",
            "Définition financière",
            "Devise fixe"
          ],
          "correct": 0,
          "explanation": "DeFi = Finance décentralisée"
        },
        {
          "id": 2,
          "text": "Quel est l'avantage principal de la DeFi ?",
          "options": [
            "Pas d'intermédiaires",
            "Moins de sécurité",
            "Régulation forte",
            "Banques intégrées"
          ],
          "correct": 0,
          "explanation": "La DeFi élimine les intermédiaires"
        },
        {
          "id": 3,
          "text": "Qu'est-ce qu'un Lending Pool ?",
          "options": [
            "Protocol de prêt",
            "Piscine de prêt",
            "Une banque",
            "Un exchange"
          ],
          "correct": 0,
          "explanation": "C'est un protocole où on prête des cryptos"
        },
        {
          "id": 4,
          "text": "DEX signifie quoi ?",
          "options": [
            "Decentralized Exchange",
            "Digital Exchange",
            "Débit Exchange",
            "Défaut Exchange"
          ],
          "correct": 0,
          "explanation": "DEX = Decentralized Exchange"
        },
        {
          "id": 5,
          "text": "Qu'est-ce que le Yield Farming ?",
          "options": [
            "Générer des rendements",
            "Cultiver du rendement",
            "Vendre des crops",
            "Problème agricole"
          ],
          "correct": 0,
          "explanation": "Yield Farming = générer des rendements via la liquidité"
        },
        {
          "id": 6,
          "text": "Qu'est-ce qu'un Stablecoin ?",
          "options": [
            "Crypto reliée à une devise fiat",
            "Une crypto volatile",
            "Une action stable",
            "Un bond"
          ],
          "correct": 0,
          "explanation": "Stablecoin = Crypto reliée au USD/EUR"
        },
        {
          "id": 7,
          "text": "Quel risque comporte la DeFi ?",
          "options": [
            "Risques de smart contracts",
            "Aucun risque",
            "Trop de sécurité",
            "Fermetures"
          ],
          "correct": 0,
          "explanation": "Les bugs de smart contracts sont un risque majeur"
        },
        {
          "id": 8,
          "text": "APY en DeFi c'est quoi ?",
          "options": [
            "Rendement annuel en %",
            "Prix moyen",
            "Appel public",
            "Accord préalable"
          ],
          "correct": 0,
          "explanation": "APY = Annual Percentage Yield"
        }
      ],
      "passingScore": 75
    }
  },
  {
    "id": 4,
    "title": "Sécurité et Portefeuilles",
    "duration": "55 min",
    "description": "Protégez vos actifs crypto efficacement",
    "locked": false,
    "content": "\n# Sécurité et Portefeuilles\n\n## Types de Portefeuilles\n\n### Portefeuilles Chauds (Hot Wallets)\nConnectés à internet, faciles d'utilisation mais moins sécurisés.\n- Wallets web (MetaMask, Phantom)\n- Applications mobiles\n- Exchanges\n\n### Portefeuilles Froids (Cold Wallets)\nHors ligne, maximum de sécurité.\n- Hardware wallets (Ledger, Trezor)\n- Paper wallets\n- Air-gapped computers\n\n## Bonnes Pratiques de Sécurité\n\n### 1. Clés Privées\n- Ne JAMAIS partager votre clé privée\n- Créez des backups sécurisés\n- Utilisez un gestionnaire de mots de passe\n\n### 2. Authentification Multi-Facteurs (2FA)\n- Activez la 2FA sur tous les accounts\n- Utilisez des apps authenticators (Google Authenticator)\n- Évitez SMS 2FA si possible\n\n### 3. Vérification des URLs\n- Vérifiez que vous êtes sur le bon site\n- Les arnaqueurs créent des faux sites identiques\n- Utilisez les favoris\n\n### 4. Seed Phrase (Phrase de Récupération)\n- C'est votre sauvetage en cas de perte\n- Écrivez-la sur papier et stockez en sécurité\n- 12 ou 24 mots\n\n## Attaques Courantes\n\n- Phishing: faux emails/sites\n- Malware: logiciels malveillants\n- Rugpulls: arnaqueurs qui disparaissent\n- Front-running: manipulation de transactions\n",
    "vocabulary": [
      {
        "term": "Hot Wallet",
        "definition": "Portefeuille connecté à internet"
      },
      {
        "term": "Cold Wallet",
        "definition": "Portefeuille hors ligne"
      },
      {
        "term": "Hardware Wallet",
        "definition": "Appareil physique pour stocker les clés"
      },
      {
        "term": "Seed Phrase",
        "definition": "Phrase de récupération de 12-24 mots"
      },
      {
        "term": "Private Key",
        "definition": "Clé secrète contrôlant vos cryptos"
      },
      {
        "term": "Public Address",
        "definition": "Adresse pour recevoir des fonds"
      },
      {
        "term": "Phishing",
        "definition": "Arnaque pour voler vos identifiants"
      },
      {
        "term": "2FA",
        "definition": "Authentification à deux facteurs pour la sécurité"
      }
    ],
    "quiz": {
      "questions": [
        {
          "id": 1,
          "text": "Quel portefeuille est le plus sûr ?",
          "options": [
            "Cold Wallet",
            "Hot Wallet",
            "Mobile wallet",
            "Exchange"
          ],
          "correct": 0,
          "explanation": "Les Cold Wallets sont hors ligne et plus sûrs"
        },
        {
          "id": 2,
          "text": "Qu'est-ce qu'une clé privée ?",
          "options": [
            "Code secret de vos cryptos",
            "Votre mot de passe",
            "Numéro de compte",
            "Phrase de récupération"
          ],
          "correct": 0,
          "explanation": "La clé privée contrôle vos cryptos"
        },
        {
          "id": 3,
          "text": "Combien de mots dans une seed phrase ?",
          "options": [
            "12 ou 24",
            "6 ou 8",
            "32 ou 64",
            "100 ou 200"
          ],
          "correct": 0,
          "explanation": "Les seed phrases font 12 ou 24 mots"
        },
        {
          "id": 4,
          "text": "Devriez-vous partager votre clé privée ?",
          "options": [
            "Non jamais",
            "Oui avec votre banquier",
            "Seulement une fois",
            "Avec votre famille"
          ],
          "correct": 0,
          "explanation": "Ne JAMAIS partager votre clé privée"
        },
        {
          "id": 5,
          "text": "Qu'est-ce que le phishing ?",
          "options": [
            "Arnaque pour voler identifiants",
            "Une technique de pêche",
            "Un problème technique",
            "Un type de malware"
          ],
          "correct": 0,
          "explanation": "Phishing = arnaque pour voler vos données"
        },
        {
          "id": 6,
          "text": "Qu'est-ce que 2FA ?",
          "options": [
            "Authentification à 2 facteurs",
            "Deux facteurs d'activation",
            "Fonds auxilliaires",
            "Frais d'accès"
          ],
          "correct": 0,
          "explanation": "2FA = Authentification à deux facteurs"
        },
        {
          "id": 7,
          "text": "Ledger et Trezor sont des quoi ?",
          "options": [
            "Hardware Wallets",
            "Exchanges",
            "Navigateurs",
            "Banques"
          ],
          "correct": 0,
          "explanation": "Ce sont des portefeuilles matériels (hardware wallets)"
        },
        {
          "id": 8,
          "text": "Quelle est la meilleure 2FA ?",
          "options": [
            "App authenticator",
            "SMS",
            "Email",
            "Aucun"
          ],
          "correct": 0,
          "explanation": "Les apps authenticators sont plus sûres que SMS"
        }
      ],
      "passingScore": 75
    }
  },
  {
    "id": 5,
    "title": "Trading et Analyse Technique",
    "duration": "60 min",
    "description": "Apprenez à trader les cryptomonnaies intelligemment",
    "locked": false,
    "content": "\n# Trading et Analyse Technique\n\n## Types de Trading\n\n### Day Trading\nAcheter et vendre le même jour pour profiter des fluctuations court-terme.\n- Risque élevé\n- Nécessite beaucoup d'attention\n- Frais importants\n\n### Swing Trading\nTenir des positions quelques jours à semaines.\n- Risque modéré\n- Moins stressant que day trading\n- Rendements potentiels intéressants\n\n### Long-term Investing\nAcheter et hold pendant des mois/années.\n- Risque plus calculé\n- Moins d'efforts\n- Moins de frais de transaction\n\n## Analyse Technique\n\n### Support et Résistance\n- Support: prix où l'achat augmente\n- Résistance: prix où la vente augmente\n\n### Moyennes Mobiles\nLissent les prix pour identifier les tendances.\n- MA court-terme (20 jours)\n- MA long-terme (200 jours)\n\n### Bougies Japonaises\nAffichent ouverture, fermeture, haut et bas.\n\n## Gestion du Risque\n\n- Définissez vos stop-loss\n- N'investissez que ce que vous pouvez perdre\n- Diversifiez votre portefeuille\n- Évitez le FOMO (Fear of Missing Out)\n\n## Erreurs Courantes\n\n- Over-trading\n- Pas de plan\n- Émotions qui prennent le contrôle\n- Pas d'arrêt de pertes\n",
    "vocabulary": [
      {
        "term": "Day Trading",
        "definition": "Trading intraday"
      },
      {
        "term": "Swing Trading",
        "definition": "Trading sur plusieurs jours/semaines"
      },
      {
        "term": "Support",
        "definition": "Niveau de prix d'achat accru"
      },
      {
        "term": "Résistance",
        "definition": "Niveau de prix de vente accru"
      },
      {
        "term": "MACD",
        "definition": "Indicateur de momentum"
      },
      {
        "term": "RSI",
        "definition": "Indicateur de force relative"
      },
      {
        "term": "Stop-Loss",
        "definition": "Ordre pour limiter les pertes"
      },
      {
        "term": "Take-Profit",
        "definition": "Ordre pour réaliser les gains"
      }
    ],
    "quiz": {
      "questions": [
        {
          "id": 1,
          "text": "Quel trading a le moins de risque ?",
          "options": [
            "Long-term investing",
            "Day trading",
            "Scalping",
            "Futures"
          ],
          "correct": 0,
          "explanation": "L'investissement à long terme est plus stable"
        },
        {
          "id": 2,
          "text": "Qu'est-ce que le support ?",
          "options": [
            "Niveau d'achat accru",
            "Assistance client",
            "Une ressource",
            "Un prix maximum"
          ],
          "correct": 0,
          "explanation": "Le support est un niveau d'achat fort"
        },
        {
          "id": 3,
          "text": "FOMO signifie quoi ?",
          "options": [
            "Fear Of Missing Out",
            "Fondation For Money",
            "Formation Of Markets",
            "Fonds Of Money"
          ],
          "correct": 0,
          "explanation": "FOMO = Fear Of Missing Out (peur de rater)"
        },
        {
          "id": 4,
          "text": "Pourquoi un stop-loss ?",
          "options": [
            "Limiter les pertes",
            "Augmenter gains",
            "Vérifier prix",
            "Sauvegarder données"
          ],
          "correct": 0,
          "explanation": "Le stop-loss protège contre les grandes pertes"
        },
        {
          "id": 5,
          "text": "Qu'est-ce que les bougies ?",
          "options": [
            "Graphique OHLC",
            "Objets de décor",
            "Lumières",
            "Signaux"
          ],
          "correct": 0,
          "explanation": "Les bougies affichent O, H, L, C"
        },
        {
          "id": 6,
          "text": "Moyenne mobile 200j c'est quoi ?",
          "options": [
            "Tendance long-terme",
            "Tendance court-terme",
            "200 jours exactement",
            "Prix moyen"
          ],
          "correct": 0,
          "explanation": "MA200 indique la tendance à long-terme"
        },
        {
          "id": 7,
          "text": "Quel est le pire pour le trading ?",
          "options": [
            "Laisser émotions décider",
            "Analyser les données",
            "Utiliser stop-loss",
            "Planifier"
          ],
          "correct": 0,
          "explanation": "Les émotions ruinent les meilleures stratégies"
        },
        {
          "id": 8,
          "text": "Combien investir que vous ne pouvez perdre ?",
          "options": [
            "Seulement ce qu'on peut",
            "Tout ce qu'on a",
            "50% de vos économies",
            "Emprunter"
          ],
          "correct": 0,
          "explanation": "N'investissez que ce que vous pouvez perdre"
        }
      ],
      "passingScore": 75
    }
  },
  {
    "id": 6,
    "title": "Régulation et Taxes",
    "duration": "45 min",
    "description": "Comprendre les aspects légaux et fiscaux des cryptos",
    "locked": false,
    "content": "\n# Régulation et Taxes\n\n## Paysage Régulatoire\n\n### États-Unis\n- SEC supervise les tokens (securities)\n- FinCEN supervise les compliance anti-blanchiment\n- IRS taxe les capital gains\n\n### Europe\n- MiCA (Markets in Crypto-Assets) - nouvelle régulation\n- GDPR pour la vie privée\n- TVA sur les transactions\n\n### France\n- AMF supervise les services crypto\n- Impôts: capital gains et revenus\n- Obligations de reporting\n\n## Obligations Fiscales\n\n### Capital Gains\nLes profits d'achat-vente sont imposables.\n- Gains court-terme: +33% taxes\n- Gains long-terme: 19% impôt + 15.5% sociales\n\n### Revenus Crypto\n- Staking rewards: revenus imposables\n- Yield farming: revenus imposables\n- Mining: revenues imposables\n\n### Reporting\n- Déclaration des transactions sur impôts\n- Rapports aux douanes pour montants élevés\n- KYC (Know Your Customer) sur exchanges\n\n## Compliance\n\n### AML (Anti Money Laundering)\nLes exchanges doivent vérifier les identités.\n\n### KYC (Know Your Customer)\nFournissez ID, adresse, source de fonds.\n\n## Considérations Légales\n\n- Les contrats intelligents ne sont pas protégés légalement\n- Les exchange peuvent faire faillite\n- Les régulations changent\n- Conseillez avec un expert fiscal\n",
    "vocabulary": [
      {
        "term": "SEC",
        "definition": "Securities and Exchange Commission (USA)"
      },
      {
        "term": "MiCA",
        "definition": "Markets in Crypto-Assets (Régulation EU)"
      },
      {
        "term": "Capital Gains",
        "definition": "Profits de la vente d'actifs"
      },
      {
        "term": "KYC",
        "definition": "Know Your Customer (vérification ID)"
      },
      {
        "term": "AML",
        "definition": "Anti Money Laundering"
      },
      {
        "term": "Tax Lot",
        "definition": "Enregistrement d'un achat pour taxes"
      },
      {
        "term": "Staking",
        "definition": "Détention de cryptos pour rewards"
      },
      {
        "term": "Compliance",
        "definition": "Conformité aux règles"
      }
    ],
    "quiz": {
      "questions": [
        {
          "id": 1,
          "text": "Qui supervise les cryptos aux USA ?",
          "options": [
            "SEC et FinCEN",
            "FBI",
            "Banque centrale",
            "Google"
          ],
          "correct": 0,
          "explanation": "SEC et FinCEN supervisent les cryptos"
        },
        {
          "id": 2,
          "text": "Les gains crypto sont-ils imposables ?",
          "options": [
            "Oui",
            "Non",
            "Seulement long-terme",
            "Ça dépend"
          ],
          "correct": 0,
          "explanation": "Tous les gains de crypto sont imposables"
        },
        {
          "id": 3,
          "text": "Qu'est-ce que KYC ?",
          "options": [
            "Know Your Customer",
            "Contrôle de qualité",
            "Clé criptographique",
            "Limite de prix"
          ],
          "correct": 0,
          "explanation": "KYC = Know Your Customer"
        },
        {
          "id": 4,
          "text": "MiCA est une régulation de ?",
          "options": [
            "L'Europe",
            "USA",
            "Monde entier",
            "France seulement"
          ],
          "correct": 0,
          "explanation": "MiCA est la nouvelle régulation européenne"
        },
        {
          "id": 5,
          "text": "Les staking rewards sont imposables ?",
          "options": [
            "Oui, c'est du revenu",
            "Non jamais",
            "Seulement en France",
            "À moins de 100€"
          ],
          "correct": 0,
          "explanation": "Le staking est imposé comme revenu"
        },
        {
          "id": 6,
          "text": "Quel taux pour gains court-terme ?",
          "options": [
            "+33%",
            "19%",
            "15%",
            "50%"
          ],
          "correct": 0,
          "explanation": "Les gains court-terme sont imposés +33%"
        },
        {
          "id": 7,
          "text": "Qu'est-ce que l'AML ?",
          "options": [
            "Anti Money Laundering",
            "Actifs et Monnaies",
            "Analyse de Marché",
            "Accord de Liquidité"
          ],
          "correct": 0,
          "explanation": "AML = Anti Money Laundering"
        },
        {
          "id": 8,
          "text": "Faut-il un conseil fiscal ?",
          "options": [
            "Oui, fortement recommandé",
            "Non jamais",
            "Uniquement riches",
            "Après problèmes"
          ],
          "correct": 0,
          "explanation": "Conseillez toujours un expert fiscal"
        }
      ],
      "passingScore": 75
    }
  },
  {
    "id": 7,
    "title": "Staking et Yield Farming",
    "duration": "55 min",
    "description": "Générez des rendements passifs avec vos cryptos",
    "locked": false,
    "content": "\n# Staking et Yield Farming\n\n## Qu'est-ce que le Staking ?\n\nLe staking est l'action de verrouiller vos cryptos pour valider les transactions et recevoir des récompenses. C'est le système de consensus Proof of Stake.\n\n### Comment ça fonctionne ?\n1. Vous envoyez vos coins dans un contrat de staking\n2. Vous devenez validateur\n3. Vous recevez des récompenses\n4. Après la période, vous pouvez retirer\n\n### Avantages du Staking :\n- Rendements passifs (5-20% APY)\n- Soutient la sécurité du réseau\n- Pas d'équipement spécialisé (vs mining)\n- Écologique (pas de mining intensif)\n\n## Yield Farming\n\nLe yield farming est la fourniture de liquidité aux pools décentralisés pour gagner des frais de trading et des récompenses.\n\n### Liquidity Pools\n- Fournissez 2 assets en proportions égales\n- Recevez les frais de trading\n- Recevez des récompenses en tokens\n\n### Stratégies de Yield Farming :\n- Single-sided staking\n- Impermanent Loss consideration\n- Strategies complexes avec leverage\n\n## Risques\n\n### Impermanent Loss\nQuand le ratio des prix change, vous pouvez subir une perte même si vous aviez un gain.\n\n### Smart Contract Risks\nLes bugs peuvent causer la perte de vos fonds.\n\n### Volatilité\nLes rendements ne sont pas garantis.\n\n## Rendements Réalistes\n\n- Staking stable: 5-10% APY\n- Staking DeFi: 10-50% APY\n- Rendements très élevés (100%+): risques énormes\n",
    "vocabulary": [
      {
        "term": "Staking",
        "definition": "Verrouiller cryptos pour valider"
      },
      {
        "term": "Validateur",
        "definition": "Nœud qui valide les transactions"
      },
      {
        "term": "APY",
        "definition": "Annual Percentage Yield (rendement annuel)"
      },
      {
        "term": "Liquidity Pool",
        "definition": "Paire d'assets pour le trading"
      },
      {
        "term": "Impermanent Loss",
        "definition": "Perte due à changement de ratio"
      },
      {
        "term": "LP Token",
        "definition": "Token représentant votre part"
      },
      {
        "term": "Yield Farming",
        "definition": "Fournir liquidité pour rendements"
      },
      {
        "term": "Slashing",
        "definition": "Pénalité pour mauvaise validation"
      }
    ],
    "quiz": {
      "questions": [
        {
          "id": 1,
          "text": "Qu'est-ce que le staking ?",
          "options": [
            "Verrouiller cryptos pour valider",
            "Miser de l'argent",
            "Stocker des données",
            "Acheter des actions"
          ],
          "correct": 0,
          "explanation": "Le staking verrouille les cryptos pour valider"
        },
        {
          "id": 2,
          "text": "Quel rendement peut-on attendre ?",
          "options": [
            "5-20% généralement",
            "0% toujours",
            "100%+ sûrement",
            "Variable"
          ],
          "correct": 0,
          "explanation": "Les rendements varient de 5-20%"
        },
        {
          "id": 3,
          "text": "Qu'est-ce qu'une liquidity pool ?",
          "options": [
            "Paire d'assets pour trading",
            "Piscine d'eau",
            "Base de données",
            "Compte bancaire"
          ],
          "correct": 0,
          "explanation": "Pool = paire d'assets pour les échanges"
        },
        {
          "id": 4,
          "text": "Qu'est-ce que l'impermanent loss ?",
          "options": [
            "Perte due au ratio de prix",
            "Perte permanente",
            "Gain temporaire",
            "Frais de trading"
          ],
          "correct": 0,
          "explanation": "Impermanent loss = perte due au ratio"
        },
        {
          "id": 5,
          "text": "Rendement de 100%+ est-il sûr ?",
          "options": [
            "Non, risque très élevé",
            "Oui absolument",
            "Peut-être",
            "Dépend"
          ],
          "correct": 0,
          "explanation": "Les rendements extrêmes = risques énormes"
        },
        {
          "id": 6,
          "text": "APY signifie quoi ?",
          "options": [
            "Annual Percentage Yield",
            "Annual Price Yield",
            "Apply Payment Yearly",
            "Adjust Per Year"
          ],
          "correct": 0,
          "explanation": "APY = Annual Percentage Yield"
        },
        {
          "id": 7,
          "text": "Le staking nécessite du matériel spécialisé ?",
          "options": [
            "Non, pas besoin",
            "Oui obligatoire",
            "Seulement le mining",
            "Dépend de la crypto"
          ],
          "correct": 0,
          "explanation": "Le staking n'a pas besoin d'équipement spécialisé"
        },
        {
          "id": 8,
          "text": "Quelle est la meilleure stratégie ?",
          "options": [
            "Étudier les risques",
            "Suivre les hypes",
            "Faire confiance aux influenceurs",
            "Tout mettre"
          ],
          "correct": 0,
          "explanation": "Toujours étudier les risques d'abord"
        }
      ],
      "passingScore": 75
    }
  },
  {
    "id": 8,
    "title": "NFTs et Tokenomics",
    "duration": "50 min",
    "description": "Comprendre les tokens, NFTs et leur économie",
    "locked": false,
    "content": "\n# NFTs et Tokenomics\n\n## Qu'est-ce qu'un NFT ?\n\nUn NFT (Non-Fungible Token) est un token unique et irremplçable sur la blockchain. Chaque NFT a une identité unique contrairement aux cryptomonnaies.\n\n### Caractéristiques des NFTs :\n- Unique et irremplçable\n- Indivisible (pas de fractionnement)\n- Traçable sur la blockchain\n- Propriété prouvée\n\n### Cas d'Usage des NFTs :\n- Art numérique\n- Collectibles\n- Gaming assets\n- Real estate virtuelle\n- Tickets et certificats\n\n## Tokenomics\n\nTokenomics = l'économie d'un token. Comment il fonctionne, sa distribution, et son utilité.\n\n### Supply Mechanics\n- Max Supply: limite totale\n- Circulation Supply: en circulation maintenant\n- Inflation: nouveaux tokens créés\n\n### Utilité des Tokens\n- Voting power (gouvernance)\n- Accès aux services\n- Rewards et incentives\n- Paiements\n\n### Allocation des Tokens\n- Équipe: combien ?\n- Investisseurs: combien ?\n- Community: combien ?\n- Trésorerie: réserves\n\n## Evaluation des NFTs\n\n### Facteurs de Valeur :\n- Rareté\n- Provenance (histoire)\n- Utilité dans les jeux/metaverse\n- Reconnaissance du créateur\n- Sentiment du marché\n\n## Red Flags\n\n- Proyets avec team anonyme\n- Tokenomics non clairs\n- Supply infinie ou inflation extrême\n- Hype sans utilité réelle\n- Promesses de gains garantis\n",
    "vocabulary": [
      {
        "term": "NFT",
        "definition": "Token non-fongible unique"
      },
      {
        "term": "ERC-721",
        "definition": "Standard pour NFTs sur Ethereum"
      },
      {
        "term": "Tokenomics",
        "definition": "Économie d'un token"
      },
      {
        "term": "Mint",
        "definition": "Créer un nouveau NFT"
      },
      {
        "term": "Royalties",
        "definition": "Frais au créateur à chaque vente"
      },
      {
        "term": "Floor Price",
        "definition": "Prix minimum d'une collection"
      },
      {
        "term": "Governance Token",
        "definition": "Token pour voter"
      },
      {
        "term": "Utility Token",
        "definition": "Token avec utilité pratique"
      }
    ],
    "quiz": {
      "questions": [
        {
          "id": 1,
          "text": "Qu'est-ce qu'un NFT ?",
          "options": [
            "Token unique et irremplçable",
            "Cryptomonnaie commune",
            "Contrat intelligent",
            "Une action"
          ],
          "correct": 0,
          "explanation": "NFT = token unique et irremplçable"
        },
        {
          "id": 2,
          "text": "Peut-on fractionner un NFT ?",
          "options": [
            "Non, indivisible",
            "Oui",
            "Parfois",
            "Dépend"
          ],
          "correct": 0,
          "explanation": "Les NFTs sont indivisibles par défaut"
        },
        {
          "id": 3,
          "text": "Qu'est-ce que la tokenomics ?",
          "options": [
            "Économie du token",
            "Technologie numérique",
            "Économie mondiale",
            "Finance classique"
          ],
          "correct": 0,
          "explanation": "Tokenomics = économie et distribution du token"
        },
        {
          "id": 4,
          "text": "ERC-721 est le standard pour quoi ?",
          "options": [
            "NFTs",
            "Tokens fongibles",
            "Smart contracts",
            "Données"
          ],
          "correct": 0,
          "explanation": "ERC-721 = standard pour NFTs"
        },
        {
          "id": 5,
          "text": "Qu'est-ce que minter un NFT ?",
          "options": [
            "Créer un nouveau NFT",
            "Vendre un NFT",
            "Acheter un NFT",
            "Copier un NFT"
          ],
          "correct": 0,
          "explanation": "Minter = créer un nouveau NFT"
        },
        {
          "id": 6,
          "text": "Quel est un red flag pour les NFTs ?",
          "options": [
            "Team anonyme",
            "Faible prix",
            "Peu de volume",
            "Pas de hype"
          ],
          "correct": 0,
          "explanation": "Une team anonyme est un très mauvais signe"
        },
        {
          "id": 7,
          "text": "Qu'est-ce que le floor price ?",
          "options": [
            "Prix minimum de la collection",
            "Prix au plancher",
            "Prix moyen",
            "Prix du fondateur"
          ],
          "correct": 0,
          "explanation": "Floor price = prix minimum de la collection"
        },
        {
          "id": 8,
          "text": "Quel token a le plus de valeur ?",
          "options": [
            "Celui avec utilité claire",
            "Le plus populaire",
            "Le plus rare",
            "Le plus hyped"
          ],
          "correct": 0,
          "explanation": "L'utilité est plus importante que la rareté"
        }
      ],
      "passingScore": 75
    }
  },
  {
    "id": 9,
    "title": "Layer 2 et Solutions de Scaling",
    "duration": "50 min",
    "description": "Découvrez comment les blockchains se mettent à l'échelle",
    "locked": false,
    "content": "\n# Layer 2 et Solutions de Scaling\n\n## Problème de Scalabilité\n\nLes blockchains principales ont des limites :\n- Nombre de transactions par seconde limité\n- Frais élevés quand congestionné\n- Confirmations lentes\n\nBitcoin: ~7 tx/s\nEthereum: ~15 tx/s\nVisa: ~65,000 tx/s\n\n## Solutions Layer 1 (Blockchain)\n\n### Augmentation de Blocs\n- Augmenter la taille des blocs\n- Augmenter la fréquence des blocs\n- Limitation: node storage\n\n### Sharding\n- Diviser la blockchain en shards\n- Chaque shard traite des transactions\n- Ethereum implémente le sharding\n\n## Solutions Layer 2\n\n### Rollups\nGroupent les transactions et les envoient au L1.\n\n**Optimistic Rollups:**\n- Assumme que transactions sont correctes\n- Période de défi pour les fraudes\n- Exemple: Optimism, Arbitrum\n\n**Zero-Knowledge Rollups:**\n- Cryptographie pour prouver validité\n- Finalité quasi-instantanée\n- Exemple: zkSync, StarkNet\n\n### Sidechains\nBlockchains indépendantes connectées au L1.\n- Exemple: Polygon\n\n### Plasma\nPermet de traiter les transactions off-chain.\n\n## Compromis\n\n- Layer 1: Sécurité + Décentralisation, -Scalabilité\n- Layer 2: Scalabilité + UX, -Sécurité légèrement\n\n## Avenir du Scaling\n\n- Combinaison L1 + L2\n- Rollups principaux (Arbitrum, Optimism)\n- Interopérabilité entre chaînes\n- Expansion de la capacité\n",
    "vocabulary": [
      {
        "term": "Layer 1",
        "definition": "Blockchain principale"
      },
      {
        "term": "Layer 2",
        "definition": "Solutions off-chain"
      },
      {
        "term": "Rollup",
        "definition": "Agrégation de transactions"
      },
      {
        "term": "Sidechain",
        "definition": "Blockchain connectée au L1"
      },
      {
        "term": "Optimistic Rollup",
        "definition": "Rollup avec défi de fraude"
      },
      {
        "term": "Zero-Knowledge",
        "definition": "Preuve sans révéler données"
      },
      {
        "term": "Sharding",
        "definition": "Division de la blockchain"
      },
      {
        "term": "TPS",
        "definition": "Transactions par seconde"
      }
    ],
    "quiz": {
      "questions": [
        {
          "id": 1,
          "text": "Quel est le problème principal des L1 ?",
          "options": [
            "Scalabilité limitée",
            "Sécurité faible",
            "Pas de tokens",
            "Trop chère"
          ],
          "correct": 0,
          "explanation": "Les L1 ont une scalabilité limitée"
        },
        {
          "id": 2,
          "text": "Combien de tx/s Ethereum peut faire ?",
          "options": [
            "~15 tx/s",
            "~1000 tx/s",
            "~65000 tx/s",
            "Illimité"
          ],
          "correct": 0,
          "explanation": "Ethereum fait environ 15 tx/s sans L2"
        },
        {
          "id": 3,
          "text": "Qu'est-ce qu'un Rollup ?",
          "options": [
            "Agrégation de transactions",
            "Nouveau token",
            "Cycle de prix",
            "Protocole de trading"
          ],
          "correct": 0,
          "explanation": "Rollup = agrégation de transactions"
        },
        {
          "id": 4,
          "text": "Optimistic Rollup comment ça marche ?",
          "options": [
            "Assume correctness, défi après",
            "Prive tout d'abord",
            "Validation immédiate",
            "Consensus"
          ],
          "correct": 0,
          "explanation": "Optimistic = assume correct jusqu'au défi"
        },
        {
          "id": 5,
          "text": "Zero-Knowledge utilise quoi ?",
          "options": [
            "Cryptographie pour preuve",
            "Consensus",
            "Mining",
            "Validation classique"
          ],
          "correct": 0,
          "explanation": "ZK utilise la cryptographie avancée"
        },
        {
          "id": 6,
          "text": "Polygon est un type de quoi ?",
          "options": [
            "Sidechain",
            "Rollup",
            "Sharding",
            "Plasma"
          ],
          "correct": 0,
          "explanation": "Polygon est une sidechain"
        },
        {
          "id": 7,
          "text": "Arbitrum et Optimism sont des quoi ?",
          "options": [
            "Optimistic Rollups",
            "Sidechains",
            "Shards",
            "Tokens"
          ],
          "correct": 0,
          "explanation": "Ce sont des Optimistic Rollups"
        },
        {
          "id": 8,
          "text": "Layer 2 réduit-il la sécurité ?",
          "options": [
            "Légèrement oui",
            "Non jamais",
            "Augmente la sécurité",
            "Sans effet"
          ],
          "correct": 0,
          "explanation": "L2 réduit légèrement la sécurité vs L1"
        }
      ],
      "passingScore": 75
    }
  },
  {
    "id": 10,
    "title": "Investissement Long-terme et Stratégies",
    "duration": "60 min",
    "description": "Développez une stratégie d'investissement cryptocurrency durable",
    "locked": false,
    "content": "\n# Investissement Long-terme et Stratégies\n\n## Philosophie de l'Investissement\n\n### Bitcoin comme Réserve de Valeur\nBitcoin vise à être une \"réserve de valeur\" comme l'or.\n- Offre fixe (21M)\n- Adoption croissante\n- Réseau de plus en plus fort\n- Cas d'usage global\n\n### Ethereum comme Infrastructure\nEthereum est la plateforme pour les dApps.\n- Cas d'usage croissants\n- Écosystème DeFi mature\n- Staking rewards\n- Évolution technologique\n\n## Stratégies d'Investissement\n\n### Dollar Cost Averaging (DCA)\nInvestissez un montant fixe régulièrement (mensuel/hebdomadaire).\n**Avantages:**\n- Réduit l'impact du timing\n- Crée une discipline\n- Réduit l'émotionnel\n- Moyennes les prix\n\n### Buy and Hold\nAchetez et gardez pendant des années.\n**Avantages:**\n- Bas sur les frais\n- Moins de stress\n- Bénéficie de la croissance long-terme\n- Tax efficient\n\n### Rebalancing\nAjustez votre allocation périodiquement (tous les 3-12 mois).\n\n## Allocation d'Actifs\n\n### Conservative Portfolio\n- 50% Bitcoin\n- 30% Ethereum\n- 20% Other/Stablecoins\n\n### Moderate Portfolio\n- 40% Bitcoin\n- 30% Ethereum\n- 20% Altcoins\n- 10% Stablecoins\n\n### Aggressive Portfolio\n- 30% Bitcoin\n- 25% Ethereum\n- 40% Altcoins\n- 5% Stablecoins\n\n## Considérations Importantes\n\n### Due Diligence\n- Étudiez le projet en détail\n- Lisez les whitepapers\n- Vérifiez la team\n- Analysez la tokenomics\n\n### Gestion des Risques\n- Diversifiez\n- Utilisez stop-losses\n- Ne mettez pas tout\n- Gardez une réserve\n\n### Discipline Mentale\n- Évitez le FOMO\n- Résistez à la panique\n- Pensez long-terme\n- Ignorez le bruit\n\n## Mythes à Éviter\n\n- \"Devenir riche rapidement\"\n- \"Les cryptos vont toujours monter\"\n- \"Quelqu'un sait le futur prix\"\n- \"Plus de hype = Plus de profit\"\n\n## Réalité\n\n- Les retours ne sont pas garantis\n- Le marché est cyclique\n- La patience paie\n- L'éducation est clé\n\n---\n\n**Conclusion:** L'investissement cryptocurrency long-terme réussit avec:\n1. **Éducation continue** - Apprenez toujours\n2. **Discipline** - Suivez votre plan\n3. **Patience** - Pensez sur années\n4. **Humilité** - Vous ne saurez pas tout\n5. **Diversification** - Répartissez les risques\n",
    "vocabulary": [
      {
        "term": "HODL",
        "definition": "Hold On for Dear Life (garder long-terme)"
      },
      {
        "term": "DCA",
        "definition": "Dollar Cost Averaging"
      },
      {
        "term": "Portfolio",
        "definition": "Collection d'investissements"
      },
      {
        "term": "Allocation",
        "definition": "Distribution des fonds"
      },
      {
        "term": "Rebalancing",
        "definition": "Rééquilibrer la allocation"
      },
      {
        "term": "Due Diligence",
        "definition": "Recherche approfondie"
      },
      {
        "term": "HODLER",
        "definition": "Personne qui hold long-terme"
      },
      {
        "term": "Bull Market",
        "definition": "Marché haussier"
      }
    ],
    "quiz": {
      "questions": [
        {
          "id": 1,
          "text": "Qu'est-ce que DCA ?",
          "options": [
            "Dollar Cost Averaging",
            "Digital Currency Account",
            "Décentralized Crypto Alliance",
            "Daily Crypto Analysis"
          ],
          "correct": 0,
          "explanation": "DCA = investir régulièrement"
        },
        {
          "id": 2,
          "text": "Quel est le meilleur timing pour investir ?",
          "options": [
            "Régulièrement via DCA",
            "Achetez au plus bas",
            "Suivez les signaux",
            "Attendez"
          ],
          "correct": 0,
          "explanation": "DCA élimine le besoin de timing parfait"
        },
        {
          "id": 3,
          "text": "Qu'est-ce que HODL ?",
          "options": [
            "Hold On for Dear Life",
            "House of Digital Ledger",
            "High Output Dynamic Logic",
            "Hold or Deposit Later"
          ],
          "correct": 0,
          "explanation": "HODL = garder vos cryptos long-terme"
        },
        {
          "id": 4,
          "text": "Portfolio conservative contient ?",
          "options": [
            "50% BTC, 30% ETH, 20% Autres",
            "10% BTC, 20% ETH, 70% Alts",
            "Seulement des alts",
            "Seulement stables"
          ],
          "correct": 0,
          "explanation": "Conservative = beaucoup de BTC et ETH"
        },
        {
          "id": 5,
          "text": "Combien de temps tenir long-terme ?",
          "options": [
            "3+ années minimum",
            "Quelques mois",
            "1 an max",
            "Toujours trader"
          ],
          "correct": 0,
          "explanation": "Long-terme = minimum 3-5 ans"
        },
        {
          "id": 6,
          "text": "Pourquoi diversifier ?",
          "options": [
            "Réduire les risques",
            "Augmenter les gains",
            "Simplifier",
            "Éviter taxes"
          ],
          "correct": 0,
          "explanation": "Diversification = réduction du risque"
        },
        {
          "id": 7,
          "text": "Rebalancing, c'est quoi ?",
          "options": [
            "Rééquilibrer l'allocation",
            "Rééquilibrer les prix",
            "Refaire les trades",
            "Revérifier les wallets"
          ],
          "correct": 0,
          "explanation": "Rebalancing = ajuster la allocation"
        },
        {
          "id": 8,
          "text": "Quel est le plus grand risque crypto ?",
          "options": [
            "Volatilité et timing",
            "Hack",
            "Régulation",
            "Pas de risque"
          ],
          "correct": 0,
          "explanation": "La volatilité et le mauvais timing sont les plus grands risques"
        }
      ],
      "passingScore": 75
    }
  }
]
  }
];