# InvestKit - Plateforme d'Investissement Premium

Plateforme web complète pour l'investissement intelligent avec simulateurs financiers, analyse de risque et éducation gamifiée.

## 🚀 Stack Technique

- **Frontend** : Next.js 14 + React 19 + TypeScript
- **Styling** : CSS avec Design System moderne
- **Backend** : Node.js + Express (en développement)
- **Database** : PostgreSQL (en développement)
- **Auth** : JWT + localStorage

## 📁 Structure du Projet

```
InvestKit/
├── app/                    # Application Next.js (App Router)
│   ├── components/         # Composants réutilisables
│   ├── api/                # Routes API (futures)
│   ├── layout.tsx          # Layout global
│   └── page.tsx            # Page d'accueil
├── lib/                    # Logique partagée
│   └── auth.ts             # Fonctions d'authentification
├── css/                    # Styles
│   └── design-system.css   # Design System global
├── public/                 # Assets statiques
├── js/                     # JavaScript legacy (en migration)
├── outils/                 # Outils et simulateurs (en migration)
├── tsconfig.json           # Configuration TypeScript
├── next.config.js          # Configuration Next.js
├── package.json            # Dépendances et scripts
└── README.md               # Ce fichier
```

## 🛠️ Commandes

### Développement
```bash
npm run dev
# Serveur sur http://localhost:3000
```

### Build
```bash
npm run build
npm run start
```

### Linting & Format
```bash
npm run lint
npm run format
npm run type-check
```

## 🔐 Authentification

L'authentification utilise JWT avec localStorage pour le stockage du token client-side.

**Endpoints API disponibles** :
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/verify-email` - Vérification email
- `POST /api/auth/forgot-password` - Mot de passe oublié
- `POST /api/auth/reset-password` - Réinitialisation

## 🎯 Fonctionnalités Principales

### 1. Outils de Simulation
- Simulateur d'investissement pro
- Calculateurs pour tous les marchés
- Visualisations avec Chart.js

### 2. Analyse de Risque
- Moteur d'évaluation de projets
- Calcul automatique des risques
- Conseils d'optimisation

### 3. Éducation Gamifiée
- Parcours d'apprentissage par niveau
- Cours et vocabulaire
- Quiz interactifs
- Système de progression

### 4. Actualités & Données
- Intégration d'APIs financières
- Flux de news économiques
- Analyses temps réel

## 📝 Variables d'Environnement

Voir `.env.example` pour la liste complète.

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 🚧 En Développement

- ✅ Frontend avec Next.js
- 🔲 Backend Node.js + Express
- 🔲 Base de données PostgreSQL
- 🔲 Authentification complète
- 🔲 Simulateurs avancés
- 🔲 Déploiement en production

## 📚 Documentation

- [CLAUDE.md](./CLAUDE.md) - Guide technique et architecture

## 🤝 Contribution

Pour contribuer au projet, consultez les conventions de code dans [CLAUDE.md](./CLAUDE.md).

## 📄 Licence

MIT
