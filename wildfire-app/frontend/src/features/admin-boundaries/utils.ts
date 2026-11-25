import type { BoundaryItem } from "./types";

/** accent-free lowercase */
export const normalizeName = (value: string) =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();

/** match by name */
export const filterBoundaries = (items: BoundaryItem[], query: string): BoundaryItem[] => {
  const q = normalizeName(query.trim());
  const list = q ? items.filter((item) => normalizeName(item.name).includes(q)) : items;
  return [...list].sort((a, b) => Number(b.covered) - Number(a.covered));
};

/** only sensible choice */
export const singleChoice = (items: BoundaryItem[]): BoundaryItem | null => {
  if (items.length === 1) return items[0];
  const covered = items.filter((item) => item.covered);
  return covered.length === 1 ? covered[0] : null;
};

/** auto-picked leading levels */
export const leadingAutoPicks = (options: BoundaryItem[][], selected: (BoundaryItem | null)[], max: number): number => {
  let n = 0;
  while (n < max && selected[n] && singleChoice(options[n])?.code === selected[n]?.code) n += 1;
  return n;
};
