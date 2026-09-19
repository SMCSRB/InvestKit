# InvestKit Backend API

API REST pour InvestKit, construite avec Node.js + Express.

## 🚀 Démarrage Rapide

### Installation

```bash
cd backend
npm install
```

### Développement

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:5000`

### Build & Production

```bash
npm run build
npm start
```

## 📁 Structure

```
backend/
├── src/
│   ├── config/          # Configuration (env, etc.)
│   ├── controllers/     # Logique métier
│   ├── middleware/      # Middleware Express
│   ├── routes/          # Routes API
│   ├── utils/           # Utilitaires (JWT, etc.)
│   └── index.ts         # Point d'entrée
├── dist/                # Build compilé
├── package.json
└── tsconfig.json
```

## 🔐 Endpoints d'Authentification

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "Jean",
  "lastName": "Dupont",
  "profile": { "investorType": "beginner" }
}

Response:
{
  "success": true,
  "userId": "uuid-here",
  "verificationCode": "ABC123" (dev only)
}
```

### Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "userId": "uuid-here",
  "verificationCode": "ABC123"
}

Response:
{
  "success": true,
  "user": { "id", "email", "firstName" }
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "success": true,
  "token": "jwt-token-here",
  "user": { "id", "email", "firstName", "lastName" }
}
```

### Get Current User (Protected)
```http
GET /api/auth/me
Authorization: Bearer jwt-token-here

Response:
{
  "user": { "id", "email", "firstName", "lastName" }
}
```

### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "message": "Lien envoyé..."
}
```

### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "resetToken": "token-here",
  "newPassword": "NewPass123!"
}

Response:
{
  "success": true
}
```

## 📝 Variables d'Environnement

Voir `.env.example` pour la liste complète.

### Essentielles
- `PORT` - Port du serveur (défaut: 5000)
- `JWT_SECRET` - Secret pour signer les JWT
- `CORS_ORIGIN` - URL du frontend (ex: http://localhost:3000)

### Base de Données (À venir)
- `DATABASE_URL` - Connection string PostgreSQL
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

## 🧪 Tests Locaux avec Thunder Client / Postman

1. Importer les endpoints ci-dessus
2. Commencer par `/api/auth/register`
3. Utiliser le `verificationCode` retourné pour `/api/auth/verify-email`
4. Puis `/api/auth/login` avec les credentials
5. Utiliser le `token` retourné dans l'header `Authorization: Bearer {token}`

## 🔲 À Faire (Étapes Suivantes)

- [ ] PostgreSQL intégration
- [ ] Database migrations
- [ ] Email verification (vrai email)
- [ ] Password reset (email)
- [ ] API des investissements
- [ ] Analyse de risque
- [ ] Tests unitaires
- [ ] Déploiement en production

## 🛡️ Sécurité

- ✅ Passwords hashées avec bcrypt
- ✅ JWT pour l'authentification
- ✅ CORS configuré
- ✅ Validation des inputs
- 🔲 Rate limiting (À venir)
- 🔲 HTTPS en production (À venir)

## 📚 Documentation Complète

Voir [CLAUDE.md](../CLAUDE.md) pour l'architecture générale du projet.
