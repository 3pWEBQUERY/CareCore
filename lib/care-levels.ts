// Swiss care levels (KLV Art. 7a: 12 levels of 20 minutes care time each, assessed with BESA or RAI).
export const NOT_ASSESSED = "Noch nicht eingestuft";
export const CARE_LEVELS = Array.from({ length: 12 }, (_, index) => `Pflegestufe ${index + 1}`);
