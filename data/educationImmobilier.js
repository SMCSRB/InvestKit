// Parcours « Immobilier » — texte rédigé pour ce projet. Les règles de la vraie vie sont décrites telles quelles ; les paramètres du jeu (apport, seuils,
// frais) sont des valeurs de jeu, à reconfirmer (docs/PARAMETRES-A-RECONFIRMER.md). Chaque terme renvoie au glossaire (glossaryId).
const Q = (id, text, options, correct, explanation) => ({ id, text, options, correct, explanation });

export const immobilierDomain = {
  id: 'real_estate',
  name: 'Immobilier',
  description: 'Acheter, emprunter, louer, être imposé, revendre : le chemin complet d\'un investissement immobilier',
  icon: 'building',
  color: '#f59e0b',
  badge: 'building',
  totalChapters: 5,
  chapters: [
    {
      id: 1,
      title: 'Acheter : prix, frais de notaire et apport',
      duration: '20 min',
      description: 'Ce que coûte réellement un achat, au-delà du prix affiché',
      content: `# Acheter un bien

## Le prix n'est pas le coût
À côté du prix, il y a les **frais de notaire** : environ 7 à 8 % dans l'ancien et 2 à 3 % dans le neuf en France (une grande partie sont des taxes). Il y a aussi les travaux, les frais de dossier du prêt et parfois une expertise.

## L'apport
L'**apport** est la somme que tu mets de ta poche. En pratique, les banques ne prêtent pas les frais de notaire : l'apport doit au moins les couvrir, et elles demandent souvent environ 10 % du prix en plus. Dans le jeu : frais de notaire + 10 % du prix (valeur de jeu, non sourcée, à reconfirmer).

## Les travaux cachés
Une annonce peut cacher des travaux. Une **expertise** coûte quelques centaines de pièces et révèle les travaux réels : elle peut t'éviter une mauvaise surprise.

## Une bonne affaire ?
Un prix bas ne suffit pas : compare le loyer possible, les charges, l'état et la demande locative.`,
      vocabulary: [
        { term: 'Frais de notaire', definition: 'Frais d\'acquisition, en grande partie des taxes', glossaryId: 'frais-notaire' },
        { term: 'Apport', definition: 'Somme que tu mets toi-même', glossaryId: 'apport' },
        { term: 'Expertise', definition: 'Contrôle qui révèle les travaux réels', glossaryId: 'expertise' },
        { term: 'Travaux', definition: 'Coût de remise en état du bien', glossaryId: 'travaux' },
        { term: 'Bonne affaire', definition: 'Prix attractif par rapport à la valeur et au loyer possible', glossaryId: 'bonne-affaire' },
      ],
      quiz: { passingScore: 75, questions: [
        Q(1, 'Que s\'ajoute-t-il au prix d\'un bien ancien ?', ['Rien', 'Des frais de notaire d\'environ 7 à 8 %', 'Un bonus', 'Une réduction'], 1, 'Dans l\'ancien, les frais de notaire pèsent environ 7 à 8 % du prix.'),
        Q(2, 'Qu\'est-ce que l\'apport ?', ['La somme prêtée par la banque', 'La somme que tu mets toi-même', 'Le loyer', 'Un impôt'], 1, 'C\'est ta mise personnelle, avant le prêt.'),
        Q(3, 'En pratique, les banques prêtent-elles les frais de notaire ?', ['Oui, toujours', 'En général non : l\'apport doit les couvrir', 'Seulement aux étudiants', 'Elles les paient'], 1, 'L\'apport couvre au moins les frais de notaire.'),
        Q(4, 'À quoi sert une expertise avant achat ?', ['À réduire le prix automatiquement', 'À révéler les travaux réels', 'À obtenir un prêt', 'À payer moins d\'impôt'], 1, 'Elle évite de découvrir des travaux cachés après l\'achat.'),
        Q(5, 'Dans le jeu, l\'apport minimum est…', ['0', 'Frais de notaire + 10 % du prix (valeur de jeu)', 'Le prix entier', '1 % du prix'], 1, 'C\'est une valeur de jeu, non sourcée, à reconfirmer.'),
      ] },
    },
    {
      id: 2,
      title: 'Emprunter : mensualité, endettement et reste à vivre',
      duration: '25 min',
      description: 'Ce que la banque regarde avant de te prêter',
      content: `# Emprunter

## La mensualité
La **mensualité** est ce que tu rembourses chaque mois : un peu de capital, des intérêts et l'assurance emprunteur. Plus la durée est longue, plus la mensualité baisse, mais plus tu paies d'intérêts au total.

## Le taux d'endettement
En France, le Haut Conseil de stabilité financière (HCSF) demande que le **taux d'endettement** ne dépasse pas **35 %** des revenus, assurance comprise, et que la durée ne dépasse pas **25 ans** (27 ans dans certains cas, comme les travaux importants). Un dossier au-dessus est en général refusé.

## Le reste à vivre
La banque regarde aussi ce qu'il te reste chaque mois pour vivre. Il n'y a pas de seuil officiel : les seuils du jeu sont des valeurs de jeu.

## L'épargne restante
Après l'achat, garde de quoi payer plusieurs mensualités. Le jeu t'avertit sous 3 mensualités (valeur de jeu) : ce n'est pas une règle officielle, mais une marge de prudence. Un prêt personnel non remboursé ne compte pas comme de l'épargne.`,
      vocabulary: [
        { term: 'Mensualité', definition: 'Somme remboursée chaque mois', glossaryId: 'mensualite' },
        { term: 'Taux d\'endettement', definition: 'Part des revenus consacrée aux crédits', glossaryId: 'endettement' },
        { term: 'Reste à vivre', definition: 'Ce qui reste chaque mois pour vivre', glossaryId: 'reste-a-vivre' },
        { term: 'Épargne restante', definition: 'Pièces à toi après l\'opération, en mensualités', glossaryId: 'epargne-restante' },
        { term: 'TAEG', definition: 'Coût total annuel du crédit', glossaryId: 'taeg' },
      ],
      quiz: { passingScore: 75, questions: [
        Q(1, 'Quel taux d\'endettement maximum recommande le HCSF, assurance comprise ?', ['20 %', '35 %', '50 %', '70 %'], 1, 'Au-dessus de 35 %, un dossier est en général refusé.'),
        Q(2, 'Allonger la durée d\'un prêt…', ['Baisse la mensualité mais augmente le coût total', 'Augmente la mensualité', 'Supprime les intérêts', 'N\'a aucun effet'], 0, 'Tu paies plus longtemps donc plus d\'intérêts.'),
        Q(3, 'Quelle est la durée maximale habituelle d\'un prêt immobilier (HCSF) ?', ['10 ans', '25 ans', '40 ans', '50 ans'], 1, 'Jusqu\'à 27 ans dans certains cas, comme les travaux importants.'),
        Q(4, 'Que mesure le reste à vivre ?', ['Ce qui reste chaque mois pour vivre après les crédits et dépenses', 'Le capital restant dû', 'Les frais de notaire', 'Le loyer'], 0, 'La banque vérifie que tu peux vivre après avoir payé le crédit.'),
        Q(5, 'L\'avertissement « moins de 3 mensualités » du jeu est…', ['Une règle officielle française', 'Une marge de prudence, valeur de jeu non officielle', 'Un refus', 'Un impôt'], 1, 'Tu peux acheter quand même, mais le risque d\'impayé augmente.'),
      ] },
    },
    {
      id: 3,
      title: 'Louer : loyer, charges, vacance et rendement',
      duration: '25 min',
      description: 'Ce que rapporte vraiment un bien loué',
      content: `# Louer un bien

## Le loyer et les charges
Le **loyer** est ce que paie le locataire. Une partie des charges est récupérable sur lui ; d'autres restent à ta charge : taxe foncière, copropriété non récupérable, assurance, entretien.

## La vacance
Entre deux locataires, le bien peut rester vide : c'est la **vacance**. Sur un quartier très demandé (zone tendue), elle est courte ; sur un marché détendu, elle peut durer.

## Rendement brut et cash-flow
Le **rendement brut** compare le loyer annuel au prix. Il ne tient pas compte des charges, de la vacance ni du crédit. Le **cash-flow** est ce qui reste réellement chaque mois, crédit compris : il peut être négatif (un effort d'épargne).

## Les impayés
Un locataire peut ne pas payer. Une assurance loyers impayés (GLI) peut couvrir une partie du risque ; il existe aussi une trêve hivernale qui protège les locataires l'hiver.`,
      vocabulary: [
        { term: 'Loyer', definition: 'Somme payée par le locataire', glossaryId: 'loyer' },
        { term: 'Vacance', definition: 'Période sans locataire', glossaryId: 'vacance' },
        { term: 'Rendement brut', definition: 'Loyer annuel ÷ prix', glossaryId: 'rendement-brut' },
        { term: 'Cash-flow', definition: 'Ce qui reste chaque mois, crédit compris', glossaryId: 'cash-flow' },
        { term: 'Effort d\'épargne', definition: 'Somme à ajouter chaque mois quand le cash-flow est négatif', glossaryId: 'effort-epargne' },
        { term: 'Taxe foncière', definition: 'Impôt annuel du propriétaire', glossaryId: 'taxe-fonciere' },
        { term: 'GLI', definition: 'Assurance loyers impayés', glossaryId: 'gli' },
      ],
      quiz: { passingScore: 75, questions: [
        Q(1, 'Que compare le rendement brut ?', ['Le loyer annuel au prix du bien', 'Le cash-flow au loyer', 'Les charges au prix', 'Les impôts aux loyers'], 0, 'Il ignore les charges, la vacance et le crédit.'),
        Q(2, 'Qu\'est-ce que la vacance ?', ['Une période sans locataire', 'Un congé du propriétaire', 'Un impôt', 'Un crédit'], 0, 'Pendant ce temps, aucun loyer n\'est encaissé.'),
        Q(3, 'Le cash-flow peut-il être négatif ?', ['Non, jamais', 'Oui : le crédit et les charges peuvent dépasser les loyers', 'Seulement avec un gros apport', 'Seulement dans le neuf'], 1, 'Tu dois alors compléter chaque mois : c\'est l\'effort d\'épargne.'),
        Q(4, 'Quelle charge reste à ta charge de propriétaire ?', ['La taxe foncière', 'Toutes les charges du locataire', 'L\'eau du locataire', 'Aucune'], 0, 'Comme la copropriété non récupérable, l\'assurance et l\'entretien.'),
        Q(5, 'À quoi sert une GLI ?', ['À couvrir une partie des loyers impayés', 'À baisser les frais de notaire', 'À augmenter le loyer', 'À éviter l\'impôt'], 0, 'C\'est une assurance contre les impayés de loyer.'),
      ] },
    },
    {
      id: 4,
      title: 'Impôts et DPE : ce qui pèse après l\'achat',
      duration: '25 min',
      description: 'Loyers imposés, plus-value et performance énergétique',
      content: `# Impôts et DPE

## Les loyers sont imposés
Les loyers perçus sont des **revenus fonciers** : ils s'ajoutent à tes revenus et subissent l'impôt sur le revenu et les prélèvements sociaux. Le jeu applique un barème simplifié (valeurs de jeu, à reconfirmer).

## La plus-value à la revente
Quand tu revends plus cher que tu n'as acheté, la **plus-value** est imposée, avec des **abattements pour durée de détention** : plus tu gardes longtemps, moins tu paies. En France, l'impôt sur le revenu disparaît après 22 ans de détention et les prélèvements sociaux après 30 ans. Ce sont les règles que le jeu reprend.

## Le DPE
Le **diagnostic de performance énergétique** classe un logement de A à G. La location des logements les plus énergivores est progressivement interdite en France (G d'abord, puis F et E). Un mauvais DPE peut obliger à faire des travaux ou t'empêcher de louer.

## Le coût réel d'une revente
Impôt, frais d'agence, diagnostics et remboursement anticipé réduisent ce que tu touches. C'est pourquoi le classement du jeu compte la valeur **nette de revente**.`,
      vocabulary: [
        { term: 'Revenus fonciers', definition: 'Loyers imposés', glossaryId: 'revenus-fonciers' },
        { term: 'Plus-value', definition: 'Gain à la revente, imposé', glossaryId: 'plus-value' },
        { term: 'Abattement', definition: 'Réduction de l\'impôt selon la durée de détention', glossaryId: 'abattement' },
        { term: 'DPE', definition: 'Classe énergétique du logement de A à G', glossaryId: 'dpe' },
        { term: 'Valeur verte', definition: 'Effet de la performance énergétique sur la valeur', glossaryId: 'valeur-verte' },
      ],
      quiz: { passingScore: 75, questions: [
        Q(1, 'Les loyers perçus sont…', ['Non imposés', 'Imposés comme revenus fonciers', 'Imposés à 100 %', 'Remboursés'], 1, 'Ils s\'ajoutent à tes revenus imposables.'),
        Q(2, 'À quoi servent les abattements pour durée de détention ?', ['À réduire l\'impôt sur la plus-value quand on garde longtemps', 'À augmenter la plus-value', 'À payer le notaire', 'À baisser le loyer'], 0, 'Plus tu gardes longtemps, moins tu paies.'),
        Q(3, 'Après combien d\'années de détention l\'impôt sur le revenu sur la plus-value disparaît-il en France ?', ['5 ans', '10 ans', '22 ans', '40 ans'], 2, 'Les prélèvements sociaux, eux, disparaissent après 30 ans.'),
        Q(4, 'Que classe le DPE ?', ['La performance énergétique, de A à G', 'Le prix', 'Le loyer', 'La taille'], 0, 'Un mauvais DPE peut interdire la location.'),
        Q(5, 'Pourquoi le classement compte-t-il la valeur nette de revente ?', ['Parce que la revente coûte (impôt, agence, diagnostics, remboursement anticipé)', 'Parce que c\'est plus simple', 'Parce que les frais sont nuls', 'Pour punir les joueurs'], 0, 'Ce que tu touches vraiment est inférieur au prix de vente.'),
      ] },
    },
    {
      id: 5,
      title: 'Revendre et gérer les risques',
      duration: '20 min',
      description: 'Frais de revente, impayés et prudence',
      content: `# Revendre et gérer les risques

## Les frais de revente
Frais d'agence, diagnostics obligatoires, éventuelle indemnité de remboursement anticipé du prêt : ils viennent en déduction du prix. Un bien **loué** se vend en général moins cher qu'un bien vide, car l'acheteur doit garder le locataire : le jeu applique une décote de 10 % (valeur de jeu, non sourcée, à reconfirmer).

## Les impayés de crédit
Si tu ne paies plus ta mensualité, tu t'exposes au défaut, puis à la vente forcée à un prix plus bas. Une vente amiable rapide, avant la vente forcée, coûte moins cher.

## Les bonnes habitudes
Garde une marge, évite de dépendre d'un seul loyer, anticipe les travaux, et n'emprunte pas au maximum de ce que la banque accepte : une banque accepte parfois plus que ce que tu peux supporter.

## Le temps
L'immobilier est un placement long : les frais d'entrée et de sortie se rentabilisent sur des années.`,
      vocabulary: [
        { term: 'Frais d\'agence', definition: 'Commission de l\'agence à la vente', glossaryId: 'frais-agence' },
        { term: 'IRA', definition: 'Indemnité de remboursement anticipé', glossaryId: 'ira' },
        { term: 'Décote', definition: 'Baisse de prix, par exemple pour un bien loué', glossaryId: 'decote' },
        { term: 'Vente forcée', definition: 'Vente imposée après des impayés, à prix réduit', glossaryId: 'vente-forcee' },
        { term: 'Défaut de paiement', definition: 'Mensualités non payées de suite', glossaryId: 'defaut-paiement' },
      ],
      quiz: { passingScore: 75, questions: [
        Q(1, 'Quels frais réduisent ce que tu touches à la revente ?', ['Agence, diagnostics et éventuel remboursement anticipé', 'Aucun', 'Seulement le notaire d\'achat', 'Les loyers perçus'], 0, 'Ils sont déduits du prix de vente.'),
        Q(2, 'Pourquoi un bien loué se vend-il souvent moins cher ?', ['L\'acheteur doit garder le locataire', 'Il est plus récent', 'Il a plus de pièces', 'C\'est interdit de le vendre plus cher'], 0, 'Dans le jeu : décote de 10 % (valeur de jeu).'),
        Q(3, 'Que risques-tu en cessant de payer ton crédit ?', ['Rien', 'Un défaut puis une vente forcée à prix réduit', 'Une récompense', 'Un bonus'], 1, 'La vente forcée se fait à un prix plus bas.'),
        Q(4, 'Vaut-il mieux emprunter le maximum accepté par la banque ?', ['Oui, toujours', 'Non : garde une marge au-dessus de ce que tu peux supporter', 'Oui, c\'est obligatoire', 'Peu importe'], 1, 'La banque accepte parfois plus que ce que tu peux tenir.'),
        Q(5, 'L\'immobilier est plutôt un placement…', ['À très court terme', 'À long terme', 'Sans frais', 'Sans risque'], 1, 'Les frais d\'entrée et de sortie se rentabilisent sur des années.'),
      ] },
    },
  ],
  finalQuiz: {
    passingScore: 75,
    questions: [
      Q(1, 'Quels frais s\'ajoutent au prix d\'un bien ancien ?', ['Des frais de notaire d\'environ 7 à 8 %', 'Aucun', 'Un bonus', 'Une réduction'], 0, 'Dans l\'ancien, c\'est environ 7 à 8 % du prix.'),
      Q(2, 'Quel taux d\'endettement maximum le HCSF demande-t-il ?', ['35 % assurance comprise', '5 %', '90 %', 'Aucun plafond'], 0, 'Et une durée maximale de 25 ans, 27 dans certains cas.'),
      Q(3, 'Que dit le rendement brut ?', ['Loyer annuel ÷ prix, sans charges ni crédit', 'Ce qui reste après impôts', 'Le cash-flow', 'La plus-value'], 0, 'C\'est un repère, pas un gain réel.'),
      Q(4, 'Un cash-flow négatif signifie…', ['Que tu dois compléter chaque mois', 'Que tu gagnes de l\'argent', 'Que le bien est gratuit', 'Que le crédit est remboursé'], 0, 'C\'est l\'effort d\'épargne.'),
      Q(5, 'Les loyers perçus sont…', ['Des revenus fonciers imposables', 'Non imposables', 'Remboursés', 'Réservés aux professionnels'], 0, 'Ils subissent impôt sur le revenu et prélèvements sociaux.'),
      Q(6, 'Après 22 ans de détention, la plus-value immobilière…', ['N\'est plus soumise à l\'impôt sur le revenu', 'Double', 'Disparaît totalement avec les prélèvements sociaux', 'Est interdite'], 0, 'Les prélèvements sociaux, eux, disparaissent après 30 ans.'),
      Q(7, 'Pourquoi le jeu compte-t-il la valeur nette de revente ?', ['Parce que revendre coûte et réduit ce que tu touches', 'Pour compliquer', 'Parce que le prix est faux', 'Pour supprimer les frais'], 0, 'Impôt, agence, diagnostics et remboursement anticipé.'),
      Q(8, 'Que se passe-t-il en cas d\'impayés prolongés ?', ['Défaut puis vente forcée à prix réduit', 'Rien', 'Un bonus', 'Le prêt est effacé sans conséquence'], 0, 'Une vente amiable rapide coûte moins cher qu\'une vente forcée.'),
    ],
  },
};
