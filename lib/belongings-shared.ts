// Hilfsmittel und persönliche Gegenstände je Person (Server und Oberfläche).

export const BELONGING_KINDS = { aid: "Hilfsmittel", personal: "Persönlicher Gegenstand" } as const;
export type BelongingKind = keyof typeof BELONGING_KINDS;

// Häufige Gegenstände zur Schnellauswahl (nur Bezeichnungen, frei ergänzbar).
export const BELONGING_SUGGESTIONS: Record<BelongingKind, string[]> = {
  aid: ["Brille", "Hörgerät", "Zahnprothese", "Rollator", "Rollstuhl", "Gehstock"],
  personal: ["Ehering", "Armbanduhr", "Mobiltelefon", "Portemonnaie"],
};

export type Belonging = {
  id: string;
  kind: BelongingKind;
  name: string;
  marking: string;
  location: string;
  note: string;
  updatedAt: string;
  updatedBy: string | null;
  removed: { at: string; by: string | null; reason: string } | null;
};

export type BelongingList = { residentId: string; canWrite: boolean; belongings: Belonging[] };
