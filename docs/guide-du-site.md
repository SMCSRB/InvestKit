# Visite guidée interactive

Remplace le guide de lecture (fenêtre de texte + page « Guide du site », refusés). Le joueur apprend **en pratiquant** : le guide désigne les vrais éléments de l'écran et l'emmène de page en page.

## Ce que fait la visite
- **Projecteur** : l'écran est assombri (quatre rectangles autour d'un trou) sauf l'élément expliqué, cerclé ; bulle à flèche avec titre court, une ou deux phrases, « étape n sur N », barre d'avancement, Suivant / Précédent / Passer. Sur téléphone (≤ 640 px) la bulle devient un panneau en bas de l'écran et l'élément est amené au-dessus.
- **Elle navigue vraiment** : étapes « Direction : … » où le guide clique lui-même l'entrée du menu (sur téléphone il ouvre d'abord le menu, événement `ik:tour-menu` écouté par `AppShell`). Parcours : tableau de bord (patrimoine, liquidités, récompense, prochaine étape) → Bourse et PEA → Crypto → Immobilier → Banque → Éducation → Classements → Profil et confidentialité → « Un retour ? ».
- **Étapes actives** : le guide attend une vraie action (événement `ik:clock-advanced` pour « +1 semaine », clic, ou apparition d'un élément : départ Crypto, fiche Bitcoin, profil Immobilier). Pas de bouton Suivant pendant l'attente, mais toujours « Passer cette étape ». Le trou du projecteur laisse passer le clic.
- **Honnêteté** : aucune étape ne fait dépenser de pièces ni n'agit à la place du joueur ; les actions qui avancent le temps sont annoncées (tout le jeu, sans retour en arrière, gratuit). Achat, emprunt, récompense du jour : le guide les montre, ne les clique jamais.
- **Mini-visites** (3 à 4 étapes) Bourse, Crypto, Immobilier, Banque : petite invitation non bloquante au premier passage (« Non merci » ne revient pas) et bouton **« ? Guide de cette page »** toujours visible (en bas à gauche), plus une petite cible vers « Mon parcours de découverte ».
- **Reprise et contrôle** : Échap / croix = pause, « Passer la visite » = arrêt ; reprise ou relance dans **Aide et support** (panneau « Mon parcours de découverte » : cases cochées par rubrique, Reprendre, Recommencer, Tout remettre à zéro).
- **Jamais coincé** : élément absent ou caché → l'étape est sautée après ~4 s (jamais de voile pendant la recherche) ; une page qui nous renvoie ailleurs → étape sautée ; un sélecteur invalide → on passe au suivant.
- **Accessibilité** : flèches, Entrée, Échap ; focus déplacé dans la bulle à chaque étape (`role="dialog"`, titre et texte reliés, zone `aria-live` pour les consignes), Tab piégé dans la bulle tant que la page est masquée (étapes non actives) ; boutons ≥ 40 px ; `prefers-reduced-motion` et le réglage « Animations : Non » coupent mouvement et défilement doux.
- **Design** : jetons du site (`tokens.css`, clair et sombre), pas d'emoji, pas de symbole d'euro, mots simples, tutoiement. *Hypothèse : le point 8 de la demande étant coupé, j'ai repris l'identité du site.*

## Architecture
- Étapes : **une seule source**, `app/lib/tour/steps.js` (sélecteurs `data-tour="…"` posés sur les vraies pages, avec repli sur des `data-testid`/aria-label existants). Calculs purs testables : `app/lib/tour/engine.js`.
- Composants : `app/components/tour/` (`TourProvider` logique, `TourOverlay` projecteur + bulle, `TourLauncher`, `TourInvite`, `TourChecklist`).
- **État par compte, côté serveur** : table `guide_progress` (migration 056), API `/api/v1/guide` (GET, PUT, POST /reset, limite 60 par 15 min, identité prise dans le jeton, listes fermées validées dans `backend/src/config/guideRules.ts`, jamais d'autre donnée). Écritures regroupées (2,5 s) et envoyées à la mise en pause/fermeture de l'onglet. L'état est inclus dans l'export des données du compte et supprimé avec le compte.
- L'ancienne page `/guide` redirige vers `/support`.

## Tests
- `backend/tests/visiteGuideeMoteur.test.ts` (21) : moteur, parité des identifiants d'étapes avec le serveur, tous les éléments visés existent dans le code, textes (pas d'emoji, d'euro, de chiffre en dur), mini-visites de 3 à 4 étapes.
- `backend/tests/visiteGuideeApi.test.ts` (9) : validation fermée, isolation entre joueurs, remise à zéro.
- `e2e/guide.spec.ts` (390 px, exécution à part) : visite complète sans blocage, pause/reprise/passer, clavier, mini-visite et invitation. `e2e/crypto.spec.ts` : étape active « +1 semaine » et fiche.
