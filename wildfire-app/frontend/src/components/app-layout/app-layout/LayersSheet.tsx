import { Layers } from "lucide-react";
import { useTranslation } from "@/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@spatialhub/ui";

import { cn } from "@/lib/utils";
import { NAV_ROW_CLASS } from "@/components/ui/SidebarButton";

type BaseLayerInfo = {
  id: string;
  name: string;
  description: string;
};

interface LayersSheetProps {
  baseLayers: BaseLayerInfo[];
  selectedBaseLayerId: string;
  changeBaseLayer: (layerId: string) => void;
  expanded?: boolean;
}

/** base map picker */
export const LayersSheet: React.FC<LayersSheetProps> = ({
  baseLayers,
  selectedBaseLayerId,
  changeBaseLayer,
  expanded = false,
}) => {
  const { t } = useTranslation();
  const label = t("mapLayers.tooltip", "Base Maps");
  const descriptions: Record<string, string> = {
    osm_standard: t("mapLayers.baseLayers.osmStandard"),
    carto_positron: t("mapLayers.baseLayers.cartoPositron"),
  };

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-tour="layers"
              aria-label={label}
              className={
                expanded
                  ? NAV_ROW_CLASS
                  : cn(
                      "cursor-pointer w-9 h-9 rounded-button flex items-center justify-center transition-all duration-normal relative group",
                      "border-2 border-transparent hover:bg-muted"
                    )
              }
            >
              <Layers className="cursor-pointer w-5 h-5 shrink-0 text-muted-foreground group-hover:text-foreground" />
              {expanded && <span className="truncate">{label}</span>}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>

      {/* small card beside */}
      <DropdownMenuContent side="right" align="start" sideOffset={8} className="z-[60] w-64 p-1.5">
        <p className="px-2 pb-1.5 pt-1 text-xs font-semibold text-foreground">{t("mapLayers.title")}</p>
        <div role="group" aria-label={t("mapLayers.title")}>
          {baseLayers.map((layer) => {
            const active = layer.id === selectedBaseLayerId;
            return (
              <DropdownMenuItem
                key={layer.id}
                role="menuitemradio"
                aria-checked={active}
                onSelect={() => changeBaseLayer(layer.id)}
                className={cn("flex items-start gap-2.5 rounded-lg px-2 py-2", active && "bg-muted")}
              >
                {/* radio dot */}
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                    active ? "border-foreground" : "border-muted-foreground"
                  )}
                >
                  {active && <span className="size-2 rounded-full bg-foreground" />}
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="text-sm font-medium text-foreground">{layer.name}</span>
                  <span className="text-xs text-muted-foreground">{descriptions[layer.id] || layer.description}</span>
                </span>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
