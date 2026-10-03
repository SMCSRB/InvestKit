# Inventaire des faux contenus écrits en dur

Contrôle du 3 octobre 2026 sur le code du site (`app/`, `data/`, `lib/`). Statut : **corrigé** (dans cette PR ou une PR précédente), **à ton choix** (ambigu : recommandation donnée, rien n'a été changé), **réel** (donnée venant du serveur ou calcul vrai).
Un test automatique (`backend/tests/fauxContenus.test.ts`) échoue si une valeur d'exemple connue revient : pour en ajouter une, ajoute une ligne à sa liste `INTERDITS`.

## Page d'accueil et bandeau
| Où | Ce qui s'affichait | Statut |
|---|---|---|
| Accueil, chiffres | « 10K+ investisseurs actifs », « 99.9 % uptime garanti » | **Déjà supprimés** (PR « retours design ») ; chiffres actuels = comptes réels (110 actifs, 110 termes) ; test `landing.test.ts` + nouveau test |
| Accueil, aperçu du produit (`HeroPreview`) | Patrimoine 12 480, +6,4 %, « Série de 7 jours », « Niveau 3 », courbe sur 8 mois | **À ton choix** : maquette illustrative non étiquetée comme exemple. Reco : ajouter la légende « Aperçu illustratif » (sans mention « simulation » en plus). |
| Accueil, vignettes de domaines (mensualité 62/28/10, score de risque 62, « Joueur A/B/C ») | Valeurs illustratives, certaines marquées « (exemple) » | **À ton choix** : même reco, étiqueter toutes les vignettes. |
| Bandeau du haut (cours) | Cours et mini-courbes | **Réel** : cours du marché Crypto simulé du joueur (`/crypto/state`, `/crypto/assets`, `/crypto/candles?symbol=` pour CHAQUE actif) ; le bandeau disparaît sans compte Crypto ou sans réponse. |
| Mini-courbes BTC/ETH/BNB/XRP « presque identiques » | Forme proche | **Non écrites en dur** : chaque courbe est lue au serveur pour son propre actif (test). Des cryptos réelles sont fortement corrélées, la ressemblance seule n'est pas une preuve de copie. Garde-fou ajouté : une courbe trop courte, plate, invalide ou **de forme identique à celle d'un autre actif** (corrélation ≥ 0,99999) est retirée. Contrôle de ta base : `cd backend && npm run crypto:check-series -- --symbols BTC,ETH,BNB,XRP --days 24` (lecture seule). Dans la base de test locale, il n'y a que des actifs fictifs « DEMO » : je n'ai pas pu examiner tes vrais cours. |
| Onglet Marché | Mêmes sources que le bandeau | **Réel**, même garde-fou |

## Tableau de bord
| Où | Ce qui s'affichait | Statut |
|---|---|---|
| Bouton « Actualités » (panneau) | 5 fausses actualités : « CAC 40 en hausse 1,2 % », « Alerte BTC », « +5 k€ de gains ce mois », « Il y a 2 h / 5 h / 1 h / 3 h » | **Corrigé** : vraies annonces publiées par l'équipe (`/announcements`) ou « Aucune actualité pour le moment » |
| Onglet « Conseils » du même panneau | 6 conseils généraux (50/30/20, diversification…) | **Réel** (conseils pédagogiques, pas des faits chiffrés) |
| « XP du jour » aléatoire (150–650) | État jamais affiché | **Corrigé** : code mort supprimé |
| Paramètres > Profil : e-mail, bio, nom, photo | « jean.dupont@example.com », bio d'exemple | **Corrigé** (PR profil #92) : vraies données du serveur |
| Paramètres > Affichage : Devise, Format de date | Listes déroulantes sans aucun effet (USD, GBP, formats de date) | **Corrigé** : texte en lecture seule « EUR », « Fixe pour l'instant » |
| Paramètres > Sécurité : « Sessions actives, gérez vos sessions » | Fonction inexistante | **Corrigé** : retirée |
| Sécurité : « Modifier » (mot de passe) | Bouton sans action | **Corrigé** : mène au vrai flux « mot de passe oublié » |
| Données : « Exporter », « Lire » | Boutons sans action | **Corrigé** : export réel (fichier JSON du serveur), « Lire » mène à la politique de confidentialité |
| Données : « Supprimer mon compte » | Bouton sans action (alors que la suppression existe côté serveur) | **À ton choix** : reco : brancher la vraie suppression (mot de passe + « SUPPRIMER », déjà prévus par l'API) dans une PR dédiée. |
| Abonnement | Prix 7,99 € / 79 €, « 2 mois offerts » | **Réel** : `lib/plans.js` ; « 2 mois offerts » : 79 € = 9,9 mois de 7,99 € (−18 %) : à reformuler si tu veux un chiffre exact (**à ton choix**). |
| Parrainage | « 100 InvestCoins par ami » | À vérifier avec le code serveur de parrainage (**à ton choix** si la valeur a changé). |
| Visibilité du profil (public/privé/amis), « masquer mes stats », « partager ma progression » | Enregistrés **seulement dans ce navigateur**, lus par aucun écran ni par le serveur : un profil « privé » ne l'est pas | **À ton choix, important** : reco : les brancher au serveur dans une PR dédiée, ou les retirer d'ici là. |
| Préférences d'apprentissage (domaine favori, niveau, notifications Académie) | Même problème : enregistrées localement, sans effet | **À ton choix** : reco : retirer ou brancher. |
| Fenêtre « personnalisation du profil » (`showProfileMenu`) | Code jamais affiché (aucun bouton ne l'ouvre) | **À ton choix** : reco : supprimer ce code mort (gros bloc, risque nul). |
| Série (« Racha ») | Mot espagnol | **Corrigé** : « Série » |

## Page /profile
| Où | Ce qui s'affichait | Statut |
|---|---|---|
| Compte > Email | **adresse personnelle écrite en dur dans le code** (vue par tous les joueurs comme leur propre e-mail) | **Corrigé** : e-mail réel du compte ; « Modifier l'email » mène à la procédure sécurisée |
| Compte > Mot de passe | « Dernière modification il y a 3 mois » | **Corrigé** : retiré ; le bouton mène au flux « mot de passe oublié » |
| Compte > Exporter / Se déconnecter | Boutons sans action | **Corrigé** : export réel, déconnexion réelle |
| Compte > « Supprimer toutes mes données » | Bouton sans action | **À ton choix** (voir « Supprimer mon compte ») |
| Calendrier « Activité d'apprentissage » | **Cases tirées au hasard** à chaque affichage | **Corrigé** : retiré, remplacé par le vrai nombre de chapitres terminés + « bientôt » |
| « Statistiques mensuelles / XP ce mois » | C'était l'XP total | **Corrigé** : renommé « Statistiques / XP total » |
| « Temps d'apprentissage » | Affichait la série et le niveau (aucun temps mesuré) | **Corrigé** : « Série et niveau » |
| Certificats : « Télécharger », « Partager » | Boutons sans action | **À ton choix** : reco : retirer ces boutons tant qu'il n'y a pas de vrai certificat à exporter. |
| Confidentialité (profil public, masquer l'XP) ; Notifications (son, rappels quotidiens, « résumé hebdomadaire par e-mail ») ; Affichage (Animations, Mode compact) | Interrupteurs sans effet ; **aucun e-mail hebdomadaire n'existe** ; « Animations » existe déjà (vrai réglage) dans la carte Apparence | **À ton choix** : reco : retirer les interrupteurs sans fonction, garder ceux qui agissent (Mode sombre, Animations de la carte Apparence). |
| Pseudo, bio | « InvestKitUser » et texte d'exemple par défaut | **Corrigé** (PR profil #92) |

## Amis, guildes, classements, immobilier, banque, crypto
Aucune donnée en dur trouvée : amis, guildes et classements viennent du serveur (`SocialHub`, `/classements`) ; Immobilier, Banque et Crypto lisent leurs états au serveur. L'ancien contenu d'exemple (projets de démonstration, fil d'activité, profils d'amis) avait déjà été supprimé (commentaires dans le code).

## Autres
- `app/design-system` (page de référence avec chiffres d'exemple) : **n'existe qu'en développement** (`notFound()` en production).
- `app/lib/siteInfo.js` : `contact@example.com` volontairement provisoire, signalé par `npm run check:site-info` (règle du projet).
- Certains textes éducatifs contiennent des chiffres réels (ex. « 99,95 % d'énergie en moins » pour la preuve d'enjeu d'Ethereum) : contenu de cours, pas un faux compteur.
