// D'où viennent les chiffres d'une annonce : « réel » (source citée) ou « valeur de jeu ». Sert à l'écran (mentions obligatoires) ; aucun calcul ici. Fonctions pures.
// Règle d'Andreja (5 octobre 2026) : ce qui n'a pas de source ouverte porte la marque « valeur de jeu » ; un loyer réel porte l'attribution de sa source.
export type RentSource =
  | { kind: 'jeu' }
  | { kind: 'anil'; communeLabel: string; vintage: number; snapshotDate: string; estimate: 'commune' | 'maille'; lowEurM2: number; highEurM2: number; attribution: string; nature: string };

// Champs d'une fiche qui restent des VALEURS DE JEU (clé = ce que l'écran marque). À retirer d'ici quand une source réelle est branchée (taxe foncière : PR 5).
// Charges de copropriété, assurance, entretien, charges récupérables, vacance, durée des baux : aucune source ouverte par commune.
export const GAME_VALUE_FIELDS = ['rent', 'vacancy', 'tenancy', 'condoFees', 'propertyTax', 'insurance', 'maintenance', 'recoverableCharges'] as const;
export type GameValueField = (typeof GAME_VALUE_FIELDS)[number];

export interface ListingDataSources { rent: RentSource; gameValues: GameValueField[] }

// Un loyer réel retire « rent » des valeurs de jeu ; tout le reste reste marqué.
export const listingDataSources = (rent: RentSource = { kind: 'jeu' }): ListingDataSources => ({
  rent,
  gameValues: GAME_VALUE_FIELDS.filter((f) => !(f === 'rent' && rent.kind === 'anil')),
});
