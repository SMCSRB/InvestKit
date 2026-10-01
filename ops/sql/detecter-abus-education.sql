-- DÉTECTER les comptes qui ont profité de l'ancienne faille de l'éducation (pièces et XP obtenus avec des chapitres inventés).
-- LECTURE SEULE : ces requêtes ne modifient rien. À lancer avec :  psql "$DATABASE_URL" -f ops/sql/detecter-abus-education.sql
-- Les chapitres légitimes ci-dessous viennent de backend/src/data/educationCatalog.ts (un test vérifie qu'ils sont à jour).

-- A. Lignes d'avancement qui ne correspondent à AUCUN chapitre ni domaine existant, par compte (les plus gros en premier)
WITH valid(domain_id, chapter_id) AS (VALUES
    ('crypto', '1'),
    ('crypto', '2'),
    ('crypto', '3'),
    ('crypto', '4'),
    ('crypto', '5'),
    ('crypto', '6'),
    ('crypto', '7'),
    ('crypto', '8'),
    ('crypto', '9'),
    ('crypto', '10'),
    ('crypto_market', '1'),
    ('crypto_market', '2'),
    ('crypto_market', '3'),
    ('crypto_market', '4'),
    ('crypto_market', '5')
)
SELECT u.email, ep.user_id,
       COUNT(*)                        AS lignes_invalides,
       SUM(ep.coins_earned)            AS pieces_obtenues,
       SUM(LEAST(ep.xp_earned, 2000000000))::bigint AS xp_obtenu,
       COALESCE(b.balance, 0)          AS solde_actuel
FROM education_progress ep
JOIN users u ON u.id = ep.user_id
LEFT JOIN investcoins_balance b ON b.user_id = ep.user_id
WHERE NOT EXISTS (
        SELECT 1 FROM valid v
        WHERE v.domain_id = ep.domain_id
          AND (v.chapter_id = ep.chapter_id OR ep.chapter_id = '__domain_complete__'))
  AND (ep.coins_earned > 0 OR ep.xp_earned > 0)
GROUP BY u.email, ep.user_id, b.balance
ORDER BY pieces_obtenues DESC;

-- B. Filet de sécurité par le registre des pièces : plus de récompenses « chapitre » que de chapitres qui existent (15),
--    ou plus de récompenses « domaine » que de domaines (2). Repère aussi les lignes d'avancement supprimées à la main.
SELECT u.email, t.user_id,
       COUNT(*) FILTER (WHERE t.reason = 'quiz_chapter')         AS recompenses_chapitre,
       COUNT(*) FILTER (WHERE t.reason = 'quiz_domain_complete') AS recompenses_domaine,
       SUM(t.amount)                                             AS pieces_total
FROM investcoins_transactions t
JOIN users u ON u.id = t.user_id
WHERE t.reason IN ('quiz_chapter', 'quiz_domain_complete')
GROUP BY u.email, t.user_id
HAVING COUNT(*) FILTER (WHERE t.reason = 'quiz_chapter') > 15
    OR COUNT(*) FILTER (WHERE t.reason = 'quiz_domain_complete') > 2
ORDER BY pieces_total DESC;

-- C. Ordre de grandeur : pièces créées par l'éducation au total (à comparer à ce que les joueurs honnêtes peuvent gagner :
--    15 chapitres x 20 + 2 domaines x 100 = 500 pièces par joueur au maximum)
SELECT reason, COUNT(*) AS ecritures, SUM(amount) AS pieces
FROM investcoins_transactions WHERE reason IN ('quiz_chapter', 'quiz_domain_complete') GROUP BY reason;
