# Badge Pro doré et identifiant « Pseudo#tag »

## Ce que voient les joueurs
- **Couronne dorée « Membre Pro »** à côté du pseudo partout où un joueur apparaît : amis, demandes, bloqués, guilde, classement mondial, classement entre amis. Info-bulle au survol **et au clavier**. Dessin original, lisible à 16 px.
- Le serveur n'envoie qu'un **booléen** `pro` (jamais de date, de formule ni de montant). Il disparaît dès que l'abonnement s'arrête (ou que le Pro manuel est retiré) : la valeur est relue en base à chaque requête.
- **Confidentialité** : Paramètres → Données → « Afficher ma couronne Pro aux autres joueurs ». Masquée, elle ne l'est que pour les autres ; le joueur la voit toujours chez lui.
- **Identifiant** `Pseudo#1234` : tout le monde a un # automatique (4 chiffres). On ajoute un ami avec `Pseudo#tag` exact (ou avec son code ami, comme avant). Pas de recherche partielle : aucune liste de joueurs à parcourir. Un mauvais # et un pseudo inconnu donnent **la même réponse**.

## Choisir son # (membres Pro)
- Lettres sans accent et chiffres, 3 à 12 caractères. La casse choisie est gardée à l'affichage ; l'unicité l'ignore.
- **Unicité garantie par la base** : index unique sur (pseudo, #) après « pliage » des ressemblances (`0/o`, `1/i/l`, `5/s`, `3/e`, `4/a`, accents, casse). Même sans passer par le site, la base refuse un doublon.
- **Refusés** : mots réservés (admin, support, investkit, modérateur, staff, officiel…), insultes, et tout # qui se lit comme le **pseudo d'un autre joueur** ou contient le pseudo d'un **administrateur**. Listes dans `backend/src/config/tagRules.ts` (VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER) ; pliage dans `backend/src/engine/playerTag.ts`.
- **Un changement par mois** (verrou serveur : deux demandes simultanées du même joueur → une seule passe).
- **Historique conservé** (`player_tag_history`). L'ancien # est **réservé 30 jours** à son ancien propriétaire, puis libéré.
- **Les amis ne cassent jamais** : amitiés, guildes et demandes pointent sur l'identifiant interne du joueur (uuid), pas sur le #.

## Fin de l'abonnement : la règle que je recommande
**Garder le # choisi 30 jours après la fin du Pro, puis revenir à un # automatique, et le mettre de côté 90 jours pour le rendre en cas de réabonnement.**

Pourquoi :
- **Pas de rupture brutale.** Une carte refusée ou un oubli de renouvellement ne doit pas te faire perdre ton identité du jour au lendemain ; 30 jours laissent le temps de réagir.
- **Pas de squat gratuit.** Garder le # pour toujours reviendrait à offrir à vie un avantage Pro à quelqu'un qui ne paie plus (et à bloquer de beaux # pour rien). Le retour à l'automatique garde la valeur du Pro.
- **Pas de perte définitive.** Si le joueur revient dans les 90 jours, son # lui est rendu (s'il est encore libre) : cela encourage le réabonnement sans punir.
- **Aucun lien cassé** : les amis restent amis dans tous les cas ; seul l'affichage change.
- Autre choix possible (à décider par toi) : « garder pour toujours » (simple, moins de valeur Pro) ou « retour immédiat » (strict, mais brutal). Les durées (30 et 90 jours) sont dans `tagRules.ts`.

## Boutons d'abonnement
- **Paramètres → Abonnement** : Pro abonné → « Gérer mon abonnement » ouvre le portail Stripe (détails, renouvellement, changement de formule, résiliation, factures). **Pro accordé à la main** → bouton masqué et message « Accès Pro offert, aucun abonnement à gérer. » (le serveur répond aussi `MANUAL_PRO` si on appelle le portail). Gratuit → les offres.
- **Menu du profil** : « Gérer mon abonnement » (Pro) ou « Voir les offres » (gratuit).
- Le portail Stripe fonctionne en **mode test** tant que les clés Stripe de l'environnement sont des clés de test (rien à changer dans le code).
- Correction au passage : la page Paramètres lisait le statut Pro d'un contexte indisponible à cet endroit ; un Pro accordé à la main y apparaissait « gratuit ». Elle lit maintenant `/auth/me` (test de non-régression ajouté).

## Tests
`backend/tests/playerTag.test.ts` (règles pures, doublon, mots interdits, ressemblance, limite mensuelle, deux demandes simultanées, libération de l'ancien #, amis, badge, confidentialité, fin d'abonnement, réabonnement) et `backend/tests/proBadgeTagFront.test.ts` (interface). Captures : `docs/captures-pro/`.
