# InvestKit - Plateforme Premium d'Investissement

## Vue d'Ensemble
InvestKit est une plateforme web professionnel dédiée à l'investissement, la simulation de projets financiers et l'éducation. Le projet est pensé "API-first" pour permettre un déploiement futur en tant qu'application mobile.

**Objectif principal** : Fournir aux investisseurs un ensemble d'outils pointus pour simuler, analyser et optimiser leurs stratégies d'investissement.

---

## Fonctionnalités Principales

### 1. Outils de Simulation et d'Investissement
- Calculateurs et simulateurs pour tous les marchés
- Immobilier, Crypto, Bourse/PEA, Obligations, etc.
- Calculs financiers avancés (intérêts composés, ROI, etc.)

### 2. Analyse de Risque Pro
- Moteur d'évaluation de projets d'investissement
- Calcul automatique des risques (actuels et futurs)
- Conseils d'optimisation basés sur l'IA

### 3. Flux de Données d'Actualité
- Intégration d'APIs financières (données temps réel)
- Flux de news économiques
- Analyses basées sur des données actualisées

### 4. Espace Éducation Gamifié
- Parcours d'apprentissage par niveau (débutant → expert)
- Cours, vocabulaire, quiz interactifs
- Système de niveaux par domaine d'investissement

---

## Stack Technique (Proposée)

### Frontend
- **Next.js 14+** (React + SSR/SSG)
- **TypeScript** (typage fort)
- **TailwindCSS** (design responsive)
- **Recharts / Chart.js** (visualisations financières)
- **Zustand** (state management)

### Backend
- **Node.js + Express.js** OU **Python + FastAPI**
- **PostgreSQL** (données structurées, transactions financières)
- **Redis** (cache, rate limiting)
- **JWT + OAuth2** (authentification)

### DevOps & Sécurité
- **Docker** (containerization)
- **GitHub Actions** (CI/CD)
- **Vercel OU Railway** (hébergement)
- **Supabase** (Backend-as-a-Service optionnel)

---

## Architecture Générale

```
InvestKit/
├── frontend/          # Application Next.js
│   ├── pages/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── styles/
├── backend/           # API Node.js/Python
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── middleware/
│   └── services/
├── database/          # Migrations & Schemas
│   └── migrations/
└── docs/
```

---

## Exigences de Sécurité
✅ OWASP Top 10 compliant
✅ Cryptage des données sensibles (AES-256)
✅ Rate limiting & DDoS protection
✅ Validation des inputs (frontend + backend)
✅ HTTPS obligatoire
✅ CORS configuré
✅ Audit logs pour les transactions

---

## Conventions de Code
- **Langage** : TypeScript/Python pour la type-safety
- **Nommage** : camelCase (JS), snake_case (Python/SQL)
- **Commits** : Format conventionnel (feat:, fix:, docs:, etc.)
- **Tests** : Jest/Pytest (couverture > 80%)

---

## État du Projet
- **Phase** : Pré-développement (Étape 1 en cours)
- **Dernière mise à jour** : 2026-09-19
