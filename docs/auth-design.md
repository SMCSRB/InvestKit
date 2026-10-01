# Pages de compte (inscription, connexion, code, mot de passe, erreur)

Mise en page commune : `app/components/landing/AuthLayout.jsx` (`AuthFrame`, `AuthLayout`). Fond animé : `app/components/auth/AuthScene.jsx`. Panneau visuel : `AuthVisual.jsx`. Champs : `fields.jsx` (mot de passe, force, règles, code à 6 cases, confettis). Styles : `app/styles/auth.css`. Appels : `app/lib/authApi.js`.

## Disposition
- Ordinateur (≥ 980 px) : une **scène** à gauche et le formulaire à droite, dans une carte à **bordure lumineuse qui tourne** qui chevauche légèrement la scène. La scène contient un titre dont le mot change (Bourse / Crypto / Immobilier), un graphique en **bougies qui se dessinent** avec sa courbe, une carte InvestCoins (pièce qui tourne, compteur jusqu'à 500, valeur de jeu lue dans `siteFacts.js` et comparée au serveur par un test), un anneau « Parcours d'éducation », une notification de succès et des étiquettes de domaines qui flottent. Les cartes se décalent à des profondeurs différentes avec la souris (parallaxe 2D, bien moins coûteuse qu'une vraie 3D : mesuré 27 → 57 images/s en rendu logiciel). Tout est **illustratif** et le dit (« exemple illustratif, pas un cours réel ») ; les bougies viennent d'un générateur à graine fixe, aucune donnée de marché.
- La connexion a son propre titre (« Ton portefeuille … t'attend »).
- Mobile : bandeau compact (mot qui change + bougies) au-dessus du formulaire, sans scène.
- Les éléments du formulaire apparaissent en cascade.
- En-tête minimal (logo, « Accueil », thème), **non collant** : il ne recouvre jamais le formulaire. Le lien « Aller au contenu » n'apparaît qu'au focus clavier.

## Fond animé : règles de performance
- Seuls `transform` et `opacity` s'animent ; aucune bibliothèque, aucun `<canvas>`.
- Pause quand l'onglet est caché (`data-paused`) ; version allégée sur mobile, appareil modeste (≤ 4 Go / ≤ 4 cœurs / économiseur de données) ; fond **statique** si « réduire les animations » (réglage système ou profil) : `data-anim="off"`.
- Parallaxe à la souris seulement (pas sur écran tactile), une mise à jour par image au plus.
- Appareil modeste (`data-lite`) : seules les bougies bougent encore. Mesure (rendu logiciel, sans GPU, donc pessimiste) : 57 images/s bureau, 60 mobile et animations réduites.

## Inscription en 3 étapes
1. Code d'invitation (en premier, si le site est sur invitation) + e-mail. Le code est validé par `POST /auth/validate-invite` (« valide » ou non, sans détail).
2. Mot de passe : une barre de force, règles visibles pendant la saisie puis repliées, confirmation contrôlée à chaque frappe, afficher/masquer, `autocomplete="new-password"`.
3. Deux consentements séparés (conditions, confidentialité/RGPD) avec liens vers les vraies pages, puis hCaptcha **invisible**.

Aucune vérification « e-mail disponible » : l'écran de succès est le même que l'adresse existe ou non (voir `docs/securite.md`).

## Captcha
Le site garde **hCaptcha** (déjà configuré, déjà autorisé par la politique de sécurité du contenu), passé en mode invisible. Passer à reCAPTCHA v3 demanderait des clés Google, un changement de la politique de sécurité du contenu et une mise à jour de la politique de confidentialité : à décider séparément.

## Langues
La bascule FR/EN/ES n'existait que sur l'inscription (les autres pages étaient en français seulement) : elle est retirée tant que les traductions ne sont pas complètes partout. Tutoiement partout.
