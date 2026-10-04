# Tous les paramètres « à reconfirmer » — valeur, fichier, source officielle à consulter

**À quoi sert ce tableau** : avant d'ouvrir le site au public, chaque chiffre fiscal, taux, seuil ou règle de jeu ci-dessous doit être vérifié sur sa source officielle (ou assumé comme « choix de jeu »). Un paramètre se change à un seul endroit (le fichier indiqué) ; aucune règle n'est cachée dans l'interface.

**Légende de la colonne État**
- **SOURCÉ** : une source a été consultée (septembre 2026) mais pas sur le texte officiel lui-même → à reconfirmer.
- **EXTRAPOLÉ** : déduit de quelques valeurs sourcées.
- **JEU** : valeur de jeu inventée pour l'équilibrage (« VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER ») : il n'y a pas de source officielle, il faut **décider** si on la garde.
- **DÉCISION** : décision produit (fait foi, pas de source externe).

**Avertissement honnête** : les références de textes de loi ci-dessous sont des **pistes de recherche** à vérifier sur Légifrance / service-public.gouv.fr ; les sites officiels n'étaient pas consultables depuis le serveur de développement. Aucune de ces valeurs n'a été validée par un professionnel.

Sites officiels utiles : [impots.gouv.fr](https://www.impots.gouv.fr) · [BOFiP](https://bofip.impots.gouv.fr) · [Légifrance](https://www.legifrance.gouv.fr) · [service-public.gouv.fr](https://www.service-public.gouv.fr) · [URSSAF](https://www.urssaf.fr) · [Banque de France](https://www.banque-france.fr) · [HCSF](https://www.economie.gouv.fr/hcsf) · [AMF](https://www.amf-france.org) · [notaires.fr](https://www.notaires.fr) · [ANIL](https://www.anil.org) · [Autorité de la concurrence](https://www.autoritedelaconcurrence.fr) · [ecologie.gouv.fr (DPE)](https://www.ecologie.gouv.fr) · [CNIL](https://www.cnil.fr) · [OWASP](https://owasp.org) · [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html).

---
## A. Fiscalité et frais — Bourse, PEA, Crypto (`backend/src/config/tradingRules.ts`)
| Paramètre | Valeur actuelle | État | Source officielle à consulter |
|---|---|---|---|
| Prélèvements sociaux sur plus-values de valeurs mobilières | 18,6 % depuis 2026 ; 17,2 % de 2018 à 2025 ; 15,5 % 2012-2017 ; 13,5 % avant | SOURCÉ (2018+), JEU (avant) | service-public.gouv.fr « Prélèvements sociaux » ; Code de la sécurité sociale art. L136-7 ; loi de financement de la sécurité sociale 2026. **À arbitrer** : les simulateurs (design) et les revenus fonciers utilisent 17,2 %, la Bourse 18,6 % |
| Impôt sur le revenu des plus-values (PFU) | 12,8 % (titres : 2018+, crypto : 2022+) ; 19 % avant | SOURCÉ / JEU (avant 2018) | impots.gouv.fr « Prélèvement forfaitaire unique » ; CGI art. 200 A |
| PEA : exonération d'impôt après | 5 ans | SOURCÉ | Code monétaire et financier art. L221-30 et suivants ; CGI art. 157 |
| PEA : plafond de versements | 150 000 € | SOURCÉ | idem (CMF L221-30) |
| Crypto : seuil annuel de cessions sans impôt | 305 € (total des cessions de l'année) | SOURCÉ | CGI art. 150 VH bis ; BOFiP « BOI-RPPM-PVBMC-30 » |
| Crypto : échanges crypto contre crypto non imposés | oui (impôt à la sortie vers l'euro) | SOURCÉ | idem 150 VH bis |
| Courtage actions | 0,5 % (minimum 1 🪙), à l'achat et à la vente | SOURCÉ pour le PEA en ligne seulement (décret n° 2020-95) ; **JEU pour le compte-titres** (même taux par simplification) | loi PACTE (2019) ; décret 2020-95 ; tarifs publics des courtiers ; AMF |
| Courtage ETF | 0,35 % (minimum 1 🪙) | JEU | grilles tarifaires de courtiers en ligne |
| Courtage crypto | 0,5 % (minimum 1 🪙) | JEU | grilles tarifaires des plateformes (Kraken, Binance, Coinbase…) |

## B. Banque (`backend/src/config/bankRules.ts`)
| Paramètre | Valeur actuelle | État | Source officielle à consulter |
|---|---|---|---|
| Taux de base par année (2010 → 2026) | de 0 % à 3,9 % (courbe fictive calée sur l'Euribor 12 mois) | JEU | Banque de France (séries de taux), EMMI/Euribor |
| Écart prêt personnel / prêt sur portefeuille | +4,5 / +2,0 points | JEU | offres publiques de banques ; Banque de France |
| Taux d'usure | non activé | — | Banque de France (taux d'usure trimestriels) |
| Prêt personnel : plafond, durées, minimum | 6 mois de revenus nets ; 6 à 60 mois ; 25 🪙 ; 1 prêt actif | JEU | — (choix de jeu à valider) |
| Remboursement anticipé (conso) | 1 % du capital remboursé si > 1 an restant, sinon 0,5 % | JEU (« de mémoire ») | Code de la consommation art. L312-34 (à vérifier) |
| Prêt sur portefeuille : plafond / appel / liquidation | actions et ETF 50 / 65 / 80 % ; obligations 70 / 91 / 100 % ; crypto 30 / 39 / 48 % (bourse) et 30 / 65 / 80 % (module crypto) | DÉCISION + JEU | pratiques de prêts lombards (banques privées) ; pas de texte officiel |
| Décote d'une vente forcée | 3 % | JEU | — |
| Limites de dette | 3 prêts actifs ; 500 000 🪙 de dette (`config/economy.ts`) ; 3 échéances impayées = défaut | JEU | — |
| Rétablissement après défaut | capital de base = capital de départ (10 000 🪙, `config/economy.ts`) ; 30 jours d'interdiction ; 30 jours entre deux procédures ; 3 au maximum | JEU | inspiré de la procédure de rétablissement personnel (Code de la consommation L711-1 et suivants) |

## C. Immobilier — règles bancaires, frais, loyers (`backend/src/config/immoRules.ts`)
| Paramètre | Valeur actuelle | État | Source officielle à consulter |
|---|---|---|---|
| Taux d'endettement maximal | 35 % (assurance comprise) | SOURCÉ (source secondaire ; texte officiel à relire) | HCSF, décision D-HCSF-2021-7 du 29/09/2021, applicable depuis le 01/01/2022 ; economie.gouv.fr / hcsf.fr (non consultés ici : accès bloqué) |
| Durée maximale du prêt | 25 ans ; 27 ans avec gros travaux (≥ 10 % du prêt dans le code) | SOURCÉ pour 25/27 ans ; le seuil de travaux à reconfirmer | HCSF (même décision) |
| Loyers retenus par la banque | 70 % | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** | courtiers (pas de texte officiel) |
| Reste à vivre minimal | étudiant 500 ; salarié 1 200 ; cadre 1 800 InvestCoins par mois | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** | pratique bancaire (aucun seuil officiel) |
| Avertissement d'épargne : pièces propres uniquement | Ne comptent PAS comme épargne : le capital restant dû d'un prêt personnel non remboursé (et les pièces d'un prêt sur portefeuille fléché). Règle prudente : on retire le capital dû même si les pièces ont été dépensées. | DÉCISION produit (Andreja) | `ownCoins` dans `bankService.ts` |
| Crédit fléché : prêt personnel | NON affecté : pièces libres, dépensables partout (décision d'Andreja, comme un vrai prêt personnel). Le prêt immobilier reste attaché au bien (il ne crée aucune pièce). Le prêt sur portefeuille reste fléché vers son domaine. | DÉCISION produit | `bankPersonalService.ts` (`earmark: false`) |
| Apport minimal | frais de notaire (100 %, pratique bancaire non sourcée) + **10 % du prix** | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** (les 10 % et l'apport des frais de notaire) ; DÉCISION produit | pratique bancaire (aucun texte officiel) |
| Avertissement d'épargne restante (NON bloquant) | « Après cet achat, il te restera X pièces, soit Y mensualités. Moins de 3 mensualités expose à un impayé. » Seuil : **3 mensualités** (`BANK_RULES.lowSavingsWarningMonths`). **La réserve de 4 mensualités qui refusait un achat est SUPPRIMÉE** : aucune règle française officielle ne l'impose. | VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER | repère de prudence du jeu |
| Seuil de classement (tous domaines) | 2 500 InvestCoins investis ET 5 jours actifs | JEU, NON SOURCÉE, À RECONFIRMER | `config/economy.ts` |
| Décote d'un bien loué à la revente (classement Immobilier) | 10 % | JEU, NON SOURCÉE, À RECONFIRMER | `SALE_PARAMS.occupiedDiscountPct` |
| Biens « à rénover » : plafond des travaux annoncés | 35 % de la valeur du bien rénové | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** | `RENOVATION_BUDGET_CAPS.advertisedPctOfRenovatedValue` |
| Biens « à rénover » : plafond des travaux réels (défauts cachés compris) | 55 % de la valeur du bien rénové ; jamais moins que les travaux annoncés | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** | `RENOVATION_BUDGET_CAPS.realPctOfRenovatedValue` |
| Biens « à rénover » sans expertise : valeur selon les travaux payés | valeur « non rénové » + (valeur rénovée − valeur « non rénové ») × part des travaux payés ; une fois tout payé, le bien est rénové | RÈGLE DE JEU (décision d'Andreja), pas un chiffre sourcé | `valueOfProperty` (`realEstateHelpers.ts`) |
| XP : courbe des 25 niveaux et titres (Curieux … Maître) | 0, 100, 250, 450, 700, 1000, … 38 600 XP cumulés | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** | `LEVEL_THRESHOLDS`, `LEVEL_TITLES` (`levelRules.ts`) |
| Badges : XP par rareté (commun 20, rare 50, épique 100, légendaire 250) et seuils des badges (5/10 chapitres, 5/30/100 jours actifs, niveaux 5 et 9) | voir `badgeRules.ts` | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** | `BADGES`, `XP_BY_RARITY` (`badgeRules.ts`) |
| XP : plafond quotidien des leçons et des mini-questions | 300 et 100 XP par jour (jour UTC) | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** | `XP_DAILY_CAPS` (`levelRules.ts`) |
| Parking : prix au m² | 40 % de celui d'un appartement du quartier (±20 % selon garage, box ou place) | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** | `PARKING_RULES.priceFactor` |
| Parking : loyer au m² | 34 % de celui d'un appartement (rendement brut visé 5 à 9 %) | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** | `PARKING_RULES.rentFactor` |
| Parking : tension locative | +0,12 (demande de stationnement forte, vacance plus faible) | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** | `PARKING_RULES.tensionBoost` |
| Parking : charges | 35 % de celles d'un logement de même surface | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** | `PARKING_RULES.chargesScale` |
| Parking : durée moyenne d'un bail | 48 mois | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** | `TENANCY_MONTHS.parking` |
| Parking : règles du bail (préavis, pas de trêve hivernale, pas d'assurance loyers impayés « habitation ») | Non codées : le parking suit les mêmes mécanismes que les logements, sans DPE | **À SOURCER avant l'ouverture au public** | — |
| Frais de dossier d'un très petit emprunt | Plafonnés à 25 % du capital emprunté (le minimum de 200 € reste pour les emprunts normaux) | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** | `loanApplicationFee` |
| Assurance emprunteur | 0,36 % du capital par an | JEU | comparateurs publics ; CCSF |
| Frais de dossier | max(200 €, 0,2 % du capital) | JEU | tarifs bancaires |
| Expertise avant achat | 300 € + 0,15 % du prix | JEU | — |
| Profils de départ (revenus / dépenses) | étudiant 900 / 300 ; salarié 2 400 / 900 ; cadre 4 500 / 1 500 € par mois | JEU | INSEE (ordres de grandeur) |
| Frais de notaire | ancien 7,5 % ; neuf 2,5 % | SOURCÉ (milieu de fourchette) | notaires.fr ; impots.gouv.fr (droits de mutation) |
| Conversion | 1 🪙 = 20 € en Immobilier ; 1 🪙 = 1 $ en Crypto | DÉCISION | — |
| Facteurs de loyer (état, énergie, petites surfaces), vacance 0,5 à 5 mois, durée des baux 24/36/48 mois | voir fichier | JEU | observatoires de loyers (OLAP, ANIL) |
| Événements aléatoires (retards, impayés, dégradations, travaux imprévus) | probabilités du fichier | JEU | — |
| Préavis du locataire 3 mois (1 mois en zone tendue), dépôt de garantie 1 mois, bail de 3 ans, congé du propriétaire 6 mois avant l'échéance | idem | SOURCÉ | loi du 6 juillet 1989 (art. 10, 15, 22) — Légifrance, service-public.gouv.fr |
| Barème de l'impôt sur le revenu 2026 (tranches 11/30/41/45 %) et tranche par profil | 11 % étudiant et salarié ; 30 % cadre | SOURCÉ | impots.gouv.fr (barème) ; CGI art. 197 |
| Prélèvements sociaux sur revenus fonciers | 17,2 % | SOURCÉ | URSSAF ; impots.gouv.fr |
| Plus-value immobilière : IR 19 % + prélèvements sociaux 17,2 % | idem | SOURCÉ | CGI art. 150 U et suivants ; service-public.gouv.fr |
| Abattements pour durée de détention (IR et prélèvements sociaux) ; exonération à 22 / 30 ans | barèmes dans `engine/immo/sale.ts` | SOURCÉ | CGI art. 150 VC |
| Forfaits : frais d'acquisition 7,5 % ; travaux 15 % après 5 ans | idem | SOURCÉ | CGI art. 150 VB |
| Surtaxe sur plus-values > 50 000 € | paliers 2 à 6 % | SOURCÉ | CGI art. 1609 nonies G |
| Frais d'agence (vendeur) | 5,78 % | SOURCÉ | Autorité de la concurrence ; DGCCRF |
| Diagnostics obligatoires à la vente | 300 € | SOURCÉ (diagnostiqueurs) | fédérations de diagnostiqueurs |
| Audit énergétique à la vente (classes E, F, G) | 800 € | JEU | ecologie.gouv.fr ; Code de la construction art. L126-28-1 |
| Bien vendu occupé : décote | 10 % | JEU | — |
| Vente à l'amiable après impayés / vente forcée | −12 % / −25 % ; 3 mois d'impayés ; 2 mois de délai | SOURCÉ (adjudications 10-30 %) + JEU | statistiques des ventes aux enchères judiciaires |
| Frais de poursuite (vente forcée) | 6 % du prix, 4 000 à 15 000 € | JEU | — |
| Rénovation énergétique | 450 € par m² ; +2 classes, plafonnées à C | JEU | ADEME ; MaPrimeRénov' |
| Ventes pressées (facteur de prix par annonce) | 0,68 à 0,93 | JEU | — |
| Assurance loyers impayés (GLI) | 3 % du loyer ; carence 3 mois ; indemnisation dès 2 mois d'impayés ; plafond 70 000 € ; étudiants refusés | SOURCÉ (courtiers) / JEU (étudiants) | contrats d'assureurs ; ANIL |
| Trêve hivernale | 1er novembre → 31 mars | SOURCÉ | Code des procédures civiles d'exécution art. L412-6 ; service-public.gouv.fr |
| Valeur verte (effet du DPE sur les prix) | appartement G −12 % ; maison G −25 %, A +17 % ; autres classes extrapolées | SOURCÉ + EXTRAPOLÉ | Notaires de France / Notaires-INSEE |
| Interdictions de location selon le DPE (calendrier) | voir moteur de rénovation | SOURCÉ | loi Climat et Résilience (2021) ; ecologie.gouv.fr |
| Catalogue de villes, prix et loyers | entièrement fictif | JEU | remplacé plus tard par la base DVF (data.gouv.fr) |

## D. Crypto — marché simulé (`backend/src/config/cryptoMarketRules.ts`, `backend/src/data/crypto/`)
| Paramètre | Valeur actuelle | État | Source officielle à consulter |
|---|---|---|---|
| Frais de plateforme par palier de liquidité | 0,10 / 0,20 / 0,35 / 0,60 % (ordre limite en attente : moitié) | JEU | tarifs publics des plateformes |
| Écart achat/vente par palier | 0,02 / 0,05 / 0,20 / 0,80 % | JEU | idem |
| Glissement | 0,10 × √(montant ÷ volume quotidien), plafonné à 5 % | JEU | modèle usuel de microstructure (pas de source officielle) |
| Paliers de volume | 500 M$ / 50 M$ / 5 M$ / moins | JEU | CoinGecko, CoinMarketCap |
| Ordre minimal, ordres ouverts, actif sans cotation | 10 🪙 ; 20 ; 7 jours | JEU | — |
| Événements aléatoires | panne 0,6 % par jour ; volatilité extrême 1,2 % par jour (×3) | JEU | — |
| Dates de lancement des actifs, chronologies de faillites | ordres de grandeur | JEU | CoinGecko / CoinMarketCap ; presse financière |
| Cours réels | aucun importé tant que `npm run crypto:import` n'est pas lancé | — | CoinGecko (conditions d'utilisation de l'API) |

## E. Analyse de risque (`backend/src/config/riskRules.ts`)
| Paramètre | Valeur actuelle | État | Source officielle à consulter |
|---|---|---|---|
| Volatilité annuelle par classe | actions FR 20 % ; monde 16 % ; obligations 6 % ; crypto 70 % ; immobilier 7 % ; liquidités 0,5 % | JEU | MSCI, S&P Dow Jones Indices, Euronext (CAC 40), notaires-INSEE |
| Corrélations entre classes | de 0 à 0,9 | JEU | idem |
| Poids du score de risque | volatilité 25, chute 25, concentration 15, crypto 10, levier 15, horizon 10 % | JEU | — |
| Chutes historiques par crise | S&P −49 / −57 / −34 / −25 % ; CAC −62 / −58 % ; Bitcoin −84 / −77 % ; logement −3 à −4 % | SOURCÉ (ordres de grandeur) | indices officiels ; Notaires-INSEE |
| Chutes marquées « estimé » | voir fichier | EXTRAPOLÉ | — |

## F. Économie du jeu (`backend/src/config/game.ts`, services)
| Paramètre | Valeur actuelle | État | Source |
|---|---|---|---|
| Capital de départ | 10 000 🪙 (`config/economy.ts`) | DÉCISION | — |
| Capital Pro | ×2 (complément de 10 000 🪙, une seule fois) | DÉCISION | — |
| Seuil d'entrée au classement (tous les domaines) | 2 500 🪙 investis dans le domaine ET 5 jours actifs (`RANKING_MIN_INVESTED`, `RANKING_MIN_ACTIVE_DAYS`, `config/economy.ts`) | DÉCISION | — |
| Capital minimal pour apparaître au classement | 100 🪙 ; 20 places | JEU | — |
| Récompense quotidienne | 10 🪙 fixes, 3 jours payés au maximum par semaine (lundi → dimanche, UTC), aucune série (`DAILY_REWARD_*`, `config/economy.ts`) | JEU | — |
| Chapitre / domaine d'éducation | 20 🪙 et 100 XP / 100 🪙 et 500 XP | JEU | — |
| Étape de la checklist d'accueil | 10 🪙 | JEU | — |
| Prix du plan Pro | 7,99 € par mois ; 79 € par an | DÉCISION | — |

## G. Sécurité (`backend/src/config/securityRules.ts`, `backend/src/middleware/rateLimiter.ts`)
| Paramètre | Valeur actuelle | État | Source officielle à consulter |
|---|---|---|---|
| Verrouillage de compte | 8 échecs en 15 min ; 15 min puis doublé jusqu'à 4 h ; 2FA : 5 échecs | JEU | OWASP « Authentication Cheat Sheet » ; ANSSI |
| Mot de passe | 8 à 128 caractères, majuscule + minuscule + chiffre, liste de mots courants | JEU | NIST SP 800-63B ; CNIL (recommandation sur les mots de passe) |
| Limites de requêtes | API 300 / 15 min ; connexion et inscription 5 / 15 min ; outils 40 / 15 min ; retours 10 / h | JEU | OWASP |
| Durée de session / jeton | selon `JWT_EXPIRES_IN` (7 jours par défaut) | JEU | OWASP ASVS |
| Conservation des données (page confidentialité) | voir `app/privacy/page.jsx` | À FAIRE VALIDER | CNIL ; avocat |

## H. Paramètres ajoutés par les PR de design (non fusionnées)
| Paramètre | Valeur | État | Source officielle |
|---|---|---|---|
| Simulateurs : prélèvements sociaux, impôt forfaitaire, PEA | 17,2 % ; 12,8 % ; 5 ans (**incohérent avec 18,6 % ci-dessus : à arbitrer**) | SOURCÉ | voir A |
| Simulateurs : micro-foncier | abattement 30 %, plafond 15 000 € | SOURCÉ | CGI art. 32 ; impots.gouv.fr |
| Simulateurs : micro-BIC (meublé) | abattement 50 %, plafond 77 700 € | SOURCÉ | CGI art. 50-0 ; impots.gouv.fr |
| Simulateurs : frais de notaire, endettement | 7,5 / 2,5 % ; 35 % | SOURCÉ | voir C |
| Simulateurs : indemnité de remboursement anticipé (immobilier) | plus bas de 6 mois d'intérêts et 3 % du capital restant | SOURCÉ | Code de la consommation art. L313-47 |
| Simulateurs : écart des scénarios | ±3 points | JEU | — |
| Apport proposé par défaut (Immobilier) | 30 % du prix | JEU | pratique bancaire |
| Social : amis / demandes / guilde | 100 amis ; 20 demandes sortantes ; 50 entrantes ; 30 membres | JEU | — |
| Inscription : durée minimale des réponses | 700 ms (0 à 3 000) | JEU | OWASP |
| E-mails automatiques par adresse | 1 par heure (adresse déjà inscrite) ; 3 par heure (mot de passe oublié) | JEU | — |
| Favoris et recherches enregistrées | 200 ; 20 | JEU | — |

## Méthode conseillée pour la vérification
1. Commence par **A** et **C** (fiscalité et règles bancaires) : ce sont les seules qui ressemblent à des faits réels.
2. Pour chaque ligne SOURCÉ : ouvre la source officielle, note la date de vérification et l'adresse dans le commentaire au-dessus de la valeur (dans le fichier indiqué), puis remplace « à reconfirmer » par « vérifié le JJ/MM/AAAA ».
3. Pour chaque ligne JEU : décide « on garde » (la mention reste, c'est un choix de jeu) ou « on change ».
4. Tranche les incohérences signalées (18,6 % contre 17,2 %).
5. Fais relire la liste par un comptable ou un juriste avant l'ouverture au public.

## À traiter avant l'ouverture au public
- **Rétablissement (procédure après défaut de paiement)** : décision d'Andreja, **ne rien changer maintenant**. Avant l'ouverture au public, il doit suivre la vraie vie :
  - **saisie de tous les biens**, pas seulement des pièces réservées (aujourd'hui seules les pièces réservées sont saisies, et le prêt personnel n'en réserve plus) ;
  - **conséquences durables** (blocage du crédit, historique visible, effets qui ne disparaissent pas au bout de quelques minutes) ;
  - **pas d'effacement gratuit** après avoir dépensé l'argent emprunté (emprunter, dépenser, puis faire effacer la dette ne doit pas être rentable).
- **Script `test:give-coins` (se donner des InvestCoins pour les tests)** : `backend/scripts/test-give-coins.ts` + ligne `test:give-coins` de `backend/package.json`. **À RETIRER ou à BLOQUER avant l'ouverture au public**, pour qu'il ne puisse pas exister sur le vrai site. Il est déjà protégé (refus si le nom de la base ne finit pas par `_test`, double contrôle après connexion, crédit par le registre avec le motif `test_gift`, compte existant seulement, jamais lancé automatiquement), mais la meilleure garantie est qu'il n'existe pas en production : le supprimer du dépôt de production, ou l'exclure de l'image de déploiement. À vérifier à l'audit de sécurité : `grep -rn "test_gift" backend/` ne doit rien trouver dans la version publique.
- **« Jour actif »** : à resserrer à l'audit de sécurité (voir `docs/classement-net-de-revente.md`).

## Finitions de l'économie : choix faits sans question (principe : la vraie vie)
| Sujet | Choix | État |
|---|---|---|
| « Capital investi » du seuil de classement | Montant ACTUELLEMENT investi (positions détenues au prix de revient ; biens immobiliers encore possédés), pas le cumul des achats. Le cumul reste affiché sous « Total acheté (cumul) ». Seuil : 2 500 et 5 jours actifs (inchangés). | DÉCISION produit |
| Parcours d'éducation Bourse et Immobilier | Créés (5 chapitres + quiz final chacun) ; récompenses identiques aux autres parcours (20 par chapitre, 100 par parcours). Faits fiscaux repris des règles françaises ; les barèmes du jeu restent des valeurs de jeu. | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** pour les montants de récompense et les paramètres du jeu cités ; textes à relire. |
| Capitalisation Crypto absente | Colonne et tri masqués plutôt que vides (aucune capitalisation inventée). | DÉCISION produit |
| Tableau de bord Bourse | Onglets Crypto (ancien domaine) et Immobilier retirés de l'onglet Bourse ; les positions de l'ancien domaine Crypto restent comptées dans le patrimoine. | DÉCISION produit |

## Retours de test (copie de test) : points d'attention sur la performance Immobilier
- **Performance juste après un achat très négative (ex. −31 % pour un studio non loué, −91 % pour un T2 loué, plus de 100 % du capital investi pour une maison louée avec peu d'apport)** : ce n'est pas une erreur de calcul, c'est l'effet cumulé des règles actuelles (frais de notaire, frais d'agence, diagnostics, indemnité de remboursement anticipé, impôt, et surtout la **décote de 10 % d'un bien loué à la revente**, qui pèse très lourd quand l'apport est faible). Elle est maintenant expliquée sur la carte du tableau de bord. La décote de 10 % reste une **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** (`SALE_PARAMS.occupiedDiscountPct`) : **décision d'Andreja : on la garde (réalisme)**. La carte Immobilier du tableau de bord affiche deux lignes séparées, « Valeur de tes biens » et « Résultat si tu revendais aujourd'hui », pour que le pourcentage ne soit pas lu comme la valeur du bien. **À sourcer avant l'ouverture au public** (taux de décote d'un bien loué).
- **[TRAITÉ — voir les règles 1 et 2 ci-dessus] Bien « à rénover » acheté sans expertise** : tant que les travaux découverts après l'achat ne sont pas payés, le bien reste valorisé « à rénover » alors que le prêt a déjà financé les travaux annoncés : la valeur nette de revente est alors très basse (jusqu'à −285 % mesuré). C'est une règle de jeu (la rénovation n'est faite qu'une fois tous les travaux payés), pas modifiée ici (économie figée). À reconsidérer : valoriser le bien comme rénové moins les travaux restant à payer.

## Confidentialité du profil (6a-5)
- Défaut « public » pour tous les comptes (le comportement actuel ne change pour personne) : décision de continuité. Le libellé « Joueur anonyme » et la règle « privé = introuvable par pseudo, joignable par code ami » suivent la décision d'Andreja (question 12 de l'analyse 6a). Rien de chiffré, aucune valeur de jeu.
