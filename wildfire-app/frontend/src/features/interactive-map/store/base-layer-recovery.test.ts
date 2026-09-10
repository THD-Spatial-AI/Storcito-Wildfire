import { describe, expect, it } from "vitest";
import { chooseRasterFallbackLayerId } from "./base-layer-recovery";

describe("chooseRasterFallbackLayerId", () => {
  it("moves from OSM Standard to CARTO Positron", () => {
    expect(chooseRasterFallbackLayerId("osm_standard")).toBe("carto_positron");
  });

  it("skips providers that are cooling down", () => {
    expect(
      chooseRasterFallbackLayerId(
        "osm_standard",
        new Set(["osm_standard", "carto_positron"]),
      ),
    ).toBe("osm_humanitarian");
  });

  it("returns to OSM Standard after a CARTO failure", () => {
    expect(chooseRasterFallbackLayerId("carto_positron")).toBe("osm_standard");
  });

  it("returns null when every alternative is unavailable", () => {
    expect(
      chooseRasterFallbackLayerId(
        "osm_standard",
        new Set(["osm_standard", "carto_positron", "osm_humanitarian"]),
      ),
    ).toBeNull();
  });
});
