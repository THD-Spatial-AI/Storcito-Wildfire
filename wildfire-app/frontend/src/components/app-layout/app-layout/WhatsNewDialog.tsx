import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@spatialhub/ui";
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  CalendarRange,
  Copy,
  Crosshair,
  ExternalLink,
  Flame,
  GraduationCap,
  Keyboard,
  LayoutGrid,
  ListTree,
  MapPin,
  Pin,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import { GITHUB_URL } from "./constants";

type ReleaseGroup = "new" | "improved" | "fixed";

interface WhatsNewItem {
  key: string;
  group: ReleaseGroup;
  icon: LucideIcon;
}

// Bump per release.
const RELEASE_DATE = "2026-10-27";
const SEEN_KEY = "whatsNew.seenVersion";

const WHATS_NEW_ITEMS: WhatsNewItem[] = [
  { key: "families", group: "new", icon: ListTree },
  { key: "tabs", group: "new", icon: LayoutGrid },
  { key: "pinning", group: "new", icon: Pin },
  { key: "newBadge", group: "new", icon: BadgeCheck },
  { key: "coordinates", group: "new", icon: Crosshair },
  { key: "tour", group: "improved", icon: GraduationCap },
  { key: "docs", group: "improved", icon: BookOpen },
  { key: "shortcuts", group: "improved", icon: Keyboard },
  { key: "fireWeather", group: "fixed", icon: Flame },
  { key: "sharing", group: "fixed", icon: Copy },
  { key: "dateField", group: "fixed", icon: CalendarRange },
];

const GROUP_STYLES: Record<ReleaseGroup, { badge: string; tile: string }> = {
  new: {
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    tile: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  improved: {
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    tile: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  fixed: {
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    tile: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
};

const GROUP_ORDER: ReleaseGroup[] = ["new", "improved", "fixed"];

const readSeen = (): string | null => {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
};

const writeSeen = (version: string) => {
  try {
    localStorage.setItem(SEEN_KEY, version);
  } catch {
    // Storage blocked.
  }
};

interface WhatsNewDialogProps {
  version: string;
}

export const WhatsNewDialog: React.FC<WhatsNewDialogProps> = ({ version }) => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [unseen, setUnseen] = useState(() => readSeen() !== version);

  const releaseDate = new Date(RELEASE_DATE).toLocaleDateString(i18n.language, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleOpen = () => {
    setOpen(true);
    if (unseen) {
      writeSeen(version);
      setUnseen(false);
    }
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            data-tour="version"
            onClick={handleOpen}
            aria-label={t("whatsNew.open")}
            className="group relative cursor-pointer rounded-full border border-border bg-muted/50 px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            v{version}
            {unseen && (
              <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{t("whatsNew.open")}</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-2xl p-0" showCloseButton={false}>
          <div className="border-b border-border px-5 pt-5 pb-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-semibold text-foreground">
                  {t("whatsNew.title")}
                </DialogTitle>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border bg-muted px-2 py-0.5 font-medium tabular-nums text-foreground">
                    {t("whatsNew.version", { version })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {t("whatsNew.released", { date: releaseDate })}
                  </span>
                </div>
              </div>
            </div>
            <DialogDescription className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("whatsNew.intro")}
            </DialogDescription>
          </div>

          <div className="max-h-[60vh] space-y-5 overflow-y-auto px-5 py-4">
            {GROUP_ORDER.map((group) => {
              const items = WHATS_NEW_ITEMS.filter((item) => item.group === group);
              const styles = GROUP_STYLES[group];
              return (
                <section key={group}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", styles.badge)}>
                      {t(`whatsNew.groups.${group}`)}
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground">{items.length}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <ul className="space-y-2">
                    {items.map(({ key, icon: Icon }) => (
                      <li key={key} className="flex gap-3 rounded-xl border border-border bg-card p-3">
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", styles.tile)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{t(`whatsNew.items.${key}.title`)}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {t(`whatsNew.items.${key}.description`)}
                          </p>
                          <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="font-medium">{t("whatsNew.where")}:</span>
                            {t(`whatsNew.items.${key}.where`)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border bg-muted px-5 py-3">
            <a
              href={`${GITHUB_URL}/commits/main`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {t("whatsNew.viewAll")}
              <ExternalLink className="h-3 w-3" />
            </a>
            <Button onClick={() => setOpen(false)} className="h-9 rounded-lg px-4 text-sm font-medium">
              {t("whatsNew.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
