// Parcours « Bourse et PEA » — texte rédigé pour ce projet. Les règles de la vraie vie sont décrites telles quelles ; les paramètres du jeu (frais, seuils)
// sont des valeurs de jeu, à reconfirmer (voir docs/PARAMETRES-A-RECONFIRMER.md). Chaque terme renvoie au glossaire (glossaryId).
const Q = (id, text, options, correct, explanation) => ({ id, text, options, correct, explanation });

export const bourseDomain = {
  id: 'stocks',
  name: 'Bourse et PEA',
  description: 'Actions, ETF, obligations, risque, enveloppes fiscales et frais : les bases pour investir sans te faire piéger',
  icon: 'chart',
  color: '#22c55e',
  badge: 'chart',
  totalChapters: 5,
  chapters: [
    {
      id: 1,
      title: 'Actions, ETF et obligations : que possèdes-tu vraiment ?',
      duration: '20 min',
      description: 'Trois façons de placer de l\'argent, trois niveaux de risque',
      content: `# Actions, ETF et obligations

## L'action
Une **action** est une part d'une entreprise. Tu en deviens copropriétaire : tu profites de sa croissance et de ses dividendes, mais tu peux aussi perdre une partie ou la totalité de ta mise si elle va mal.

## L'obligation
Une **obligation** est un prêt que tu fais à une entreprise ou à un État. Il te verse des intérêts et te rend le capital à l'échéance, sauf défaut de l'emprunteur. Elle bouge en général moins qu'une action, mais son prix peut baisser quand les taux montent.

## L'ETF
Un **ETF** (fonds indiciel coté) suit un indice, par exemple les grandes entreprises d'un pays. En un seul achat, tu détiens des dizaines ou des centaines d'entreprises. Ses frais sont en général plus faibles que ceux d'un fonds géré activement.

## Le cours
Le **cours** est le prix d'un titre à un instant. Dans le jeu, tu rejoues des cours historiques à ta date simulée : ils ne sont pas en direct.`,
      vocabulary: [
        { term: 'Action', definition: 'Part d\'une entreprise', glossaryId: 'action' },
        { term: 'Obligation', definition: 'Prêt à une entreprise ou à un État', glossaryId: 'obligation' },
        { term: 'ETF', definition: 'Fonds qui suit un indice et se négocie comme une action', glossaryId: 'etf' },
        { term: 'Cours de clôture', definition: 'Dernier prix de la séance', glossaryId: 'cours-cloture' },
      ],
      quiz: { passingScore: 75, questions: [
        Q(1, 'Que possèdes-tu quand tu achètes une action ?', ['Une part de l\'entreprise', 'Un prêt à l\'entreprise', 'Un droit garanti à un dividende', 'Un compte bancaire'], 0, 'Tu deviens copropriétaire, avec ses gains et ses pertes possibles.'),
        Q(2, 'Une obligation est…', ['Une part d\'entreprise', 'Un prêt que tu fais à un emprunteur', 'Un impôt', 'Un fonds qui suit un indice'], 1, 'L\'emprunteur te verse des intérêts et te rend le capital à l\'échéance.'),
        Q(3, 'Qu\'apporte un ETF ?', ['La garantie de ne jamais perdre', 'Un seul achat qui répartit sur beaucoup d\'entreprises', 'Un rendement fixe', 'L\'absence de frais'], 1, 'Il suit un indice : tu détiens en un achat des dizaines ou centaines de titres.'),
        Q(4, 'Une action peut-elle perdre toute sa valeur ?', ['Non, jamais', 'Oui, si l\'entreprise fait faillite', 'Seulement en crise mondiale', 'Seulement si on la vend'], 1, 'C\'est le risque de l\'action : la perte peut être totale.'),
        Q(5, 'Dans le jeu, les cours sont…', ['En direct', 'Des cours historiques rejoués à ta date simulée', 'Inventés au hasard', 'Ceux de demain'], 1, 'Ils ne sont pas en direct et le graphique ne montre rien d\'après ta date simulée.'),
      ] },
    },
    {
      id: 2,
      title: 'Risque, volatilité et diversification',
      duration: '25 min',
      description: 'Pourquoi ne pas tout mettre sur un seul titre',
      content: `# Risque, volatilité et diversification

## La volatilité
La **volatilité** mesure l'ampleur des variations d'un prix. Une volatilité élevée veut dire des hausses et des baisses fortes : plus de gains possibles, mais aussi plus de pertes possibles.

## Le risque, ce n'est pas seulement la baisse
Le risque est aussi de devoir vendre au mauvais moment. Si tu as besoin de ton argent dans deux ans, une action n'est pas un bon endroit pour le mettre.

## La diversification
Ne pas tout mettre dans un seul titre, un seul secteur, un seul pays. Quand une entreprise baisse, une autre peut monter : l'ensemble varie moins. La diversification réduit le risque propre à un titre, elle n'élimine pas le risque de marché : en crise, presque tout baisse.

## Les crises passées
Les grandes baisses existent : 2008, mars 2020… Elles sont suivies de rebonds, mais il faut pouvoir attendre. Le jeu te montre, dans l'analyse de risque, comment ton portefeuille aurait traversé ces crises.`,
      vocabulary: [
        { term: 'Volatilité', definition: 'Ampleur des variations d\'un prix', glossaryId: 'volatilite' },
        { term: 'Diversification', definition: 'Répartir pour ne pas dépendre d\'un seul titre', glossaryId: 'diversification' },
        { term: 'Performance du portefeuille', definition: 'Gain ou perte en pourcentage', glossaryId: 'performance-portefeuille' },
      ],
      quiz: { passingScore: 75, questions: [
        Q(1, 'Que mesure la volatilité ?', ['L\'ampleur des variations d\'un prix', 'Les dividendes', 'Les frais', 'Le nombre de titres'], 0, 'Plus elle est haute, plus les hausses et baisses sont fortes.'),
        Q(2, 'La diversification permet de…', ['Supprimer tout risque', 'Réduire le risque propre à un titre', 'Garantir un gain', 'Éviter les frais'], 1, 'Elle réduit le risque d\'un titre seul, pas le risque de marché.'),
        Q(3, 'Tu auras besoin de cet argent dans 2 ans. Une action est…', ['Un bon choix, car elle monte toujours', 'Risquée : tu pourrais devoir vendre au mauvais moment', 'Sans risque', 'Interdite'], 1, 'Le risque dépend aussi du temps dont tu disposes.'),
        Q(4, 'En cas de crise générale, un portefeuille diversifié…', ['Ne baisse jamais', 'Peut quand même baisser fortement', 'Monte toujours', 'Est protégé par la loi'], 1, 'Presque tous les actifs peuvent baisser ensemble.'),
        Q(5, 'Mettre toute ta somme sur une seule entreprise est…', ['La meilleure stratégie', 'Peu diversifié donc plus risqué', 'Obligatoire', 'Sans conséquence'], 1, 'Tout dépend alors du sort d\'une seule entreprise.'),
      ] },
    },
    {
      id: 3,
      title: 'PEA, compte-titres et impôts',
      duration: '25 min',
      description: 'Deux enveloppes, deux fiscalités',
      content: `# PEA, compte-titres et impôts

## Le compte-titres ordinaire (CTO)
Sans plafond de versement, ouvert à presque tous les titres. Les gains sont en général soumis à la **flat tax** : 30 % (12,8 % d'impôt sur le revenu + 17,2 % de prélèvements sociaux).

## Le PEA
Le **plan d'épargne en actions** sert à investir en actions européennes. Si tu gardes ton plan au moins 5 ans, les gains ne sont plus soumis à l'impôt sur le revenu, mais aux prélèvements sociaux. Un retrait avant 5 ans entraîne en général la clôture du plan. Les versements sont plafonnés.

## Ce que fait le jeu
Le jeu applique une fiscalité simplifiée inspirée de ces règles. Ses barèmes sont des **valeurs de jeu à reconfirmer** : vérifie toujours les règles à jour sur les sources officielles avant d'agir dans la vraie vie.

## Une moins-value n'est pas un gain
Tu ne paies d'impôt que sur un gain réalisé, c'est-à-dire quand tu vends.`,
      vocabulary: [
        { term: 'PEA', definition: 'Enveloppe pour actions européennes, fiscalité allégée après 5 ans', glossaryId: 'pea' },
        { term: 'Compte-titres', definition: 'Enveloppe sans plafond, soumise à la flat tax', glossaryId: 'compte-titres' },
        { term: 'Flat tax', definition: 'Prélèvement forfaitaire de 30 % sur les gains', glossaryId: 'flat-tax' },
      ],
      quiz: { passingScore: 75, questions: [
        Q(1, 'Quel taux global la flat tax représente-t-elle en France ?', ['10 %', '30 %', '50 %', '0 %'], 1, '12,8 % d\'impôt sur le revenu + 17,2 % de prélèvements sociaux.'),
        Q(2, 'Après 5 ans, que change le PEA ?', ['Plus aucun prélèvement', 'Les gains ne sont plus soumis à l\'impôt sur le revenu, mais restent soumis aux prélèvements sociaux', 'Les gains sont doublés', 'Rien'], 1, 'Seuls les prélèvements sociaux restent dus.'),
        Q(3, 'Quand paies-tu l\'impôt sur un gain en titres ?', ['À l\'achat', 'Quand tu réalises le gain en vendant', 'Chaque jour', 'Jamais'], 1, 'Un gain latent (non vendu) n\'est pas imposé.'),
        Q(4, 'Le compte-titres ordinaire est-il plafonné en versements ?', ['Oui, comme le PEA', 'Non', 'Oui à 1 000', 'Seulement pour les débutants'], 1, 'Il n\'a pas de plafond de versement, contrairement au PEA.'),
        Q(5, 'Les barèmes fiscaux du jeu sont…', ['Des règles officielles à jour', 'Des valeurs de jeu à reconfirmer', 'Sans importance', 'Interdits'], 1, 'Vérifie toujours les sources officielles avant d\'agir dans la vraie vie.'),
      ] },
    },
    {
      id: 4,
      title: 'Les frais : le coût qui grignote tes gains',
      duration: '15 min',
      description: 'Courtage, frais des fonds et effet sur la durée',
      content: `# Les frais

## Le courtage
Chaque ordre d'achat ou de vente peut coûter des **frais de courtage** : un pourcentage de l'opération, parfois avec un minimum. Beaucoup de petits ordres coûtent plus cher qu'un ordre unique.

## Les frais des fonds
Un ETF ou un fonds prélève des frais annuels. Quelques dixièmes de pour cent de plus par an peuvent représenter une somme importante après vingt ans.

## L'effet sur la durée
Les frais s'appliquent même quand le marché baisse. Compare toujours le coût total, pas seulement le prix affiché.

## Dans le jeu
Les frais de courtage et les impôts sont expliqués **avant** de valider un achat ou une vente. Les montants du jeu sont des valeurs de jeu.`,
      vocabulary: [
        { term: 'Courtage', definition: 'Frais prélevés à chaque ordre', glossaryId: 'courtage' },
        { term: 'Performance', definition: 'Résultat de ton portefeuille, frais compris', glossaryId: 'performance' },
      ],
      quiz: { passingScore: 75, questions: [
        Q(1, 'Que sont les frais de courtage ?', ['Des frais prélevés à chaque ordre', 'Un impôt sur le revenu', 'Un dividende', 'Une récompense'], 0, 'Ils s\'appliquent à l\'achat comme à la vente.'),
        Q(2, 'Pourquoi comparer le coût total ?', ['Parce que les frais réduisent le gain, même quand le marché baisse', 'Parce que les frais sont toujours nuls', 'Pour payer plus', 'Ce n\'est pas utile'], 0, 'Les frais s\'ajoutent au prix et pèsent sur la performance.'),
        Q(3, 'Beaucoup de petits ordres, par rapport à un seul…', ['Coûtent souvent plus cher', 'Coûtent toujours moins', 'Sont gratuits', 'Sont interdits'], 0, 'Surtout quand il existe un minimum de frais par ordre.'),
        Q(4, 'Quelques dixièmes de pour cent de frais annuels en plus…', ['N\'ont aucun effet', 'Pèsent beaucoup après vingt ans', 'Sont remboursés', 'Sont déduits de l\'impôt'], 1, 'L\'effet se cumule année après année.'),
        Q(5, 'Dans le jeu, quand les frais sont-ils expliqués ?', ['Après la vente', 'Avant de valider l\'ordre', 'Jamais', 'Seulement en fin d\'année'], 1, 'Pour que tu saches ce que tu paies avant de décider.'),
      ] },
    },
    {
      id: 5,
      title: 'Investir dans la durée sans paniquer',
      duration: '20 min',
      description: 'Horizon, régularité et réactions aux baisses',
      content: `# Investir dans la durée

## L'horizon de placement
Plus ton horizon est long, plus tu peux supporter les variations. Un projet à court terme ne doit pas reposer sur des actions.

## Investir régulièrement
Investir un peu chaque mois lisse ton prix d'entrée : tu achètes plus de titres quand c'est bas, moins quand c'est haut. Ce n'est pas une garantie de gain, mais cela évite de parier sur un seul moment.

## Les erreurs classiques
- Vendre en panique après une forte baisse, puis racheter plus cher.
- Courir après ce qui vient de monter.
- Investir de l'argent dont tu auras besoin bientôt.

## Dans le jeu
Tu peux avancer dans le temps année par année et voir ce que ton portefeuille aurait fait. Les résultats passés ne prédisent pas l'avenir : ce sont des leçons, pas des promesses.`,
      vocabulary: [
        { term: 'Valeur des positions', definition: 'Valeur de ce que tu détiens à une date', glossaryId: 'valeur-positions' },
        { term: 'Année simulée', definition: 'Date de jeu à laquelle tu te trouves', glossaryId: 'annee-simulee' },
      ],
      quiz: { passingScore: 75, questions: [
        Q(1, 'Quel est l\'intérêt d\'investir régulièrement ?', ['Garantir un gain', 'Lisser ton prix d\'entrée', 'Supprimer les frais', 'Éviter l\'impôt'], 1, 'Tu n\'achètes pas tout à un seul moment.'),
        Q(2, 'Que faire de l\'argent dont tu as besoin dans 6 mois ?', ['L\'investir en actions', 'Ne pas le mettre sur un placement risqué', 'Le prêter', 'Tout vendre'], 1, 'Un horizon court ne supporte pas les variations des actions.'),
        Q(3, 'Vendre en panique après une forte baisse…', ['Est souvent une erreur coûteuse', 'Garantit un gain', 'Est obligatoire', 'Supprime le risque'], 0, 'Tu peux transformer une perte provisoire en perte réelle.'),
        Q(4, 'Les résultats passés montrés par le jeu…', ['Prédisent l\'avenir', 'Sont des leçons, pas des promesses', 'Sont garantis', 'Sont inventés'], 1, 'Le passé ne prédit pas l\'avenir.'),
        Q(5, 'Courir après ce qui vient de monter est…', ['Une stratégie sûre', 'Une erreur fréquente', 'Obligatoire', 'Sans risque'], 1, 'Tu achètes souvent trop haut.'),
      ] },
    },
  ],
  finalQuiz: {
    passingScore: 75,
    questions: [
      Q(1, 'Quelle est la différence entre une action et une obligation ?', ['L\'action est une part d\'entreprise, l\'obligation un prêt', 'Aucune', 'L\'obligation est une part d\'entreprise', 'L\'action est un impôt'], 0, 'Copropriété d\'un côté, créance de l\'autre.'),
      Q(2, 'Que fait la diversification ?', ['Elle réduit le risque propre à un titre', 'Elle garantit un gain', 'Elle supprime les frais', 'Elle augmente la volatilité'], 0, 'Elle n\'élimine pas le risque de marché.'),
      Q(3, 'La flat tax en France représente…', ['30 % des gains', '5 % des gains', '70 % des gains', '0 %'], 0, '12,8 % + 17,2 %.'),
      Q(4, 'Après 5 ans, un PEA…', ['Ne soumet plus les gains à l\'impôt sur le revenu', 'Supprime toute taxe', 'Double les gains', 'Est clôturé'], 0, 'Les prélèvements sociaux restent dus.'),
      Q(5, 'Quand un gain est-il imposé ?', ['Quand il est réalisé par une vente', 'Quand le cours monte', 'Chaque jour', 'Jamais'], 0, 'Un gain latent n\'est pas imposé.'),
      Q(6, 'Pourquoi les frais comptent-ils ?', ['Ils pèsent sur la performance même quand le marché baisse', 'Ils sont toujours nuls', 'Ils sont remboursés', 'Ils n\'existent que dans le jeu'], 0, 'Ils s\'ajoutent au prix et se cumulent.'),
      Q(7, 'Que dit la règle de prudence sur l\'argent dont tu as besoin bientôt ?', ['Ne pas le placer en actions', 'L\'investir en totalité', 'Emprunter pour acheter plus', 'Ne pas y toucher même en cas de besoin'], 0, 'Un horizon court ne supporte pas les baisses.'),
      Q(8, 'Les résultats passés rejoués dans le jeu…', ['Ne prédisent pas l\'avenir', 'Garantissent des gains', 'Sont les cours de demain', 'Sont toujours positifs'], 0, 'Ce sont des leçons, pas des promesses.'),
    ],
  },
};
