# Checklist d'accueil et profil d'investisseur

Carte **« 🚀 Tes premiers pas »** en haut de la Vue d'ensemble du tableau de bord.

## Étapes (calculées par le serveur sur l'état RÉEL du compte)
1. Remplir le profil d'investisseur · 2. Choisir le domaine gratuit · 3. Terminer une leçon d'éducation · 4. Réclamer la récompense quotidienne · 5. Premier achat en Bourse/Crypto · 6. Premier bien immobilier · 7. Activer la double authentification.
Le client ne « déclare » jamais une étape (impossible de se la faire attribuer) : `POST /onboarding/claim` ne prend aucun paramètre et recalcule tout.

## Récompenses
10 🪙 par étape (`CHECKLIST_REWARD_COINS` dans `services/onboardingService.ts` — *VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER*), versées une seule fois (clé primaire `onboarding_rewards(user_id, step)`, atomique : 5 demandes simultanées ne versent qu'une fois), nature « création » au registre (`checklist_reward`), avec une notification. Max. 70 🪙 au total.

## Profil d'investisseur (questionnaire en 4 questions)
Niveau (débutant/intermédiaire/expert), réaction à une baisse de 30 % (prudent/équilibré/audacieux), objectifs, marchés qui attirent. Stocké dans `investor_profiles` (table existante), validé strictement (listes fermées, pas de doublons). Renvoie un **conseil de départ** : où commencer (Éducation d'abord pour un débutant, domaine préféré dans le Simulateur, liquidités et score de risque pour un profil prudent, tests de résistance pour un profil audacieux, rendement brut ET effort d'épargne en Immobilier). Ce n'est pas un conseil en investissement : pédagogie de départ.

## Prochaine étape
La carte met en avant la première étape non faite, avec un bouton « C'est parti » ; une fois tout terminé et récupéré, un lien « Masquer cette carte » apparaît.

Migration 032. API : `GET /onboarding`, `POST /onboarding/claim`, `POST /onboarding/profile`.
