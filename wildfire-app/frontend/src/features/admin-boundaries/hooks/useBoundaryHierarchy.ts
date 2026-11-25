import { useCallback, useEffect, useRef, useState } from "react";

import { boundariesService } from "../services/boundariesService";
import type { BoundaryItem, BoundaryLevelConfig, BoundaryLevelId, BoundarySelection } from "../types";
import { leadingAutoPicks, singleChoice } from "../utils";

interface UseBoundaryHierarchyOptions {
  levels: BoundaryLevelConfig[];
  onApply: (selection: BoundarySelection) => void;
  onError?: (error: unknown) => void;
  /** visible options only */
  filterItems?: (level: BoundaryLevelId, items: BoundaryItem[]) => BoundaryItem[];
  /** usable as area */
  canApply?: (level: BoundaryLevelId, item: BoundaryItem) => boolean;
}

interface BoundaryHierarchyApi {
  options: BoundaryItem[][];
  selected: (BoundaryItem | null)[];
  loading: boolean[];
  applying: boolean;
  failed: boolean;
  select: (index: number, item: BoundaryItem | null) => void;
  resetUserChoices: () => void;
  retry: () => void;
}

/** cascading level state */
export const useBoundaryHierarchy = ({
  levels,
  onApply,
  onError,
  filterItems,
  canApply,
}: UseBoundaryHierarchyOptions): BoundaryHierarchyApi => {
  const count = levels.length;
  const [options, setOptions] = useState<BoundaryItem[][]>(() => levels.map(() => []));
  const [selected, setSelected] = useState<(BoundaryItem | null)[]>(() => levels.map(() => null));
  const [loading, setLoading] = useState<boolean[]>(() => levels.map(() => false));
  const [applying, setApplying] = useState(false);
  const [failed, setFailed] = useState(false);

  // latest request level
  const tokens = useRef<number[]>(levels.map(() => 0));
  const applyToken = useRef(0);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const callbacks = useRef({ onApply, onError, filterItems, canApply });
  callbacks.current = { onApply, onError, filterItems, canApply };
  const applicable = useCallback(
    (index: number, item: BoundaryItem) =>
      levels[index].selectable && item.covered && (callbacks.current.canApply?.(levels[index].id, item) ?? true),
    [levels]
  );

  const setAt = <T,>(list: T[], index: number, value: T) => list.map((v, i) => (i === index ? value : v));
  // value from index on
  const fillFrom = <T,>(list: T[], index: number, value: T) => list.map((v, i) => (i >= index ? value : v));

  const resetFrom = useCallback(
    (index: number) => {
      for (let i = index; i < count; i += 1) tokens.current[i] += 1;
      setOptions((prev) => fillFrom(prev, index, [] as BoundaryItem[]));
      setSelected((prev) => fillFrom(prev, index, null));
      setLoading((prev) => fillFrom(prev, index, false));
    },
    [count]
  );

  const apply = useCallback(
    async (index: number, path: BoundaryItem[]) => {
      const level = levels[index];
      const item = path[index];
      const token = ++applyToken.current;
      setApplying(true);
      try {
        const detail = await boundariesService.get(level.id, item.code);
        if (token !== applyToken.current) return;
        callbacks.current.onApply({ ...detail, path: path.slice(0, index + 1) });
      } catch (error) {
        if (token === applyToken.current) callbacks.current.onError?.(error);
      } finally {
        if (token === applyToken.current) setApplying(false);
      }
    },
    [levels]
  );

  const load = useCallback(
    // parent path passed
    async (index: number, parent?: string, parentPath: BoundaryItem[] = []) => {
      if (index >= count) return;
      const token = ++tokens.current[index];
      setLoading((prev) => setAt(prev, index, true));
      try {
        const raw = await boundariesService.list(levels[index].id, parent);
        if (token !== tokens.current[index]) return;
        const items = callbacks.current.filterItems?.(levels[index].id, raw) ?? raw;
        setFailed(false);
        setOptions((prev) => setAt(prev, index, items));
        const auto = singleChoice(items);
        if (auto) {
          setSelected((prev) => setAt(prev, index, auto));
          void load(index + 1, auto.code, [...parentPath, auto]);
          // only allowed choice
          if (callbacks.current.filterItems && index === count - 1 && applicable(index, auto)) {
            void apply(index, [...parentPath, auto]);
          }
        }
      } catch (error) {
        if (token !== tokens.current[index]) return;
        // list failure
        if (import.meta.env.DEV) console.warn("Boundary list failed:", error);
        setFailed(true);
      } finally {
        if (token === tokens.current[index]) setLoading((prev) => setAt(prev, index, false));
      }
    },
    [apply, applicable, count, levels]
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  const retry = useCallback(() => {
    setFailed(false);
    resetFrom(0);
    void load(0);
  }, [load, resetFrom]);

  const select = useCallback(
    (index: number, item: BoundaryItem | null) => {
      resetFrom(index + 1);
      setSelected((prev) => setAt(prev, index, item));
      const path = [...selectedRef.current.slice(0, index), item];

      if (item) {
        void load(index + 1, item.code, path as BoundaryItem[]);
        if (applicable(index, item)) void apply(index, path as BoundaryItem[]);
        return;
      }
      // fall back parent
      for (let i = index - 1; i >= 0; i -= 1) {
        const parentItem = path[i];
        if (parentItem && applicable(i, parentItem)) {
          void apply(i, path as BoundaryItem[]);
          return;
        }
      }
    },
    [apply, applicable, load, resetFrom]
  );

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // keep auto-picked levels
  const resetUserChoices = useCallback(() => {
    applyToken.current += 1;
    setApplying(false);
    const current = selectedRef.current;
    const firstUserLevel = leadingAutoPicks(optionsRef.current, current, count);
    if (firstUserLevel >= count || !current[firstUserLevel]) return;
    setSelected((prev) => fillFrom(prev, firstUserLevel, null));
    resetFrom(firstUserLevel + 1);
  }, [count, resetFrom]);

  return { options, selected, loading, applying, failed, select, resetUserChoices, retry };
};
