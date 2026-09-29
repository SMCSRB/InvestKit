# Immobilier — étape 6 : revente, impôt, vente forcée, classement

Tout est calculé côté serveur (`backend/src/engine/immo/sale.ts`, `capitalGains.ts`, `services/realEstateSaleService.ts`).
Les sources officielles sont inaccessibles depuis l'environnement de développement : les valeurs sont recoupées
par recherche web et marquées « à reconfirmer » sur legifrance / service-public / impots.gouv.

## Plus-value immobilière (résidence non principale)
- Impôt sur le revenu 19 % ; prélèvements sociaux 17,2 % (taux 2026 des revenus du patrimoine, à reconfirmer).
- Abattement IR : 0 % jusqu'à 5 ans, 6 %/an de la 6e à la 21e année, exonération à 22 ans.
- Abattement prélèvements sociaux : 1,65 %/an de la 6e à la 21e année, 28 % la 22e, puis 9 %/an, exonération à 30 ans.
- Prix d'acquisition majoré : frais de notaire réels (ou forfait 7,5 %) et travaux réels (ou forfait 15 % après 5 ans).
- Surtaxe sur les plus-values nettes > 50 000 € : lissage reconstitué — **à reconfirmer** (test de continuité).
## Frais de vente
Agence 5,78 %, diagnostics 300 €, indemnité de remboursement anticipé = min(6 mois d'intérêts, 3 % du capital restant).
Audit énergétique à la vente : **maisons et immeubles entiers seulement** (pas les appartements en copropriété) ;
classes F/G depuis le 1er avril 2023, E depuis le 1er janvier 2025, D à partir de 2034. Coût de jeu : 800 € (paramètre non sourcé).
Location interdite : G depuis 2025, F 2028, E 2034.
## Difficultés de paiement
Alerte à 3 mois de retard → **vente à l'amiable rapide (décote 12 %) proposée d'abord** → après 2 mois de grâce,
vente forcée (décote 25 % + frais de procédure). La réalité est bien plus longue (souvent plus d'un an) ;
le jeu la raccourcit et le dit au joueur. Les arriérés sont payés en premier par le produit de la vente, le reste devient une dette.
## Classement
Performance = (fonds propres + flux encaissés − argent investi) / argent investi.
Statistique admin : `GET /economy/admin/coins-by-domain`, script `npm run coins-stats`.
## Paramètres de jeu non sourcés
Audit 800 €, décote logement occupé 10 %, rénovation 450 €/m², échelle des frais de procédure.
## Calibration du cash-flow
Les loyers ne sont jamais gonflés. Leviers dans `CATALOG_CALIBRATION` (échelle de prix par ville, échelle des charges non récupérables).
Résultats de simulation présentés à l'utilisateur ; choix en attente.

## Annonces « ventes pressées » (calage précis du catalogue)
Pour qu'il existe dans chaque ville au moins 2–3 annonces proches de l'équilibre (cash-flow attendu après impôt ≥ −30 €/mois,
30 % d'apport, sans aléas), 13 annonces précises sont vendues sous le prix du marché (facteur 0,68 à 0,92, titre « (vente pressée) »)
— `CATALOG_CALIBRATION.urgentSaleFactor`. Loyers, charges et règles globales inchangés. Valeur de jeu, non sourcée, à reconfirmer.
Limite connue : à Marvelle (métropole), l'équilibre n'est tenu qu'avec les taux/prix des premières années ; en 2026 (taux élevés) les
annonces les plus proches restent vers −50 à −130 €/mois.

## Rappel : à reconfirmer
Coefficients de lissage de la surtaxe (1/20, 1/10, 15/100, 20/100, 25/100) : reconstitués, NON vérifiés sur le texte officiel.
