import { useEffect, useId, useMemo, useRef, useState, type FC, type KeyboardEvent } from "react";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

import type { BoundaryItem } from "../types";
import { filterBoundaries } from "../utils";

interface BoundaryLevelSelectProps {
  label: string;
  items: BoundaryItem[];
  value: BoundaryItem | null;
  loading?: boolean;
  disabled?: boolean;
  /** allow clearing */
  clearable?: boolean;
  onChange: (item: BoundaryItem | null) => void;
}

export const BoundaryLevelSelect: FC<BoundaryLevelSelectProps> = ({
  label,
  items,
  value,
  loading = false,
  disabled = false,
  clearable = true,
  onChange,
}) => {
  const { t } = useTranslation();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => filterBoundaries(items, query), [items, query]);

  const isDisabled = disabled || (!loading && items.length === 0);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    setTimeout(() => inputRef.current?.focus(), 0);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => setActive(0), [query, open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (item: BoundaryItem) => {
    if (!item.covered) return;
    onChange(item);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = filtered[active];
      if (item) choose(item);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <label htmlFor={id} className="mb-1 block text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <button
          id={id}
          type="button"
          disabled={isDisabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-left text-sm text-foreground transition-colors duration-150 hover:border-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground")}>
            {value?.name ?? (loading ? t("boundaries.loading", "Loading…") : t("boundaries.select", "Select…"))}
          </span>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
          )}
        </button>
        {clearable && value && !disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={t("boundaries.clear", "Clear")}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="md-fade-in absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("boundaries.search", "Search…")}
              role="combobox"
              aria-controls={`${id}-list`}
              aria-expanded
              aria-activedescendant={filtered[active] ? `${id}-${filtered[active].code}` : undefined}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul id={`${id}-list`} ref={listRef} role="listbox" className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <li className="px-2.5 py-3 text-center text-xs text-muted-foreground">
                {t("boundaries.noResults", "No matches.")}
              </li>
            )}
            {filtered.map((item, index) => {
              const isSelected = value?.code === item.code;
              return (
                <li
                  key={item.code}
                  id={`${id}-${item.code}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={!item.covered}
                  data-index={index}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(item)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm",
                    index === active && item.covered && "bg-muted",
                    !item.covered && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span className={cn("min-w-0 flex-1 truncate", isSelected && "font-semibold")}>{item.name}</span>
                  {!item.covered && (
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {t("boundaries.noData", "No data")}
                    </span>
                  )}
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
