# 🚀 Guide d'Hébergement - InvestKit Discord Bot

## 🎯 Objectif

Ce guide explique comment garder votre bot Discord en ligne **24/7** sans avoir besoin de garder votre ordinateur allumé.

---

## ☁️ Options d'Hébergement

### 1. **Replit** (Gratuit, Recommandé pour Débutants)
[Replit.com](https://replit.com)

**Avantages:**
- Gratuit
- Facile à configurer
- Interface graphique
- Parfait pour apprendre

**Étapes:**
1. Créez un compte Replit
2. Cliquez sur "Create Replit"
3. Choisissez "Import from GitHub"
4. Copiez l'URL du repo InvestKit
5. Configurez `.env` avec vos tokens
6. Lancez le bot avec `npm start`
7. Utilisez "Always On" (optionnel, payant)

**Limitations:**
- Peut être arrêté après inactivité
- Limites de CPU/RAM
- Version gratuite peut être instable

---

### 2. **Railway** (Gratuit + Payant, Recommandé)
[Railway.app](https://railway.app)

**Avantages:**
- Gratuit (avec crédit initial)
- Très fiable
- Facilement intégré avec GitHub
- Excellent support

**Étapes:**
1. Créez un compte Railway
2. Connectez GitHub
3. Importez le repo InvestKit
4. Configurez les variables d'environnement:
   ```
   DISCORD_TOKEN=votre_token
   DISCORD_CLIENT_ID=votre_client_id
   DISCORD_GUILD_ID=votre_guild_id
   ```
5. Railway détectera `package.json` et lancera automatiquement
6. Le bot sera en ligne 24/7

**Coût:**
- Gratuit: $5/mois de crédit
- Puis: ~$5-10/mois pour un bot simple

---

### 3. **Heroku** (Payant, Stable)
[Heroku.com](https://heroku.com)

**Avantages:**
- Très stable et fiable
- Excellent uptime
- Bonne documentation

**Étapes:**
1. Créez un compte Heroku
2. Créez une nouvelle app
3. Connectez GitHub au repo
4. Configurez les Config Vars
5. Deploy depuis GitHub
6. Activez Dyno (coûteux)

**Coût:**
- À partir de $25/mois

---

### 4. **VPS** (Recommandé pour Production)
Options: **DigitalOcean**, **Linode**, **Vultr**, **AWS**

**Avantages:**
- Contrôle total
- Très fiable
- Bon rapport qualité/prix

**Étapes (DigitalOcean):**
1. Créez un droplet (VPS)
2. Choisissez Ubuntu 22.04
3. SSH dans le serveur
4. Installez Node.js:
   ```bash
   curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
5. Clonez le repo:
   ```bash
   git clone https://github.com/your-repo/InvestKit.git
   cd InvestKit/discord-bot
   ```
6. Installez les dépendances:
   ```bash
   npm install
   ```
7. Créez le fichier `.env`
8. Configurez PM2 pour garder le bot actif:
   ```bash
   npm install -g pm2
   pm2 start src/index.js --name "investkit-bot"
   pm2 save
   pm2 startup
   ```

**Coût:**
- À partir de $4-6/mois (DigitalOcean)
- À partir de $5/mois (Linode)
- À partir de $2.50/mois (Vultr)

---

## 🔄 Gardez le Bot Actif 24/7

### Option 1: PM2 (Recommandé)

```bash
# Installation globale
npm install -g pm2

# Démarrer le bot
pm2 start src/index.js --name "investkit-bot"

# Sauvegarder la configuration
pm2 save

# Configurer le redémarrage automatique
pm2 startup

# Voir les logs
pm2 logs investkit-bot

# Redémarrer le bot
pm2 restart investkit-bot

# Arrêter le bot
pm2 stop investkit-bot
```

### Option 2: Systemd (Linux)

Créez `/etc/systemd/system/investkit-bot.service`:

```ini
[Unit]
Description=InvestKit Discord Bot
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/home/your_username/InvestKit/discord-bot
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10

Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

Puis:
```bash
sudo systemctl enable investkit-bot
sudo systemctl start investkit-bot
sudo systemctl status investkit-bot
```

### Option 3: Screen (Simple)

```bash
screen -S investkit-bot
cd /path/to/InvestKit/discord-bot
npm start

# Détacher: Ctrl+A puis D
# Réattacher: screen -r investkit-bot
```

---

## 🔐 Sécurité

### Bonnes Pratiques

1. **Never commit `.env`**
   ```bash
   git add .gitignore
   ```

2. **Utilisez des secrets**
   - Sur Railway: Config Vars
   - Sur Heroku: Config Vars
   - Sur VPS: Fichier `.env` sécurisé

3. **Limitez les permissions**
   ```bash
   chmod 600 .env
   ```

4. **Utilisez des tokens sécurisés**
   - Régénérez le token du bot si compromis
   - Never share tokens publiquement

5. **Configurez un firewall**
   ```bash
   sudo ufw allow 22/tcp  # SSH
   sudo ufw enable
   ```

---

## 📊 Monitoring et Logs

### Avec PM2

```bash
# Dashboard en temps réel
pm2 monit

# Voir les logs
pm2 logs investkit-bot

# Afficher les infos du processus
pm2 show investkit-bot

# Sauvegarder les logs
pm2 save
pm2 logs investkit-bot > bot.log
```

### Avec Systemd

```bash
# Voir les logs
journalctl -u investkit-bot -f

# Voir les dernières 100 lignes
journalctl -u investkit-bot -n 100
```

---

## 🚨 Dépannage

### Le bot se déconnecte
1. Vérifiez le token
2. Vérifiez la connexion internet
3. Vérifiez les logs: `pm2 logs`

### Erreur de permission
1. Assurez-vous que le bot a les rôles admin
2. Placez le bot au sommet de la liste des rôles

### Commandes ne répondent pas
1. Redéployez les commandes: `npm run deploy-commands`
2. Redémarrez le bot: `pm2 restart investkit-bot`

### Bot se crash constamment
1. Vérifiez les dépendances: `npm install`
2. Vérifiez Node.js version: `node -v` (besoin 18+)
3. Consultez les logs: `pm2 logs`

---

## 💡 Recommandations

### Pour Production
1. ✅ Utilisez Railway ou un VPS
2. ✅ Configurez PM2 ou Systemd
3. ✅ Mettez en place des logs
4. ✅ Faites des sauvegardes régulières
5. ✅ Utilisez un .env sécurisé

### Pour Développement
1. ✅ Utilisez Replit ou votre ordinateur
2. ✅ Utilisez `npm run dev` (rechargement automatique)
3. ✅ Testez les commandes dans un canal privé

---

## 🔗 Comparaison

| Plateforme | Coût | Uptime | Facilité | Recommandé |
|-----------|------|--------|---------|-----------|
| Replit | Gratuit | 70% | ⭐⭐⭐⭐⭐ | Débutants |
| Railway | $5-10/mois | 99% | ⭐⭐⭐⭐ | Recommandé |
| Heroku | $25+/mois | 99.9% | ⭐⭐⭐ | Stable |
| DigitalOcean | $4-6/mois | 99.99% | ⭐⭐ | Production |
| Votre PC | Gratuit | Dépend | ⭐⭐ | Test |

---

## ✅ Checklist de Lancement

- [ ] Bot créé sur Discord Developer Portal
- [ ] Token configuré dans `.env`
- [ ] Commandes déployées: `npm run deploy-commands`
- [ ] Hébergement choisi et configuré
- [ ] Bot en ligne 24/7 vérifiée
- [ ] Permissions vérifiées
- [ ] Test des commandes complété
- [ ] Logs configurés
- [ ] Backups configurées

---

**Votre bot est prêt pour 24/7! 🚀**
