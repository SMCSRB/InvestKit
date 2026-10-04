# Télécharger et importer les données de l'Immobilier réel (une commande par fichier)

**Où** : sur ton serveur, dans **`~/InvestKit-design`** (la copie de test). Le script **refuse** de tourner dans `~/InvestKit` (le vrai site). **Rien n'est écrit en base** tant que tu n'ajoutes pas `--apply`, et `--apply` n'accepte que la base **`investkit_design_test`**. Le script ne lit **aucun secret** (ni `.env`) : le mot de passe de la base, tu le tapes toi-même dans la commande.

Prérequis : `git pull` de `release/design-complet` dans `~/InvestKit-design` (le script est `ops/immo-telecharger.py`), `python3` et `npm` (déjà là).

## 1. Voir le rapport (aucune écriture)
```bash
cd ~/InvestKit-design
python3 ops/immo-telecharger.py anil 2025        # 4 CSV de la Carte des loyers ; refaire pour 2022, 2023, 2024
python3 ops/immo-telecharger.py terralyse        # taux de taxe foncière par commune
python3 ops/immo-telecharger.py irl              # série IRL de l'Insee
```
Chaque commande : trouve le jeu de données sur data.gouv.fr (API officielle), **affiche la licence lue** (elle doit être « lov2 » = Licence Ouverte 2.0, sinon le script s'arrête), l'éditeur, la date de mise à jour, puis pour chaque fichier son nom, sa taille et son empreinte ; télécharge dans `backend/data/…-brut/` (ignoré par git) ; lance `immo:import-… --check`. **Sortie limitée à 30 lignes** (`--full` pour tout voir).

## 2. Rapport attendu (à m'envoyer)
- **ANIL** : « 4 fichiers » ; pour chaque ville le nombre de communes ou arrondissements avec un loyer, par série (appartements, T1-T2, T3+, maisons) ; **Paris, Lyon, Marseille : arrondissements présents ou « sans loyer »** ; sinon le message « colonne introuvable » avec **les colonnes trouvées**.
- **Terralyse** : « N communes dans le fichier (5 206 annoncées) », « Paris, Lyon et Marseille : présentes » (sinon refus qui **nomme la commune absente**), pour chaque ville taux communal + intercommunal = global, TEOM à part, et la ligne « ATTENTION : taux intercommunal VIDE (compté 0) pour … » s'il y en a ; sinon « colonne(s) introuvable(s) » avec **les colonnes trouvées**.
- **IRL** : « N trimestres retenus », première et dernière valeur, « 3e trimestres récents » à comparer avec la page de l'Insee.

## 3. Si le script s'arrête (STOP)
Il dit pourquoi et quoi faire. Cas prévus : licence différente (lis la page, puis `--accept-licence` si c'est acceptable) ; fichiers non reconnus (`--url all=… --url t12=… --url t3=… --url house=…`) ; site qui répond mal (télécharge à la main : `--file <fichier>` pour terralyse et irl, `--dir <dossier>` pour anil). **Ce script n'a pas pu être essayé sur les vrais sites** (accès réseau bloqué pendant le développement) : s'il se trompe, envoie-moi le message STOP.

## 4. Écrire en base de TEST (après avoir lu le rapport)
```bash
DATABASE_URL=postgresql://UTILISATEUR:MOT_DE_PASSE@localhost:5432/investkit_design_test python3 ops/immo-telecharger.py anil 2025 --apply
DATABASE_URL=… python3 ops/immo-telecharger.py terralyse --apply
DATABASE_URL=… python3 ops/immo-telecharger.py irl --apply
```
Chaque `--apply` : écrit le JSON préparé, **simule** le chargement, puis charge en base de test (rejouable : même fichier = rien de plus). Ces chargements ne changent **rien pour les joueurs** tant que les drapeaux (`RENT_MARKET_ENABLED`, `PROPERTY_TAX_ENABLED`, `DVF_MARKET_ENABLED`) restent désactivés ; **seul l'IRL** est déjà lu par le moteur (révision des loyers).

## À relire à la main avant d'importer en base
Licences et conditions : data.gouv.fr (jeu ANIL, jeu Terralyse) et insee.fr (conditions de réutilisation de la série IRL 001515333), voir les fiches `docs/loyers-anil-fiche-source.md`, `docs/taxe-fonciere-fiche-source.md`, `docs/loyers-irl-fiche-source.md`.
