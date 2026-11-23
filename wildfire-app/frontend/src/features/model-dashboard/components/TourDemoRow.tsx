import { ChevronDown, Eye, MoreHorizontal, Pin } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { useTranslation } from "@/i18n";
import { riskColor } from "@/lib/riskPalette";

/** static tour example */
export const TourDemoRow: React.FC = () => {
  const { t } = useTranslation();

  return (
    <tr
      data-tour="model-row"
      aria-hidden="true"
      className="h-14 pointer-events-none select-none bg-emerald-500/[0.06] shadow-[inset_2px_0_0_0_var(--color-emerald-500)]"
    >
      <td className="pl-2 pr-0 py-2">
        <div className="flex items-center justify-center gap-1">
          <input type="checkbox" tabIndex={-1} readOnly checked={false} className="h-4 w-4 rounded border-input" />
          <span data-tour="model-pin" className="rounded-md p-0.5">
            <Pin className="h-3.5 w-3.5 fill-primary text-primary" />
          </span>
        </div>
      </td>

      <td className="py-2 pl-2 pr-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-foreground">{t("tour.product.demo.title")}</span>
          <span
            data-tour="model-new-badge"
            className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-px text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t("model.recentlyCompleted", "New")}
          </span>
          <span className="shrink-0 rounded-full border border-dashed border-border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("tour.product.demo.example")}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span
            data-tour="model-versions-toggle"
            className="inline-flex items-center gap-0.5 rounded-md bg-muted/60 py-px pl-1.5 pr-1 font-medium text-foreground/80 ring-1 ring-border"
          >
            {t("model.versionCount", { count: 3, defaultValue: "{{count}} versions" })}
            <ChevronDown aria-hidden className="h-3 w-3" />
          </span>
          <span>· {t("model.originalVersion", "Original")}</span>
        </div>
      </td>

      <td className="px-4 py-2">
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-foreground/80">
          <span className="truncate">Galicia</span>
        </span>
      </td>

      <td className="hidden px-4 py-2 md:table-cell">
        <span className="text-xs tabular-nums text-muted-foreground">1–31 Aug 2026</span>
      </td>

      <td className="px-4 py-2">
        <span className="inline-flex items-center gap-2">
          <span className="w-8 text-right text-xs font-semibold tabular-nums text-foreground">3.92</span>
          <span className="relative h-1.5 w-20 overflow-hidden rounded-full bg-muted">
            <span className="absolute inset-y-0 left-0 w-[78%] rounded-full" style={{ backgroundColor: riskColor(4) }} />
          </span>
        </span>
      </td>

      <td className="px-4 py-2">
        <div data-tour="model-status" className="flex items-center gap-1.5">
          <StatusBadge status="completed" size="small" />
          <span className="rounded-md bg-muted px-1.5 py-px text-[11px] font-medium tabular-nums text-muted-foreground">12s</span>
        </div>
      </td>

      <td className="hidden px-4 py-2 xl:table-cell">
        <span className="text-xs tabular-nums text-muted-foreground">{t("tour.product.demo.justNow")}</span>
      </td>

      <td className="sticky right-0 z-[1] bg-card group-data-[overflow=true]/table:shadow-[-8px_0_8px_-8px_rgb(0_0_0/0.12)] group-hover:bg-muted py-2 pl-2 pr-4">
        <div className="flex items-center justify-end gap-1">
          <span
            data-tour="model-primary-action"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-foreground/80"
          >
            <Eye className="h-[18px] w-[18px]" />
          </span>
          <span
            data-tour="model-row-menu"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </span>
        </div>
      </td>
    </tr>
  );
};
