# Bourse et Crypto : frais et fiscalité

**Principe** : frais et impôts sont des *puits* d'InvestCoins. Les pièces payées sont détruites (nature « destruction » du registre), jamais redistribuées. La statistique admin `/economy/admin/coins-by-domain` renvoie maintenant aussi `sinks` : pièces détruites par domaine et par motif (`fee_brokerage`, `tax_capital_gains`, …).

Tous les paramètres sont dans `backend/src/config/tradingRules.ts`, avec leur source ou la mention « VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER ».

## Enveloppes
- **Bourse** : à l'achat on choisit **PEA** (par défaut) ou **compte-titres (CTO)**. Un même titre peut être détenu sur les deux ; à la vente il faut alors préciser l'enveloppe.
- **Crypto** : une seule enveloppe.
- Les positions d'avant cette évolution (sans enveloppe) sont traitées comme un compte-titres.

## Frais de courtage (achat et vente)
| Actif | Taux | Minimum | Statut |
|---|---|---|---|
| Action | 0,5 % | 1 🪙 | plafond légal PEA en ligne (loi Pacte) |
| ETF | 0,35 % | 1 🪙 | VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER |
| Crypto | 0,5 % | 1 🪙 | VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER (trading « pro » 0,1–0,26 %, interfaces simples plus cher) |

Arrondi toujours à l'entier supérieur (contre le joueur). Le courtage est inclus dans le classement (achats + frais, ventes nettes de frais et d'impôts).

## Impôt sur les plus-values (à la vente)
- **Compte-titres** : flat tax = 12,8 % d'impôt + prélèvements sociaux (PS).
- **PEA** : après 5 ans depuis le premier achat en PEA, **0 % d'impôt sur le revenu**, PS seulement ; avant 5 ans, flat tax. Plafond de versements 150 000 🪙.
- **Crypto** : flat tax sur chaque vente (toutes les ventes se font contre InvestCoins = euros). Les échanges crypto contre crypto n'existent pas dans le jeu. **Seuil de 305 🪙** de cessions sur l'année simulée : en dessous, aucun impôt.
- PS par année : 13,5 % (avant 2012, *non sourcé*), 15,5 % (2012-2017, *approx.*), 17,2 % (2018-2025), **18,6 % (2026, LFSS 2026)**.
- IR : 12,8 % depuis 2018 (titres) / 2022 (crypto) ; 19 % avant (simplification pour remplacer le barème progressif, *non sourcé*).

Sources : voir l'en-tête de `tradingRules.ts` (Ramify, impots-pratique, Waltio, sinvestir, Kraken).

## Simplifications assumées
- Pas de report des moins-values ; frais non déduits de la plus-value.
- Le PEA n'est jamais clôturé (un retrait avant 5 ans est taxé mais le plan reste ouvert) ; PS au taux de l'année de la vente.
- Crypto : les gains de ventes déjà faites sous le seuil ne sont pas rattrapés si le seuil est franchi ensuite.
- Vente forcée du prêt sur portefeuille : ni frais ni impôt.
- Taxe sur les transactions financières (achats d'actions françaises) non modélisée.
- Prix d'acquisition = prix moyen pondéré par titre et par enveloppe.

## API
- `POST /trading/quote {side, symbol, quantity, account?}` : aperçu (frais, impôt, explication) sans exécuter.
- `POST /trading/buy` et `/sell` acceptent `account` (`pea` | `cto`) ; réponses enrichies (`fee`, `tax`, `netProceeds`).
- `GET /trading/portfolio` : `costs` (frais et impôts payés, état du PEA, cessions crypto de l'année).
- Migration 026 : colonne `virtual_portfolios.tax_state`.
