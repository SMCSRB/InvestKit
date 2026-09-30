// Catalogue d'actifs du domaine « Crypto » (marché simulé). Les DESCRIPTIONS sont rédigées pour InvestKit (pas de copie).
//
// Les dates de lancement ci-dessous sont des ORDRES DE GRANDEUR (année-mois) : VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER.
// Ce qui décide réellement de l'apparition d'un actif dans le jeu, c'est la PREMIÈRE BOUGIE IMPORTÉE (crypto_assets.first_candle_at) :
// aucun actif n'est jamais proposé avant son premier cours réel. Aucune donnée de cours n'est écrite ici.

export type CryptoCategory =
  | 'store_of_value' | 'smart_contract' | 'stablecoin' | 'exchange' | 'payments' | 'defi' | 'meme' | 'infra' | 'gaming' | 'ai' | 'privacy' | 'other';

export const CATEGORY_LABELS: Record<CryptoCategory, string> = {
  store_of_value: 'Réserve de valeur', smart_contract: 'Contrats intelligents', stablecoin: 'Stablecoin', exchange: 'Plateforme d\'échange', payments: 'Paiements',
  defi: 'Finance décentralisée', meme: 'Mèmes', infra: 'Infrastructure', gaming: 'Jeux et métavers', ai: 'Intelligence artificielle', privacy: 'Confidentialité', other: 'Autre',
};

// Niveau de risque pédagogique (1 = le plus bas du domaine, 5 = le plus élevé) et sa signification.
export const RISK_LABELS: Record<number, string> = {
  1: 'Faible pour la crypto : stablecoin adossé à des réserves, mais un décrochage du cours reste possible',
  2: 'Modéré : très liquide, fortes variations mais historique long',
  3: 'Élevé : grande capitalisation, baisses de 70 à 85 % déjà observées',
  4: 'Très élevé : capitalisation moyenne, liquidité plus faible, dépendance à un projet',
  5: 'Extrême : petite capitalisation, mèmes ou projets fragiles — perte totale possible',
};

export interface CatalogEntry {
  symbol: string; name: string; category: CryptoCategory; launch: string; risk: 1 | 2 | 3 | 4 | 5; description: string;
  stable?: boolean;
  // Actif disparu ou effondré : la chronologie réelle est rejouée (le cours vient des données importées, jamais d'ici).
  collapse?: { date: string; title: string; explanation: string };
  // Écarts entre le symbole du jeu et celui du fournisseur de données (à vérifier lors de l'import).
  providers?: { cryptocompare?: string; binance?: string; coingecko?: string; note?: string };
}

type Row = [symbol: string, name: string, cat: CryptoCategory, launch: string, risk: 1 | 2 | 3 | 4 | 5, description: string];

const R: Row[] = [
  ['BTC', 'Bitcoin', 'store_of_value', '2010-07', 3, 'La première cryptomonnaie (2009). Quantité limitée à 21 millions d\'unités ; beaucoup la voient comme une « réserve de valeur » numérique. Très volatile : des baisses de plus de 80 % ont déjà eu lieu.'],
  ['ETH', 'Ethereum', 'smart_contract', '2015-08', 3, 'Réseau sur lequel on exécute de petits programmes (contrats intelligents) : finance décentralisée, jetons, collections numériques. Son jeton sert à payer les frais du réseau.'],
  ['USDT', 'Tether', 'stablecoin', '2014-10', 1, 'Jeton censé valoir toujours un dollar, émis par une entreprise qui affirme détenir des réserves. Sert de « monnaie de parking » entre deux investissements. Le risque : que la promesse ne soit pas tenue.'],
  ['USDC', 'USD Coin', 'stablecoin', '2018-09', 1, 'Stablecoin indexé sur le dollar, avec des réserves auditées. En mars 2023, il a brièvement décroché à cause de la faillite d\'une banque qui détenait une partie de ses réserves.'],
  ['DAI', 'Dai', 'stablecoin', '2017-12', 1, 'Stablecoin décentralisé : sa valeur d\'un dollar est maintenue par des garanties déposées dans des contrats intelligents, sans entreprise derrière.'],
  ['BNB', 'BNB', 'exchange', '2017-07', 3, 'Jeton de la plateforme Binance et de sa blockchain. Il donne des réductions de frais et paie les transactions du réseau. Son sort dépend de celui de l\'entreprise.'],
  ['XRP', 'XRP', 'payments', '2013-01', 3, 'Jeton conçu pour des transferts d\'argent rapides entre banques et entreprises. Longtemps en procès avec le régulateur américain, ce qui a pesé sur son cours.'],
  ['SOL', 'Solana', 'smart_contract', '2020-04', 4, 'Blockchain très rapide et peu chère, concurrente d\'Ethereum. A connu des pannes de réseau et un effondrement en 2022 avant de remonter.'],
  ['ADA', 'Cardano', 'smart_contract', '2017-10', 4, 'Blockchain développée avec une approche académique (méthodes formelles, publications scientifiques). Déploiement des fonctions plus lent que ses concurrents.'],
  ['DOGE', 'Dogecoin', 'meme', '2013-12', 4, 'Né comme une plaisanterie (le chien d\'un mème). Sans plafond d\'émission. Son cours réagit surtout aux messages de célébrités et à l\'humeur des réseaux sociaux.'],
  ['TRX', 'TRON', 'smart_contract', '2017-09', 4, 'Blockchain très utilisée pour échanger des stablecoins à bas coût. Projet fortement lié à son fondateur.'],
  ['AVAX', 'Avalanche', 'smart_contract', '2020-09', 4, 'Plateforme de contrats intelligents permettant de créer ses propres sous-réseaux. Concurrente d\'Ethereum sur la finance décentralisée.'],
  ['TON', 'Toncoin', 'smart_contract', '2021-08', 4, 'Blockchain née d\'un projet de messagerie, aujourd\'hui utilisée au sein d\'applications de messagerie très grand public. Historique de cotation relativement court.'],
  ['LINK', 'Chainlink', 'infra', '2017-09', 4, 'Réseau d\'« oracles » : il apporte aux contrats intelligents des informations du monde réel (cours, météo…), qu\'ils ne peuvent pas connaître seuls.'],
  ['SHIB', 'Shiba Inu', 'meme', '2020-08', 5, 'Jeton mème inspiré de Dogecoin, avec une quantité énorme d\'unités. Hausse de plusieurs milliers de pourcents en 2021, puis chute durable.'],
  ['DOT', 'Polkadot', 'infra', '2020-08', 4, 'Réseau qui relie plusieurs blockchains entre elles pour qu\'elles échangent des données et des actifs.'],
  ['BCH', 'Bitcoin Cash', 'payments', '2017-08', 4, 'Issu d\'un désaccord sur la taille des blocs de Bitcoin (2017). Vise des paiements quotidiens peu chers ; moins utilisé que le Bitcoin d\'origine.'],
  ['NEAR', 'NEAR Protocol', 'smart_contract', '2020-10', 4, 'Blockchain visant la simplicité pour les développeurs et les utilisateurs, avec des frais très bas.'],
  ['LTC', 'Litecoin', 'payments', '2011-10', 3, 'Surnommé « l\'argent » face à « l\'or » Bitcoin : plus rapide, même principe. Ancien, stable dans ses fonctions, peu d\'innovation.'],
  ['POL', 'Polygon', 'infra', '2019-04', 4, 'Solution qui décharge Ethereum d\'une partie du travail pour réduire les frais. Anciennement appelé MATIC.', ],
  ['UNI', 'Uniswap', 'defi', '2020-09', 4, 'Jeton de gouvernance d\'une bourse décentralisée où l\'on échange des jetons sans intermédiaire, via des réserves mises en commun.'],
  ['ICP', 'Internet Computer', 'infra', '2021-05', 5, 'Projet ambitieux d\'hébergement d\'applications sur une blockchain. Lancement à un cours très élevé suivi d\'une chute de plus de 95 %.'],
  ['APT', 'Aptos', 'smart_contract', '2022-10', 5, 'Jeune blockchain issue d\'anciens ingénieurs d\'un grand réseau social. Peu d\'historique, forte part de jetons détenue par les fondateurs et investisseurs.'],
  ['ETC', 'Ethereum Classic', 'smart_contract', '2016-07', 4, 'La branche d\'Ethereum qui a refusé en 2016 d\'annuler un piratage célèbre. Existe toujours, bien moins utilisée.'],
  ['XLM', 'Stellar', 'payments', '2014-08', 4, 'Réseau de paiements internationaux à faible coût, proche dans l\'esprit de XRP.'],
  ['XMR', 'Monero', 'privacy', '2014-05', 4, 'Cryptomonnaie qui masque l\'expéditeur, le destinataire et le montant. Retirée de plusieurs plateformes à cause de la réglementation.'],
  ['ATOM', 'Cosmos', 'infra', '2019-03', 4, 'Écosystème de blockchains indépendantes capables de communiquer entre elles (« l\'internet des blockchains »).'],
  ['OP', 'Optimism', 'infra', '2022-05', 5, 'Réseau de « deuxième couche » d\'Ethereum : il regroupe les transactions pour les rendre moins chères. Le jeton sert à la gouvernance.'],
  ['ARB', 'Arbitrum', 'infra', '2023-03', 5, 'Autre réseau de deuxième couche d\'Ethereum, très utilisé en finance décentralisée. Jeton distribué gratuitement aux premiers utilisateurs.'],
  ['FIL', 'Filecoin', 'infra', '2020-10', 5, 'Marché de stockage de fichiers décentralisé : on paie en jetons pour héberger ses données chez des particuliers.'],
  ['HBAR', 'Hedera', 'infra', '2019-09', 4, 'Réseau géré par un conseil de grandes entreprises, qui n\'utilise pas une blockchain classique.'],
  ['VET', 'VeChain', 'infra', '2017-08', 4, 'Blockchain orientée traçabilité des produits et chaînes d\'approvisionnement des entreprises.'],
  ['INJ', 'Injective', 'defi', '2020-10', 5, 'Réseau dédié aux marchés financiers décentralisés (produits dérivés, échanges).'],
  ['MKR', 'Maker', 'defi', '2017-08', 4, 'Jeton de gouvernance du protocole qui crée le stablecoin Dai. Ses détenteurs votent les règles de risque.'],
  ['AAVE', 'Aave', 'defi', '2020-10', 4, 'Protocole de prêt et d\'emprunt décentralisé : on dépose des jetons pour gagner des intérêts, ou on emprunte contre garantie.'],
  ['GRT', 'The Graph', 'infra', '2020-12', 5, 'Sorte de moteur de recherche des données des blockchains, utilisé par de nombreuses applications.'],
  ['ALGO', 'Algorand', 'smart_contract', '2019-06', 4, 'Blockchain fondée par un chercheur réputé, axée sur la rapidité et la sécurité du consensus.'],
  ['EGLD', 'MultiversX', 'smart_contract', '2020-09', 5, 'Blockchain qui répartit le travail en « fragments » pour monter en capacité. Anciennement Elrond.'],
  ['XTZ', 'Tezos', 'smart_contract', '2018-07', 4, 'Blockchain qui se met à jour par vote de ses détenteurs, sans séparation du réseau.'],
  ['SAND', 'The Sandbox', 'gaming', '2020-08', 5, 'Monde virtuel où l\'on achète des parcelles de terrain numériques. Engouement de 2021 retombé depuis.'],
  ['MANA', 'Decentraland', 'gaming', '2017-09', 5, 'Autre monde virtuel à parcelles numériques. Très dépendant de la mode du « métavers ».'],
  ['AXS', 'Axie Infinity', 'gaming', '2020-11', 5, 'Jeu où l\'on collectionne des créatures et gagne des jetons. Le modèle économique s\'est effondré avec la baisse du nombre de joueurs.'],
  ['EOS', 'EOS', 'smart_contract', '2017-07', 5, 'Lancé après une levée de fonds record (2018) puis abandonné par ses promoteurs. Exemple de projet très hyperbolisé.'],
  ['IOTA', 'IOTA', 'infra', '2017-06', 5, 'Réseau conçu pour les objets connectés, sans blockchain classique.'],
  ['NEO', 'Neo', 'smart_contract', '2016-09', 5, 'Surnommé « l\'Ethereum chinois » à ses débuts, projet plus discret depuis.'],
  ['DASH', 'Dash', 'payments', '2014-02', 4, 'Dérivé de Bitcoin pour des paiements plus rapides, avec une option de confidentialité.'],
  ['ZEC', 'Zcash', 'privacy', '2016-10', 4, 'Cryptomonnaie qui permet des transactions dont le montant et les adresses restent masqués grâce à des preuves mathématiques.'],
  ['XEM', 'NEM', 'smart_contract', '2015-04', 5, 'Ancienne blockchain d\'entreprise. A subi en 2018 un vol de plusieurs centaines de millions de dollars sur une plateforme.'],
  ['BAT', 'Basic Attention Token', 'other', '2017-05', 5, 'Jeton d\'un navigateur web qui récompense l\'attention portée aux publicités. Usage réel limité.'],
  ['ENJ', 'Enjin Coin', 'gaming', '2017-07', 5, 'Jeton destiné aux objets de jeux vidéo échangeables entre jeux.'],
  ['CHZ', 'Chiliz', 'other', '2019-07', 5, 'Jeton des « fan tokens » de clubs sportifs. Cours très sensible aux événements sportifs et aux modes.'],
  ['CRV', 'Curve DAO', 'defi', '2020-08', 5, 'Jeton d\'une bourse décentralisée spécialisée dans les échanges de stablecoins. Son fondateur a eu de gros emprunts contre ce jeton, source de crainte en 2023.'],
  ['SNX', 'Synthetix', 'defi', '2018-03', 5, 'Protocole qui crée des versions « synthétiques » d\'actifs (or, actions) sur la blockchain.'],
  ['COMP', 'Compound', 'defi', '2020-06', 5, 'Un des pionniers du prêt décentralisé. Son lancement en 2020 a déclenché l\'été de la « finance décentralisée ».'],
  ['SUSHI', 'SushiSwap', 'defi', '2020-09', 5, 'Bourse décentralisée née en copiant Uniswap, lancée avec une polémique de gouvernance.'],
  ['YFI', 'yearn.finance', 'defi', '2020-07', 5, 'Jeton à quantité très faible (36 000 unités) : son prix unitaire a dépassé 90 000 dollars en 2021. Un exemple de jeton « cher » qui n\'est pas « gros ».'],
  ['1INCH', '1inch', 'defi', '2020-12', 5, 'Agrégateur qui cherche le meilleur prix d\'un échange en comparant plusieurs bourses décentralisées.'],
  ['LDO', 'Lido DAO', 'defi', '2021-01', 4, 'Jeton de gouvernance du plus grand service de « staking » d\'Ethereum (mise en dépôt contre rémunération).'],
  ['RUNE', 'THORChain', 'defi', '2019-07', 5, 'Protocole d\'échange entre cryptomonnaies de réseaux différents, sans intermédiaire. A subi plusieurs piratages.'],
  ['KAVA', 'Kava', 'defi', '2019-10', 5, 'Réseau de prêts décentralisés sur l\'écosystème Cosmos.'],
  ['FLOW', 'Flow', 'gaming', '2020-10', 5, 'Blockchain pensée pour les jeux et collections numériques grand public.'],
  ['QNT', 'Quant', 'infra', '2018-08', 4, 'Logiciel d\'interconnexion de blockchains destiné aux banques et grandes entreprises.'],
  ['PEPE', 'Pepe', 'meme', '2023-04', 5, 'Jeton mème lancé sans équipe ni projet. Multiplié par des centaines en quelques semaines puis très volatil : pur pari spéculatif.'],
  ['WIF', 'dogwifhat', 'meme', '2023-12', 5, 'Jeton mème d\'un chien coiffé d\'un bonnet. Aucune utilité, cours dicté par la viralité.'],
  ['BONK', 'Bonk', 'meme', '2022-12', 5, 'Jeton mème distribué gratuitement aux utilisateurs de Solana après la faillite de FTX.'],
  ['FLOKI', 'Floki', 'meme', '2021-07', 5, 'Jeton mème inspiré du chien d\'une personnalité, avec un marketing très agressif.'],
  ['RNDR', 'Render', 'ai', '2020-06', 4, 'Marché de puissance de calcul graphique partagée, associé à l\'intelligence artificielle.'],
  ['FET', 'Fetch.ai', 'ai', '2019-03', 5, 'Projet d\'agents logiciels autonomes, fusionné en 2024 avec d\'autres jetons d\'IA.'],
  ['TAO', 'Bittensor', 'ai', '2021-03', 5, 'Réseau où des modèles d\'intelligence artificielle sont rémunérés selon leur utilité. Petite quantité, prix unitaire élevé.'],
  ['SEI', 'Sei', 'smart_contract', '2023-08', 5, 'Blockchain récente dédiée aux échanges rapides.'],
  ['SUI', 'Sui', 'smart_contract', '2023-05', 5, 'Jeune blockchain issue d\'anciens ingénieurs d\'un grand réseau social, pensée pour la rapidité.'],
  ['TIA', 'Celestia', 'infra', '2023-10', 5, 'Réseau qui fournit uniquement l\'espace de stockage des données pour d\'autres blockchains.'],
  ['JUP', 'Jupiter', 'defi', '2024-01', 5, 'Agrégateur d\'échanges de l\'écosystème Solana.'],
  ['PYTH', 'Pyth Network', 'infra', '2023-11', 5, 'Fournisseur de cours financiers pour les contrats intelligents, alimenté par de grandes maisons de trading.'],
  ['STX', 'Stacks', 'smart_contract', '2019-10', 5, 'Couche qui permet d\'exécuter des contrats intelligents en s\'appuyant sur la sécurité de Bitcoin.'],
  ['IMX', 'Immutable', 'gaming', '2021-06', 5, 'Réseau de deuxième couche d\'Ethereum spécialisé dans les jeux et objets numériques.'],
  ['THETA', 'Theta Network', 'infra', '2018-03', 5, 'Réseau de diffusion de vidéos en pair-à-pair, rémunéré en jetons.'],
  ['FTM', 'Fantom', 'smart_contract', '2018-11', 5, 'Blockchain rapide très utilisée en 2021 en finance décentralisée ; le projet a depuis été rebaptisé Sonic.'],
  ['CAKE', 'PancakeSwap', 'defi', '2020-09', 5, 'Bourse décentralisée la plus utilisée sur le réseau de Binance.'],
  ['GALA', 'Gala', 'gaming', '2020-09', 5, 'Plateforme de jeux vidéo distribuant des objets numériques.'],
  ['APE', 'ApeCoin', 'other', '2022-03', 5, 'Jeton lié à une célèbre collection de dessins numériques de singes. Distribué gratuitement aux détenteurs, forte chute après l\'engouement.'],
  ['AR', 'Arweave', 'infra', '2020-06', 5, 'Stockage « permanent » de données : on paie une fois pour conserver un fichier sans limite de durée.'],
  ['ZIL', 'Zilliqa', 'smart_contract', '2018-01', 5, 'Blockchain qui découpe le réseau en groupes pour traiter plus de transactions à la fois.'],
  ['ONE', 'Harmony', 'smart_contract', '2019-05', 5, 'Blockchain dont un pont vers Ethereum a été piraté en 2022 (une centaine de millions de dollars).'],
  ['KSM', 'Kusama', 'infra', '2020-01', 5, 'Réseau d\'essai « en conditions réelles » de Polkadot, plus risqué et plus expérimental.'],
  ['ZRX', '0x', 'defi', '2017-08', 5, 'Infrastructure d\'échanges entre particuliers sur la blockchain, parmi les premières du genre.'],
  ['OMG', 'OMG Network', 'infra', '2017-07', 5, 'Ancien projet de paiements sur Ethereum, depuis devenu peu actif.'],
  ['ICX', 'ICON', 'infra', '2017-10', 5, 'Projet sud-coréen d\'interconnexion de blockchains, popularité retombée.'],
  ['WAVES', 'Waves', 'smart_contract', '2016-06', 5, 'Plateforme de jetons dont le stablecoin maison a perdu son ancrage en 2022.'],
  ['QTUM', 'Qtum', 'smart_contract', '2017-05', 5, 'Mélange le modèle de Bitcoin et les contrats intelligents d\'Ethereum.'],
  ['ONT', 'Ontology', 'infra', '2018-03', 5, 'Projet chinois d\'identité numérique sur blockchain.'],
  ['BTT', 'BitTorrent', 'other', '2019-01', 5, 'Jeton lié au logiciel de téléchargement pair-à-pair, rattaché à l\'écosystème TRON. Valeur unitaire minuscule.'],
  ['CELO', 'Celo', 'payments', '2020-05', 5, 'Blockchain pensée pour les paiements mobiles dans les pays émergents.'],
  ['LRC', 'Loopring', 'infra', '2017-08', 5, 'Protocole d\'échanges rapides sur Ethereum via une technique de regroupement de transactions.'],
  ['CVX', 'Convex Finance', 'defi', '2021-05', 5, 'Protocole qui optimise les rendements sur Curve, avec une logique de votes achetés.'],
  ['GMX', 'GMX', 'defi', '2021-09', 5, 'Bourse décentralisée de produits à effet de levier, payée en partie par les pertes des traders.'],
  ['DYDX', 'dYdX', 'defi', '2021-09', 5, 'Bourse décentralisée d\'instruments à effet de levier.'],
  ['ENS', 'Ethereum Name Service', 'infra', '2021-11', 5, 'Annuaire de noms lisibles (comme « moi.eth ») pour remplacer les longues adresses de portefeuille.'],
  ['BLUR', 'Blur', 'other', '2023-02', 5, 'Place de marché de collections numériques pour traders professionnels.'],
  ['WLD', 'Worldcoin', 'other', '2023-07', 5, 'Projet d\'identité numérique fondé sur le scan de l\'iris, controversé sur la vie privée.'],
  ['PENDLE', 'Pendle', 'defi', '2021-04', 5, 'Protocole qui permet de séparer et d\'échanger le rendement futur d\'un placement.'],
  ['ORDI', 'ORDI', 'other', '2023-05', 5, 'Premier jeton créé sur Bitcoin lui-même (standard « BRC-20 »). Cours très spéculatif.'],
  ['RVN', 'Ravencoin', 'other', '2018-01', 5, 'Cryptomonnaie dédiée à l\'émission d\'actifs numériques, minée par les cartes graphiques.'],
  ['MINA', 'Mina', 'infra', '2021-03', 5, 'Blockchain dont la taille reste minuscule grâce à des preuves mathématiques compactes.'],
  ['LUNA', 'Terra (LUNA, 2019-2022)', 'defi', '2019-07', 5, 'Jeton de la blockchain Terra, dont la valeur servait de garantie au stablecoin UST. Au printemps 2022, le stablecoin a perdu son ancrage et le jeton s\'est effondré de plus de 99,9 % en quelques jours.',
  ],
  ['UST', 'TerraUSD (UST)', 'stablecoin', '2020-11', 5, 'Stablecoin « algorithmique » : son ancrage au dollar ne reposait pas sur des réserves mais sur un mécanisme avec le jeton LUNA. Il s\'est effondré en mai 2022.'],
  ['FTT', 'FTX Token', 'exchange', '2019-07', 5, 'Jeton de la plateforme FTX, principal actif de garantie de sa société sœur. Quand la faillite a été révélée en novembre 2022, il a perdu plus de 95 % en quelques jours.'],
  ['CEL', 'Celsius', 'defi', '2018-06', 5, 'Jeton d\'une société de prêts en cryptomonnaies qui a suspendu les retraits de ses clients en juin 2022 puis a fait faillite.'],
  ['SRM', 'Serum', 'defi', '2020-08', 5, 'Bourse décentralisée liée à FTX. Le projet a été abandonné après la faillite de la plateforme.'],
  ['BCC', 'Bitconnect', 'other', '2016-11', 5, 'Faux « programme de rendement garanti » : une pyramide de Ponzi démasquée en janvier 2018, cours effondré de plus de 90 % en quelques jours.'],
];

// Chronologies réelles des faillites (dates publiques) — VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER pour les jours exacts.
const COLLAPSES: Record<string, { date: string; title: string; explanation: string }> = {
  LUNA: { date: '2022-05-09', title: 'Effondrement de Terra (LUNA / UST)', explanation: 'Le stablecoin UST a perdu son ancrage au dollar à partir du 9 mai 2022. Pour le racheter, le système a créé des quantités énormes de LUNA, dont le cours s\'est effondré en quelques jours : plus de 40 milliards de dollars ont disparu. Leçon : un stablecoin « algorithmique » n\'est garanti par rien d\'autre que la confiance.' },
  UST: { date: '2022-05-09', title: 'UST perd son ancrage au dollar', explanation: 'Le stablecoin algorithmique UST est descendu de 1 $ à quelques centimes en une semaine. Un stablecoin n\'est pas un compte bancaire : sans réserves, rien ne garantit son cours.' },
  FTT: { date: '2022-11-08', title: 'Faillite de FTX', explanation: 'Début novembre 2022, la révélation que la société sœur de FTX détenait surtout des jetons FTT comme garantie a provoqué une ruée sur les retraits. FTX a fait faillite le 11 novembre ; le jeton FTT a perdu plus de 95 %. Leçon : un jeton émis par une plateforme dépend entièrement de sa santé.' },
  CEL: { date: '2022-06-12', title: 'Celsius suspend les retraits', explanation: 'La société de prêts Celsius a bloqué les retraits de ses clients le 12 juin 2022 avant de déposer le bilan en juillet. Leçon : rémunérer l\'épargne à taux élevé cache un risque de contrepartie.' },
  SRM: { date: '2022-11-08', title: 'Serum abandonné après FTX', explanation: 'Serum dépendait de FTX pour son développement et sa sécurité ; après la faillite, le projet a été piraté puis abandonné.' },
  BCC: { date: '2018-01-16', title: 'Bitconnect : une pyramide démasquée', explanation: 'Bitconnect promettait des rendements quotidiens garantis. Le 16 janvier 2018, la plateforme a fermé ses services de prêt et le cours a perdu plus de 90 % en quelques jours. Leçon : un rendement « garanti » élevé est un signal d\'arnaque.' },
};

const STABLES = new Set(['USDT', 'USDC', 'DAI', 'UST']);

// Écarts connus entre symboles du jeu et symboles de fournisseurs (à vérifier à l'import).
const PROVIDER_OVERRIDES: Record<string, { cryptocompare?: string; binance?: string; coingecko?: string; note?: string }> = {
  POL: { cryptocompare: 'MATIC', coingecko: 'polygon-ecosystem-token', note: 'Avant septembre 2024 le jeton s\'appelait MATIC : importer l\'historique sous MATIC.' },
  LUNA: { cryptocompare: 'LUNA', coingecko: 'terra-luna', note: 'Terra « classique » (avant mai 2022) : vérifier que la série importée est bien celle de l\'ancienne LUNA (aujourd\'hui LUNC) et non de Terra 2.0.' },
  UST: { cryptocompare: 'UST', coingecko: 'terrausd', note: 'Série disparue : certains fournisseurs la renomment en USTC.' },
  FTM: { note: 'Devenu « S » (Sonic) en 2025 : importer l\'historique sous FTM.' },
  RNDR: { note: 'Devenu RENDER : importer sous RNDR pour la période avant 2024.' },
  BCC: { cryptocompare: 'BCCOIN', note: 'Ne pas confondre avec Bitcoin Cash (ancien code BCC sur certaines plateformes).' },
};

export const CATALOG: CatalogEntry[] = R.map(([symbol, name, category, launch, risk, description]) => ({
  symbol, name, category, launch, risk, description,
  ...(STABLES.has(symbol) ? { stable: true } : {}),
  ...(COLLAPSES[symbol] ? { collapse: COLLAPSES[symbol] } : {}),
  ...(PROVIDER_OVERRIDES[symbol] ? { providers: PROVIDER_OVERRIDES[symbol] } : {}),
}));

export const catalogBySymbol = new Map(CATALOG.map((c) => [c.symbol, c]));
