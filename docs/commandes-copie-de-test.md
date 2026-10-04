# Commandes de la copie de test (base `investkit_design_test`, ports 3001/5001)

Même format sûr pour les trois : un sous-shell qui lit `DATABASE_URL` dans `~/start-test-api.sh` (sans l'afficher), annonce « Base visee : … » et **refuse toute base dont le nom ne finit pas par `_test`**.

```
# 1) Créer un code d'invitation (1 utilisation, 30 jours)
( cd ~/InvestKit-design/backend && export DATABASE_URL="$(sed -nE 's/^(export )?DATABASE_URL=//p' ~/start-test-api.sh | tail -1 | tr -d "\"'")" && N="${DATABASE_URL##*/}" && N="${N%%\?*}" && echo "Base visee : $N" && case "$N" in ?*_test) npm run invite -- create --uses 1 --days 30 --note "test local" ;; *) echo "REFUSE : la base ne finit pas par _test" ;; esac )

# 2) Donner le statut Pro à un compte (pseudo ou e-mail)
( cd ~/InvestKit-design/backend && export DATABASE_URL="$(sed -nE 's/^(export )?DATABASE_URL=//p' ~/start-test-api.sh | tail -1 | tr -d "\"'")" && N="${DATABASE_URL##*/}" && N="${N%%\?*}" && echo "Base visee : $N" && case "$N" in ?*_test) npm run set-pro -- PSEUDO on ;; *) echo "REFUSE : la base ne finit pas par _test" ;; esac )

# 3) Donner des InvestCoins de test à un compte (pseudo ou e-mail)
( cd ~/InvestKit-design/backend && export DATABASE_URL="$(sed -nE 's/^(export )?DATABASE_URL=//p' ~/start-test-api.sh | tail -1 | tr -d "\"'")" && N="${DATABASE_URL##*/}" && N="${N%%\?*}" && echo "Base visee : $N" && case "$N" in ?*_test) npm run test:give-coins -- --user PSEUDO --amount 50000 ;; *) echo "REFUSE : la base ne finit pas par _test" ;; esac )
```
Remplace `PSEUDO`. `set-pro off` retire le statut Pro. Le pseudo est accepté par `set-pro` depuis la correction qui l'accompagne ; avant, utilise l'e-mail.

## hCaptcha en test local (sans toucher au vrai site)
hCaptcha publie des clés **de test publiques**, qui valident toujours (un bandeau « test » s'affiche). À mettre **uniquement** dans la configuration de la copie de test :
- API (`~/start-test-api.sh`) : `HCAPTCHA_SECRET_KEY=0x0000000000000000000000000000000000000000`
- Site de test : `NEXT_PUBLIC_HCAPTCHA_SITEKEY=10000000-ffff-ffff-ffff-000000000001`, puis reconstruire le site de test (la clé est fixée à la compilation).
Le vrai site garde ses vraies clés ; le code de vérification du captcha n'est pas modifié.

## Vérification par e-mail en test local
Avec `EMAIL_PROVIDER` absent ou `ethereal`, aucun vrai e-mail n'est envoyé. Deux façons de récupérer le code à 6 chiffres après l'inscription :
- `grep -i "preview" ~/api-test.log | tail -1` : adresse de l'aperçu du message (si le service Ethereal est joignable depuis le serveur).
- Sinon, dans le même sous-shell sûr : remplacer la commande par `psql "$DATABASE_URL" -tAc "SELECT verification_code FROM users WHERE LOWER(email)=LOWER('ton@mail')"`. Le code n'expire qu'après un court délai : le lire juste après l'inscription.
