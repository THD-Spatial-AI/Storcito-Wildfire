export const BUFFER_MIN = 0;
export const BUFFER_MAX = 2000;
const BUFFER_STEP = 100;
export const DEFAULT_BUFFER_DISTANCE = 0;

export const clampBuffer = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_BUFFER_DISTANCE;
  return Math.min(BUFFER_MAX, Math.max(BUFFER_MIN, value));
};

const isOnGrid = (value: number): boolean => value % BUFFER_STEP === 0;

export const stepBuffer = (current: number, direction: 1 | -1): number => {
  const clamped = clampBuffer(current);
  if (!isOnGrid(clamped)) {
    const snapped =
      direction === 1
        ? Math.ceil(clamped / BUFFER_STEP) * BUFFER_STEP
        : Math.floor(clamped / BUFFER_STEP) * BUFFER_STEP;
    return clampBuffer(snapped);
  }
  return clampBuffer(clamped + direction * BUFFER_STEP);
};
