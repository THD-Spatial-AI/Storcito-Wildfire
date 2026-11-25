import { describe, expect, it } from "vitest";

import { filterBoundaries, leadingAutoPicks, normalizeName, singleChoice } from "./utils";
import type { BoundaryItem } from "./types";

const item = (code: string, name: string, covered = true): BoundaryItem => ({
  code,
  name,
  parent_code: null,
  covered,
});

describe("boundary utils", () => {
  it("ignores accents and case", () => {
    expect(normalizeName("A Coruña")).toBe("a coruna");
  });

  it("filters by accent-free name", () => {
    const items = [item("15", "A Coruña"), item("27", "Lugo")];
    expect(filterBoundaries(items, "coruna").map((i) => i.code)).toEqual(["15"]);
  });

  it("lists covered items first", () => {
    const items = [item("13", "Madrid", false), item("12", "Galicia")];
    expect(filterBoundaries(items, "").map((i) => i.code)).toEqual(["12", "13"]);
  });

  it("auto-picks a single item", () => {
    expect(singleChoice([item("ES", "España")])?.code).toBe("ES");
  });

  it("auto-picks the only covered item", () => {
    expect(singleChoice([item("12", "Galicia"), item("13", "Madrid", false)])?.code).toBe("12");
  });

  it("leaves real choices to the user", () => {
    expect(singleChoice([item("15", "A Coruña"), item("27", "Lugo")])).toBeNull();
  });

  it("counts leading auto-picked levels", () => {
    const es = item("ES", "España");
    const gal = item("12", "Galicia");
    const options = [[es], [gal, item("13", "Madrid", false)], [item("15", "A Coruña"), item("27", "Lugo")]];
    expect(leadingAutoPicks(options, [es, gal, item("15", "A Coruña")], 3)).toBe(2);
    expect(leadingAutoPicks(options, [es, gal, null], 1)).toBe(1);
    expect(leadingAutoPicks(options, [null, null, null], 3)).toBe(0);
  });
});
