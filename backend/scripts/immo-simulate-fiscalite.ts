// Simulation de l'impôt sur les revenus fonciers, micro-foncier contre régime réel, pour les trois profils. EXEMPLES DE CALCUL : les loyers et charges ci-dessous sont des cas types, pas des données.
// Aucune base, aucun serveur, rien n'est écrit. Les règles viennent de config/rentTaxRules.ts (chiffres [à relire]).
//   npm run immo:simulate-fiscalite
import { compareRegimes } from '../src/engine/immo/rentTaxRegimes';
import { INCOME_TAX_MARGINAL_PCT_BY_PROFILE, SOCIAL_CHARGES_ON_RENT_PCT } from '../src/config/immoRules';
import { MICRO_FONCIER, REAL_REGIME } from '../src/config/rentTaxRules';

const eur = (n: number): string => `${Math.round(n).toLocaleString('fr-FR')} €`;
const CASES = [
  { label: 'petit studio, sans emprunt',               rent: 4_800,  other: 1_100, interest: 0 },
  { label: 'T2, emprunt en cours',                      rent: 7_200,  other: 1_500, interest: 3_000 },
  { label: 'T3, gros emprunt (déficit)',                rent: 9_600,  other: 3_500, interest: 8_500 },
  { label: 'travaux importants (déficit hors intérêts)', rent: 6_000,  other: 13_000, interest: 2_000 },
  { label: 'plusieurs biens (au-dessus du plafond micro)', rent: 18_000, other: 4_000, interest: 5_000 },
];
console.log(`Micro-foncier : abattement ${MICRO_FONCIER.abatementPct} %, plafond ${eur(MICRO_FONCIER.ceilingEur)} de loyers bruts. Réel : déficit imputable sur le revenu global jusqu'à ${eur(REAL_REGIME.deficitOnGlobalIncomeCeilingEur)}, reste reporté ${REAL_REGIME.carryYears} ans.`);
console.log(`Prélèvements sociaux ${SOCIAL_CHARGES_ON_RENT_PCT} %. Impôt sur le revenu : tranche du profil (choix de jeu). TOUS CES CHIFFRES SONT À RELIRE (docs/fiscalite-fonciere-fiche-source.md). Le moteur actuel ne les utilise pas.\n`);
for (const [profile, ir] of Object.entries(INCOME_TAX_MARGINAL_PCT_BY_PROFILE)) {
  console.log(`Profil ${profile} (tranche ${ir} %)`);
  for (const c of CASES) {
    const r = compareRegimes({ grossRentEur: c.rent, otherChargesEur: c.other, loanInterestEur: c.interest, irMarginalPct: ir, socialChargesPct: SOCIAL_CHARGES_ON_RENT_PCT });
    const micro = r.micro.eligible ? eur(r.micro.totalTaxEur) : 'non permis';
    const carry = r.real.deficitCarriedEur > 0 ? `, déficit reporté ${eur(r.real.deficitCarriedEur)}` : '';
    console.log(`  ${c.label.padEnd(46)} loyers ${eur(c.rent).padStart(9)} · micro ${micro.padStart(10)} · réel ${eur(r.real.totalTaxEur).padStart(9)}${carry} → ${r.best === 'micro' ? 'micro' : 'réel'}`);
  }
  console.log('');
}
console.log('Indicatif : l\'engagement de trois ans au régime réel, la CSG déductible et le quotient familial ne sont pas modélisés.');
