# Refonte des emojis : icônes SVG sobres et cohérentes

## Pourquoi
Les emojis (couleurs différentes selon l'appareil, style « fait par une IA ») donnaient un rendu peu professionnel. Ils sont remplacés par des icônes SVG au même trait, aux couleurs du thème violet.

## Règles (décidées)
- **Aucun emoji dans l'interface** : ni dans les titres, ni dans les textes, ni dans les boutons, badges, menus, classements, éducation. Un test (`backend/tests/refonteEmojis.test.ts`) fait échouer la suite si un emoji revient dans `app/`, `data/` ou `lib/`.
- **La pièce InvestCoin** est un SVG original (`app/components/ui/Coin.jsx`, composant `<Coin />`) qui remplace tous les 🪙 : il suit la taille du texte et se lit « InvestCoins » (aria-label). Dans les textes où un composant est impossible (messages du serveur, info-bulles, glossaire), on écrit le mot **InvestCoins** (ou « 1 InvestCoin »).
- **Icônes** : composant `<Icon name="…" />` (jeu maison + Lucide). Pour une icône décrite par une donnée (domaine, badge, thème, avatar), `<Glyph g="…" />`. Médailles de classement : `<Medal rank={n} />`. Badges de récompense : `<BadgeMedal icon rarity />` (couleur selon la rareté).
- Accessibilité : une icône décorative est `aria-hidden` ; une icône qui porte du sens reçoit un `label`.

## Bibliothèque choisie : Lucide
- **Lucide** (https://lucide.dev), version **1.49.0**, licence **ISC** (usage commercial libre, il suffit de garder la mention de copyright : `app/components/ui/lucide-LICENSE.txt`).
- **Aucune dépendance ajoutée** : 96 icônes sont copiées (chemins SVG) dans `app/components/ui/lucideIcons.js` par `tools/icons/vendor-lucide.py` (liste et version fixes). Détails : `docs/licences-icones.md`.
- Pourquoi Lucide et pas Phosphor : trait fin et régulier identique à notre jeu maison (grille 24 px), licence ISC très courte, et la copie des seules icônes utiles évite d'alourdir le site.

## Inventaire (site : `app/`, `data/`, `lib/`)
- Avant : **390 emojis**, 95 sortes différentes, dans 31 fichiers (la pièce 🪙 : 80 fois ; puis 📊, ✅, 📈, 🏆, 🔒, ⚠, ✨, ⭐, 👤, 🚀, 📚…).
- Après : **0**. La seule exception est `app/components/ui/emojiMap.js` : table de correspondance (jamais affichée) qui permet d'afficher une icône pour une ancienne valeur déjà enregistrée par un joueur (par exemple l'avatar choisi avant la refonte).
- Emojis dans les messages du serveur (notifications, prêts, erreurs) : **🪙 remplacé par « InvestCoins »** dans 29 fichiers de l'API et ses tests.
- Non touchés, volontairement : le **bot Discord** (Discord affiche des emojis par nature, application séparée), et les **journaux de la console** du serveur. Les mails n'utilisent déjà que des images et aucun emoji.

## Correspondance principale
| Avant | Après |
|---|---|
| 🪙 | `<Coin />` (SVG original) |
| 📊 📈 📉 | chartColumn, trendingUp, trendingDown |
| 🏆 🥇🥈🥉 🏅 | trophy, `<Medal />`, award |
| ✅ ❌ ⚠️ ⛔ | circleCheck, circleX, triangleAlert, ban |
| 🏠 🏦 💳 💰 | house, landmark, creditCard, banknote |
| 🔒 🔐 🛡 | lock, lockKeyhole, shield |
| 🚀 🎯 💡 ✨ | rocket, target, lightbulb, sparkles |
| 👤 👥 👑 | user, users, crown |
| ₿ (crypto) | bitcoin |
| badges (👶 🧠 💎 🌸 ☀️ 🍂 ❄️ 🌙 ⚡…) | `<BadgeMedal />` : baby, brain, gem, flower2, sun, leaf, snowflake, moon, zap… |
Dans les titres et les textes, l'emoji est simplement retiré (le titre se suffit à lui-même).

## Comparaison avant / après
Ouvre `docs/refonte-emojis/comparaison.html` dans un navigateur (13 pages, captures réelles).

## Ajouter une icône
1. Ajouter son nom Lucide à la liste de `tools/icons/vendor-lucide.py`, puis le relancer avec le dossier `icons` de `lucide-static@1.49.0` (`npm pack lucide-static@1.49.0`).
2. L'utiliser avec `<Icon name="nomEnCamelCase" />`. Le test vérifie que chaque nom utilisé existe.

## Points d'attention
- Un bug de fond corrigé en route : l'onboarding décidait « message de succès ou d'erreur » en cherchant un ✅ dans le texte ; il utilise maintenant un état (`messageOk`).
- `<Icon size>` grand (plus de 24 px) est maintenant respecté (une règle CSS imposait 20 px).
