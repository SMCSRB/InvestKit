# 🤖 InvestKit Discord Bot

Un bot Discord complet et professionnel pour votre communauté d'investissement InvestKit. Offre des outils de simulation financière, des actualités, un système de rôles et bien plus.

## ✨ Fonctionnalités

### 💰 Outils Financiers
- **Calcul du ROI** - Calculez le retour sur investissement
- **Calcul des Intérêts Composés** - Simulez vos gains avec les intérêts composés
- **Actualités Financières** - Récupérez les dernières news

### 👥 Gestion Communautaire
- **Système de Rôles** - Investisseur, Trader, Apprenant
- **Leaderboard** - Classement des meilleurs investisseurs
- **Statistiques du Serveur** - Infos détaillées du serveur
- **Profil Utilisateur** - Affiche le profil de n'importe quel membre

### 🎓 Éducation
- **Ressources d'Apprentissage** - Cours par niveau (Débutant → Avancé)
- **Quiz Interactif** - Questions d'investissement

### ⚙️ Administrateur
- **Configuration Automatique** - Crée les salons et rôles automatiquement
- **Annonces** - Postez des annonces officielles
- **Accueil des Membres** - Message de bienvenue automatique

---

## 📋 Prérequis

- **Node.js** 18.0+ et npm
- **Discord Server** où vous êtes propriétaire
- **Discord Bot Token** (via Discord Developer Portal)

---

## 🚀 Installation

### 1. Cloner et installer les dépendances

```bash
cd discord-bot
npm install
```

### 2. Créer un bot Discord

1. Allez sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Cliquez sur "New Application"
3. Allez dans "Bot" → "Add Bot"
4. Copiez le TOKEN
5. Allez dans OAuth2 → URL Generator
6. Sélectionnez: `bot`
7. Permissions:
   - Administrator (pour faciliter la gestion)
   - Ou sélectionnez manuellement:
     - Manage Roles
     - Manage Channels
     - Send Messages
     - Read Messages/View Channels
     - Embed Links
     - Attach Files

### 3. Configuration

Créez un fichier `.env` à la racine du dossier `discord-bot`:

```bash
cp .env.example .env
```

Remplissez le fichier `.env`:

```env
DISCORD_TOKEN=votre_token_bot
DISCORD_CLIENT_ID=votre_client_id
DISCORD_GUILD_ID=votre_guild_id
```

**Comment trouver votre Guild ID:**
- Activez le mode développeur dans Discord
- Faites un clic droit sur votre serveur
- Cliquez sur "Copier l'ID du serveur"

### 4. Déployer les commandes

```bash
npm run deploy-commands
```

### 5. Lancer le bot

```bash
npm start
```

Pour le développement avec rechargement automatique:

```bash
npm run dev
```

---

## 🛠️ Commandes Disponibles

### Commandes Financières
| Commande | Description | Usage |
|----------|-------------|-------|
| `/calcul-roi` | Calcule le ROI | `/calcul-roi montant-initial:1000 montant-final:1500` |
| `/calcul-interet` | Calcule les intérêts composés | `/calcul-interet capital:1000 taux:5 annees:10` |
| `/news` | Affiche les dernières actualités | `/news categorie:crypto` |

### Commandes Communautaires
| Commande | Description |
|----------|-------------|
| `/profil` | Affiche votre profil ou celui d'un membre |
| `/leaderboard` | Affiche le classement des investisseurs |
| `/stats` | Statistiques du serveur |
| `/roles` | Menu de sélection des rôles |

### Commandes Éducation
| Commande | Description |
|----------|-------------|
| `/learn` | Ressources d'apprentissage par niveau |
| `/quiz` | Questions d'investissement |

### Commandes Admin
| Commande | Description | Permissions |
|----------|-------------|------------|
| `/setup` | Configure le serveur automatiquement | Administrator |
| `/announce` | Poste une annonce officielle | Administrator |
| `/help` | Centre d'aide | Tout le monde |

---

## 📁 Structure du Projet

```
discord-bot/
├── src/
│   ├── index.js                 # Point d'entrée principal
│   ├── commands/                # Dossier des commandes
│   │   ├── help.js
│   │   ├── profile.js
│   │   ├── calcul-roi.js
│   │   ├── calcul-interet.js
│   │   ├── news.js
│   │   ├── roles.js
│   │   ├── leaderboard.js
│   │   ├── stats.js
│   │   ├── announce.js
│   │   ├── setup.js
│   │   ├── learn.js
│   │   └── quiz.js
│   ├── events/                  # Événements du bot
│   │   ├── ready.js
│   │   ├── interactionCreate.js
│   │   └── guildMemberAdd.js
│   ├── utils/                   # Utilitaires
│   │   └── deployCommands.js
│   └── config/                  # Configuration
│       └── config.js
├── .env.example                 # Exemple de configuration
├── package.json
└── README.md
```

---

## 🔧 Configuration du Serveur

### Salons Créés Automatiquement
Lancez `/setup` pour créer automatiquement:

- `#bienvenue` - Accueil des nouveaux membres
- `#📋-regles` - Règles du serveur
- `#🎭-roles` - Sélection des rôles
- `#💰-investissement` - Discussions d'investissement
- `#📊-trading` - Discussions de trading
- `#🎓-education` - Ressources d'apprentissage
- `#📰-news` - Actualités financières
- `#🤖-bot` - Commandes du bot

### Rôles Créés Automatiquement
- **Investisseur** 💰 - Pour les investisseurs
- **Trader** 📊 - Pour les traders
- **Apprenant** 🎓 - Pour les débutants
- **Modérateur** 🔵 - Pour les modérateurs

---

## 🎯 Guide de Démarrage

1. **Installer le bot**
   ```bash
   npm install && npm run deploy-commands && npm start
   ```

2. **Configurer le serveur**
   ```
   /setup
   ```

3. **Accueillir vos membres**
   - Les nouveaux membres reçoivent un message de bienvenue
   - Ils peuvent choisir leurs rôles dans `#roles`

4. **Lancer des actualités**
   ```
   /announce titre:"Bienvenue dans InvestKit!" contenu:"Nous sommes heureux de vous accueillir..."
   ```

---

## 📊 Système de Points (À Venir)

Le leaderboard affichera bientôt les points basés sur:
- Performance d'investissement (ROI)
- Participation aux discussions
- Complétion des cours
- Quiz réussis

---

## 🔐 Sécurité

- ✅ Vérification des permissions (Admin only)
- ✅ Rate limiting sur les commandes
- ✅ Gestion des erreurs robuste
- ✅ Validation des entrées
- ✅ Logs des actions importantes

---

## 🐛 Dépannage

### Le bot ne répond pas
1. Vérifiez que le `.env` est bien configuré
2. Vérifiez le token Discord
3. Assurez-vous que le bot a les permissions nécessaires

### Les commandes ne s'affichent pas
```bash
npm run deploy-commands
```

### Erreur de permission
Assurez-vous que le bot a le rôle `Administrator` ou les permissions nécessaires.

---

## 🚀 Améliorations Futures

- [ ] Système de points persistant avec base de données
- [ ] Intégration API financière (CoinGecko, Alpha Vantage)
- [ ] Système de trading simulé
- [ ] Cache pour les performances
- [ ] Dashboard web

---

## 📄 Licence

MIT

---

## 🤝 Support

Pour toute question ou problème:
1. Consultez la documentation Discord.js: https://discord.js.org/
2. Créez une issue sur GitHub
3. Contactez l'équipe InvestKit

---

## 💡 Tips

- Utilisez `/help` pour voir toutes les commandes
- Personnalisez les rôles et canaux selon vos besoins
- Testez les commandes dans un canal privé d'abord
- Mettez à jour régulièrement discord.js pour les patches de sécurité

---

**Bon investissement! 📈**
