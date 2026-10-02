-- Détecter une éventuelle exploitation de l'ancienne faille « save-preferences » (LECTURE SEULE : aucune modification).
-- Lancer :  psql "$DATABASE_URL" -f ops/sql/detecter-session-sans-preuve.sql

\echo '--- A. Comptes JAMAIS vérifiés qui ont pourtant un pseudo (impossible dans le parcours normal : très suspect)'
SELECT id, email, username, created_at, updated_at FROM users WHERE verified = FALSE AND username IS NOT NULL ORDER BY created_at DESC;

\echo '--- B. Comptes jamais vérifiés qui ont des traces d''activité (journal d''audit)'
SELECT u.id, u.email, COUNT(*) AS actions, MIN(a.created_at) AS premiere, MAX(a.created_at) AS derniere
FROM users u JOIN audit_logs a ON a.user_id = u.id
WHERE u.verified = FALSE GROUP BY u.id, u.email ORDER BY actions DESC;

\echo '--- C. Comptes utilisés depuis 3 adresses IP différentes ou plus le même jour (à examiner avec le propriétaire du compte)'
SELECT u.id, u.email, a.created_at::date AS jour, COUNT(DISTINCT a.ip_address) AS adresses_ip
FROM audit_logs a JOIN users u ON u.id = a.user_id
WHERE a.ip_address IS NOT NULL
GROUP BY u.id, u.email, a.created_at::date HAVING COUNT(DISTINCT a.ip_address) >= 3
ORDER BY jour DESC, adresses_ip DESC;

\echo '--- D. Pseudos modifiés sans trace de vérification récente : comptes dont le pseudo existe mais dont l''e-mail a été vérifié il y a plus de 7 jours ET modifiés depuis (indice faible)'
SELECT id, email, username, created_at, updated_at FROM users
WHERE verified = TRUE AND username IS NOT NULL AND updated_at > created_at + INTERVAL '7 days' ORDER BY updated_at DESC LIMIT 100;
