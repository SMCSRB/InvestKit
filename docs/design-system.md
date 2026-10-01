# Design system InvestKit

Un seul habillage pour tout le site : sombre par défaut, clair complet, violet orchidée, cartes arrondies, lueurs discrètes.
Les mises en page s'inspirent de trois maquettes de référence fournies par le propriétaire (tableaux de bord sombres, violet,
graphiques professionnels). Aucune marque, aucun logo ni aucun texte de ces maquettes n'est repris.

## Où changer quoi

| Je veux changer… | Fichier |
|---|---|
| une couleur, une police, un rayon, une ombre, une durée d'animation | `app/styles/tokens.css` (seul endroit) |
| le corps de page, le focus clavier, les animations de base | `app/styles/base.css` |
| les cartes, boutons, champs, tableaux, fenêtres… | `app/styles/components.css` |
| le menu latéral, la barre supérieure, le bandeau de cours | `app/styles/shell.css` |
| l'ancien CSS (en cours de retrait page par page) | `app/styles/legacy/*.css` (couche `legacy`, priorité la plus basse) |

La police est **Plus Jakarta Sans** (licence libre OFL), auto-hébergée via `@fontsource-variable/plus-jakarta-sans` : aucun appel à un service externe.

## Thème et animations

- `<html data-theme="dark|light">` : choix mémorisé (`localStorage.ik-theme`). Bascule dans le menu latéral, le menu du profil et la recherche.
- Depuis le lot 7, **toutes** les pages suivent le thème (le filtre `THEMED_PREFIXES` a disparu). Les réglages Thème et Animations sont aussi dans `/profile` (carte Apparence, `AppearanceSettings.jsx`).
- **Animations** : réglage `Auto / Oui / Non` (`localStorage.ik-motion`, `<html data-motion>`). « Auto » suit la préférence système « réduire les animations ».
  On n'anime que `transform` et `opacity` ; durées : 150 ms (rapide), 240 ms, 420 ms, 900 ms (tracé des graphiques). Variables `--ik-dur-*`, `--ik-ease`, `--ik-stagger`.
- Aucune animation ne retarde l'affichage des données ni un clic ; rien ne clignote.

## Couleurs (extrait)

Surfaces : `--ik-bg`, `--ik-surface-1/2/3`. Texte : `--ik-text`, `--ik-text-2`, `--ik-text-3`. Marque : `--ik-primary`, `--ik-accent`, `--ik-grad-brand`.
États : `--ik-positive` (vert), `--ik-negative` (rouge), `--ik-warning`, `--ik-info`. Graphiques : `--ik-series-1` à `--ik-series-5` (ordre fixe, jamais cyclé).

Contrôles automatiques : `backend/tests/designTokens.test.ts` vérifie le contraste AA (4,5:1) du texte et 3:1 des séries de graphique, en clair et en sombre.
Les séries ont été validées avec le script du skill `dataviz` (l'écart daltonien est juste suffisant en sombre : toujours une légende ou une étiquette directe).

## Composants

React, dans `app/components/ui/` : `Icon` (jeu d'icônes SVG), `Logo`, `primitives` (`Card`, `CardHead`, `StatCard`, `Delta`, `Button`, `Segmented`, `Tabs`, `Switch`, `Skeleton`, `EmptyState`, `Modal`, `Popover`, `Coin`),
`charts` (`LineChart`, `StackedBars`, `Donut`, `SegmentedBar`, `Sparkline`, `Legend`), `motion` (`Reveal`, `AnimatedNumber`, `burstCoins`).
Les graphiques de marché professionnels (bougies, indicateurs) utilisent Lightweight Charts (attribution obligatoire), voir `app/crypto/PriceChart.jsx`.

Coque, dans `app/components/shell/` : `AppShell` (menu latéral repliable, bandeau de cours, barre supérieure, recherche Ctrl/⌘ + K), `PageHeader`.
Navigation : **une seule source**, `app/components/shell/nav.js`. Données de la barre supérieure : **réelles** (solde d'InvestCoins, série de jours, notifications, droit d'administration).
Le bandeau de cours n'affiche que les actifs du marché simulé du joueur (Crypto) ; sans compte Crypto, il disparaît. Aucun chiffre inventé.

Règles : les valeurs d'exemple sont toujours étiquetées « exemple » ; les icônes sont des SVG (pas d'emoji comme icône) ; un bouton sans action réelle n'existe pas (ou porte « Bientôt » honnêtement).

## Pages publiques et 3D (lot 2)

- Habillage des pages publiques : `app/components/landing/PublicShell.jsx` (en-tête, pied de page) ; écrans de compte : `AuthLayout.jsx`. Styles : `app/styles/landing.css` (préfixe `lp-`).
- Offres et prix : `app/lib/plans.js` (source unique) ; le paiement reste « Bientôt disponible » tant que `NEXT_PUBLIC_BILLING_ENABLED` n'est pas « true ».
- **3D en CSS pur** (aucune bibliothèque) : scène inclinable avec couches en profondeur (`Stage3D.jsx`, `--z` par couche), pièce InvestKit (`Coin3D`), inclinaison des cartes au survol par délégation d'événements (`TiltScope.jsx`, attribut `data-tilt`). Uniquement `transform` et `opacity`. Coupée par « Animations : Non » et « réduire les animations » ; sur écran tactile, balancement automatique lent au lieu du suivi de la souris.
- Les valeurs du graphique de l'accroche sont des exemples générés (jamais de vrais cours) et sont étiquetées comme telles.
- Formats : `app/lib/format.js` (espace insécable classique pour les milliers).

## Tableau de bord (lot 3)

- Le rail profil (avatar, badges, niveau) a été retiré à la demande du propriétaire.
- `app/dashboard/page.jsx` garde ses autres systèmes (amis, guildes, simulateur, éducation, paramètres…) ; seule la coque a changé (`AppShell`, `PageHeader`, `Tabs`) et les couleurs codées en dur sont devenues des jetons (`var(--ik-…)`, `color-mix`, helper `alpha()`), donc clair et sombre fonctionnent.
- Vue d'ensemble : `app/dashboard/OverviewTab.jsx` (données du serveur uniquement) ; Marché : `MarketTab.jsx` (cours Crypto simulés réels). Styles : `app/styles/dashboard.css` (préfixe `dash-`).
- Les cartes chargées ont des emplacements réservés (skeleton à la hauteur mesurée) : pas de saut de mise en page (CLS mobile 0,38 → 0,001).
- Contenus d'exemple restants (amis, guildes, messages) : annoncés par `.dash-demo-note` tant que le réseau social n'est pas réel.

## Marchés et graphiques (lot 4)

- `/crypto` est dans la coque (`AppShell`) ; les couleurs codées en dur de la page ont été remplacées par les jetons.
- Graphiques canvas (Lightweight Charts n'accepte pas `var(--…)`) : `app/lib/chartTheme.js` lit les jetons du thème actif (`useChartTheme`) et se met à jour quand `data-theme` change ; `withAlpha` fabrique les transparences. Couleurs d'indicateurs = séries validées (ordre fixe).
- Bourse : `app/components/HistoryChart.jsx` (courbe annuelle, étiquette « Données illustratives », tableau accessible) lit `GET /api/v1/trading/history`, borné côté serveur à l'année simulée du joueur.
- L'attribution TradingView reste obligatoire (logo du graphique + lien sous la carte).

## Pages migrées (lots 5 à 7)

Méthode : le `<main>` plein écran d'origine devient `<AppShell>` ; les couleurs d'origine sont remplacées par les jetons (script de migration jetable, relu à la main) ; plus de filtre par route. `backend/tests/designMigration.test.ts` liste les pages migrées et vérifie : coque, aucune couleur d'origine ni texte blanc nu. Texte sur boutons pleins : `--ik-text-on-primary|positive|negative`.

## Classes utilitaires (Tailwind absent)

Plusieurs pages (amis, profil, quiz final…) utilisaient des classes de type Tailwind (`flex`, `p-4`, `text-gray-400`…) alors que **Tailwind n'est pas installé** : ces classes ne faisaient rien. `scripts/gen-utilities.py` génère `app/styles/utilities.css` : un sous-ensemble de ces utilitaires, **limité aux classes réellement utilisées**, avec des couleurs du thème (clair/sombre). Après avoir ajouté une classe dans une de ces pages : `python3 scripts/gen-utilities.py`. Pour une page neuve, préférer les composants du design system.

## Voir les composants

En développement uniquement : `/design-system` (renvoie 404 en production).

## Sources d'inspiration (hors captures du propriétaire)

Voir le récapitulatif de la PR.
