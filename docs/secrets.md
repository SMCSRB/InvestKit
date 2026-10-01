# Secrets : où ils vivent, et comment on évite les fuites

**Règle d'or** : un mot de passe, une clé ou un jeton n'est JAMAIS écrit dans un fichier suivi par git (code, scripts, docs, captures, messages de commit, PR, discussions avec un outil). Il vit dans un fichier **`.env.dev`** (ou dans les variables du serveur en production), que git ignore.

## En développement (ton ordinateur)
1. Ne garde plus de secret dans `start-dev.sh`. Remplace-le :
   ```bash
   cp start-dev.example.sh start-dev.sh && chmod +x start-dev.sh
   cp .env.dev.example .env.dev
   ```
2. Ouvre `.env.dev` et remplis les valeurs (mot de passe d'application Gmail dans `SMTP_PASS`, etc.). `start-dev.sh` les lit tout seul et refuse de démarrer s'il en manque.
3. Vérifie que git ignore bien ces fichiers : `git status` ne doit **pas** les lister. (`.env.dev` et `start-dev.sh` sont dans `.gitignore`.)

## Si un secret a fuité (cas du mot de passe d'application Gmail)
1. **Révoque-le** chez le fournisseur : compte Google → Sécurité → Mots de passe des applications → supprimer. C'est la seule vraie protection : le retirer d'un fichier ne l'efface pas de l'historique.
2. Crées-en un nouveau et mets-le dans `.env.dev`.
3. Lance `npm run check:secrets` : il doit répondre « Aucun secret trouvé ».

## Vérifications automatiques
- **Avant chaque commit** (à activer une fois) : `npm run setup:hooks` — un commit contenant un secret est refusé.
- **À la demande** : `npm run check:secrets` (fichiers suivis + tout l'historique de toutes les branches). `--tree` = rapide, fichiers seulement.
- **Dans GitHub (CI)** : le workflow « Sécurité » lance gitleaks (version fixée) ET ce script, sur chaque PR et chaque lundi. Une PR avec un secret est rouge.
- Faux positif (valeur d'exemple) : ajoute le chemin dans `.secretsignore`, avec un commentaire. Jamais un fichier qui contient un vrai secret.

## État vérifié (octobre 2026)
Le script a parcouru les fichiers suivis et tout l'historique de toutes les branches du dépôt : **aucun secret trouvé**. `start-dev.sh` n'a jamais été suivi par git (il est resté sur ton ordinateur), donc ce secret n'est pas dans le dépôt GitHub — mais il a pu être copié ailleurs (captures, discussions) : d'où la révocation.

## Faux positifs de gitleaks déjà examinés

Au premier passage, gitleaks signalait 6 « fuites » dans l'historique. Je les ai toutes regardées : **aucune n'est un vrai secret** (mot de passe de test, valeur d'exemple commentée dans `.env.example`, identifiants d'événements Crypto, clé de site hCaptcha qui est publique). Elles sont listées dans `.gitleaks.toml` pour que la CI reste rouge uniquement sur une vraie nouveauté. Si gitleaks s'arrête un jour : regarde d'abord le fichier et la ligne signalés ; ne l'ajoute à `.gitleaks.toml` que si tu es certain que ce n'est pas un secret.
