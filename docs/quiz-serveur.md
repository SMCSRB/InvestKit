# Quiz d'éducation : corrigés par le serveur, réponses mélangées

## Ce qui a changé
- **Ordre des réponses mélangé** à chaque ouverture d'un quiz et à chaque nouvelle tentative (chapitres et quiz final, tous les cours). Plus de « la bonne réponse est toujours la première ».
- **Le navigateur ne corrige plus.** Il envoie au serveur, pour chaque question, l'**identifiant** de l'option choisie (par exemple `o1wpdz65o3eg`), jamais sa position ni un score. Le serveur compare avec la bonne réponse, calcule le score et décide de la récompense.
- Route : `POST /api/v1/education/submit-quiz` avec `{ domainId, scope, answers }` (`scope` = numéro du chapitre, ou `final`).
- Les anciennes routes `complete-chapter` et `complete-domain` (« j'ai fini ») répondent **410** et ne donnent plus rien : elles récompensaient sans aucune preuve.

## Identifiants d'options
Ils sont calculés à partir du **texte** de l'option (fichier `data/quizIds.js`), jamais de sa position : on peut donc mélanger l'affichage sans rien casser. Le serveur connaît, pour chaque question, les identifiants des options et celui de la bonne réponse (`backend/src/data/educationQuizzes.ts`, **généré**).

**Quand tu modifies un cours** (texte d'une option, nouvelle question, nouveau chapitre), regénère le catalogue :
```bash
cd backend && node scripts/gen-education-catalog.mjs
```
Un test échoue tant que ce fichier n'est pas à jour. Le générateur refuse aussi une question sans bonne réponse valide ou avec deux options identiques.

## Pas de pièces ni d'XP gratuits
- Récompense **une seule fois** par chapitre (20 🪙 et 100 XP) et **une seule fois** par domaine (100 🪙 et 500 XP, quiz final). Refaire un quiz déjà validé ne rapporte rien.
- Le quiz final n'est accepté que si **tous les chapitres du domaine** ont été validés par le serveur (sinon : erreur 409, rien n'est donné).
- Montants et XP fixés par le serveur ; ce que le client envoie (score, XP) est ignoré.
- Une réponse doit être un identifiant d'option **de cette question** ; il faut répondre à toutes les questions, sinon la requête est refusée (400).
- Quiz raté : le serveur indique quelles réponses sont fausses mais **ne donne pas la bonne option**.
- **Limite de tentatives** : 20 envois par 10 minutes et par joueur (sinon erreur 429).
- **Plafond total** par joueur : `chapitres × 20 + domaines × 100` pièces (aujourd'hui 15 chapitres et 2 domaines : 500 🪙). Un test le vérifie en refaisant tous les quiz deux fois.

## Limite à connaître
Le contenu des cours (y compris les réponses) fait partie du code public du site. Quelqu'un qui lit le code du navigateur peut donc retrouver les bonnes réponses. Le serveur empêche de **tricher sur le score ou la récompense**, pas de **lire** les réponses. Le plafond ci-dessus limite l'enjeu à 500 🪙 par compte.

## À tester chez toi
1. Ouvre un chapitre, note l'ordre des réponses, recharge la page : l'ordre change.
2. Réponds faux partout : « 0 % », aucune pièce, les erreurs sont signalées « À revoir dans le chapitre », la bonne réponse n'est pas montrée.
3. Clique « Réessayer » : l'ordre est de nouveau différent. Réponds juste : « Réussi : 100 % · +20 🪙 » (la première fois seulement).
4. Refais le même quiz juste : « Réussi », mais **pas** de nouvelles pièces.
5. Va directement sur le quiz final d'un parcours sans avoir fini les chapitres : message « Termine d'abord tous les chapitres… », rien n'est donné.
