// PROTOTYPE: the exploration variants under comparison.
export const VARIANTS = [
  { key: "orbit", name: "Orbit" },
  { key: "rows", name: "Reason rows" },
  { key: "deck", name: "Deck" },
  { key: "explore", name: "Drill down" },
] as const;
export type VariantKey = (typeof VARIANTS)[number]["key"];
