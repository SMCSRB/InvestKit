# Faille « session sans preuve » : correctif et marche à suivre

## Ce qui se passait
La route `POST /auth/save-preferences` était **publique** et prenait l'adresse e-mail dans le corps de la requête. Elle ouvrait une session (cookie) pour cette adresse **sans mot de passe, sans code reçu par e-mail, sans 2FA**, même pour un compte jamais vérifié. Quelqu'un qui connaissait l'adresse d'un joueur pouvait donc se connecter à son compte et changer son pseudo. La faille existait déjà dans `main`.

## Ce que le correctif change
- `verify-email` : une fois le bon code prouvé, le serveur ouvre la session (cookie httpOnly). Le code est la preuve de possession de la boîte e-mail.
- `save-preferences` : **protégée**. L'identité vient de la session du serveur, jamais d'une adresse envoyée par le navigateur. Refusée si l'e-mail n'est pas vérifié. Pseudo contrôlé (2 à 30 caractères, texte).
- Verrou **par compte** sur `verify-email` : 8 mauvais codes verrouillent le compte un moment, même si l'attaquant change d'adresse IP (le code n'a que 6 chiffres).
- Comparaison des codes en temps constant ; types contrôlés.
- Traces dans le journal d'audit : `email_verified` (session ouverte) et `profile_setup`.
- Tests : `backend/tests/sessionSansPreuve.test.ts` (les deux premiers reproduisent la faille et échouaient avant le correctif).

## Autres routes publiques passées en revue
| Route | Ouvre une session ? | Modifie un compte ? | Verdict |
|---|---|---|---|
| `register` | Non | Crée un compte (réponse neutre) | OK |
| `login`, `2fa/login-verify` | Oui, sur mot de passe (+ 2FA) | Non | OK (verrou par compte) |
| `verify-email` | Oui, sur code | Active le compte | OK après correctif |
| `resend-code` | Non | Renouvelle le code d'un compte non vérifié | OK (réponse neutre, limitée) |
| `forgot-password`, `reset-password` | Non | Mot de passe, sur jeton reçu par e-mail | OK |
| `logout`, `signup-config` | Non | Non | OK |
| `check-email/:email` | Non | Non | **Fuite d'information** : dit si une adresse a un compte (contredit la réponse neutre de `register`). Utilisée par la page d'inscription. À traiter dans une PR à part. |
| `billing/webhook` | Non | Abonnements | OK : signature Stripe obligatoire |
| `content/announcements`, `tools/*` (risque) | Non | Non | OK : lecture ou calcul sans état, limités en débit |
| `health`, `openapi.json` | Non | Non | OK |
Toutes les autres routes de l'API exigent la session (`authMiddleware`).

## Déployer
Aucune migration. Suis `docs/DEPLOIEMENT-DEBUTANT.md`. Le site et l'API doivent être déployés **ensemble** (le site n'envoie plus l'e-mail à `save-preferences`).

## Savoir si la faille a été exploitée
1. **Base (lecture seule)** : `psql "$DATABASE_URL" -f ops/sql/detecter-session-sans-preuve.sql`. Requêtes A et B : comptes jamais vérifiés avec pseudo ou activité (preuve forte). C : comptes utilisés depuis 3 IP ou plus le même jour. D : indice faible.
2. **Journaux du serveur web** (nginx ou autre) : un joueur normal appelle `save-preferences` **une seule fois**, juste après son inscription. Repère les IP qui l'appellent plusieurs fois : `grep "POST .*save-preferences" /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head`.
3. **Limite honnête** : l'ancienne route ne laissait aucune trace dans le journal d'audit, donc une prise de contrôle d'un compte vérifié n'est pas détectable avec certitude après coup.
4. **Par précaution** : changer `JWT_SECRET` après déploiement invalide **toutes** les sessions déjà ouvertes (tout le monde doit se reconnecter). En test fermé, c'est un coût faible pour un gain réel. Si un compte semble touché : lui faire changer son mot de passe (« Mot de passe oublié »).
