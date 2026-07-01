const DAY_MS = 24 * 60 * 60 * 1000;

const parseIsoDateToUtc = (value: string): number | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const time = Date.UTC(year, month - 1, day);
    const parsed = new Date(time);

    if (
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day
    ) {
        return null;
    }

    return time;
};

const formatUtcDate = (time: number) => {
    const date = new Date(time);
    return [
        date.getUTCFullYear(),
        String(date.getUTCMonth() + 1).padStart(2, "0"),
        String(date.getUTCDate()).padStart(2, "0"),
    ].join("-");
};

export const dateRangeHasOnlyAvailableDates = (
    fromDate: string,
    toDate: string,
    availableDates: string[] | Set<string>,
) => {
    const startTime = parseIsoDateToUtc(fromDate);
    const endTime = parseIsoDateToUtc(toDate);
    if (startTime === null || endTime === null || startTime > endTime) return false;

    const availableDateSet = availableDates instanceof Set ? availableDates : new Set(availableDates);
    for (let time = startTime; time <= endTime; time += DAY_MS) {
        if (!availableDateSet.has(formatUtcDate(time))) return false;
    }
    return true;
};
