# Alertes de sécurité des dépendances (`npm audit`) : analyse du 1er octobre

`npm audit` compare les bibliothèques que nous utilisons à une liste publique de failles connues. Il signale **2 alertes sur le site** et **5 sur l'API**. Aucune n'est exploitable chez nous aujourd'hui, mais on peut en supprimer la plupart simplement et sans risque. **Rien n'a été modifié** : ce document est un plan, à valider.

> Ne lance jamais `npm audit fix --force` : il installerait **Next.js 16** (changement majeur qui casse le site) et d'autres versions majeures sans test.

## Le site (2 alertes : « postcss », via Next.js)
| Alerte | Gravité | De quoi s'agit-il | Exploitable chez nous ? |
|---|---|---|---|
| PostCSS : XSS par `</style>` non échappé ; lecture de fichiers via un commentaire `sourceMappingURL` (3 variantes) | haute / moyenne | PostCSS est l'outil que Next.js utilise pour **compiler les fichiers CSS** pendant `npm run build` | **Non.** Il ne traite que **nos** fichiers CSS, écrits par nous, au moment de la compilation. Aucun CSS venant d'un visiteur ne passe dedans, et il ne tourne pas sur le serveur en service. |

**Correctif simple (testé).** Forcer la version corrigée de PostCSS (8.5.28) avec un réglage `overrides` dans `package.json`. J'ai essayé sur une **copie** du site : `npm audit` passe de 2 alertes à **0**, et `npm run build` réussit. Next.js 15 reste en place (pas de saut vers la 16).

## L'API (5 alertes, toutes « modérées », toutes dans des outils de développement)
`npm audit --omit=dev` (ce qui tourne réellement sur le serveur) affiche **0 alerte** pour l'API.

| Paquet | De quoi s'agit-il | Où est-il utilisé | Exploitable ? |
|---|---|---|---|
| `vitest` et `@vitest/mocker` (2 alertes) | Lecture de fichiers possible via une « redirection » de simulation dans l'outil de **tests** | Seulement quand on lance `npm test` (sur ton ordinateur ou en CI) | **Non** : il faudrait y injecter du code malveillant dans nos propres tests. |
| `autocannon`, `hyperid`, `uuid` (3 alertes) | `uuid` ancien : contrôle de taille manquant dans certaines fonctions quand un tampon est fourni | `autocannon` = l'outil de **test de charge** (`ops/load-test.sh`), jamais installé en production | **Non** : notre code n'appelle pas ces fonctions. |

**Corrections :**
1. **`uuid`** (3 alertes) : forcer la version corrigée (11.1.1) par `overrides`. Testé sur une copie : l'alerte disparaît et `autocannon` fonctionne toujours (73 000 requêtes de test sans erreur).
2. **`vitest`** (2 alertes) : la correction est de passer à Vitest **4.1.11 ou plus** (changement majeur de l'outil de tests). Mon essai d'installation sur une copie a échoué avec une erreur de npm : à traiter **dans une petite PR dédiée, plus tard**, en lançant toute la suite de tests. Pas d'urgence : outil de développement uniquement.

## La CI
Les deux contrôles `npm audit` de la CI (API et site) sont réglés en `continue-on-error` : ils s'affichent en avertissement et **ne bloquent pas** une PR. C'est un bon réglage pendant la refonte ; on pourra le durcir (bloquer sur « haute » en production) une fois les alertes corrigées.

## Plan proposé (à valider)
| # | Action | Effet | Risque |
|---|---|---|---|
| 1 | Petite PR : `overrides` `postcss` 8.5.28 (site) et `uuid` 11.1.1 (API), versions **fixées**, fichiers de verrouillage mis à jour, tests + build | Site : 2 → 0 alerte. API : 5 → 2 | Très faible (testé sur copies) |
| 2 | PR dédiée : Vitest 4.1.11+ | API : 2 → 0 alerte | Moyen (outil de tests), sans effet sur la production |
| 3 | Plus tard, **volontairement** : Next.js 16 | Supprime le besoin de l'`overrides` | Élevé (changement majeur). Dependabot ignore déjà les versions majeures pendant la refonte. |
