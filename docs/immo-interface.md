# Immobilier — étape 7 (interface), partie 7a

- `/immobilier` : choix du profil, annonces (filtres, simulation d'achat avec décision de la banque expliquée, expertise, achat),
  portefeuille (mise en location, baisse de loyer, travaux, mise en vente, vente amiable après 3 mois d'impayés, bandeau d'alerte
  avec rappel que la vraie procédure est plus longue), bilan du mois et journal des événements.
- Deux chiffres distincts, avec icône « ? » : **effort d'épargne mensuel** (mois normal, sans événement ponctuel) et
  **capital remboursé** (qui diminue la dette et enrichit le joueur). Calculés par le serveur (`getMonthSummary`).
- `/glossaire` : 45 entrées rédigées de zéro, recherche, ancres ; composant `HelpTip` (icône « ? » réutilisable : `<HelpTip term="cash-flow" />`).
- Pied de page : liens morts retirés (`/pricing`, `#blog`, faux réseaux sociaux) ; Discord n'apparaît que si `SITE_INFO.discordUrl` est renseigné.
- Reste pour 7b : ventes en cours (changer le prix), rénovation énergétique, classement Immobilier, activation du bouton du domaine
  gratuit Immobilier dans le tableau de bord.
