# Immobilier façon portail d'annonces (refonte de l'écran)

Seul l'**affichage et le parcours** changent : aucun calcul de jeu (prêt, banque, loyers, vacance, impôts, vente, rénovation, GLI, classement) n'est modifié. Les tests existants passent tous.

## Ce que j'ai retenu des portails (recherche web)
Consultés par recherche web (les pages des portails eux-mêmes sont bloquées depuis le serveur de développement : ce résumé vient des descriptions publiques de leurs applications et de comparatifs). Principes repris, sans copier ni marque, ni logo, ni texte, ni mise en page exacte :
- **Recherche d'abord** : une barre (lieu) + des critères détaillés ; résultats en cartes très visuelles.
- **Liste ET carte**, synchronisées ; sur la carte, des pastilles de prix et une lecture « carte des prix » par quartier.
- **Recherches enregistrées avec alertes** et **favoris** pour revenir plus tard.
- **Fiche détaillée** : galerie, diagnostics (DPE), charges, environnement, puis simulation de financement intégrée.
- Mobile : filtres en tiroir plein écran, bascule liste/carte, barre d'action collante.

## Parcours
`/immobilier` — quatre onglets : **Chercher** · **Mes biens** · **Bilan du mois** · **Classement** (l'adresse garde l'état : `?bien=` fiche d'annonce, `?propriete=` fiche d'un bien possédé, `?onglet=`).
- **Chercher** : barre texte (ville, quartier, région ; accents et casse ignorés), type, budget, surface, pièces, état, classe DPE, rendement brut minimum, ventes pressées, travaux à prévoir ; filtres actifs en pastilles ; tri (pertinence, prix, prix au m², rendement, plus récentes) ; vues grille / liste / carte ; favoris (♥) ; **Mes recherches** (enregistrer, rouvrir, supprimer, pastille « n nouvelles »).
- **Fiche d'annonce** : galerie de 4 vues (façade, séjour, cuisine, plan), prix en € et en 🪙, description rédigée, diagnostics et expertise, charges et taxes, quartier (tension locative, loyer de référence au m², vacance), loyer estimé, rendements brut et net, **simulation de financement** (apport, durée, mensualité, décision de la banque expliquée, coût en InvestCoins), « Faire expertiser », « Acheter » (confirmation puis **signature chez le notaire** et **clés remises**).
- **Mes biens** : tableau de gestion locative (cartes par bien : statut, loyer, prochaine échéance, alertes) puis **fiche du bien** où apparaissent, au bon moment : mise en location / baisse de loyer, vente et changement de prix (85 à 110 %), rénovation avec devis, assurance loyers (GLI), vente à l'amiable après impayés, relevés mensuels (mode Avancé).
- **Bilan du mois** : tableau du mois, **courrier du mois** (enveloppe qui s'ouvre), journal des événements en ligne du temps.
- **Mode Simple / Avancé** (mémorisé, Simple par défaut) : Avancé ajoute TAEG, intérêts, assurance, frais, indicateurs d'économie, relevés.

## Limites assumées (rien n'est inventé pour l'affichage)
- **Parkings et immeubles entiers** n'existent pas dans le catalogue (studio, appartement, maison seulement) : les filtres correspondants ne sont pas affichés (une note le dit).
- **Pastille « loué »** : aucune annonce n'est déjà louée ; le statut « Loué » existe pour les biens possédés.
- **« Plus récentes »** : le catalogue n'a pas de date de publication ; on utilise le rang de publication (numéro à la fin de l'identifiant).
- **Alertes « nouvelle annonce »** : le catalogue se renouvelle quand l'année de jeu avance ; une recherche enregistrée signale alors les annonces correspondantes pas encore vues.
- **Rendement net estimé** : calculé par le moteur existant (`computeIndicators`), frais de notaire inclus, avant crédit et impôts.

## Annonces fictives et images
- Mention visible partout : « Annonces fictives, simulation à but éducatif » (bandeau, fiche, bandeau sur chaque image).
- **Images générées par code** (SVG en ligne, `app/components/immo/art.jsx`) : façade selon le type (studio, immeuble, maison), l'état (échafaudages et fissures pour « à rénover », fenêtres ternes pour « à rafraîchir »), le DPE (panneaux solaires pour A et B) et la ville (palette) ; séjour, cuisine et plan d'après les pièces. Même annonce = même image. **Aucune photo, aucune image tierce** : aucune licence à vérifier, pas de téléchargement, nettes à toute taille, quelques Ko.
- **Limite** : ce sont des rendus stylisés, pas des photos réalistes. Passer à des photos libres de droits (ex. banques d'images sous licence CC0) demanderait de choisir les images à la main, noter chaque licence ici, et les servir en WebP/AVIF avec `next/image`.
- Chargement différé : une illustration n'est dessinée que lorsque sa carte approche de l'écran.

## Données et sources
L'interface ne lit que les champs de l'annonce du catalogue (`Listing`) et des champs dérivés par division simple (prix au m², rendement brut, prix en pièces). La source reste interchangeable (`REAL_ESTATE_SOURCE`, voir `docs/immo-catalogue.md`) : une source DVF devra seulement renseigner `urgentSale` (faux par défaut).

## API ajoutée
- `GET /api/v1/realestate/listings` accepte `q, cityId, types, minPrice, maxPrice, minSurface, maxSurface, minRooms, conditions, energy, minYieldPct, urgentOnly, worksOnly, sort` (validés côté serveur ; ancien format conservé).
- `GET /realestate/listings/:id` ajoute `economics` (rendements estimés).
- Favoris : `GET/PUT/DELETE /realestate/favorites[/:id]`. Recherches : `GET/POST/DELETE /realestate/saved-searches`, `POST …/:id/seen`. Limites : 200 favoris, 20 recherches, 120 actions / 10 min / IP.
- Migration `038_realestate_watch.sql`. Les favoris et recherches sont dans l'export RGPD.

## Sécurité
Filtres validés (types, bornes, listes autorisées, 60 caractères max pour le texte) ; identifiants d'annonce et UUID vérifiés ; chaque requête de favori ou de recherche filtre sur `user_id` (anti-IDOR, testé) ; noms de recherche nettoyés (caractères de contrôle et `<>` retirés) ; tous les textes affichés par React (échappés).

## Accessibilité
Clavier partout (titres de cartes et pastilles de carte sont des boutons), libellés complets sur la carte, alternative texte à chaque image, la liste est l'équivalent texte de la carte, contrastes AA vérifiés (clair et sombre, ordinateur et mobile), « réduire les animations » coupe toutes les animations (testé).
