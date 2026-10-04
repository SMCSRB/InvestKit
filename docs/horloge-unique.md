# Horloge de jeu unique (6c, étape 1 : le noyau)

**Une seule date par joueur** (mode Histoire). Bourse, Crypto et Immobilier suivent cette date : plus personne ne peut être en 2010 en Bourse et en 2020 en Crypto, ni profiter de ce qu'il a vu dans un domaine pour jouer dans l'autre. **Le serveur décide de tout** : le navigateur n'envoie jamais de date, seulement un pas.

## Comment ça marche
- Table `sim_clocks` (une ligne par joueur et par mode ; `history` utilisé, `sandbox` et `live` réservés pour le Bac à sable et En ligne). Date de départ choisie **une seule fois** dans une liste fermée (2014, 2017, 2020, 2021, 2022 ; sans choix : 2017, ou le premier départ qui a des données).
- `POST /api/v1/clock/advance` avec un pas : `day`, `week`, `month`, `quarter`, `year` ou `next_event` (jusqu'au prochain événement important, 366 jours au plus). Option `from` (la date que le navigateur croit être la bonne) : si elle a changé (deuxième onglet), l'avance est refusée.
- L'avance est découpée en **sous-pas d'un mois** ; à chaque sous-pas, dans l'ordre : la Crypto (ordres en attente, événements, prêt), l'Immobilier (règlement du mois), la Bourse (année qui change : intérêts, appel de marge). Puis la date est enregistrée. Chaque domaine garde sa mécanique ; **seule l'horloge les avance**.
- **Arrêt automatique** à la fin du sous-pas où un événement important arrive (ordre Crypto exécuté ou annulé, échéance ou appel de marge d'un prêt, impayé ou départ de locataire). La réponse contient un **récapitulatif** (`stopped`, `stopReason`, événements de chaque domaine).
- Dernier jour jouable : le plus petit entre la fin des données Crypto importées et la fin 2026 (Bourse et Immobilier). Au-delà : « Fin des données ».
- **Reprise après panne** : si un domaine est resté en retard, il est rattrapé à la prochaine action (jamais traité deux fois). Deux demandes simultanées : une seule passe (`409`).
- **Portail** (`clockGate`) sur `/trading`, `/crypto` (hors état et création du compte), `/realestate` et `/bank` : horloge créée pour un nouveau joueur, portefeuilles de Bourse créés à l'année de la partie, domaines remis à niveau.
- Les **anciens boutons** (année suivante en Bourse, jour/semaine/mois en Crypto, mois en Immobilier) passent par l'horloge et gardent la même forme de réponse : **tous les domaines avancent ensemble**.
- La Crypto, l'Immobilier et la Bourse **démarrent à la date de la partie** (plus de départ en 2010 pour la Bourse et l'Immobilier). Le choix de la date se fait dans l'écran de création du compte Crypto ; si la partie existe déjà, il ne propose que la date de la partie.

## Joueurs d'avant l'horloge unique
Un joueur qui a déjà des états de jeu sans horloge reçoit « ta partie doit être migrée » (`409 MIGRATION_REQUIRED`) : sa partie passe par la migration à valeur conservée (PR suivante), jamais par une date devinée.

## Ce qui n'est pas dans cette étape
- Les prêts gardent le compteur de mois propre à leur domaine (année en Bourse, jour en Crypto, mois en Immobilier) : ils avancent avec l'horloge, mais ne sont pas encore calculés « au jour le jour » sur la date unique.
- La barre du temps (lecture automatique ×1/×10/×100, pause) : interface, avec la refonte des pages.
- Bac à sable et En ligne : voir `docs/analyse-horloge-et-modes.md`.

## Valeurs de jeu
Plafonds de charge (366 jours, 12 mois par appel) : **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** (`backend/src/config/clockRules.ts`).
