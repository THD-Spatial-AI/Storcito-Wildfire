import { ChevronRight, Eye, MoreHorizontal, Pin } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { useTranslation } from "@/i18n";

/** Static tour example row. */
export const TourDemoRow: React.FC = () => {
  const { t } = useTranslation();

  return (
    <tr
      data-tour="model-row"
      aria-hidden="true"
      className="pointer-events-none select-none bg-emerald-500/[0.06] shadow-[inset_2px_0_0_0_var(--color-emerald-500)]"
    >
      <td className="pl-4 pr-2 py-2.5">
        <div className="flex items-center justify-center gap-1.5">
          <input type="checkbox" tabIndex={-1} readOnly checked={false} className="h-4 w-4 rounded border-input" />
          <span data-tour="model-pin" className="rounded-md p-1">
            <Pin className="h-3.5 w-3.5 fill-primary text-primary" />
          </span>
        </div>
      </td>

      <td className="w-[40%] max-w-0 pl-2 pr-4 py-2.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-2 pl-2.5">
            <span className="truncate text-sm font-medium text-foreground">
              {t("tour.product.demo.title")}
            </span>
            <span className="shrink-0 rounded-full border border-dashed border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("tour.product.demo.example")}
            </span>
          </div>
          <span className="ml-2.5 flex min-w-0 items-center gap-1.5">
            <span className="inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-foreground/70">
              <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              {t("model.versions", { count: 3 })}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">· {t("model.originalVersion", "Original")}</span>
          </span>
        </div>
      </td>

      <td className="w-[12%] max-w-0 px-4 py-2.5">
        <span className="block truncate text-xs text-muted-foreground">Galicia</span>
      </td>

      <td className="hidden w-[14%] whitespace-nowrap px-4 py-2.5 md:table-cell">
        <span className="text-xs tabular-nums text-muted-foreground">1–31 Aug 2026</span>
      </td>

      <td className="w-px whitespace-nowrap px-4 py-2.5">
        <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ring-1 bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-orange-500/25">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          {t("modelResults.legend.levels.high")}
        </span>
      </td>

      <td className="whitespace-nowrap px-4 py-2.5">
        <div data-tour="model-status" className="flex items-center gap-2">
          <StatusBadge status="completed" size="small" />
          <span
            data-tour="model-new-badge"
            className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            {t("model.recentlyCompleted", "New")}
          </span>
        </div>
      </td>

      <td className="hidden w-px whitespace-nowrap px-4 py-2.5 md:table-cell">
        <span className="text-xs tabular-nums text-muted-foreground">{t("tour.product.demo.justNow")}</span>
      </td>

      <td className="w-px whitespace-nowrap px-4 py-2.5">
        <div className="flex items-center gap-1">
          <span
            data-tour="model-primary-action"
            className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground"
          >
            <Eye className="h-3.5 w-3.5" />
            {t("model.view")}
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
