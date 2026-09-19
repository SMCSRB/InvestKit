# InvestKit Database

PostgreSQL database schema et setup pour InvestKit.

## 🚀 Démarrage Rapide

### Installation de PostgreSQL

#### macOS (Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
```

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### Windows
Télécharge l'installateur : https://www.postgresql.org/download/windows/

### Créer la base de données

```bash
# Connexion à PostgreSQL
psql -U postgres

# Créer la BD et l'utilisateur
CREATE USER investkit WITH PASSWORD 'password';
CREATE DATABASE investkit OWNER investkit;
GRANT ALL PRIVILEGES ON DATABASE investkit TO investkit;

# Sortir
\q
```

### Initialiser le schéma

Le schéma s'initialise automatiquement au démarrage du backend en mode développement (`NODE_ENV=development`).

```bash
cd backend
npm run dev
```

Le backend va :
1. Se connecter à PostgreSQL
2. Créer les tables automatiquement
3. Insérer les données d'exemple (cours)

## 📊 Structure de la Base de Données

### Utilisateurs (`users`)
- Authentification
- Emails uniques
- Mots de passe hashés (bcrypt)
- Codes de vérification
- Tokens de réinitialisation

### Profils d'Investisseur (`investor_profiles`)
- Tolérance au risque
- Objectifs d'investissement
- Expérience
- Marchés préférés

### Projets d'Investissement (`investment_projects`)
- Type de projet (stocks, crypto, immobilier, etc.)
- Montant initial
- Rendement attendu
- Statut

### Analyses de Risque (`risk_analysis`)
- Scores de risque
- Facteurs de risque (JSON)
- Recommandations
- Date d'analyse

### Cours (`courses`)
- Catégorie (stocks, crypto, real_estate, etc.)
- Niveau (beginner, intermediate, expert)
- Contenu et durée
- Statut de publication

### Progression Utilisateur (`user_progress`)
- Cours suivis
- Pourcentage de complétude
- Score de quiz
- Points XP et niveaux

## 🔧 Variables d'Environnement

Voir `backend/.env.example` :

```bash
DATABASE_URL=postgresql://investkit:password@localhost:5432/investkit
DB_HOST=localhost
DB_PORT=5432
DB_NAME=investkit
DB_USER=investkit
DB_PASSWORD=password
```

## 🗑️ Reset (Dev Only)

Pour réinitialiser complètement la BD :

```bash
# Supprimer la BD
psql -U postgres -c "DROP DATABASE IF EXISTS investkit;"

# Recréer
psql -U postgres -c "CREATE DATABASE investkit OWNER investkit;"

# Redémarrer le backend (il va recréer les tables)
cd backend
npm run dev
```

## 📝 Queries Utiles

### Voir tous les utilisateurs
```sql
SELECT id, email, first_name, verified FROM users;
```

### Voir les projets d'un utilisateur
```sql
SELECT * FROM investment_projects WHERE user_id = 'user-uuid';
```

### Voir les cours disponibles
```sql
SELECT * FROM courses WHERE is_published = TRUE ORDER BY category, level;
```

### Voir la progression d'un utilisateur
```sql
SELECT u.email, c.title, up.completion_percentage, up.xp_earned
FROM user_progress up
JOIN users u ON up.user_id = u.id
JOIN courses c ON up.course_id = c.id
WHERE u.email = 'user@example.com';
```

## 🚀 Prochaines Étapes

- [ ] Migrations versionnées (pg-migrate)
- [ ] Backup automatique
- [ ] Indexes d'optimisation
- [ ] Audit logs
- [ ] Replication (production)

## 📚 Documentation

- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [InvestKit Backend](../backend/README.md)
- [Architecture](../CLAUDE.md)
