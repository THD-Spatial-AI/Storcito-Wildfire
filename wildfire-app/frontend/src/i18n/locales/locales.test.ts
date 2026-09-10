import { describe, expect, it } from "vitest";

import { languages } from "../index";
import en from "./en.json";
import gl from "./gl.json";

const flattenStrings = (
  value: unknown,
  path: Array<string | number> = [],
  output = new Map<string, string>()
): Map<string, string> => {
  if (typeof value === "string") {
    output.set(path.join("."), value);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => flattenStrings(entry, [...path, index], output));
    return output;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, entry]) =>
      flattenStrings(entry, [...path, key], output)
    );
  }
  return output;
};

const placeholders = (value: string): string[] =>
  [...value.matchAll(/\{+[^{}]+\}+/gu)].map(([token]) => token).sort();

describe("Galician locale", () => {
  const english = flattenStrings(en);
  const galician = flattenStrings(gl);

  it("is available as Galego in the application language registry", () => {
    expect(languages).toContainEqual({
      code: "gl",
      name: "Galician",
      nativeName: "Galego",
      flag: "🇪🇸",
    });
  });

  it("contains every English translation key and no extras", () => {
    expect([...galician.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it("preserves interpolation placeholders", () => {
    for (const [key, source] of english) {
      expect(placeholders(galician.get(key) ?? ""), key).toEqual(placeholders(source));
    }
  });

  it("contains no translation-pipeline artifacts", () => {
    expect([...galician.values()].filter((value) => value.includes("ZXQ"))).toEqual([]);
  });
});
