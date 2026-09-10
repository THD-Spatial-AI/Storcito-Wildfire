import { FC } from "react";
import { Keyboard } from "lucide-react";
import { useTranslation } from "@/i18n";

import { PanelCard } from "./ViewerMapPanels";

interface ViewerShortcutsPanelProps {
  canPlay: boolean;
  can3D: boolean;
  hasRiskLayers: boolean;
}

const KEY_CLASS =
  "inline-flex h-4 min-w-4 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[9px] text-foreground";

const ShortcutRow: FC<{ keys: string[]; label: string }> = ({ keys, label }) => (
  <li className="flex items-start gap-1.5">
    <span className="flex flex-shrink-0 items-center gap-0.5">
      {keys.map((key) => (
        <kbd key={key} className={KEY_CLASS}>
          {key}
        </kbd>
      ))}
    </span>
    <span className="text-muted-foreground">{label}</span>
  </li>
);

/** Shortcut cheat-sheet card. */
export const ViewerShortcutsPanel: FC<ViewerShortcutsPanelProps> = ({
  canPlay,
  can3D,
  hasRiskLayers,
}) => {
  const { t } = useTranslation();

  return (
    <PanelCard
      icon={<Keyboard className="h-3.5 w-3.5" />}
      title={t("modelResults.shortcuts.title", "Keyboard shortcuts")}
    >
      <ul className="space-y-1 p-2 text-[10px] leading-snug">
        <ShortcutRow keys={["+", "−"]} label={t("map.shortcuts.zoom", "Zoom in and out")} />
        <ShortcutRow keys={["←", "↑", "↓", "→"]} label={t("map.shortcuts.pan", "Move the map")} />
        {canPlay && (
          <ShortcutRow
            keys={["Space"]}
            label={t("modelResults.shortcuts.playPause", "Play / pause daily animation")}
          />
        )}
        <ShortcutRow
          keys={["F"]}
          label={t("modelResults.shortcuts.fullscreen", "Toggle fullscreen")}
        />
        {can3D && (
          <ShortcutRow
            keys={["T"]}
            label={t("modelResults.shortcuts.terrain", "Toggle 3D terrain")}
          />
        )}
        {hasRiskLayers && (
          <ShortcutRow
            keys={["L"]}
            label={t("modelResults.shortcuts.toggleLayer", "Show / hide risk layer")}
          />
        )}
      </ul>
    </PanelCard>
  );
};
