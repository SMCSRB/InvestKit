# 🚀 InvestKit - Guide d'Installation Complet

Guide pas-à-pas pour mettre en place l'environnement de développement complet d'InvestKit.

## 📋 Prérequis

- Node.js 18+ (https://nodejs.org)
- PostgreSQL 14+ (https://www.postgresql.org/download/)
- Git

## 🔧 Étape 1: Installation de PostgreSQL

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### macOS (Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Windows
Télécharge l'installateur : https://www.postgresql.org/download/windows/

## ⚙️ Étape 2: Créer la Base de Données

### Option A: Script automatique (Linux/macOS)
```bash
cd /home/user/InvestKit/database
bash setup.sh
```

### Option B: Commandes SQL manuelles
```bash
# Connexion à PostgreSQL
psql -U postgres

# Puis exécute ces commandes:
CREATE USER investkit WITH PASSWORD 'password';
CREATE DATABASE investkit OWNER investkit;
GRANT ALL PRIVILEGES ON DATABASE investkit TO investkit;

# Vérifie que c'est bon:
\l investkit
\q
```

### Option C: Script SQL
```bash
psql -U postgres -f database/init.sql
```

## ✅ Étape 3: Vérifier la Connexion

```bash
# Test de connexion
psql -U investkit -d investkit -h localhost -p 5432

# Si ça marche, tu dois voir:
psql (14.x (Ubuntu xx.x-xxx))
connexion SSL (protocole : TLSv1.3, chiffrement : TLS_AES_256_GCM_SHA384)
investkit=>

# Sors
\q
```

## 🎯 Étape 4: Lancer le Backend

```bash
cd /home/user/InvestKit/backend

# Installer les dépendances (une seule fois)
npm install

# Lancer le serveur de développement
npm run dev
```

**Tu dois voir:**
```
🔗 Connecting to PostgreSQL...
✅ Database connection established
🗄️ Initializing database schema...
✅ Schema initialized

🚀 InvestKit Backend
   http://localhost:5000
   Environment: development
   Database: investkit
```

## 🌐 Étape 5: Lancer le Frontend (dans un autre terminal)

```bash
cd /home/user/InvestKit

# Installer les dépendances (une seule fois)
npm install

# Lancer le serveur de développement
npm run dev
```

**Tu dois voir:**
```
  ▲ Next.js 16.3.5
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in 2.5s
```

## 🧪 Étape 6: Tester l'Authentification

### Avec Thunder Client, Postman, ou curl:

#### 1. Register (Inscription)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Jean",
    "lastName": "Dupont"
  }'
```

**Réponse:**
```json
{
  "success": true,
  "userId": "uuid-here",
  "verificationCode": "ABC123"
}
```

#### 2. Verify Email (Vérifier l'email)
```bash
curl -X POST http://localhost:5000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid-from-register",
    "verificationCode": "ABC123"
  }'
```

#### 3. Login (Connexion)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

**Réponse:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "firstName": "Jean",
    "lastName": "Dupont"
  }
}
```

## 🔍 Dépannage

### PostgreSQL ne se connecte pas
```bash
# Vérifier que PostgreSQL est en train de tourner
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS

# Vérifier la connexion
pg_isready -h localhost -p 5432
```

### Port 5432 déjà utilisé
```bash
# Trouver quel process utilise le port
lsof -i :5432

# Changer le port dans backend/.env.local
DB_PORT=5433
```

### Backend ne peut pas se connecter à la BD
- Vérifier que `investkit` user existe: `psql -U postgres -c "\du"`
- Vérifier que `investkit` DB existe: `psql -U postgres -c "\l"`
- Vérifier le mot de passe dans `backend/.env.local`

### Node modules manquent
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

## 📚 Structure du Projet

```
InvestKit/
├── app/                 # Frontend Next.js (port 3000)
├── backend/             # Backend Express (port 5000)
│   ├── src/
│   │   ├── config/      # Configuration
│   │   ├── controllers/ # Logique métier
│   │   ├── middleware/  # Middleware Express
│   │   ├── routes/      # Routes API
│   │   ├── repositories/# Data access
│   │   └── utils/       # Utilitaires
│   └── package.json
├── database/            # Schémas PostgreSQL
│   ├── schema.sql       # Schéma principal
│   ├── init.sql         # Script d'init
│   └── setup.sh         # Setup automatique
├── css/                 # Styles (legacy)
├── js/                  # JavaScript (legacy)
└── README.md
```

## 🚀 Commandes Utiles

### Backend
```bash
cd backend
npm run dev      # Lancer en développement
npm run build    # Builder pour la production
npm start        # Lancer la version buildée
npm run lint     # Vérifier le code
npm run format   # Formater le code
```

### Frontend
```bash
cd /home/user/InvestKit
npm run dev      # Lancer en développement
npm run build    # Builder pour la production
npm run start    # Lancer la version buildée
npm run lint     # Vérifier le code
```

### PostgreSQL
```bash
# Connexion à la BD
psql -U investkit -d investkit

# Lister les tables
\dt

# Voir les utilisateurs
SELECT * FROM users;

# Quitter
\q
```

## ✨ Prochaines Étapes

1. ✅ Installation et setup
2. ✅ Tester l'authentification
3. 🔲 Créer les outils de simulation
4. 🔲 Intégrer l'IA pour l'analyse de risque
5. 🔲 Déployer en production

## 📞 Support

Pour plus d'info, consulte:
- [CLAUDE.md](./CLAUDE.md) - Architecture générale
- [backend/README.md](./backend/README.md) - Backend API
- [database/README.md](./database/README.md) - Base de données

Bon développement! 🎉
