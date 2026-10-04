# Accès aux modes de jeu (6c) : règles prêtes, jeu pas encore construit

Décisions d'Andreja (4 octobre 2026), **toutes vérifiées par le serveur** (le droit Pro est lu en base, jamais dans la requête) :

| Mode | Qui | Règle |
|---|---|---|
| Histoire | Tous | Mode de base (horloge unique). |
| Bac à sable | Tous | **Gratuit** : seulement les périodes déjà jouées en Histoire. **Pro** : période et date de départ libres. |
| En ligne | **Pro** | Réservé au plan Pro. |

- **Période jouée** : le serveur l'enregistre (`played_periods`) quand la partie Histoire a avancé d'au moins **12 mois** depuis son départ (**VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER**, `backend/src/config/clockRules.ts`). Jamais écrit par le navigateur.
- `GET /api/v1/clock/modes` : pour chaque mode, l'accès, ce que **tu** peux faire, tes périodes débloquées (information ; le serveur re-vérifie à chaque action).
- Règles pures et testées : `backend/src/engine/modeAccess.ts` ; lecture en base : `modeAccessService.check`.
- **Prévu dans l'architecture, pas codé** : plus tard, un joueur gratuit pourra voir le classement et les événements d'En ligne en **lecture seule**, sans y participer. Les lectures d'En ligne auront leurs propres routes, séparées des routes de participation (réservées au Pro). Pour l'instant `readOnlyForFree` vaut `false`.
- Le Bac à sable et En ligne ne sont **pas jouables** (`available: false`) : la source de cours en direct sera choisie juste avant En ligne, qui vient en dernier.
