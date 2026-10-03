# Suppression de compte : ce qui est supprimé, conservé, anonymisé

Code : `backend/src/services/accountService.ts` (`deleteAccount`), migration `043_account_deletion.sql`. Tests : `backend/tests/accountDeletion.test.ts`, `account.test.ts`.

## Déroulé
1. Contrôles : confirmation « SUPPRIMER », mot de passe, code 2FA si activée. Limite : 5 demandes par heure et par IP.
2. **E-mail de prévenance AVANT** à l'adresse du compte (« suppression demandée, ce n'est pas toi ? »).
3. Abonnement Stripe annulé ; s'il ne peut pas l'être, **rien n'est supprimé**.
4. Une seule transaction : archives anonymes → nettoyage → anonymisation du journal → suppression du compte. Tout ou rien.
5. Jeton encore valide : refusé (401 « compte supprimé ») ; les guildes sont réparées ; **e-mail APRÈS** (« compte supprimé »).

## Réponses point par point
| Point | Avant cette PR | Maintenant |
|---|---|---|
| a) Factures et paiements d'abonnement | la ligne d'abonnement était **supprimée** avec le compte (aucune conservation légale) | trace comptable minimale dans `billing_records_archive` : formule, dates, identifiant d'abonnement du prestataire. **Aucun identifiant de joueur, aucun e-mail.** Conservée 10 ans (`retain_until`). Les factures elles-mêmes restent chez Stripe. Abonnement gratuit ou sans identifiant de paiement : rien conservé. |
| b) Registre des InvestCoins | lignes supprimées : les statistiques par domaine (pièces créées / détruites) **baissaient** | lignes supprimées, mais **résumées en totaux anonymes** (`investcoins_ledger_archive`, par domaine / nature / motif) : les statistiques sont identiques avant et après (testé). |
| b) Journal d'audit | `user_id` effacé, mais **adresse IP, identifiant du joueur (`entity_id`) et clés « target » / e-mail restaient** | tout retiré : auteur, IP, identifiant de la personne, clés `target`, `email`, `username` des détails (les lignes écrites par un administrateur sur ce joueur gardent l'IP de l'administrateur). Le journal reste **en ajout seul** (suppression et autres modifications toujours refusées). La suppression elle-même est journalisée **anonymement** (ni identifiant, ni IP, ni e-mail) : seulement la formule, l'ancienneté du compte et si un abonnement a été annulé. |
| c) Amis, demandes, classements | supprimés en cascade (déjà correct) | + les notifications **des autres joueurs** qui citent son pseudo (« X est maintenant ton ami », « X voudrait devenir ton ami ») sont retirées |
| c) Chef de guilde | réparation seulement à la prochaine lecture de la guilde | réparée tout de suite : **le membre le plus ancien devient chef** ; guilde sans autre membre : **supprimée** |
| d) Photo, sessions, jetons, codes, invitations | photo, codes de vérification, jeton de réinitialisation, demandes de changement d'e-mail : supprimés (cascade). **Un jeton de connexion encore valide continuait de passer l'authentification** (risque réel) | idem, + jeton refusé avec 401 dès la suppression ; ses retours (texte libre) sont supprimés ; le code d'invitation utilisé reste (compteur agrégé, sans lien) |
| e) Sauvegardes | non précisé | `ops/backup.sh` garde **14 jours** (et toujours les 3 plus récentes) : le compte supprimé peut subsister **au plus 14 jours** dans les sauvegardes (davantage seulement si les sauvegardes s'arrêtaient, car les 3 dernières sont toujours gardées). Phrase ajoutée à la politique de confidentialité (section 8). En cas de restauration, **il faudra rejouer les suppressions** demandées depuis la sauvegarde. |
| f) Sécurité | limite de débit présente ; pas d'e-mail ; journal non anonyme | limite 5/heure, e-mails avant et après, journal anonyme (voir plus haut) |

## Ce qui subsiste, volontairement
- Chez Stripe : l'objet client et les factures (prestataire de paiement, obligations comptables). Rien n'est supprimé là-bas par le code.
- Totaux statistiques anonymes et trace comptable minimale (ci-dessus).
- Les parrainages : les filleuls gardent leur compte ; le lien « parrainé par » vers un compte supprimé est simplement vidé.

## À faire valider par un professionnel
La phrase de la politique de confidentialité (section 8) et la durée de conservation comptable de 10 ans.
