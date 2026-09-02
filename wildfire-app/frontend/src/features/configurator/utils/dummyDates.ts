/** Dev-only sample dates. */

const DAY_MS = 24 * 60 * 60 * 1000;

const toISODate = (date: Date) => date.toISOString().slice(0, 10);

/** Recent days. */
const recentDays = (count: number, offsetDays = 0): string[] => {
    const end = Date.now() - offsetDays * DAY_MS;
    return Array.from({ length: count }, (_, index) =>
        toISODate(new Date(end - (count - 1 - index) * DAY_MS)),
    );
};

export const dummyDatesEnabled = (): boolean =>
    import.meta.env.DEV && import.meta.env.VITE_DUMMY_DATES === "true";

/** Static dates. */
export const DUMMY_STATIC_DATES = (): string[] => recentDays(8, 1);

/** Dynamic dates. */
export const DUMMY_DYNAMIC_DATES = (): string[] => recentDays(14, 1);

/** Precomputed dates. */
export const DUMMY_PRECOMPUTED_DATES = (): string[] => recentDays(4, 1);
