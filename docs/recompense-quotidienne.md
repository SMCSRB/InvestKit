# Récompense quotidienne et jours actifs

## Règles (décidées par le serveur, jamais par le navigateur)
- **10 InvestCoins fixes** par jour payé (`DAILY_REWARD_COINS`, `backend/src/config/economy.ts`).
- **3 jours payés au maximum par semaine** (`DAILY_REWARD_MAX_DAYS_PER_WEEK`). Semaine du **lundi au dimanche, en UTC**. Soit 30 🪙 par semaine, 1 560 🪙 par an au plus.
- **Aucune série** : ni bonus qui grandit, ni compteur de jours consécutifs, ni remise à zéro. Jours manqués = rien ne change.
- Chaque versement est écrit au registre (motif `daily_reward`, nature « création » de pièces) et dans `daily_reward_claims` (une ligne par jour payé). Une seule réclamation à la fois par joueur (verrou), même avec 10 onglets.
- Messages neutres : « Récompense du jour déjà récupérée. » ou « Tu as déjà reçu tes 3 récompenses de la semaine. La prochaine est disponible lundi. » Pas de compte à rebours, pas d'animation qui réclame l'attention.

## Jours actifs
- Un jour (UTC) est « actif » dès que le joueur utilise le site (une requête authentifiée de sa part). Une session d'impersonation par l'administration ne compte pas.
- Le compteur (`users.active_days`) **ne baisse jamais** : un déclencheur en base refuse toute baisse. Il n'est lié à aucune récompense, n'a aucune échéance et ne punit pas l'absence.
- Il sert de repère (affiché discrètement) et, plus tard, de critère d'entrée au classement (5 jours actifs, valeur dans `economy.ts`).

## Ce qui a changé
- Migration `044_jours_actifs_recompense_quotidienne.sql` : colonnes `active_days`, `last_active_day`, table `daily_reward_claims`. La colonne `users.daily_streak` est conservée **sans effet** (jamais lue ni écrite).
- API : `POST /economy/daily-reward` ne renvoie plus `newStreak` ; `GET /economy/balance` renvoie `activeDays`, `dailyRewardCoins`, `claimedThisWeek`, `maxClaimsPerWeek` à la place de `dailyStreak`.
- Interface : barre du haut et accueil du tableau de bord affichent « N jours actifs » (icône calendrier) à la place de la flamme ; l'anneau clignotant du bouton cadeau est remplacé par un repère fixe ; l'aperçu de la page d'accueil du site ne promet plus de série.
- Étape « Réclamer ta récompense quotidienne » de la checklist : texte réécrit, même condition (avoir réclamé une fois).

## Valeurs de jeu
Toutes marquées `VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER` (voir `docs/PARAMETRES-A-RECONFIRMER.md`).
