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
    console.log('Zone'.padEnd(22) + 'ventes'.padStart(7) + 'prix m² appart.'.padStart(17) + 'prix m² maison'.padStart(16) + UNIT_KINDS.map((k) => k.id.padStart(9)).join(''));
    console.log('(« ~ » = trop peu de ventes dans la zone : prix de la ville entière ; « - » = pas de prix fiable ; colonnes de droite : le bien est-il accepté par la banque, ✓ ou ✗)');
    let anyHousing = 0; let anyParking = 0; let zonesTotal = 0;
    for (const c of DVF_CITIES) {
      const find = (z: string, type: 'apartment' | 'house') => parsed.rows.find((x) => x.zone === z && x.month === month && x.type === type);
      const cityApt = c.zones.map((z) => find(z, 'apartment')).filter((r) => r);
      if (!cityApt.length) { console.log(`${c.name}`.padEnd(22) + 'pas de prix fiable ce mois-là'); continue; }
      const meds = cityApt.map((r) => r!.median); const lo = minOf(meds); const hi = maxOf(meds);
      console.log(`${c.name} — ${c.zones.length} zone${c.zones.length > 1 ? 's' : ''}, ${Math.round(lo)}${hi !== lo ? ` à ${Math.round(hi)}` : ''} €/m² ; la banque finance ${maxSurfaceAt(ceiling, hi)}${hi !== lo ? ` à ${maxSurfaceAt(ceiling, lo)}` : ''} m² à ce prix`);
      for (const z of c.zones) {
        const a = find(z, 'apartment'); const h = find(z, 'house');
        const fmt = (r: typeof a) => (r ? `${Math.round(r.median)}${r.scope === 'city' ? '~' : ''}` : '-');
        const marks = UNIT_KINDS.map((k) => {
          const r = k.marketType === 'a' ? a : h;
          if (!r) return '-'.padStart(9);
          const ok = assessPurchase(s, unitPrice(k, r.median)).approved;
          if (k.id === 'parking') { if (ok) anyParking++; } else if (ok) anyHousing++;
          return (ok ? '✓' : '✗').padStart(9);
        });
        if (a) zonesTotal++;
        console.log('  ' + (zoneLabel(z) ?? z).padEnd(20) + String(a?.salesCount ?? '-').padStart(7) + fmt(a).padStart(17) + fmt(h).padStart(16) + marks.join(''));
      }
    }
    console.log(`\nCouples (zone, bien) où un LOGEMENT (studio, T2, T3 ou maison) est finançable à la médiane : ${anyHousing} ; parkings finançables : ${anyParking} sur ${zonesTotal} zones avec prix.`);
    console.log(anyHousing === 0 ? 'VERDICT : la banque refuse tout logement à la médiane ; seuls les parkings (s\'il y en a) sont accessibles.' : 'VERDICT : certains logements restent accessibles (voir le tableau).');
    console.log('(Repère : un logement décent demande au moins 9 m² ; un studio du jeu fait 17 à 24 m².)\n');
  }
};
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
