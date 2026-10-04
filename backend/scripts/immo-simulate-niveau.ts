// Simule un niveau de difficulté Immobilier avec les VRAIS prix DVF (médianes déjà préparées par immo:import-dvf) et NOS règles de banque : jouable, ou la banque refuse-t-elle presque tout ?
// Lecture seule : aucune base, aucun réseau, rien n'est écrit. À lancer par Andreja, sur la machine où se trouve backend/data/dvf-marche.json.
//   npm run immo:simulate-niveau                                      (Expert : étudiant, 2 500 pièces, prêt de 25 ans, aucun loyer retenu)
//   npm run immo:simulate-niveau -- --capital 5000 --profile student  (autre niveau)
// Chaque ville est détaillée ZONE PAR ZONE (arrondissement, ou code postal) avec le prix médian au m² de la zone.
// Options : --file <dvf-marche.json> · --capital <pièces> · --profile student|employee|executive · --months <mois> · --yield <% brut : loyer prévisionnel retenu par la banque, 0 par défaut = prudent>
//           --age old|new (ancien par défaut : frais de notaire 7,5 % ; neuf : 2,5 %) · --month AAAA-MM (répétable ; par défaut : le premier mois fiable de chaque année et le dernier mois)
import { readFileSync } from 'fs';
import path from 'path';
import { parseMarketFile } from '../src/data/realEstate/dvf/marketFile';
import { DVF_CITIES, zoneLabel } from '../src/data/realEstate/dvf/cities';
import { BANK_RULES, STARTING_PROFILES, NOTARY_RULE, LOAN_INSURANCE_RATE_PCT, loanApplicationFee } from '../src/config/immoRules';
import { minOf, maxOf } from '../src/data/realEstate/dvf/arrays';
import { fictiveDataSource } from '../src/data/realEstate/fictiveCatalog';
import { notaryFeesOld } from '../src/engine/immo/notaryDepartment';
import { assessPurchase, maxApprovedPrice, maxSurfaceAt, unitPrice, UNIT_KINDS, LevelScenario } from '../src/engine/immo/levelSimulation';
import type { ProfileId } from '../src/engine/immo';

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const args = (n: string): string[] => process.argv.flatMap((a, i, all) => (a === `--${n}` && all[i + 1] ? [all[i + 1]] : []));

const main = async () => {
  const file = path.resolve(arg('file') ?? path.join(__dirname, '..', 'data', 'dvf-marche.json'));
  const parsed = parseMarketFile(JSON.parse(readFileSync(file, 'utf8')));
  if (!parsed.ok) { console.error(`Fichier refusé :\n- ${parsed.errors.join('\n- ')}`); process.exit(1); }
  const capital = Number(arg('capital') ?? 2500);
  const profile = (arg('profile') ?? 'student') as ProfileId;
  if (!(profile in STARTING_PROFILES) || !(capital > 0)) throw new Error('Profil ou capital invalide.');
  const months = Number(arg('months') ?? 300); const yieldPct = Number(arg('yield') ?? 0);
  const age = (arg('age') ?? 'old') as 'old' | 'new';
  const prof = STARTING_PROFILES[profile];
  const months0 = parsed.rows.map((r) => r.month);   // seules les lignes AVEC prix sont gardées par le lecteur (jamais de chiffre inventé)
  const first = [...new Set(months0)].sort();
  const wanted = args('month').length ? args('month') : [...new Set([...first.filter((m) => m.endsWith('-01')), first[first.length - 1]])];
  console.log(`Niveau simulé : ${prof.label}, ${capital} pièces, prêt ${months} mois, ${age === 'old' ? 'ancien' : 'neuf'}, loyer retenu ${yieldPct} % brut. Revenus ${prof.netMonthlyIncome} / charges ${prof.livingCharges} par mois.`);
  console.log('Banque du jeu : apport minimal = notaire en entier + 10 % du prix, endettement 35 %, reste à vivre du profil. Taux de crédit : courbe fictive du jeu (à reconfirmer).\n');
  for (const month of wanted) {
    const year = Number(month.slice(0, 4));
    const rate = await fictiveDataSource.getLoanRatePct(Math.min(year, 2026), months);
    const s: LevelScenario = { capital, profile, salary: prof.netMonthlyIncome, livingCharges: prof.livingCharges, months, annualRatePct: rate, insuranceRatePct: LOAN_INSURANCE_RATE_PCT, notaryRule: NOTARY_RULE, bankRules: BANK_RULES, loanFees: loanApplicationFee, age, rentYieldPct: yieldPct };
    const ceiling = maxApprovedPrice(s);        // plafond avec le taux de notaire FORFAITAIRE du jeu ; chaque ville a le sien, avec le notaire de son département (voir ci-dessous)
    console.log(`── ${month} · taux ${rate} % · plafond d'achat avec le notaire forfaitaire du jeu : ${ceiling.toLocaleString('fr-FR')} euros ──`);
    if (age === 'old') console.log('Notaire : calculé par DÉPARTEMENT (droits de mutation à la date, émoluments, TVA, CSI ; aucun forfait de frais divers) ; sources et doutes dans docs/frais-notaire-fiche-source.md.');
    console.log('Zone'.padEnd(22) + 'ventes'.padStart(7) + 'prix m² appart.'.padStart(17) + 'prix m² maison'.padStart(16) + UNIT_KINDS.map((k) => k.id.padStart(9)).join(''));
    console.log('(« ~ » = prix de la ville entière (moins de 5 ventes dans la zone, ou écart de plus de 40 % à la ville) ; sans signe : zone seule (30 ventes ou plus) ou zone et ville mélangées (5 à 29 ventes) ; « - » = pas de prix fiable ; colonnes de droite : le bien est-il accepté par la banque, ✓ ou ✗)');
    let anyHousing = 0; let anyParking = 0; let zonesTotal = 0;
    const summary: string[] = [];
    for (const c of DVF_CITIES) {
      const sc: LevelScenario = age === 'old' ? { ...s, notaryPctAt: (price: number) => notaryFeesOld(price, c.department, `${month}-01`).pct } : s;   // notaire du département de la ville
      const cityCeiling = maxApprovedPrice(sc);
      const find = (z: string, type: 'apartment' | 'house') => parsed.rows.find((x) => x.zone === z && x.month === month && x.type === type);
      const cityApt = c.zones.map((z) => find(z, 'apartment')).filter((r) => r);
      if (!cityApt.length) { console.log(`${c.name}`.padEnd(22) + 'pas de prix fiable ce mois-là'); continue; }
      const meds = cityApt.map((r) => r!.median); const lo = minOf(meds); const hi = maxOf(meds);
      console.log(`${c.name} — ${c.zones.length} zone${c.zones.length > 1 ? 's' : ''}, ${Math.round(lo)}${hi !== lo ? ` à ${Math.round(hi)}` : ''} €/m² ; la banque finance ${maxSurfaceAt(cityCeiling, hi)}${hi !== lo ? ` à ${maxSurfaceAt(cityCeiling, lo)}` : ''} m² à ce prix (plafond ${cityCeiling.toLocaleString('fr-FR')} €${age === 'old' ? `, notaire ${notaryFeesOld(Math.max(cityCeiling, 1_000), c.department, `${month}-01`).pct.toLocaleString('fr-FR')} %` : ''})`);
      let studioOk = 0; let parkingOk = 0; let priced = 0;
      for (const z of c.zones) {
        const a = find(z, 'apartment'); const h = find(z, 'house');
        const fmt = (r: typeof a) => (r ? `${Math.round(r.median)}${r.scope === 'city' ? '~' : ''}` : '-');
        const marks = UNIT_KINDS.map((k) => {
          const r = k.marketType === 'a' ? a : h;
          if (!r) return '-'.padStart(9);
          const ok = assessPurchase(sc, unitPrice(k, r.median)).approved;
          if (k.id === 'parking') { if (ok) { anyParking++; parkingOk++; } } else if (ok) anyHousing++;
          if (k.id === 'studio' && ok) studioOk++;
          return (ok ? '✓' : '✗').padStart(9);
        });
        if (a) { zonesTotal++; priced++; }
        console.log('  ' + (zoneLabel(z) ?? z).padEnd(20) + String(a?.salesCount ?? '-').padStart(7) + fmt(a).padStart(17) + fmt(h).padStart(16) + marks.join(''));
      }
      summary.push(c.name.padEnd(16) + `${Math.round(lo)}${hi !== lo ? ` à ${Math.round(hi)}` : ''}`.padEnd(26) + `${maxSurfaceAt(cityCeiling, hi)}${hi !== lo ? ` à ${maxSurfaceAt(cityCeiling, lo)}` : ''}`.padEnd(18) + `${studioOk}/${priced} zones`.padStart(14) + `${parkingOk}/${priced}`.padStart(10));
    }
    console.log('\nPlafond de ce profil, ville par ville (le plus petit bien du catalogue : studio de 17 m², parking de 11 m²) :');
    console.log('Ville'.padEnd(16) + 'prix m² médian (zones)'.padEnd(26) + 'm² finançables'.padEnd(18) + 'studio 17 m²'.padStart(14) + 'parking'.padStart(10));
    for (const line of summary) console.log(line);
    console.log(`\nCouples (zone, bien) où un LOGEMENT (studio, T2, T3 ou maison) est finançable à la médiane : ${anyHousing} ; parkings finançables : ${anyParking} sur ${zonesTotal} zones avec prix.`);
    console.log(anyHousing === 0 ? 'VERDICT : la banque refuse tout logement à la médiane ; seuls les parkings (s\'il y en a) sont accessibles.' : 'VERDICT : certains logements restent accessibles (voir le tableau).');
    console.log('(Repère : un logement décent demande au moins 9 m² ; un studio du jeu fait 17 à 24 m².)\n');
  }
};
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
