# Notifications

Avant : le tableau de bord affichait des notifications **fictives** (Alice Dupont, Bob Martin…) et en inventait une nouvelle au hasard toutes les 30 secondes. Maintenant : **uniquement des notifications réelles**, créées par le serveur quand quelque chose d'important arrive.

## Ce qui déclenche une notification
| Source | Événements |
|---|---|
| Banque | appel de marge, vente forcée du portefeuille, prêt en défaut, mensualité impayée, dette effacée, procédure de rétablissement, prêt remboursé |
| Immobilier | loyers impayés, locataire parti / préavis, travaux imprévus, alerte de la banque, vente forcée, bien vendu, location interdite (DPE), remboursement de l'assurance loyers impayés |
| Sécurité du compte | mot de passe modifié, double authentification activée / désactivée |
| Équipe | ajustement de pièces par un administrateur (avec le motif), bonus Pro |

Les événements fréquents (loyer en retard, prêt accordé…) restent dans le journal de leur module, pour ne pas inonder le joueur quand il avance de plusieurs mois d'un coup.

## Technique
- Table `notifications` (migration 031), 200 dernières conservées par utilisateur, supprimées avec le compte (RGPD).
- `GET /api/v1/notifications?limit=&unread=true` → liste + nombre de non lues ; `POST /api/v1/notifications/read` `{ids:[…]}` ou `{all:true}` (uniquement les siennes).
- Tableau de bord : chargement au démarrage puis toutes les 60 s, pastille (pop-up) de 6 s pour une nouvelle notification non lue, clic = marquée lue + ouverture de la page concernée (`/banque`, `/immobilier`). Les anciennes fausses notifications gardées dans le navigateur (`localStorage`) ne sont plus lues.
- Pas (encore) d'envoi par e-mail ni de notification « push » du navigateur : à décider (consentement, RGPD).
