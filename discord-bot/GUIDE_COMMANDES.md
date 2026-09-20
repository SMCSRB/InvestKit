# 📚 Guide Complet des Commandes InvestKit Bot

## 📋 Table des Matières
1. [Commandes Financières](#commandes-financières)
2. [Commandes Communautaires](#commandes-communautaires)
3. [Commandes Éducation](#commandes-éducation)
4. [Commandes Admin](#commandes-admin)
5. [Comment Ajouter des Commandes](#comment-ajouter-des-commandes)

---

## 💰 Commandes Financières

### `/calcul-roi`
**Description:** Calcule le Return On Investment (Retour sur Investissement)

**Options:**
- `montant-initial` (requis) - Le montant initialement investi en €
- `montant-final` (requis) - Le montant après l'investissement en €

**Exemple:**
```
/calcul-roi montant-initial:1000 montant-final:1500
```

**Résultat:**
```
Montant initial: 1000.00 €
Montant final: 1500.00 €
Gain: +500.00 €
ROI: +50.00%
```

### `/calcul-interet`
**Description:** Calcule les intérêts composés

**Options:**
- `capital` (requis) - Capital initial en €
- `taux` (requis) - Taux d'intérêt annuel en %
- `annees` (requis) - Nombre d'années (1-100)
- `frequence` (optionnel) - Fréquence de capitalisation (Annuelle/Semestrielle/Trimestrielle/Mensuelle)

**Exemple:**
```
/calcul-interet capital:10000 taux:5 annees:10 frequence:Mensuelle
```

**Résultat:**
```
Capital initial: 10000.00 €
Taux annuel: 5.00%
Période: 10 ans
Capitalisation: Mensuelle
Intérêts gagnés: 6453.20 €
Montant final: 16453.20 €
```

### `/news`
**Description:** Affiche les dernières actualités financières

**Options:**
- `categorie` (optionnel) - Crypto / Bourse / Immobilier / Économie

**Exemple:**
```
/news categorie:crypto
```

**Résultat:**
```
1. Bitcoin atteint un nouveau sommet
   Le Bitcoin dépasse les 45 000€ pour la première fois
   
2. Ethereum 2.0 update
   La mise à jour majeure améliore la performance de 50%
```

---

## 👥 Commandes Communautaires

### `/profil`
**Description:** Affiche le profil d'un utilisateur

**Options:**
- `utilisateur` (optionnel) - L'utilisateur dont vous voulez voir le profil

**Exemple:**
```
/profil utilisateur:@JohnDoe
```

**Résultat:**
```
Pseudo Discord: JohnDoe
ID: 123456789
Compte créé: 15 janvier 2020
Rejoint le serveur: 20 septembre 2024
Rôles: Investisseur, Trader
```

### `/roles`
**Description:** Menu de sélection des rôles

**Bouttons disponibles:**
- 💰 Investisseur
- 📊 Trader
- 🎓 Apprenant

**Utilisation:**
```
/roles
```

### `/leaderboard`
**Description:** Affiche le classement des meilleurs investisseurs

**Exemple:**
```
/leaderboard
```

**Résultat:**
```
🏆 Leaderboard des Investisseurs

🥇 InvestorPro - 4500 pts (ROI: 145%)
🥈 MoneyMaker - 4200 pts (ROI: 132%)
🥉 WealthBuilder - 3850 pts (ROI: 125%)
#4 MarketGuru - 3600 pts (ROI: 118%)
...
```

### `/stats`
**Description:** Affiche les statistiques du serveur

**Exemple:**
```
/stats
```

**Résultat:**
```
Nombre total de membres: 150
Utilisateurs: 145
Bots: 5
Canaux texte: 8
Salons vocaux: 2
Rôles: 4
```

### `/help`
**Description:** Affiche le centre d'aide avec toutes les commandes

**Exemple:**
```
/help
```

---

## 🎓 Commandes Éducation

### `/learn`
**Description:** Accédez aux ressources d'apprentissage

**Options:**
- `niveau` (optionnel) - Débutant / Intermédiaire / Avancé

**Exemple - Niveau Débutant:**
```
/learn niveau:Débutant
```

**Résultat:**
```
🎓 Ressources d'Apprentissage - Niveau Débutant

1. Les Bases de l'Investissement
   Comprendre les concepts fondamentaux d'investissement
   ⏱️ Durée: 2 heures

2. Types d'Actifs: Actions, Obligations, Crypto
   Explorer les différentes classes d'actifs
   ⏱️ Durée: 3 heures

3. Gestion des Risques pour Débutants
   Apprendre à identifier et gérer les risques
   ⏱️ Durée: 2.5 heures
```

**Exemple - Niveau Avancé:**
```
/learn niveau:Avancé
```

**Résultat:**
```
🎓 Ressources d'Apprentissage - Niveau Avancé

1. Dérivés Financiers & Options
   Comprendre les produits financiers complexes
   ⏱️ Durée: 6 heures

2. Analyse Quantitative
   Utiliser la data pour prendre des décisions
   ⏱️ Durée: 8 heures

3. Gestion de Fonds d'Investissement
   Gérer un portefeuille professionnel
   ⏱️ Durée: 7 heures
```

### `/quiz`
**Description:** Participipe à un quiz d'investissement

**Exemple:**
```
/quiz
```

**Résultat:**
```
🎯 Quiz InvestKit

Quel est le ROI dans le contexte de l'investissement?

Réponse: ||Return On Investment (Retour sur Investissement)||
```

---

## ⚙️ Commandes Admin

### `/setup`
**Description:** Configure automatiquement le serveur

**Permissions requises:** Administrator

**Crée:**
- 8 canaux de texte
- 4 rôles

**Exemple:**
```
/setup
```

**Résultat:**
```
✅ Configuration Terminée!

Salons créés: 8 nouveaux salons
Rôles créés: 4 nouveaux rôles
```

### `/announce`
**Description:** Poste une annonce officielle

**Permissions requises:** Administrator

**Options:**
- `titre` (requis) - Titre de l'annonce
- `contenu` (requis) - Contenu de l'annonce
- `canal` (optionnel) - Canal où poster (par défaut: canal courant)

**Exemple:**
```
/announce titre:"Bienvenue dans InvestKit!" contenu:"Nous sommes heureux de vous accueillir dans notre communauté..."
```

---

## 🛠️ Comment Ajouter des Commandes

### Structure d'une Commande

Créez un fichier dans `src/commands/`:

```javascript
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('macommande')
    .setDescription('Description de ma commande')
    .addStringOption(option =>
      option.setName('parametre')
        .setDescription('Description du paramètre')
        .setRequired(true)
    ),
  cooldown: 5, // En secondes
  async execute(interaction) {
    const param = interaction.options.getString('parametre');
    
    const embed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('Résultat')
      .setDescription(`Vous avez saisi: ${param}`);
    
    await interaction.reply({ embeds: [embed] });
  },
};
```

### Types de Paramètres

```javascript
// String
.addStringOption(option =>
  option.setName('texte')
    .setDescription('Un texte')
    .setRequired(true)
)

// Number
.addNumberOption(option =>
  option.setName('nombre')
    .setDescription('Un nombre')
    .setRequired(true)
    .setMinValue(0)
    .setMaxValue(100)
)

// Integer
.addIntegerOption(option =>
  option.setName('entier')
    .setDescription('Un entier')
    .setRequired(true)
)

// Boolean
.addBooleanOption(option =>
  option.setName('bool')
    .setDescription('Vrai ou Faux')
    .setRequired(true)
)

// User
.addUserOption(option =>
  option.setName('utilisateur')
    .setDescription('Un utilisateur')
    .setRequired(true)
)

// Channel
.addChannelOption(option =>
  option.setName('canal')
    .setDescription('Un canal')
    .setRequired(true)
)

// Role
.addRoleOption(option =>
  option.setName('role')
    .setDescription('Un rôle')
    .setRequired(true)
)
```

### Options avec Choix

```javascript
.addStringOption(option =>
  option.setName('categorie')
    .setDescription('Choisir une catégorie')
    .setRequired(true)
    .addChoices(
      { name: 'Crypto', value: 'crypto' },
      { name: 'Bourse', value: 'stock' },
      { name: 'Immobilier', value: 'realestate' }
    )
)
```

### Embed Personnalisé

```javascript
const embed = new EmbedBuilder()
  .setColor('#0099FF')           // Couleur
  .setTitle('Mon Titre')         // Titre
  .setDescription('Description') // Description
  .setThumbnail('URL_image')     // Miniature
  .setImage('URL_image')         // Image grande
  .addFields(
    { name: 'Champ 1', value: 'Valeur 1', inline: true },
    { name: 'Champ 2', value: 'Valeur 2', inline: true }
  )
  .setFooter({ text: 'Pied de page' })
  .setTimestamp();               // Timestamp automatique
```

### Déployer une Nouvelle Commande

1. Créez le fichier dans `src/commands/`
2. Lancez:
```bash
npm run deploy-commands
```
3. Redémarrez le bot:
```bash
npm start
```

---

## 📝 Exemples Complets

### Commande Simple

```javascript
import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Dit bonjour'),
  execute(interaction) {
    interaction.reply(`Bonjour ${interaction.user.username}! 👋`);
  },
};
```

### Commande avec Paramètre

```javascript
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('echo')
    .setDescription('Répète votre message')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Le message à répéter')
        .setRequired(true)
    ),
  execute(interaction) {
    const message = interaction.options.getString('message');
    const embed = new EmbedBuilder()
      .setColor('#0099FF')
      .setDescription(message);
    interaction.reply({ embeds: [embed] });
  },
};
```

### Commande Asynchrone

```javascript
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Infos du serveur'),
  async execute(interaction) {
    await interaction.deferReply(); // Dire "je pense à ta réaction..."
    
    const guild = interaction.guild;
    const memberCount = (await guild.members.fetch()).size;
    
    const embed = new EmbedBuilder()
      .setTitle(`Infos de ${guild.name}`)
      .addFields(
        { name: 'Membres', value: String(memberCount) }
      );
    
    await interaction.editReply({ embeds: [embed] });
  },
};
```

---

## 🚀 Tips et Tricks

1. **Utiliser `interaction.deferReply()`** pour les commandes longues
2. **Toujours valider les entrées** des utilisateurs
3. **Utiliser les cooldowns** pour éviter les abus
4. **Ajouter des emojis** pour un meilleur UX
5. **Utiliser `ephemeral: true`** pour les messages privés
6. **Tester les commandes** avant de les déployer

---

**Bon développement! 🚀**
