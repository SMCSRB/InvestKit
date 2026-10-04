// Simule un niveau de difficulté Immobilier avec les VRAIS prix DVF (médianes déjà préparées par immo:import-dvf) et NOS règles de banque : jouable, ou la banque refuse-t-elle presque tout ?
// Lecture seule : aucune base, aucun réseau, rien n'est écrit. À lancer par Andreja, sur la machine où se trouve backend/data/dvf-marche.json.
//   npm run immo:simulate-niveau                                      (Expert : étudiant, 2 500 pièces, prêt de 25 ans, aucun loyer retenu)
//   npm run immo:simulate-niveau -- --capital 5000 --profile student  (autre niveau)
// Options : --file <dvf-marche.json> · --capital <pièces> · --profile student|employee|executive · --months <mois> · --yield <% brut : loyer prévisionnel retenu par la banque, 0 par défaut = prudent>
//           --age old|new (ancien par défaut : frais de notaire 7,5 % ; neuf : 2,5 %) · --month AAAA-MM (répétable ; par défaut : le premier mois fiable de chaque année et le dernier mois)
import { readFileSync } from 'fs';
import path from 'path';
import { parseMarketFile } from '../src/data/realEstate/dvf/marketFile';
import { DVF_CITIES, zoneLabel } from '../src/data/realEstate/dvf/cities';
import { BANK_RULES, STARTING_PROFILES, NOTARY_RULE, LOAN_INSURANCE_RATE_PCT, loanApplicationFee } from '../src/config/immoRules';
import { fictiveDataSource } from '../src/data/realEstate/fictiveCatalog';
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
    const ceiling = maxApprovedPrice(s);
    console.log(`── ${month} · taux ${rate} % · la banque accepte au plus ${ceiling.toLocaleString('fr-FR')} euros ──`);
    console.log('Ville'.padEnd(15) + 'prix m² (médiane de chaque quartier)'.padEnd(40) + 'm² finançables au prix du m²' .padEnd(30) + UNIT_KINDS.map((k) => k.id.padStart(8)).join(''));
    let anyHousing = 0; let anyParking = 0; let zonesTotal = 0;
    for (const c of DVF_CITIES) {
      const zones = c.districts ? c.codes : [c.codes[0]];
      const rowsOf = (type: 'a' | 'm') => zones.map((z) => ({ z, r: parsed.rows.find((x) => x.zone === z && x.month === month && x.type === (type === 'a' ? 'apartment' : 'house')) })).filter((x) => x.r);
      const apt = rowsOf('a');
      if (!apt.length) { console.log(c.name.padEnd(15) + 'pas de prix fiable ce mois-là'); continue; }
      const meds = apt.map((x) => x.r!.median);
      const lo = Math.min(...meds); const hi = Math.max(...meds);
      const cnt: Record<string, string> = {};
      for (const k of UNIT_KINDS) {
        const list = rowsOf(k.marketType);
        const ok = list.filter((x) => assessPurchase(s, unitPrice(k, x.r!.median)).approved).length;
        cnt[k.id] = `${ok}/${list.length}`;
        if (k.id === 'parking') anyParking += ok; else anyHousing += ok;
      }
      zonesTotal += apt.length;
      console.log(c.name.padEnd(15) + `${Math.round(lo)}${hi !== lo ? ` à ${Math.round(hi)}` : ''}`.padEnd(40) + `${maxSurfaceAt(ceiling, hi)}${hi !== lo ? ` à ${maxSurfaceAt(ceiling, lo)}` : ''}`.padEnd(30) + UNIT_KINDS.map((k) => cnt[k.id].padStart(8)).join(''));
    }
    console.log(`\nQuartiers où au moins un LOGEMENT (studio, T2, T3 ou maison) est finançable à la médiane : ${anyHousing} sur ${zonesTotal} × 4 types ; parkings : ${anyParking} sur ${zonesTotal}.`);
    console.log(anyHousing === 0 ? 'VERDICT : la banque refuse tout logement à la médiane ; seuls les parkings (s\'il y en a) sont accessibles.' : 'VERDICT : certains logements restent accessibles (voir le tableau).');
    console.log('(Repère : un logement décent demande au moins 9 m² ; un studio du jeu fait 17 à 24 m².)\n');
  }
};
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
