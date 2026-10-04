# Analyse du catalogue Immobilier : affaires rentables et non rentables

**Statut : analyse seulement (rien n'est modifié).** Produite le 4 octobre 2026 à partir du catalogue fictif actuel (après les règles de rénovation de la PR #127), 80 biens × 2 époques d'achat = 160 achats simulés avec le vrai moteur du jeu.

## Comment lire les chiffres
- **Scénario** : profil Cadre, apport minimal accepté par la banque (frais de notaire + 10 % du prix, plus 10 % des travaux annoncés), prêt sur 25 ans au taux de l'époque, bien mis en location au loyer de marché pendant **5 ans**, puis revente simulée. Événements aléatoires coupés (départs, retards, impayés, travaux imprévus) : c'est le scénario « sans incident ». La recherche de locataire reste aléatoire.
- **Brut** = loyer annuel ÷ prix. **Net** = (loyer annuel après vacance − charges) ÷ (prix + frais de notaire).
- **CF/mois** = flux de trésorerie mensuel moyen sur 5 ans, **mensualité du prêt comprise** (négatif = le joueur complète chaque mois avec ses pièces).
- **Résultat** = gain si tu revendais (valeur nette de revente + flux encaissés − argent mis), en **% de l'argent mis** (apport + frais de dossier + travaux). C'est plus parlant que « % du capital de départ » : −100 % veut dire que tu perds tout ce que tu as mis, −165 % que tu perds en plus de l'argent complété chaque mois.
- **Immédiat** = revente le jour de l'achat (bien non loué).
- Deux époques : **2010 → 2015** (prix plats ou en baisse, taux 3,75 %) et **2018 → 2023** (prix en hausse de 7 à 29 %, taux 1,75 % à l'achat).

## Contexte de marché du catalogue
| Ville | Type | Prix au m² 2010 → 2015 | Évolution | Prix au m² 2018 → 2023 | Évolution |
|---|---|---|---|---|---|
| Marvelle | métropole | 4200 → 4601 | +10 % | 5397 → 6623 | +23 % |
| Valcourt | grande ville | 2600 → 2415 | -7 % | 2637 → 3207 | +22 % |
| Portelune | grande ville | 3000 → 2990 | +0 % | 3227 → 4177 | +29 % |
| Saint-Aubrion | moyenne | 1700 → 1741 | +2 % | 1934 → 2208 | +14 % |
| Brumevalle | moyenne | 1100 → 994 | -10 % | 1110 → 1193 | +7 % |
| Roquemont | moyenne | 2100 → 2107 | +0 % | 2303 → 2639 | +15 % |
| Ternelle | petite | 900 → 889 | -1 % | 977 → 1134 | +16 % |
| Clairval | moyenne | 2000 → 1928 | -4 % | 2197 → 2602 | +18 % |

Taux d'un prêt de 25 ans : 3,75 % (2010), 2,15 % (2015), 1,75 % (2018), 4,15 % (2023).

## Synthèse par ville (résultat après 5 ans, médiane en % de l'argent mis ; nombre de biens gagnants sur 10)
| Ville | Brut moyen | 2010 → 2015 médiane | gagnants | 2018 → 2023 médiane | gagnants |
|---|---|---|---|---|---|
| Marvelle | 5.2 % | -79 % | 1 / 10 | +7 % | 6 / 10 |
| Valcourt | 5.8 % | -149 % | 0 / 10 | -9 % | 3 / 10 |
| Portelune | 5.8 % | -119 % | 0 / 10 | +41 % | 9 / 10 |
| Saint-Aubrion | 6.5 % | -110 % | 0 / 10 | -47 % | 1 / 10 |
| Brumevalle | 7.6 % | -165 % | 0 / 10 | -82 % | 0 / 10 |
| Roquemont | 7.4 % | -107 % | 0 / 10 | -14 % | 1 / 10 |
| Ternelle | 7.9 % | -137 % | 0 / 10 | -55 % | 0 / 10 |
| Clairval | 5.8 % | -139 % | 0 / 10 | -31 % | 1 / 10 |

## Synthèse par type de bien
| Bien | Nombre | Brut moyen | Net moyen | 2010 → 2015 médiane | gagnants | 2018 → 2023 médiane | gagnants |
|---|---|---|---|---|---|---|---|
| Studio | 16 | 6.7 % | 4.1 % | -122 % | 0 / 16 | -8 % | 5 / 16 |
| T2 | 16 | 6.1 % | 3.8 % | -131 % | 0 / 16 | -26 % | 4 / 16 |
| T3 | 8 | 6.6 % | 4.0 % | -130 % | 0 / 8 | -22 % | 2 / 8 |
| T2 à rénover | 8 | 6.6 % | 3.7 % | -122 % | 1 / 8 | -11 % | 3 / 8 |
| Maison T4 | 8 | 6.6 % | 4.6 % | -110 % | 0 / 8 | -20 % | 3 / 8 |
| Garage fermé | 8 | 5.4 % | 3.5 % | -139 % | 0 / 8 | -31 % | 1 / 8 |
| Box | 8 | 6.4 % | 3.9 % | -140 % | 0 / 8 | -35 % | 1 / 8 |
| Place de parking | 8 | 7.9 % | 4.9 % | -127 % | 0 / 8 | -22 % | 2 / 8 |

**Global** : 22 biens gagnants sur 160 après 5 ans (2010 : 1 sur 80 ; 2018 : 21 sur 80). Médiane immédiate : -89 %. Meilleur : +110 %, pire : -238 %.

## Horizon long (10 ans depuis 2010, 8 ans depuis 2018)
| Ville | 2010 → 2020 médiane | gagnants | 2018 → 2026 médiane | gagnants |
|---|---|---|---|---|
| Brumevalle | -67 % | 0 / 10 | -75 % | 0 / 10 |
| Clairval | -25 % | 2 / 10 | -22 % | 2 / 10 |
| Marvelle | +102 % | 10 / 10 | +36 % | 10 / 10 |
| Portelune | +26 % | 6 / 10 | +33 % | 9 / 10 |
| Roquemont | +26 % | 9 / 10 | +11 % | 7 / 10 |
| Saint-Aubrion | -4 % | 4 / 10 | -48 % | 1 / 10 |
| Ternelle | -50 % | 0 / 10 | -55 % | 0 / 10 |
| Valcourt | -68 % | 0 / 10 | +12 % | 7 / 10 |

**Global** : 31 / 80 gagnants à 10 ans depuis 2010 (médiane -12 %), 36 / 80 à 8 ans depuis 2018 (médiane -14 %).

## Lecture : le mélange est-il bon ?

**Ce qui est cohérent avec la vraie vie**
- Revendre le jour de l'achat fait perdre environ **90 % de l'apport minimal** (frais de notaire, d'agence, diagnostics, indemnité de remboursement anticipé : de l'ordre de 15 % du prix, soit presque tout l'apport quand il est minimal (17,5 % du prix)). C'est réaliste.
- Sur **5 ans**, presque personne ne gagne quand les prix sont plats (2010 → 2015 : **1 bien gagnant sur 80**), alors que 21 sur 80 gagnent en 2018 → 2023 (prix en hausse de 7 à 29 %). Dans la vraie vie aussi, un achat revendu après 5 ans dans un marché plat perd ses frais.
- Les villes dont les prix montent (Marvelle, Portelune, Roquemont, et Valcourt après 2018) récompensent la patience : à 10 ans depuis 2010, **Marvelle gagne 10 fois sur 10 (+102 % en médiane)**, Roquemont 9 sur 10, Portelune 6 sur 10.

**Ce qui paraît déséquilibré**
1. **Certaines villes ne gagnent jamais** : Brumevalle et Ternelle ne comptent aucun bien gagnant sur 10, dans les quatre horizons testés, alors que leur rendement brut est le plus élevé du catalogue (7,6 % et 7,9 %). Saint-Aubrion et Clairval gagnent rarement (au mieux 4 biens sur 10, et un seul à 5 ans).
2. **Cause principale : les charges pèsent trop dans les petites villes.** Un T2 paie à peu près le même montant de charges partout (1 200 à 1 700 InvestCoins par an : taxe foncière, copropriété, entretien, assurance de 135 fixes), alors que le loyer varie du simple au triple. Résultat : les charges représentent **17 à 21 % du loyer à Marvelle, Portelune et Roquemont, mais 37 à 42 % à Brumevalle et Ternelle** (24 à 31 % à Saint-Aubrion, Valcourt et Clairval). Le rendement **net** des petites villes (3,5 à 3,8 %) tombe donc sous le taux du prêt (3,75 % à 4,15 %) : l'effet de levier est négatif, le joueur complète chaque mois. Le « rendement brut » élevé est un piège, ce qui est pédagogique, mais « 0 gagnant sur 10, toujours » est trop dur.
3. **Valcourt (grande ville) perd à 10 ans depuis 2010** (0 sur 10) parce que ses prix baissent de 7 % de 2010 à 2015 avec des loyers qui stagnent (11 € du m² en 2010 et en 2015) ; c'est un choix de scénario (le catalogue joue des cycles de marché), pas un défaut de calcul. Il redevient gagnant après 2018 (7 sur 10 à 8 ans).
4. **Les parkings** ont un rendement net correct (place : 4,9 %) mais ne gagnent presque jamais à 5 ans : mêmes frais d'achat (notaire, dossier) rapportés à un petit capital.

**Pistes pour rééquilibrer (rien n'est codé, à décider)**
- **A. Charges proportionnelles au loyer** (taxe foncière et assurance indexées sur le niveau de la ville, au lieu de montants presque fixes) : un T2 de Brumevalle passerait de 37-42 % à environ 25 % de charges, soit un rendement net d'environ 4,8 % au lieu de 3,7 % (estimation arithmétique, non mesurée), au-dessus du taux du prêt de 2010. C'est la piste qui corrige le plus gros défaut.
- **B. Afficher le rendement net et le flux mensuel** dans la fiche d'un bien (le simulateur de la fiche montre déjà le coût du prêt) pour que le joueur voie le piège avant d'acheter.
- **C. Ne rien changer aux cycles de marché** (2010 → 2015 plat, 2018 → 2023 haussier) : ils donnent de vraies leçons. On peut seulement veiller à ce qu'au moins quelques biens de chaque ville soient gagnants sur un horizon de 10 ans.
- **D. Ne pas toucher aux frais de notaire, d'agence et à la décote d'un bien loué** : réalistes (la décote de 10 % reste à sourcer avant l'ouverture au public).

**Limites de cette analyse** : une seule graine de jeu par bien, scénario sans incident (sans impayé ni départ), profil Cadre avec apport minimal ; avec plus d'apport, l'effet de levier (et les pertes) seraient moindres. Les résultats après 5, 8 et 10 ans comptent la revente simulée avec la décote d'un bien loué.

## Tableau par bien
Prix en InvestCoins (1 pièce = 1 €). « — » : pas de résultat. Les deux époques achètent le même bien du catalogue (même surface), au prix et au loyer de l'époque.

| Ville | Bien (id) | m² | Prix 2010 | Brut | Net | CF/mois | Immédiat | **2010 → 2015** | 2010 → 2020 | Prix 2018 | Brut | CF/mois | **2018 → 2023** | 2018 → 2026 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Brumevalle | Studio (1) | 22 | 32 000 | 6.9 % | 3.7 % | -43 | -90 % | **-167 %** | -35 % | 32 000 | 7.5 % | -33 | **-57 %** | -48 % |
| Brumevalle | T2 (2) | 40 | 41 500 | 7.3 % | 3.5 % | -71 | -117 % | **-163 %** | -93 % | 41 500 | 7.8 % | -79 | **-112 %** | -101 % |
| Brumevalle | T3 (3) | 64 | 55 000 | 8.2 % | 3.8 % | -106 | -88 % | **-186 %** | -37 % | 55 500 | 8.7 % | -95 | **-77 %** | -42 % |
| Brumevalle | Maison T4 (4) | 106 | 119 000 | 7.1 % | 4.5 % | -225 | -127 % | **-171 %** | -94 % | 120 000 | 7.6 % | -141 | **-108 %** | -96 % |
| Brumevalle | T2 à rénover (5) | 41 | 34 000 | 8.0 % | 3.5 % | -82 | -113 % | **-161 %** | -180 % | 34 500 | 8.5 % | -92 | **-106 %** | -191 % |
| Brumevalle | Studio (6) | 18 | 23 500 | 7.4 % | 3.6 % | -31 | -95 % | **-136 %** | -67 % | 24 000 | 7.8 % | -36 | **-86 %** | -73 % |
| Brumevalle | T2 (7) | 34 | 39 000 | 7.5 % | 4.0 % | -47 | -94 % | **-131 %** | -63 % | 39 500 | 8.0 % | -53 | **-83 %** | -67 % |
| Brumevalle | Garage fermé (8) | 14 | 6 800 | 6.7 % | 3.6 % | -11 | -102 % | **-175 %** | -67 % | 6 800 | 7.2 % | -8 | **-78 %** | -78 % |
| Brumevalle | Box (9) | 12 | 4 400 | 8.2 % | 3.9 % | -8 | -108 % | **-179 %** | -81 % | 4 400 | 8.7 % | -4 | **-82 %** | -85 % |
| Brumevalle | Place de parking (10) | 12 | 5 000 | 8.9 % | 5.1 % | -4 | -106 % | **-152 %** | -43 % | 5 100 | 9.2 % | -4 | **-77 %** | -45 % |
| Clairval | Studio (1) | 22 | 51 000 | 5.0 % | 3.0 % | -104 | -92 % | **-161 %** | -25 % | 56 000 | 5.0 % | -100 | **-25 %** | -19 % |
| Clairval | T2 (2) | 45 | 97 500 | 4.9 % | 3.0 % | -188 | -87 % | **-156 %** | -25 % | 107 000 | 4.9 % | -192 | **-25 %** | -16 % |
| Clairval | T3 (3) | 61 | 97 000 | 7.3 % | 4.8 % | -107 | -87 % | **-129 %** | +33 % | 106 500 | 7.3 % | -83 | **+9 %** | +34 % |
| Clairval | Maison T4 (4) | 102 | 173 000 | 6.4 % | 4.5 % | -223 | -92 % | **-121 %** | -24 % | 190 000 | 6.3 % | -185 | **-39 %** | -26 % |
| Clairval | T2 à rénover (5) | 45 | 73 500 | 5.6 % | 3.2 % | -161 | -83 % | **-108 %** | -51 % | 81 000 | 5.5 % | -158 | **-55 %** | -52 % |
| Clairval | Studio (6) | 21 | 43 500 | 6.6 % | 4.3 % | -56 | -89 % | **-136 %** | +16 % | 47 500 | 6.7 % | -52 | **-5 %** | +20 % |
| Clairval | T2 (7) | 39 | 102 500 | 4.6 % | 3.0 % | -206 | -91 % | **-141 %** | -51 % | 112 500 | 4.6 % | -201 | **-47 %** | -44 % |
| Clairval | Garage fermé (8) | 15 | 13 500 | 4.9 % | 3.1 % | -25 | -95 % | **-155 %** | -40 % | 14 800 | 4.9 % | -24 | **-33 %** | -30 % |
| Clairval | Box (9) | 11 | 7 900 | 5.6 % | 3.3 % | -13 | -100 % | **-152 %** | -40 % | 8 600 | 5.7 % | -14 | **-42 %** | -31 % |
| Clairval | Place de parking (10) | 11 | 7 000 | 7.2 % | 4.5 % | -8 | -101 % | **-137 %** | -12 % | 7 700 | 7.2 % | -8 | **-30 %** | -13 % |
| Marvelle | Studio (1) | 22 | 80 000 | 6.0 % | 4.4 % | -100 | -90 % | **-78 %** | +79 % | 102 500 | 5.5 % | -123 | **-9 %** | +19 % |
| Marvelle | T2 (2) | 38 | 159 000 | 4.6 % | 3.4 % | -290 | -80 % | **-80 %** | +105 % | 204 500 | 4.2 % | -341 | **+16 %** | +42 % |
| Marvelle | T3 (3) | 59 | 177 000 | 5.0 % | 3.5 % | -334 | -85 % | **-87 %** | +99 % | 227 000 | 4.6 % | -390 | **+10 %** | +40 % |
| Marvelle | Maison T4 (4) | 87 | 371 500 | 4.5 % | 3.5 % | -635 | -71 % | **-68 %** | +118 % | 477 000 | 4.1 % | -789 | **+24 %** | +51 % |
| Marvelle | T2 à rénover (5) | 36 | 123 000 | 4.8 % | 3.4 % | -214 | +13 % | **+24 %** | +211 % | 158 000 | 4.4 % | -253 | **+110 %** | +149 % |
| Marvelle | Studio (6) | 17 | 68 500 | 6.2 % | 4.7 % | -75 | -90 % | **-74 %** | +88 % | 88 000 | 5.6 % | -94 | **-4 %** | +25 % |
| Marvelle | T2 (7) | 42 | 146 500 | 6.0 % | 4.5 % | -182 | -86 % | **-70 %** | +135 % | 188 000 | 5.5 % | -217 | **+18 %** | +53 % |
| Marvelle | Garage fermé (8) | 14 | 27 600 | 4.0 % | 3.0 % | -57 | -90 % | **-100 %** | +68 % | 35 500 | 3.6 % | -67 | **-12 %** | +6 % |
| Marvelle | Box (9) | 11 | 18 900 | 4.6 % | 3.4 % | -34 | -92 % | **-94 %** | +81 % | 24 300 | 4.2 % | -40 | **-8 %** | +14 % |
| Marvelle | Place de parking (10) | 12 | 16 100 | 5.9 % | 4.4 % | -21 | -93 % | **-80 %** | +107 % | 20 700 | 5.4 % | -25 | **+4 %** | +33 % |
| Portelune | Studio (1) | 22 | 76 500 | 5.1 % | 3.4 % | -126 | -82 % | **-117 %** | -6 % | 82 500 | 5.1 % | -123 | **+20 %** | +4 % |
| Portelune | T2 (2) | 44 | 155 000 | 4.7 % | 3.5 % | -310 | -81 % | **-159 %** | +41 % | 166 500 | 4.8 % | -272 | **+86 %** | +58 % |
| Portelune | T3 (3) | 59 | 129 000 | 5.6 % | 3.5 % | -267 | -98 % | **-132 %** | -40 % | 138 500 | 5.7 % | -208 | **-17 %** | -29 % |
| Portelune | Maison T4 (4) | 88 | 199 000 | 6.6 % | 4.9 % | -200 | -86 % | **-110 %** | +55 % | 214 500 | 6.8 % | -148 | **+65 %** | +53 % |
| Portelune | T2 à rénover (5) | 46 | 115 000 | 5.2 % | 3.4 % | -257 | -18 % | **-79 %** | +79 % | 123 500 | 5.3 % | -197 | **+97 %** | +88 % |
| Portelune | Studio (6) | 21 | 48 000 | 7.2 % | 4.4 % | -56 | -88 % | **-117 %** | +50 % | 52 000 | 7.2 % | -40 | **+58 %** | +54 % |
| Portelune | T2 (7) | 37 | 88 000 | 6.7 % | 4.6 % | -99 | -87 % | **-114 %** | +45 % | 94 500 | 6.8 % | -76 | **+60 %** | +48 % |
| Portelune | Garage fermé (8) | 14 | 15 700 | 5.0 % | 3.4 % | -28 | -93 % | **-139 %** | -10 % | 16 900 | 5.2 % | -27 | **+18 %** | +2 % |
| Portelune | Box (9) | 11 | 14 800 | 5.3 % | 3.8 % | -23 | -94 % | **-132 %** | -3 % | 15 900 | 5.4 % | -22 | **+24 %** | +8 % |
| Portelune | Place de parking (10) | 10 | 10 200 | 6.4 % | 4.4 % | -12 | -97 % | **-122 %** | +11 % | 11 000 | 6.4 % | -12 | **+24 %** | +18 % |
| Roquemont | Studio (1) | 23 | 62 000 | 6.9 % | 5.1 % | -54 | -88 % | **-103 %** | +28 % | 68 000 | 6.9 % | -44 | **-7 %** | +12 % |
| Roquemont | T2 (2) | 45 | 105 000 | 6.3 % | 4.5 % | -123 | -87 % | **-112 %** | +8 % | 115 500 | 6.3 % | -111 | **-15 %** | -1 % |
| Roquemont | T3 (3) | 65 | 141 500 | 6.8 % | 4.9 % | -137 | -87 % | **-105 %** | +24 % | 155 000 | 6.8 % | -117 | **-8 %** | +11 % |
| Roquemont | Maison T4 (4) | 107 | 212 000 | 7.3 % | 5.6 % | -147 | -86 % | **-96 %** | +46 % | 232 500 | 7.3 % | -127 | **-1 %** | +25 % |
| Roquemont | T2 à rénover (5) | 36 | 43 000 | 8.7 % | 5.7 % | -49 | -128 % | **-142 %** | +42 % | 47 000 | 8.7 % | -41 | **-14 %** | +18 % |
| Roquemont | Studio (6) | 22 | 41 000 | 8.2 % | 5.6 % | -24 | -89 % | **-95 %** | +48 % | 45 000 | 8.2 % | -14 | **+2 %** | +24 % |
| Roquemont | T2 (7) | 42 | 92 500 | 6.7 % | 4.8 % | -100 | -87 % | **-110 %** | +18 % | 101 500 | 6.7 % | -95 | **-15 %** | +7 % |
| Roquemont | Garage fermé (8) | 14 | 13 500 | 6.3 % | 4.6 % | -15 | -95 % | **-117 %** | -7 % | 14 800 | 6.3 % | -14 | **-29 %** | -16 % |
| Roquemont | Box (9) | 10 | 7 100 | 7.9 % | 5.4 % | -5 | -101 % | **-110 %** | +3 % | 7 800 | 7.8 % | -4 | **-29 %** | -11 % |
| Roquemont | Place de parking (10) | 11 | 7 400 | 9.2 % | 6.6 % | -1 | -101 % | **-93 %** | +37 % | 8 100 | 9.2 % | 0 | **-14 %** | +19 % |
| Saint-Aubrion | Studio (1) | 19 | 36 000 | 6.6 % | 4.0 % | -45 | -93 % | **-105 %** | -18 % | 41 000 | 6.5 % | -47 | **-54 %** | -55 % |
| Saint-Aubrion | T2 (2) | 39 | 65 000 | 7.1 % | 4.6 % | -69 | -88 % | **-100 %** | +49 % | 74 000 | 6.9 % | -77 | **-21 %** | -14 % |
| Saint-Aubrion | T3 (3) | 67 | 103 500 | 6.6 % | 4.1 % | -158 | -87 % | **-114 %** | +28 % | 118 000 | 6.4 % | -147 | **-27 %** | -22 % |
| Saint-Aubrion | Maison T4 (4) | 96 | 183 000 | 5.9 % | 4.2 % | -248 | -91 % | **-105 %** | -13 % | 208 000 | 5.8 % | -233 | **-51 %** | -52 % |
| Saint-Aubrion | T2 à rénover (5) | 38 | 54 500 | 6.5 % | 3.7 % | -95 | -51 % | **-77 %** | +65 % | 62 000 | 6.3 % | -108 | **+14 %** | +15 % |
| Saint-Aubrion | Studio (6) | 18 | 33 000 | 6.7 % | 4.0 % | -43 | -93 % | **-106 %** | -22 % | 37 500 | 6.6 % | -42 | **-54 %** | -52 % |
| Saint-Aubrion | T2 (7) | 34 | 58 500 | 5.9 % | 3.4 % | -113 | -93 % | **-117 %** | -38 % | 66 500 | 5.8 % | -108 | **-64 %** | -61 % |
| Saint-Aubrion | Garage fermé (8) | 14 | 12 600 | 5.2 % | 3.4 % | -21 | -95 % | **-124 %** | -8 % | 14 300 | 5.2 % | -21 | **-48 %** | -54 % |
| Saint-Aubrion | Box (9) | 11 | 8 600 | 6.1 % | 4.0 % | -12 | -99 % | **-119 %** | -1 % | 9 800 | 6.0 % | -12 | **-46 %** | -45 % |
| Saint-Aubrion | Place de parking (10) | 11 | 4 900 | 8.8 % | 5.1 % | -5 | -106 % | **-114 %** | +13 % | 5 600 | 8.6 % | -3 | **-42 %** | -33 % |
| Ternelle | Studio (1) | 17 | 17 500 | 7.8 % | 3.5 % | -33 | -93 % | **-146 %** | -25 % | 19 000 | 7.8 % | -21 | **-26 %** | -30 % |
| Ternelle | T2 (2) | 43 | 42 500 | 7.5 % | 3.9 % | -63 | -89 % | **-131 %** | -16 % | 46 500 | 7.4 % | -68 | **-29 %** | -23 % |
| Ternelle | T3 (3) | 56 | 45 000 | 7.6 % | 3.5 % | -101 | -194 % | **-238 %** | -141 % | 49 000 | 7.6 % | -126 | **-154 %** | -146 % |
| Ternelle | Maison T4 (4) | 94 | 77 000 | 8.1 % | 4.9 % | -104 | -95 % | **-111 %** | -51 % | 83 500 | 8.1 % | -53 | **-58 %** | -55 % |
| Ternelle | T2 à rénover (5) | 39 | 26 000 | 8.1 % | 3.1 % | -70 | -109 % | **-136 %** | -137 % | 28 000 | 8.2 % | -58 | **-78 %** | -138 % |
| Ternelle | Studio (6) | 21 | 20 500 | 8.0 % | 3.6 % | -26 | -92 % | **-127 %** | -6 % | 22 000 | 8.1 % | -22 | **-21 %** | -36 % |
| Ternelle | T2 (7) | 37 | 36 500 | 7.2 % | 3.5 % | -72 | -89 % | **-148 %** | -10 % | 40 000 | 7.2 % | -57 | **-28 %** | -43 % |
| Ternelle | Garage fermé (8) | 14 | 6 500 | 6.6 % | 3.6 % | -10 | -102 % | **-139 %** | -49 % | 7 100 | 6.6 % | -11 | **-53 %** | -55 % |
| Ternelle | Box (9) | 10 | 3 600 | 8.0 % | 3.7 % | -6 | -112 % | **-148 %** | -57 % | 3 900 | 8.0 % | -6 | **-71 %** | -68 % |
| Ternelle | Place de parking (10) | 11 | 2 700 | 10.2 % | 4.2 % | -2 | -117 % | **-133 %** | -52 % | 2 900 | 10.3 % | -2 | **-63 %** | -60 % |
| Valcourt | Studio (1) | 18 | 50 500 | 6.3 % | 4.4 % | -60 | -88 % | **-149 %** | -36 % | 51 000 | 6.6 % | -45 | **+17 %** | +50 % |
| Valcourt | T2 (2) | 46 | 140 500 | 4.8 % | 3.3 % | -250 | -90 % | **-149 %** | -82 % | 142 500 | 5.0 % | -214 | **-29 %** | -15 % |
| Valcourt | T3 (3) | 66 | 145 500 | 5.4 % | 3.5 % | -247 | -91 % | **-143 %** | -74 % | 147 500 | 5.6 % | -202 | **-33 %** | -18 % |
| Valcourt | Maison T4 (4) | 87 | 149 000 | 6.9 % | 5.0 % | -147 | -86 % | **-142 %** | -15 % | 151 000 | 7.3 % | -94 | **+30 %** | +66 % |
| Valcourt | T2 à rénover (5) | 41 | 65 500 | 6.0 % | 3.5 % | -155 | -90 % | **-177 %** | -66 % | 66 500 | 6.3 % | -142 | **-9 %** | +14 % |
| Valcourt | Studio (6) | 24 | 48 500 | 6.8 % | 4.4 % | -57 | -88 % | **-149 %** | -30 % | 49 000 | 7.2 % | -41 | **+18 %** | +50 % |
| Valcourt | T2 (7) | 39 | 86 000 | 5.6 % | 3.7 % | -146 | -91 % | **-143 %** | -71 % | 87 500 | 5.9 % | -118 | **-33 %** | -16 % |
| Valcourt | Garage fermé (8) | 14 | 16 400 | 4.8 % | 3.3 % | -32 | -93 % | **-173 %** | -82 % | 16 600 | 5.0 % | -26 | **-15 %** | +2 % |
| Valcourt | Box (9) | 12 | 14 400 | 5.2 % | 3.7 % | -23 | -94 % | **-163 %** | -70 % | 14 600 | 5.4 % | -19 | **-10 %** | +11 % |
| Valcourt | Place de parking (10) | 11 | 10 200 | 6.7 % | 4.7 % | -11 | -97 % | **-147 %** | -43 % | 10 300 | 7.1 % | -8 | **0 %** | +29 % |
