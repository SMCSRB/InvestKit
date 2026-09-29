import { round2, assertNonNegative, EngineInputError } from './money';
import { computeRentTax, RevisionResult } from './rent';

// ─────────────────────────────────────────────────────────────────────────
// RÉCAPITULATIF MENSUEL D'UN BIEN LOUÉ
//
// Tout ce qui change d'un mois à l'autre est expliqué : chaque variation par
// rapport à un « mois normal » (loué, loyer à jour, locataire qui paie à
// temps) reçoit son montant exact et une phrase claire. Les impacts sont
// calculés étape par étape (indexation → statut du locataire → retard
// rattrapé → récupération d'impayé) : leur somme est EXACTEMENT l'écart avec
// le mois normal.
//
// Charges : RÉCUPÉRABLES (eau, entretien courant des parties communes… payées
// par le propriétaire puis refacturées au locataire) et NON RÉCUPÉRABLES
// (copropriété non refacturable, taxe foncière, assurance, gros entretien),
// toujours à la charge du propriétaire. Un logement vide ou un locataire qui
// ne paie pas laisse aussi les charges récupérables à la charge du propriétaire.
//
// Simplifications : pas de régularisation annuelle des charges récupérables
// (provisions = dépenses réelles) ; impôt = taux × loyers encaissés.
// ─────────────────────────────────────────────────────────────────────────
export type TenantStatus =
  | 'paying'      // paie à temps
  | 'late'        // paiera avec un mois de retard (décalage de trésorerie)
  | 'defaulting'  // ne paie pas (impayé)
  | 'vacant';     // logement vide

export interface AmountPair { rent: number; charges: number }

export interface MonthlyInput {
  year: number;
  month: number;                       // 1–12
  status: TenantStatus;
  rent: number;                        // loyer mensuel en vigueur, hors charges
  recoverableCharges: number;          // €/mois avancés par le propriétaire, refacturés au locataire
  nonRecoverableAnnual: {
    condoFees: number;
    propertyTax: number;
    insurance: number;
    maintenance: number;
  };
  loanPayment: number;                 // mensualité assurance comprise
  // Ventilation de la mensualité : intérêts + capital remboursé + assurance = loanPayment.
  loanBreakdown?: { interest: number; principal: number; insurance: number };
  taxRatePct: number;                  // fiscalité simplifiée (par profil)
  revision?: RevisionResult;           // indexation intervenue CE mois-ci
  carryOverIn?: AmountPair;            // retard du mois précédent encaissé ce mois-ci
  arrearsRecovered?: AmountPair;       // impayé récupéré (dépôt de garantie, assurance loyers impayés, procédure)
  vacancyMonthsSoFar?: number;         // pour l'explication : rang du mois vide (1 = premier mois de vacance)
  // Flux ponctuels (événements) : dépôt de garantie, sortie du locataire, travaux imprévus.
  oneOff?: { depositReceived?: number; depositRefunded?: number; repairCosts?: number; reletFees?: number; unexpectedWorks?: number };
  // Événements sans effet direct sur la trésorerie du mois (préavis donné, congé, départ...) : simplement expliqués.
  notes?: { code: ExplanationCode; message: string }[];
}

export interface MonthlyLines {
  rentDue: number;
  rentCollected: number;
  recoverableChargesPaid: number;
  recoverableChargesCollected: number;
  nonRecoverableCharges: number;
  loanPayment: number;
  loanInterest: number;    // part intérêts de la mensualité
  loanPrincipal: number;   // capital remboursé (enrichissement : il augmente tes fonds propres)
  loanInsurance: number;   // part assurance
  depositReceived: number;   // dépôt de garantie encaissé (à restituer plus tard)
  depositRefunded: number;   // dépôt restitué au locataire (après retenues)
  repairCosts: number;       // réparations après le départ du locataire
  reletFees: number;         // frais de remise en location (état des lieux, diagnostics, annonce)
  unexpectedWorks: number;   // travaux imprévus (panne, fuite...)
  rentTax: number;
  netCashFlow: number;
}

export type ExplanationCode =
  | 'INDEXATION' | 'INDEXATION_FROZEN' | 'VACANCY' | 'LATE_PAYMENT' | 'ARREARS'
  | 'CATCH_UP' | 'ARREARS_RECOVERED' | 'NOT_LISTED' | 'PENDING_WORKS' | 'NORMAL'
  | 'DEPOSIT_RECEIVED' | 'DEPOSIT_REFUNDED' | 'REPAIRS' | 'RELET_FEES' | 'UNEXPECTED_WORKS'
  | 'TENANT_NOTICE' | 'TENANT_LEFT' | 'LANDLORD_NOTICE' | 'DEFAULT_ENDED' | 'EVENT';

export interface Explanation {
  code: ExplanationCode;
  message: string;
  cashFlowImpact: number; // effet exact sur le cash-flow vs un mois normal (€)
}

export interface MonthlyStatement {
  year: number;
  month: number;
  lines: MonthlyLines;
  normalMonthCashFlow: number;          // cash-flow d'un mois « normal » de référence
  carryOverToNextMonth: AmountPair;     // retard à encaisser le mois suivant
  unpaidAdded: AmountPair;              // impayé ajouté à la dette du locataire
  explanations: Explanation[];
}

const eur = (x: number): string => `${x.toFixed(2).replace('.', ',')} €`;

const nonRecoverableMonthly = (i: MonthlyInput): number =>
  round2((i.nonRecoverableAnnual.condoFees + i.nonRecoverableAnnual.propertyTax + i.nonRecoverableAnnual.insurance + i.nonRecoverableAnnual.maintenance) / 12);

interface Scenario {
  rent: number;
  status: TenantStatus;
  carry?: AmountPair;
  recovered?: AmountPair;
  oneOff?: boolean;
}

const computeLines = (i: MonthlyInput, s: Scenario): { lines: MonthlyLines; carryOut: AmountPair; unpaid: AmountPair } => {
  const provisions = i.recoverableCharges;
  const carry = s.carry ?? { rent: 0, charges: 0 };
  const rec = s.recovered ?? { rent: 0, charges: 0 };
  const due = s.status === 'vacant' ? 0 : s.rent;
  const provisionsDue = s.status === 'vacant' ? 0 : provisions;

  let rentPaid = 0;
  let chargesPaid = 0;
  let carryOut: AmountPair = { rent: 0, charges: 0 };
  let unpaid: AmountPair = { rent: 0, charges: 0 };
  if (s.status === 'paying') { rentPaid = due; chargesPaid = provisionsDue; }
  else if (s.status === 'late') carryOut = { rent: due, charges: provisionsDue };
  else if (s.status === 'defaulting') unpaid = { rent: due, charges: provisionsDue };

  const rentCollected = round2(rentPaid + carry.rent + rec.rent);
  const chargesCollected = round2(chargesPaid + carry.charges + rec.charges);
  const tax = computeRentTax(rentCollected, i.taxRatePct);
  const lines: MonthlyLines = {
    rentDue: round2(due),
    rentCollected,
    recoverableChargesPaid: round2(provisions), // le propriétaire avance toujours les charges
    recoverableChargesCollected: chargesCollected,
    nonRecoverableCharges: nonRecoverableMonthly(i),
    loanPayment: round2(i.loanPayment),
    loanInterest: round2(i.loanBreakdown?.interest ?? 0),
    loanPrincipal: round2(i.loanBreakdown?.principal ?? 0),
    loanInsurance: round2(i.loanBreakdown?.insurance ?? 0),
    depositReceived: s.oneOff ? round2(i.oneOff?.depositReceived ?? 0) : 0,
    depositRefunded: s.oneOff ? round2(i.oneOff?.depositRefunded ?? 0) : 0,
    repairCosts: s.oneOff ? round2(i.oneOff?.repairCosts ?? 0) : 0,
    reletFees: s.oneOff ? round2(i.oneOff?.reletFees ?? 0) : 0,
    unexpectedWorks: s.oneOff ? round2(i.oneOff?.unexpectedWorks ?? 0) : 0,
    rentTax: tax,
    netCashFlow: 0,
  };
  lines.netCashFlow = round2(
    lines.rentCollected + lines.recoverableChargesCollected - lines.recoverableChargesPaid -
    lines.nonRecoverableCharges - lines.loanPayment - lines.rentTax +
    lines.depositReceived - lines.depositRefunded - lines.repairCosts - lines.reletFees - lines.unexpectedWorks
  );
  return { lines, carryOut, unpaid };
};

export const buildMonthlyStatement = (input: MonthlyInput): MonthlyStatement => {
  if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) throw new EngineInputError('month doit être entre 1 et 12');
  assertNonNegative(input.rent, 'rent');
  assertNonNegative(input.recoverableCharges, 'recoverableCharges');
  assertNonNegative(input.loanPayment, 'loanPayment');
  for (const [k, v] of Object.entries(input.nonRecoverableAnnual)) assertNonNegative(v, `nonRecoverableAnnual.${k}`);
  if (input.loanBreakdown) {
    const b = input.loanBreakdown;
    assertNonNegative(b.interest, 'loanBreakdown.interest'); assertNonNegative(b.principal, 'loanBreakdown.principal'); assertNonNegative(b.insurance, 'loanBreakdown.insurance');
    if (Math.abs(round2(b.interest + b.principal + b.insurance) - round2(input.loanPayment)) > 0.005) {
      throw new EngineInputError('La ventilation du prêt ne correspond pas à la mensualité');
    }
  }
  if (input.revision && input.status === 'vacant') throw new EngineInputError('Pas de révision de loyer sur un logement vide');

  const previousRent = input.revision ? input.revision.previousRent : input.rent;

  // Étapes successives : chacune modifie UNE cause, l'impact est la différence de cash-flow.
  const s0 = computeLines(input, { rent: previousRent, status: 'paying' });
  const s1 = computeLines(input, { rent: input.rent, status: 'paying' });
  const s2 = computeLines(input, { rent: input.rent, status: input.status });
  const s3 = computeLines(input, { rent: input.rent, status: input.status, carry: input.carryOverIn });
  const s4 = computeLines(input, { rent: input.rent, status: input.status, carry: input.carryOverIn, recovered: input.arrearsRecovered });
  const s5 = computeLines(input, { rent: input.rent, status: input.status, carry: input.carryOverIn, recovered: input.arrearsRecovered, oneOff: true });

  const explanations: Explanation[] = [];
  const impact = (a: { lines: MonthlyLines }, b: { lines: MonthlyLines }): number => round2(b.lines.netCashFlow - a.lines.netCashFlow);

  if (input.revision) {
    const r = input.revision;
    if (r.applied) {
      explanations.push({
        code: 'INDEXATION',
        message: `Indexation annuelle (IRL) de +${r.appliedPct.toFixed(2).replace('.', ',')} % : loyer passé de ${eur(r.previousRent)} à ${eur(r.newRent)}. La hausse suit l'indice, tu ne la fixes pas.`,
        cashFlowImpact: impact(s0, s1),
      });
    } else if (r.reason === 'FROZEN_ENERGY_F_G') {
      explanations.push({
        code: 'INDEXATION_FROZEN',
        message: `Loyer gelé : un logement classé F ou G n'a pas le droit d'être révisé à la hausse. Loyer inchangé (${eur(r.previousRent)}).`,
        cashFlowImpact: 0,
      });
    }
  }

  const statusImpact = impact(s1, s2);
  if (input.status === 'vacant') {
    const rank = input.vacancyMonthsSoFar;
    explanations.push({
      code: 'VACANCY',
      message: `Logement vide : ${eur(input.rent)} de loyer non perçu` +
        (input.recoverableCharges > 0 ? ` et ${eur(input.recoverableCharges)} de charges récupérables qui restent à ta charge` : '') +
        (rank !== undefined ? ` (mois n°${rank} de vacance).` : '.'),
      cashFlowImpact: statusImpact,
    });
  } else if (input.status === 'late') {
    explanations.push({
      code: 'LATE_PAYMENT',
      message: `Le locataire paie avec un mois de retard : ${eur(s2.carryOut.rent + s2.carryOut.charges)} ne sont pas encaissés ce mois-ci, ils seront encaissés le mois prochain (simple décalage, rien n'est perdu).`,
      cashFlowImpact: statusImpact,
    });
  } else if (input.status === 'defaulting') {
    explanations.push({
      code: 'ARREARS',
      message: `Impayé : le locataire n'a rien payé (${eur(s2.unpaid.rent)} de loyer et ${eur(s2.unpaid.charges)} de charges dus). Les charges restent à ta charge, la dette est enregistrée.`,
      cashFlowImpact: statusImpact,
    });
  }

  if (input.carryOverIn && (input.carryOverIn.rent > 0 || input.carryOverIn.charges > 0)) {
    explanations.push({
      code: 'CATCH_UP',
      message: `Rattrapage du retard du mois précédent : ${eur(input.carryOverIn.rent + input.carryOverIn.charges)} encaissés en plus.`,
      cashFlowImpact: impact(s2, s3),
    });
  }
  if (input.arrearsRecovered && (input.arrearsRecovered.rent > 0 || input.arrearsRecovered.charges > 0)) {
    explanations.push({
      code: 'ARREARS_RECOVERED',
      message: `Impayé récupéré : ${eur(input.arrearsRecovered.rent + input.arrearsRecovered.charges)} encaissés (dépôt de garantie, assurance ou procédure).`,
      cashFlowImpact: impact(s3, s4),
    });
  }
  const o = input.oneOff;
  const pos = (v: number | undefined) => round2(v ?? 0);
  if (pos(o?.depositReceived) > 0) explanations.push({ code: 'DEPOSIT_RECEIVED', cashFlowImpact: pos(o?.depositReceived),
    message: `Dépôt de garantie encaissé : ${eur(pos(o?.depositReceived))}. Cet argent n'est pas un revenu : il devra être restitué au départ du locataire (moins les retenues justifiées).` });
  if (pos(o?.depositRefunded) > 0) explanations.push({ code: 'DEPOSIT_REFUNDED', cashFlowImpact: -pos(o?.depositRefunded),
    message: `Dépôt de garantie restitué au locataire : ${eur(pos(o?.depositRefunded))}.` });
  if (pos(o?.repairCosts) > 0) explanations.push({ code: 'REPAIRS', cashFlowImpact: -pos(o?.repairCosts),
    message: `Réparations après le départ du locataire : ${eur(pos(o?.repairCosts))} (la part couverte par le dépôt de garantie a été retenue sur sa restitution).` });
  if (pos(o?.reletFees) > 0) explanations.push({ code: 'RELET_FEES', cashFlowImpact: -pos(o?.reletFees),
    message: `Frais de remise en location (état des lieux, diagnostics, annonce) : ${eur(pos(o?.reletFees))}.` });
  if (pos(o?.unexpectedWorks) > 0) explanations.push({ code: 'UNEXPECTED_WORKS', cashFlowImpact: -pos(o?.unexpectedWorks),
    message: `Travaux imprévus : ${eur(pos(o?.unexpectedWorks))}.` });
  for (const n of input.notes ?? []) explanations.push({ code: n.code, message: n.message, cashFlowImpact: 0 });
  void s5;

  if (explanations.length === 0) {
    explanations.push({ code: 'NORMAL', message: 'Mois normal : loyer et charges encaissés à temps, aucune variation.', cashFlowImpact: 0 });
  }

  return {
    year: input.year,
    month: input.month,
    lines: s5.lines,
    normalMonthCashFlow: s0.lines.netCashFlow,
    carryOverToNextMonth: s5.carryOut,
    unpaidAdded: s5.unpaid,
    explanations,
  };
};
