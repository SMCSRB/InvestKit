# Feuille de route v7 — état réel, décisions, reste à faire, idées en attente

*Écrite en octobre 2026 à partir de l'état réel du dépôt. Elle remplace les parties périmées de la v6 (voir « Ce qui est périmé » plus bas).*

## 1. État réel (octobre 2026)

| Bloc | État | Où |
|---|---|---|
| Immobilier (moteur, loyers, impôts, événements, GLI, trêve, revente, valeur verte, classement) | **Fait, dans `main`** | PR #5 à #11, #16 |
| Banque (prêt personnel, prêt sur portefeuille, défaut et rétablissement) | **Fait, dans `main`** | PR #12 à #15 |
| Bourse/PEA : frais et fiscalité ; capital de départ Pro | **Fait, dans `main`** | PR #24, #25 |
| Sécurité (cookies httpOnly + CSRF, anti-IDOR, verrouillage de compte, en-têtes, audit en ajout seul, RGPD) | **Fait, dans `main`** | PR #17, #18, #26 à #32, #41 |
| Administration, notifications, checklist d'accueil, tableau de bord réel, analyse de risque, sauvegardes, tests de charge | **Fait, dans `main`** | PR #33 à #45 |
| Domaine Crypto (marché simulé, ordres, impôt, événements, prêt, éducation) | **Fait, dans `main`** ; données **fictives** tant que `npm run crypto:import` n'est pas lancé | PR #46 à #51 |
| Faille « pièces à l'infini » de l'éducation | **Corrigée, PR à fusionner en premier** | PR #78 |
| Anti-secrets (script, CI, `start-dev` sans secret) | **Fait, PR à fusionner** | PR #77 |
| Refonte complète du design (landing, tableau de bord, marchés, éducation, amis et guildes réels, simulateurs, inscription/connexion, Immobilier façon portail, admin, animations) | **Fait, en brouillon** (13 PR) + **PR consolidée** vers `main` | PR #65 à #76 + consolidée |
| Déploiement | **Inconnu côté dépôt** : à vérifier sur le serveur (`docs/DEPLOIEMENT-DEBUTANT.md`, étape 2) | — |

## 2. Décisions prises
- **InvestCoins** : monnaie de jeu uniquement. Pas de boutique, de retrait, d'achat avec de l'argent réel, ni d'échange entre joueurs. Cette règle de conception justifie qu'un prêt crée des pièces.
- **Conversion** : 1 🪙 = 20 € en Immobilier ; 1 🪙 = 1 $ en Crypto (unification repoussée).
- **Freemium** : un domaine gratuit au choix (un changement possible), le Pro ouvre tous les domaines et double le capital de départ (une seule fois). Le plan ne promet **que ce qui existe** (« Projets illimités », « Export PDF complet » et « Alertes personnalisées » retirés tant que ces fonctions n'existent pas).
- **Inscription sur invitation** (codes via `npm run invite`) pendant la phase de test fermé.
- **Captcha** : on **garde hCaptcha** (invisible). Passer à reCAPTCHA v3 = clés Google + politique de sécurité du contenu + confidentialité : plus tard, si besoin.
- **Langues** : français seulement tant que les traductions EN/ES ne sont pas complètes partout.
- **Messagerie entre joueurs : reportée.** On garde amis et guildes avec interactions encadrées (code ami, demandes, blocage, rôles de guilde).
- **Données** : toujours réelles ou clairement marquées fictives ; aucun chiffre inventé pour l'affichage. Les valeurs de jeu sont marquées « VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER » (voir `docs/PARAMETRES-A-RECONFIRMER.md`).
- **Règles de travail** : rien n'est fusionné ni déployé sans accord ; petites PR avec checklist de test ; aucun secret dans le dépôt.
- **Parkings** : seront ajoutés au catalogue Immobilier dans la **prochaine extension** (charges faibles, vacance faible, bon rendement) ; **immeubles de rapport : plus tard**.

## 3. Ce qui reste, par priorité

### P0 — tout de suite
1. Fusionner et déployer **PR #78** (faille éducation), lancer `npm run education-abuse`, corriger les soldes (`docs/faille-education.md`).
2. **Révoquer** le mot de passe d'application Gmail ; fusionner **PR #77** ; activer le hook (`npm run setup:hooks`).
3. Vérifier ce qui tourne sur le serveur et déployer `main` (`docs/DEPLOIEMENT-DEBUTANT.md`).
4. Fermer les PR #19 à #21 (déjà dans `main`) et ranger Dependabot.

### P1 — avant l'ouverture au public
5. **Pages légales** : compléter `app/lib/siteInfo.js` (e-mail de contact, hébergeur) et les faire valider par un professionnel.
6. **Vérifier les paramètres fiscaux et bancaires** de `docs/PARAMETRES-A-RECONFIRMER.md` ; trancher 17,2 % contre 18,6 %.
7. **Stripe** : clés réelles, webhook, parcours d'abonnement testé de bout en bout (aujourd'hui en mode test).
8. **Modération et signalement** (obligatoire avant d'ouvrir amis/guildes au public) : bouton « Signaler » (joueur, nom de guilde), file de signalements dans l'administration, suppression/renommage d'un nom de guilde offensant, suspension d'un joueur depuis un signalement, historique des décisions, délai de réponse affiché. Blocage entre joueurs : déjà fait. Messagerie : seulement **après** ces outils.
9. **hCaptcha** : tester une vraie inscription (décision : on le garde).
10. **Sessions** : mettre `SESSION_TOKEN_IN_BODY=false`, puis retirer la compatibilité « jeton dans le corps » (`docs/sessions-cookies.md`).
11. **Tests de parcours dans le navigateur** (Playwright) intégrés à la CI : aujourd'hui ils tournent hors dépôt.
12. Vérifier visuellement l'écran `/admin` complet et `/onboarding`.

### P2 — produit
13. **« Projets illimités »** (voir section 4) : sinon le plan reste sans cette promesse.
14. **Parkings** dans l'Immobilier (section 5).
15. **Données réelles Bourse/PEA** : cours quotidiens importés (aujourd'hui annuels et simplifiés) ; bougies, plus bas de l'année pour les appels de marge. Comparaison des sources légales : `docs/sources-cours-bourse.md` (rien n'est lancé, décision attendue).
16. **Données réelles Crypto** : lancer l'import ; vérifier les conditions d'utilisation de la source.
17. **Source DVF** pour l'Immobilier (`REAL_ESTATE_SOURCE=dvf`, interface déjà prête).
18. **Export PDF** réel (au-delà de l'impression du navigateur) et **alertes personnalisées** : à spécifier si on veut les remettre dans le plan.
19. Carte d'aperçu Crypto du tableau de bord : lire le domaine `crypto_market` (aujourd'hui l'ancien domaine `crypto`).
20. Recherche globale, partage, résumés, SEO avancé.

### P3 — plus tard
21. **Immeubles de rapport** (Immobilier).
22. **Messagerie** entre joueurs (après la modération).
23. Mode temps réel, WebSockets, Redis/BullMQ.
24. Unification de la valeur du 🪙 entre domaines.
25. Multilingue (EN/ES) complet.
26. Application mobile.
27. Mises à jour majeures de dépendances (Next 16, TypeScript 7, etc.) : hors période de refonte.

## 4. Proposition « Projets illimités » (la solution la plus simple pour que la promesse soit vraie)
**Idée** : un « projet » = **un scénario d'investissement sauvegardé** (ses hypothèses + le résultat de l'analyse de risque), avec **étiquettes** et **versions**. Presque tout existe déjà : les tables `investment_projects` et `risk_analysis`, le moteur Monte Carlo, les tests de résistance, le score de risque et l'onglet « Projets » du tableau de bord.

- **Ce qu'on ajoute (2 petites PR)** :
  1. Serveur : une migration (colonnes `tags`, `params`, `result`, et un numéro de version dans `risk_analysis`), routes `GET/POST/PUT/DELETE /api/v1/projects` et `POST /projects/:id/versions`, vérification du droit (Gratuit : 3 projets ; Pro : illimité avec un garde-fou technique de 500), anti-IDOR, export RGPD, tests.
  2. Interface : bouton « Enregistrer comme projet » dans l'onglet Risque du simulateur PEA et dans la carte Risque du tableau de bord ; onglet « Projets » avec cartes (nom, étiquettes, score, dernière version), historique des versions et comparaison de deux versions.
- **Ce que ça ne fait pas** : pas de nouveau calcul, pas de nouvelle donnée ; on sauvegarde ce que le moteur existant produit.
- **Tant que ce n'est pas fait** : le plan Pro **ne promet plus** « Projets illimités » (corrigé dans la PR design consolidée) ; l'onglet Projets reste masqué.
- **Alternative minimale** : ne rien développer et laisser le plan tel quel (sans la promesse).

## 5. Spécification « Parkings » (prochaine extension Immobilier)
- **Catalogue** : nouveau type `parking` (garage fermé, box, place extérieure), surface 10 à 15 m², pas de nombre de pièces, pas de DPE.
- **Économie (à valider)** : prix bas (ticket d'entrée faible), **charges faibles** (copropriété, taxe foncière réduites), **vacance faible**, **bon rendement brut**, pas de travaux lourds.
- **Règles à cadrer juridiquement** : un parking n'est pas un logement → pas d'assurance loyers impayés « habitation », pas de trêve hivernale, préavis et durée de bail différents du bail d'habitation. Il faut une **source officielle** pour chaque règle avant de la coder (ajouter au tableau des paramètres).
- **Interface** : le filtre « Type » du portail Immobilier (déjà prêt) ; illustration SVG d'un box/garage ; description rédigée.
- **Fiscalité** : revenus fonciers comme un logement nu (à confirmer).
- **Tests** : catalogue (déterminisme), loyers et vacance, charges, filtre de recherche, refus des règles « habitation ».

## 6. Ce qui est périmé dans la v6 (pour la rédaction de la v7 définitive)
Immobilier (simple cash-flow → domaine complet) ; module Banque (absent de la v6) ; règle de conception des InvestCoins ; capital Pro (maintenant fait) ; invitations ; freemium (domaine unique, changement unique, Pro manuel pour les testeurs) ; hCaptcha au lieu de reCAPTCHA v3 ; cours réels du simulateur PEA (non faits) ; mode temps réel (jamais commencé) ; glossaire, pages légales et bot Discord (ajoutés).

## 7. Idées en attente (non décidées)
- Modération assistée (filtre de noms, mots interdits) pour les noms de guildes.
- Duels ou défis entre amis (sans échange de pièces).
- Photos libres de droits pour les annonces (choisies et licenciées une par une) à la place des illustrations.
- Heatmap des prix par ville ; carte de chaleur du classement.
- Mode « leçon guidée » dans l'Immobilier et la Banque.
- Tableau de santé et alertes d'exploitation (Sentry), CI de performance (Lighthouse).
- Pro : essai gratuit ; offre annuelle.
