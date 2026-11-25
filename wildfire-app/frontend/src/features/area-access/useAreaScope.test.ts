import { describe, expect, it, vi } from "vitest";
import type { BoundaryItem } from "@/features/admin-boundaries/types";

const item = (code: string, parent: string | null = null, covered = true): BoundaryItem => ({ code, name: code, parent_code: parent, covered });

// engine lists mocked
vi.mock("@/features/admin-boundaries/services/boundariesService", () => ({
	boundariesService: {
		list: vi.fn(async (level: string, parent?: string) => {
			if (level === "community") return [item("12", "ES"), item("03", "ES", false)];
			if (level === "province" && parent === "12") return ["15", "27", "32", "36"].map((c) => item(c, "12"));
			return [];
		}),
	},
}));

const { buildAreaScope } = await import("./useAreaScope");

describe("buildAreaScope", () => {
	it("one municipality drills down", async () => {
		const s = await buildAreaScope([{ level: "municipality", code: "27029" }]);
		expect(s.filterItems("community", [item("12"), item("03")]).map((i) => i.code)).toEqual(["12"]);
		expect(s.filterItems("province", ["15", "27", "32"].map((c) => item(c))).map((i) => i.code)).toEqual(["27"]);
		expect(s.filterItems("municipality", [item("27029"), item("27030")]).map((i) => i.code)).toEqual(["27029"]);
		// parents not usable
		expect(s.canApply("province", item("27"))).toBe(false);
		expect(s.canApply("municipality", item("27029"))).toBe(true);
	});

	it("whole community allows all", async () => {
		const s = await buildAreaScope([{ level: "community", code: "12" }]);
		expect(s.canApply("community", item("12"))).toBe(true);
		expect(s.canApply("province", item("32"))).toBe(true);
		expect(s.canApply("municipality", item("36047"))).toBe(true);
		expect(s.canApply("province", item("33"))).toBe(false);
	});
});
