import { ReactNode } from "react";
import { Pause, Play } from "lucide-react";

import { InfoIcon } from "@/components/ui/InfoTooltip";
import { type TooltipKey } from "@/components/shared/tooltip-contents";

// Shared daily-player pieces used by the results viewer and the comparison view.

export const PlayPauseButton = ({
  playing,
  onToggle,
  playLabel,
  pauseLabel,
}: {
  playing: boolean;
  onToggle: () => void;
  playLabel: string;
  pauseLabel: string;
}) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={playing ? pauseLabel : playLabel}
    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90 hover:shadow active:scale-95"
  >
    {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
  </button>
);

export const PlayerStat = ({
  icon,
  label,
  value,
  unit,
  tooltipKey,
  className,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  unit?: string;
  tooltipKey?: TooltipKey;
  className?: string;
}) => (
  <div className={`flex items-center gap-1.5 ${className || ""}`}>
    {icon}
    <div className="flex flex-col leading-tight">
      <div className="flex items-center gap-1">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
          {label}
        </span>
        {tooltipKey && <InfoIcon tooltipKey={tooltipKey} position="top" />}
      </div>
      <span className="text-xs font-semibold tabular-nums text-foreground whitespace-nowrap">
        {value}
        {unit ? <span className="font-normal text-muted-foreground"> {unit}</span> : null}
      </span>
    </div>
  </div>
);

export function formatFrameDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
