# Immobilier — étape 7 (interface), partie 7a

- `/immobilier` : choix du profil, annonces (filtres, simulation d'achat avec décision de la banque expliquée, expertise, achat),
  portefeuille (mise en location, baisse de loyer, travaux, mise en vente, vente amiable après 3 mois d'impayés, bandeau d'alerte
  avec rappel que la vraie procédure est plus longue), bilan du mois et journal des événements.
- Deux chiffres distincts, avec icône « ? » : **effort d'épargne mensuel** (mois normal, sans événement ponctuel) et
  **capital remboursé** (qui diminue la dette et enrichit le joueur). Calculés par le serveur (`getMonthSummary`).
- `/glossaire` : 45 entrées rédigées de zéro, recherche, ancres ; composant `HelpTip` (icône « ? » réutilisable : `<HelpTip term="cash-flow" />`).
- Pied de page : liens morts retirés (`/pricing`, `#blog`, faux réseaux sociaux) ; Discord n'apparaît que si `SITE_INFO.discordUrl` est renseigné.
- **7b (fait, en petites PR)** : changement du prix d'une vente en cours (options 85–110 % avec délai attendu), rénovation énergétique avec devis,
  onglet Classement (avec « ma performance » détaillée), bouton du domaine gratuit Immobilier activé dans le tableau de bord.
- **Extension 1 (faite)** : assurance loyers impayés et trêve hivernale, voir `docs/immo-gli-treve.md`.
- Vérifications faites dans un navigateur : parcours complet (profil, achat, location, vente, baisse de prix, rénovation, classement, assurance, bilan),
  aucun débordement horizontal à 390 px de large sur Annonces, Portefeuille, Classement et Glossaire.
