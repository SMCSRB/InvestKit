# 📧 Système d'Envoi d'Email - InvestKit

Ce guide explique comment configurer l'envoi d'emails de vérification pour votre plateforme InvestKit.

## 🚀 État Actuel

Le système d'envoi d'email est **entièrement fonctionnel** avec trois options de configuration:

### 1. **Ethereal** (Développement - Par défaut)
- ✅ Sans configuration requise
- ✅ Parfait pour le développement local
- ✅ Les emails sont logés en console
- ✅ Vous pouvez cliquer sur les URLs de prévisualisation

**Configuration actuelle:**
```env
EMAIL_PROVIDER=ethereal
EMAIL_FROM=noreply@investkit.com
```

### 2. **Resend** (Production - Recommandé) 🎯
Resend est le service d'email le plus moderne et facile à configurer.

**Avantages:**
- ✅ 100 emails gratuits par jour
- ✅ Très fiable et rapide
- ✅ Support excellent
- ✅ Pas de configuration SMTP complexe
- ✅ Dashboard intuitif

**Configuration:**

#### Étape 1: Créer un compte Resend
1. Aller sur https://resend.com
2. S'inscrire gratuitement
3. Vérifier votre email

#### Étape 2: Obtenir votre clé API
1. Dans le dashboard Resend, aller dans **API Keys**
2. Créer une nouvelle clé API
3. Copier la clé (elle commence par `re_`)

#### Étape 3: Ajouter à votre .env.local
```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_votre_clé_ici
EMAIL_FROM=noreply@investkit.com
```

#### Étape 4: Redémarrer le backend
```bash
npm run dev
```

**Test:**
Créez un compte avec un email de test, vous devriez recevoir le code de vérification!

### 3. **SMTP Custom** (Gmail, Outlook, serveur personnel)

Pour utiliser SMTP (Gmail, Outlook, votre serveur mail):

#### Pour Gmail:
1. Activer 2FA sur votre compte Google
2. Créer une "App Password" à https://myaccount.google.com/apppasswords
3. Ajouter à votre .env.local:

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-app-password-16-caracteres
EMAIL_FROM=votre-email@gmail.com
```

#### Pour Outlook:
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@outlook.com
SMTP_PASS=votre-mot-de-passe
EMAIL_FROM=votre-email@outlook.com
```

## 🔍 Vérifier que ça fonctionne

### En développement (Ethereal):
1. Lancez le backend: `npm run dev`
2. Allez sur `/signup` et créez un compte
3. Vous verrez dans le terminal du backend:
```
📨 Sending verification email to user@example.com...
✅ Email sent successfully
🔗 Preview URL: https://ethereal.email/messages/...
```
4. Cliquez sur l'URL de prévisualisation pour voir le code

### En production (Resend):
1. Le backend envoie automatiquement l'email via Resend
2. L'utilisateur reçoit le code dans sa boîte mail
3. Vous pouvez voir les statistiques d'envoi dans le dashboard Resend

## 📊 Dashboard Resend

Une fois configuré, vous pouvez suivre:
- ✅ Nombre d'emails envoyés
- ✅ Taux de délivrance
- ✅ Taux d'ouverture
- ✅ Erreurs d'envoi

## 🛡️ Sécurité

**Bonnes pratiques:**
- ✅ Jamais mettre vos vraies clés API dans Git
- ✅ Utiliser `.env.local` (ignorer dans `.gitignore`)
- ✅ Créer des clés API séparées pour dev et prod
- ✅ Rotationner les clés API régulièrement

**Fichiers ignorés:**
`.env.local` est déjà dans `.gitignore`, c'est bon ✅

## 🔗 Code de vérification

**Durée de validité:** 15 minutes
**Format:** 6 chiffres
**Tentatives:** Illimitées

Si l'utilisateur n'a pas reçu le code:
- Cliquer sur "Renvoyer le code"
- Un nouveau code est généré et envoyé
- Le code précédent devient invalide

## 📝 Template d'Email

Le template d'email est personnalisé et inclut:
- Logo InvestKit
- Message de bienvenue
- Code de vérification en gros
- Durée de validité
- Message de sécurité

Voir dans `src/utils/email.ts` la fonction `generateVerificationEmailHTML`

## 🆘 Dépannage

### "Email sending failed"
- Vérifier votre clé API Resend
- Vérifier que `EMAIL_PROVIDER=resend` est configuré
- Redémarrer le backend

### "Email not received"
- Vérifier le dossier spam/indésirable
- Vérifier que le domaine Resend est autorisé
- Essayer de renvoyer le code

### "SMTP connection error"
- Vérifier les identifiants SMTP
- Vérifier que 2FA est activé (pour Gmail)
- Vérifier que le port est correct (587 pour TLS, 465 pour SSL)

## 📞 Support

**Resend:** https://resend.com/support
**Nodemailer:** https://nodemailer.com

---

**Prochaines étapes:**
1. [ ] Choisir votre fournisseur d'email (Resend recommandé)
2. [ ] Configurer les variables d'environnement
3. [ ] Tester l'envoi d'email
4. [ ] Déployer en production
