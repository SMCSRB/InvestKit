// Événements historiques du marché des cryptos, rejoués quand l'horloge simulée du joueur les franchit.
// Textes rédigés pour ce projet. Les ordres de grandeur sont arrondis et SONT À RECONFIRMER avant toute communication externe ;
// ils servent à la pédagogie (quelle leçon tirer ?), pas de donnée de référence. Aucun événement n'est montré avant sa date.
export type EventKind = 'crash' | 'rally' | 'platform_failure' | 'regulation' | 'rates' | 'milestone';

export interface HistoricEvent { key: string; date: string; kind: EventKind; title: string; message: string; lesson: string }

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  crash: 'Krach', rally: 'Envolée', platform_failure: 'Défaillance de plateforme', regulation: 'Réglementation', rates: 'Taux d\'intérêt', milestone: 'Jalon technique',
};

export const HISTORIC_EVENTS: HistoricEvent[] = [
  { key: 'eth-launch-2015', date: '2015-07-30', kind: 'milestone', title: 'Lancement du réseau Ethereum',
    message: 'Le réseau Ethereum démarre : au-delà de la monnaie, il permet d\'exécuter de petits programmes (contrats intelligents) que tout le monde peut vérifier.',
    lesson: 'Un nouvel actif n\'a pas d\'historique : son prix repose surtout sur des attentes. Plus l\'histoire est courte, plus l\'incertitude est grande.' },
  { key: 'btc-spike-2013-04', date: '2013-04-10', kind: 'crash', title: 'Flambée puis chute de plus de 70 % en quelques jours',
    message: 'Après une envolée rapide, le bitcoin s\'effondre en quelques jours alors que les plateformes, débordées par l\'afflux de nouveaux clients, saturent.',
    lesson: 'Une hausse très rapide attire les derniers arrivants… et précède souvent une chute brutale. Les plateformes peuvent aussi être indisponibles au pire moment.' },
  { key: 'btc-china-2013-12', date: '2013-12-05', kind: 'regulation', title: 'La Chine interdit aux banques de traiter le bitcoin',
    message: 'La banque centrale chinoise interdit aux institutions financières du pays d\'utiliser le bitcoin. Le cours, monté à plus de 1 000 $ fin novembre, recule fortement.',
    lesson: 'Une décision de régulateur dans un grand pays peut déplacer tout le marché en un jour : le risque réglementaire est permanent en crypto.' },
  { key: 'mtgox-2014-02', date: '2014-02-24', kind: 'platform_failure', title: 'Mt. Gox bloque les retraits, puis fait faillite',
    message: 'La plus grande plateforme de l\'époque suspend les retraits puis dépose le bilan : environ 850 000 bitcoins de clients ont disparu (vol et mauvaise gestion).',
    lesson: 'Des actifs laissés sur une plateforme ne t\'appartiennent plus vraiment : c\'est la plateforme qui les garde. « Not your keys, not your coins ». Ne concentre pas tout chez un seul acteur.' },
  { key: 'dao-2016-06', date: '2016-06-17', kind: 'platform_failure', title: 'Piratage de « The DAO » sur Ethereum',
    message: 'Une faille dans un contrat intelligent permet de siphonner l\'équivalent d\'environ 50 millions de dollars. La communauté finit par diviser la chaîne en deux (Ethereum et Ethereum Classic).',
    lesson: 'Un programme est aussi fragile que son code. « Le code fait loi » n\'empêche pas les bugs, et les désaccords peuvent scinder un réseau.' },
  { key: 'ico-ban-2017-09', date: '2017-09-04', kind: 'regulation', title: 'La Chine interdit les levées de fonds en jetons (ICO)',
    message: 'Après une année d\'enthousiasme pour les ICO (des projets finançant leur lancement en vendant des jetons), la Chine les interdit. Le marché recule nettement sur quelques jours.',
    lesson: 'Beaucoup d\'ICO n\'avaient ni produit ni client : quand la vague de confiance retombe, les jetons sans usage perdent l\'essentiel de leur valeur.' },
  { key: 'btc-peak-2017-12', date: '2017-12-17', kind: 'rally', title: 'Sommet de la bulle de 2017 (bitcoin près de 20 000 $)',
    message: 'Le bitcoin frôle 20 000 $ après avoir été multiplié par plus de vingt en un an. Tout le monde en parle ; les achats affluent de partout.',
    lesson: 'Quand tout le monde t\'explique qu\'il faut acheter, une bonne partie des acheteurs potentiels l\'a déjà fait. Un sommet ne se reconnaît qu\'après coup : la suite a été une baisse de plus de 80 % en un an.' },
  { key: 'coincheck-2018-01', date: '2018-01-26', kind: 'platform_failure', title: 'Piratage de la plateforme Coincheck',
    message: 'Une grande plateforme japonaise se fait voler l\'équivalent d\'environ 500 millions de dollars de jetons NEM.',
    lesson: 'Les piratages de plateformes sont fréquents. Ils s\'ajoutent au risque de marché : même un actif qui tient son cours peut être perdu par sa garde.' },
  { key: 'bear-2018', date: '2018-02-06', kind: 'crash', title: 'Début du « crypto winter » de 2018',
    message: 'Après le sommet de décembre, la baisse s\'accélère : beaucoup d\'actifs perdent 70 à 95 % en quelques mois, les petits projets en premier.',
    lesson: 'La baisse des grandes capitalisations est forte, celle des petits actifs est extrême. La diversification entre cryptos protège peu : elles chutent presque toutes ensemble.' },
  { key: 'covid-2020-03', date: '2020-03-12', kind: 'crash', title: 'Jeudi noir : le marché chute de moitié en une journée',
    message: 'Dans la panique mondiale du Covid-19, les actions, l\'or et les cryptos sont vendus en même temps. Le bitcoin perd près de la moitié de sa valeur en quelques heures, avec des liquidations en chaîne sur les positions à effet de levier.',
    lesson: 'Dans une vraie crise, les actifs « différents » baissent ensemble : la corrélation monte vers 1. Et l\'effet de levier transforme une baisse en perte totale, parce que les positions sont liquidées de force.' },
  { key: 'halving-2020-05', date: '2020-05-11', kind: 'milestone', title: 'Troisième « halving » du bitcoin',
    message: 'La création de nouveaux bitcoins est divisée par deux, comme prévu par le protocole tous les quatre ans environ.',
    lesson: 'Un événement connu à l\'avance est déjà en grande partie intégré dans le prix. Une raison de hausse « évidente » est rarement un avantage.' },
  { key: 'rally-2020-12', date: '2020-12-16', kind: 'rally', title: 'Le bitcoin dépasse son record de 2017',
    message: 'Porté par l\'arrivée d\'investisseurs institutionnels et par la création monétaire massive de 2020, le bitcoin dépasse 20 000 $ pour la première fois depuis 2017.',
    lesson: 'Les liquidités abondantes (taux bas, relances) soutiennent les actifs risqués. Quand elles se retirent, ils sont les premiers à souffrir.' },
  { key: 'china-mining-2021-05', date: '2021-05-19', kind: 'crash', title: 'Coup d\'arrêt chinois au minage : −30 % en quelques jours',
    message: 'Un coup de frein réglementaire en Chine sur le minage et la chute d\'actifs très spéculatifs font perdre près d\'un tiers du cours en quelques jours.',
    lesson: 'Même après un record, une baisse de 30 % en une semaine est normale en crypto. Si tu ne peux pas la supporter, ta position est trop grosse.' },
  { key: 'china-ban-2021-09', date: '2021-09-24', kind: 'regulation', title: 'La Chine déclare illégales les transactions en cryptos',
    message: 'La Chine interdit toutes les transactions liées aux cryptos. Le marché accuse le coup puis repart, preuve que l\'effet d\'une annonce peut être bref.',
    lesson: 'Une mauvaise nouvelle déjà attendue ou déjà intégrée peut n\'avoir qu\'un effet de courte durée ; réagir à chaque titre de presse coûte des frais pour rien.' },
  { key: 'peak-2021-11', date: '2021-11-10', kind: 'rally', title: 'Record historique : le bitcoin près de 69 000 $',
    message: 'Le bitcoin atteint son record de la période, juste avant un retournement des politiques monétaires.',
    lesson: 'Les records arrivent souvent quand l\'optimisme est maximal. Fixer à l\'avance un objectif de vente (ordre take-profit) évite de décider sous l\'euphorie.' },
  { key: 'fed-2022-03', date: '2022-03-16', kind: 'rates', title: 'La Réserve fédérale relève ses taux pour la première fois depuis 2018',
    message: 'Pour lutter contre l\'inflation, la banque centrale américaine remonte ses taux, puis le fera encore de nombreuses fois. Actions technologiques et cryptos baissent ensemble.',
    lesson: 'Quand l\'argent sans risque rapporte de nouveau, les actifs risqués perdent de leur attrait. Les cryptos ne sont pas « indépendantes » de la finance classique : elles suivent souvent le Nasdaq.' },
  { key: 'terra-2022-05', date: '2022-05-09', kind: 'platform_failure', title: 'Effondrement de Terra (UST / LUNA)',
    message: 'Le stablecoin UST, censé valoir toujours 1 $, décroche puis s\'effondre ; sa jumelle LUNA perd presque toute sa valeur en quelques jours. Plus de 40 milliards de dollars s\'évaporent.',
    lesson: 'Un stablecoin n\'est sûr que s\'il est adossé à de vraies réserves. Un rendement très élevé sur un actif « stable » est un signal d\'alerte, pas une aubaine.' },
  { key: 'celsius-2022-06', date: '2022-06-12', kind: 'platform_failure', title: 'Celsius bloque les retraits ; le marché passe sous 20 000 $',
    message: 'La société de prêt Celsius suspend les retraits de ses clients ; d\'autres acteurs très endettés, comme le fonds Three Arrows Capital, sont en difficulté. Le bitcoin perd encore du terrain.',
    lesson: 'Les crises s\'enchaînent : la faillite d\'un acteur met en difficulté ceux qui lui ont prêté. Le risque de contrepartie est invisible tant que tout va bien.' },
  { key: 'ftx-2022-11', date: '2022-11-08', kind: 'platform_failure', title: 'Faillite de FTX',
    message: 'Une des plus grandes plateformes du monde bloque les retraits puis dépose le bilan en quelques jours : l\'argent des clients avait été utilisé ailleurs. Le marché s\'effondre à nouveau.',
    lesson: 'Même une plateforme célèbre et bien notée peut disparaître avec tes fonds. Répartis tes avoirs, et n\'achète pas un jeton émis par la plateforme qui le met en avant.' },
  { key: 'usdc-2023-03', date: '2023-03-10', kind: 'platform_failure', title: 'Faillite de banques américaines : le stablecoin USDC décroche',
    message: 'La faillite de la Silicon Valley Bank, où une partie des réserves de l\'USDC était déposée, fait passer ce stablecoin brièvement à environ 0,87 $ avant un retour à 1 $.',
    lesson: 'Même un stablecoin « sérieux » peut décrocher si ses réserves sont touchées. Il reste un produit de la finance traditionnelle : il hérite de ses risques.' },
  { key: 'etf-2024-01', date: '2024-01-10', kind: 'regulation', title: 'Les ETF bitcoin « spot » sont autorisés aux États-Unis',
    message: 'Le régulateur américain autorise des fonds cotés qui détiennent directement du bitcoin, ce qui ouvre la porte à des investisseurs qui ne voulaient pas gérer eux-mêmes des cryptos.',
    lesson: 'Une annonce très attendue peut faire monter un actif avant, puis le faire reculer après (« acheter la rumeur, vendre la nouvelle »).' },
  { key: 'halving-2024-04', date: '2024-04-20', kind: 'milestone', title: 'Quatrième « halving » du bitcoin',
    message: 'Nouvelle division par deux du rythme de création de bitcoins.',
    lesson: 'Comme en 2020, l\'événement était connu des années à l\'avance : sa portée sur le prix reste débattue.' },
];

export type RandomKind = 'outage' | 'volatility';
export interface RandomEventDef { kind: RandomKind; title: string; message: string; lesson: string; durationDays: number }

export const RANDOM_EVENT_PARAMS = {
  // VALEURS DE JEU, NON SOURCÉES, À RECONFIRMER. Tirage déterministe par joueur et par jour (mêmes choix = mêmes événements).
  outageProbPerDay: 0.006,
  volatilityProbPerDay: 0.012,
  volatilityMultiplier: 3,     // écart achat/vente et glissement ×3 pendant l'épisode
} as const;

export const RANDOM_EVENTS: Record<RandomKind, RandomEventDef> = {
  outage: { kind: 'outage', durationDays: 1, title: 'Incident technique sur la plateforme',
    message: 'La plateforme est indisponible aujourd\'hui : tu ne peux pas passer d\'ordre au marché. Les ordres déjà placés restent en attente.',
    lesson: 'Les plateformes tombent en panne, souvent quand le marché bouge le plus. Un ordre stop placé à l\'avance te protège mieux qu\'une décision prise en urgence.' },
  volatility: { kind: 'volatility', durationDays: 3, title: 'Volatilité extrême',
    message: 'Le marché s\'agite : les écarts achat/vente et le glissement sont multipliés par trois pendant quelques jours.',
    lesson: 'Quand tout bouge vite, acheter ou vendre « au marché » coûte plus cher. Un ordre limite te garantit ton prix (mais pas l\'exécution).' },
};
