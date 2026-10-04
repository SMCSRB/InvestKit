#!/usr/bin/env python3
"""Télécharge (TOI, sur ton serveur) les fichiers de l'Immobilier réel, puis lance l'import en rapport court.

Une commande par source, à lancer dans ~/InvestKit-design (jamais dans ~/InvestKit, le vrai site : le script refuse) :

  python3 ops/immo-telecharger.py anil 2025          # 4 CSV de la Carte des loyers (data.gouv.fr) + rapport  (millésime au choix : 2022 à 2025)
  python3 ops/immo-telecharger.py terralyse          # taux de taxe foncière par commune (Terralyse, data.gouv.fr) + rapport
  python3 ops/immo-telecharger.py irl                # série IRL de l'Insee + rapport

Sans option : télécharge, affiche d'où vient chaque fichier (adresse, licence, date, taille, empreinte) et lance « immo:import-… --check »
(rapport seulement, RIEN n'est écrit en base ni en JSON). La sortie est limitée à 30 lignes (--full pour tout voir).

Étape suivante, quand le rapport te convient (écrit le JSON, simule, puis écrit en base de TEST seulement) :
  DATABASE_URL=postgresql://UTILISATEUR:MOT_DE_PASSE@localhost:5432/investkit_design_test python3 ops/immo-telecharger.py anil 2025 --apply
(le mot de passe n'est lu nulle part : tu le fournis toi-même ; la base doit s'appeler investkit_design_test).

Options : --file <fichier> (irl, terralyse : utilise un fichier déjà téléchargé à la main) · --dir <dossier> (anil) · --url <série>=<adresse> (anil : impose une adresse ;
séries : all, t12, t3, house) · --accept-licence (continue même si la licence lue n'est pas « Licence Ouverte 2.0 ») · --full · --selftest

Ce script n'a PAS pu être essayé sur les vrais sites depuis la session de développement (accès réseau bloqué) : en cas de surprise il s'arrête et dit quoi faire à la main.
"""
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'https://www.data.gouv.fr/api/1'
MAX_BYTES = 300 * 1024 * 1024
LICENCE_OK = {'lov2'}            # identifiant data.gouv.fr de la « Licence Ouverte 2.0 »
LIMIT = 30
TEST_DB = 'investkit_design_test'
INSEE_IRL = 'https://www.insee.fr/fr/statistiques/serie/telecharger/csv/001515333'


class Stop(Exception):
    pass


def say(text=''):
    print(text, flush=True)


def get(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': 'InvestKit-immo-telecharger/1 (usage manuel)'})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise Stop(f'Fichier trop gros (plus de {MAX_BYTES // 1024 // 1024} Mo) : {url}')
    return data if binary else json.loads(data.decode('utf-8'))


def licence_check(dataset, accept):
    lic = dataset.get('license')
    say(f"  licence lue dans l'API : {lic}  (attendue : {', '.join(sorted(LICENCE_OK))} = Licence Ouverte 2.0)")
    if lic not in LICENCE_OK and not accept:
        raise Stop("La licence n'est pas celle attendue. Lis la page du jeu de données ; si c'est acceptable, relance avec --accept-licence.")


def describe(dataset):
    org = (dataset.get('organization') or {}).get('name') or (dataset.get('owner') or {}).get('slug') or '?'
    say(f"Jeu de données : {dataset.get('title')}")
    say(f"  éditeur : {org} · page : {dataset.get('page')} · dernière mise à jour : {dataset.get('last_update')}")


def save(data, folder, name):
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, name)
    with open(path, 'wb') as f:
        f.write(data)
    say(f"  {name} : {len(data) // 1024} Ko · sha256 {hashlib.sha256(data).hexdigest()[:16]}…")
    return path


# ── Choix des fichiers (fonctions pures, essayées par --selftest) ──
ANIL_PATTERNS = [
    ('t12', re.compile(r'app12|t1[\s_-]*(et|-|_)?[\s_-]*t2|t1t2', re.I), 'app12'),
    ('t3', re.compile(r'app3|t3(\s|_|-|\+|$)|t3 et plus|t3\+', re.I), 'app3'),
    ('house', re.compile(r'maison|[\s_-]mai[\s_.-]|^mai[\s_.-]|[\s_-]mai$', re.I), 'mai'),
    ('all', re.compile(r'appartement|[\s_-]app[\s_.-]|^app[\s_.-]|pred-app|[\s_-]app$', re.I), 'app'),
]


def pick_anil(resources):
    """Renvoie {série: ressource} ; lève Stop si une série est absente ou ambiguë."""
    csvs = [r for r in resources if str(r.get('format', '')).lower() == 'csv' or str(r.get('url', '')).lower().split('?')[0].endswith('.csv')]
    chosen, problems = {}, []
    for group, pat, _ in ANIL_PATTERNS:
        hits = [r for r in csvs if pat.search(f"{r.get('title', '')} {os.path.basename(str(r.get('url', '')).split('?')[0])}")]
        if group == 'all':
            used = {id(v) for v in chosen.values()}
            hits = [h for h in hits if id(h) not in used]
        if len(hits) != 1:
            problems.append(f"série « {group} » : {len(hits)} fichier(s) possible(s)")
        else:
            chosen[group] = hits[0]
    if problems:
        lines = '\n'.join(f"    - {r.get('title')} ({r.get('format')}) {r.get('url')}" for r in csvs)
        raise Stop('Je ne sais pas associer sûrement les fichiers : ' + '; '.join(problems) + f"\n  Fichiers CSV du jeu de données :\n{lines}\n  Impose les adresses avec --url all=… --url t12=… --url t3=… --url house=…")
    return chosen


def pick_terralyse(results):
    ok = []
    for d in results:
        org = ((d.get('organization') or {}).get('name') or '').lower()
        title = (d.get('title') or '').lower()
        if 'terralyse' in org and 'charge par local' in title:
            ok.append(d)
    if len(ok) != 1:
        cands = '\n'.join(f"    - {d.get('title')} · {((d.get('organization') or {}).get('name'))} · {d.get('page')}" for d in results[:10])
        raise Stop(f"Je ne trouve pas le jeu Terralyse de façon sûre ({len(ok)} correspondance(s)).\n  Résultats de recherche :\n{cands}\n  Télécharge le CSV à la main et relance avec --file <fichier>.")
    return ok[0]


def pick_single_csv(resources):
    csvs = [r for r in resources if str(r.get('format', '')).lower() == 'csv' or str(r.get('url', '')).lower().split('?')[0].endswith('.csv')]
    if len(csvs) != 1:
        lines = '\n'.join(f"    - {r.get('title')} ({r.get('format')}, {r.get('filesize')} o) {r.get('url')}" for r in resources)
        raise Stop(f"{len(csvs)} fichier(s) CSV dans le jeu de données (un seul attendu).\n  Fichiers :\n{lines}\n  Télécharge celui qui convient à la main et relance avec --file <fichier>.")
    return csvs[0]


def csv_from_download(data):
    """L'Insee peut livrer un zip : on en sort le CSV de valeurs."""
    if data[:2] == b'PK':
        z = zipfile.ZipFile(io.BytesIO(data))
        names = [n for n in z.namelist() if n.lower().endswith('.csv')]
        pref = [n for n in names if 'valeurs' in n.lower()] or names
        if not pref:
            raise Stop('Le zip ne contient aucun CSV.')
        return z.read(pref[0])
    if data[:15].lower().startswith((b'<!doctype html', b'<html')):
        raise Stop("L'Insee a répondu par une page web et non par un fichier.")
    return data


def limited(text, full):
    lines = text.rstrip('\n').split('\n')
    if full or len(lines) <= LIMIT:
        return '\n'.join(lines)
    return '\n'.join(lines[:LIMIT]) + f"\n… ({len(lines) - LIMIT} lignes de plus : relance avec --full)"


# ── Exécution ──
def run_npm(args, full, env=None):
    p = subprocess.run(['npm', '--prefix', os.path.join(ROOT, 'backend'), 'run', '--silent'] + args, cwd=ROOT, capture_output=True, text=True, env=env)
    say(limited((p.stdout or '') + (p.stderr or ''), full))
    return p.returncode


def apply_guard():
    url = os.environ.get('DATABASE_URL', '')
    name = urllib.parse.urlparse(url).path.lstrip('/') if url else ''
    if not url:
        raise Stop("--apply demande DATABASE_URL (base de TEST). Exemple : DATABASE_URL=postgresql://UTILISATEUR:MOT_DE_PASSE@localhost:5432/investkit_design_test python3 ops/immo-telecharger.py … --apply")
    if name != TEST_DB and os.environ.get('IMMO_ALLOW_OTHER_TEST_DB') != '1':
        raise Stop(f"Base « {name} » refusée : seule « {TEST_DB} » est permise ici.")
    if not name.endswith('_test'):
        raise Stop(f"Base « {name} » refusée : le nom doit finir par « _test ».")
    say(f"Base de test visée : {name}")


def guard_root():
    real = os.path.realpath(os.path.expanduser('~/InvestKit'))      # le VRAI site (chemin exact, pas seulement le nom du dossier)
    if os.path.realpath(ROOT) == real and os.environ.get('IMMO_ALLOW_REAL_SITE_DIR') != '1':
        raise Stop("Tu es dans ~/InvestKit (le VRAI site). Lance ce script depuis ~/InvestKit-design.")


def after_import(kind, json_name, check_args, load_args, apply, full):
    """--check d'abord ; avec --apply : écrit le JSON, simule le chargement, écrit en base de test."""
    if not apply:
        say('\nRapport (--check : rien n\'est écrit) :')
        return run_npm(check_args + ['--check'], full)
    apply_guard()
    say('\nÉcriture du JSON préparé :')
    if run_npm(check_args, full) != 0:
        raise Stop('Import refusé : rien n\'est chargé.')
    say('\nSimulation du chargement :')
    if run_npm(load_args, full) != 0:
        raise Stop('Simulation refusée.')
    say('\nChargement en base de TEST :')
    return run_npm(load_args + ['--apply'], full)


def cmd_anil(opts):
    year = int(opts['pos'][0]) if opts['pos'] else 2025
    folder = opts['dir'] or os.path.join(ROOT, 'backend', 'data', 'loyers-brut', str(year))
    say(f"Carte des loyers (ANIL), millésime {year}")
    if not opts['dir']:
        urls = dict(opts['urls'])
        if urls:
            for g in ('all', 't12', 't3', 'house'):
                if g not in urls:
                    raise Stop(f'--url : la série « {g} » manque (all, t12, t3 et house sont tous nécessaires).')
            say('  adresses imposées par --url')
            picks = {g: {'url': u, 'title': g} for g, u in urls.items()}
        else:
            slug = f'carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-{year}'
            ds = get(f'{API}/datasets/{slug}/')
            describe(ds)
            licence_check(ds, opts['accept'])
            picks = pick_anil(ds.get('resources', []))
        names = {g: n for g, _, n in ANIL_PATTERNS}
        for g, r in picks.items():
            save(get(r['url'], binary=True), folder, f'loyers-{year}-{names[g]}.csv')
    else:
        say(f'  fichiers déjà présents dans {folder}')
    return after_import('anil', None,
                        ['immo:import-loyers', '--', '--vintage', str(year), '--dir', folder],
                        ['immo:load-loyers', '--', '--file', os.path.join(ROOT, 'backend', 'data', f'loyers-anil-{year}.json')], opts['apply'], opts['full'])


def cmd_terralyse(opts):
    folder = os.path.join(ROOT, 'backend', 'data', 'taxe-fonciere-brut')
    say('Taxe foncière par commune (Terralyse)')
    if opts['file']:
        path = os.path.abspath(opts['file'])
    else:
        q = urllib.parse.quote('Taxe foncière par commune taux et charge par local')
        found = get(f'{API}/datasets/?q={q}&page_size=20')
        ds = pick_terralyse(found.get('data', []))
        ds = get(f"{API}/datasets/{ds.get('id')}/")
        describe(ds)
        licence_check(ds, opts['accept'])
        r = pick_single_csv(ds.get('resources', []))
        path = save(get(r['url'], binary=True), folder, 'taux-taxe-fonciere.csv')
    return after_import('terralyse', None,
                        ['immo:import-taxe-fonciere', '--', '--file', path],
                        ['immo:load-taxe-fonciere', '--', '--file', os.path.join(ROOT, 'backend', 'data', 'taxe-fonciere-terralyse.json')], opts['apply'], opts['full'])


def cmd_irl(opts):
    folder = os.path.join(ROOT, 'backend', 'data', 'irl-brut')
    say('IRL (Insee, série 001515333)')
    if opts['file']:
        path = os.path.abspath(opts['file'])
    else:
        try:
            data = csv_from_download(get(INSEE_IRL, binary=True))
        except Stop:
            raise
        except Exception as e:  # réseau, adresse changée…
            raise Stop(f"Téléchargement impossible ({e}).\n  À la main : ouvre https://www.insee.fr/fr/statistiques/serie/001515333 , bouton « Télécharger » (CSV), puis relance avec --file <fichier>.")
        path = save(data, folder, 'irl-001515333.csv')
        say("  Conditions de réutilisation à relire sur la page : https://www.insee.fr/fr/statistiques/serie/001515333")
    return after_import('irl', None,
                        ['immo:import-irl', '--', '--file', path],
                        ['immo:load-irl', '--', '--file', os.path.join(ROOT, 'backend', 'data', 'irl-insee.json')], opts['apply'], opts['full'])


def parse(argv):
    o = {'pos': [], 'dir': None, 'file': None, 'urls': [], 'accept': False, 'full': False, 'apply': False, 'selftest': False}
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == '--dir': o['dir'] = os.path.abspath(argv[i + 1]); i += 1
        elif a == '--file': o['file'] = argv[i + 1]; i += 1
        elif a == '--url':
            k, _, v = argv[i + 1].partition('=')
            if not v: raise Stop('--url attend série=adresse (ex. --url all=https://…).')
            o['urls'].append((k, v)); i += 1
        elif a == '--accept-licence': o['accept'] = True
        elif a == '--full': o['full'] = True
        elif a == '--apply': o['apply'] = True
        elif a == '--selftest': o['selftest'] = True
        elif a.startswith('--'): raise Stop(f'Option inconnue : {a}')
        else: o['pos'].append(a)
        i += 1
    return o


def selftest():
    res = [{'title': 'Loyers appartements (tous)', 'format': 'csv', 'url': 'https://x/pred-app-mef-dhup.csv'},
           {'title': 'Loyers T1-T2', 'format': 'csv', 'url': 'https://x/pred-app12-mef-dhup.csv'},
           {'title': 'Loyers T3 et plus', 'format': 'csv', 'url': 'https://x/pred-app3-mef-dhup.csv'},
           {'title': 'Loyers maisons', 'format': 'csv', 'url': 'https://x/pred-mai-mef-dhup.csv'},
           {'title': 'Notice', 'format': 'pdf', 'url': 'https://x/notice.pdf'}]
    p = pick_anil(res)
    assert {g: os.path.basename(r['url']) for g, r in p.items()} == {'t12': 'pred-app12-mef-dhup.csv', 't3': 'pred-app3-mef-dhup.csv', 'house': 'pred-mai-mef-dhup.csv', 'all': 'pred-app-mef-dhup.csv'}, p
    try:
        pick_anil(res[:3]); raise AssertionError('un fichier manquant doit être refusé')
    except Stop:
        pass
    t = pick_terralyse([{'title': 'Taxe foncière par commune, taux et charge par local, 2022 à 2025', 'organization': {'name': 'Terralyse'}}, {'title': 'Autre', 'organization': {'name': 'X'}}])
    assert 'Terralyse' in t['organization']['name']
    try:
        pick_terralyse([{'title': 'Taxe foncière par commune, taux et charge par local', 'organization': {'name': 'DGFiP'}}]); raise AssertionError('éditeur inattendu')
    except Stop:
        pass
    buf = io.BytesIO(); z = zipfile.ZipFile(buf, 'w'); z.writestr('valeurs_trimestrielles.csv', 'a;b\n'); z.writestr('autre.csv', 'x'); z.close()
    assert csv_from_download(buf.getvalue()) == b'a;b\n'
    try:
        csv_from_download(b'<!DOCTYPE html><html>'); raise AssertionError('page web refusée')
    except Stop:
        pass
    assert limited('\n'.join(str(i) for i in range(100)), False).count('\n') == LIMIT
    assert pick_single_csv([{'format': 'csv', 'url': 'u'}])['url'] == 'u'
    say('selftest ok')


def main():
    try:
        o = parse(sys.argv[1:])
        if o['selftest']:
            return selftest()
        if not o['pos']:
            say(__doc__); return 1
        guard_root()
        cmd = {'anil': cmd_anil, 'terralyse': cmd_terralyse, 'irl': cmd_irl}.get(o['pos'][0])
        if not cmd:
            raise Stop('Source inconnue : choisis anil, terralyse ou irl.')
        o['pos'] = o['pos'][1:]
        return cmd(o)
    except Stop as e:
        say(f'\nSTOP : {e}')
        return 1
    except urllib.error.HTTPError as e:
        say(f'\nSTOP : le site a répondu {e.code} ({e.url}). Télécharge à la main et utilise --file / --dir.')
        return 1


if __name__ == '__main__':
    sys.exit(main() or 0)
