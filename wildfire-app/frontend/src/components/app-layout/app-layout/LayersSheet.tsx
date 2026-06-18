import { useState } from "react";
import { Layers, MapIcon } from "lucide-react";
import { useTranslation } from "@/i18n";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Label,
  RadioGroup,
  RadioGroupItem,
  Separator,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@spatialhub/ui";

import { LayerInfo, layers } from "@/features/interactive-map/store/map-store";
import { cn } from "@/lib/utils";
import { SIDEBAR_WIDTH, TOPBAR_HEIGHT } from "./constants";

type BaseLayerInfo = {
  id: string;
  name: string;
  description: string;
};

interface LayersSheetProps {
  baseLayers: BaseLayerInfo[];
  selectedBaseLayerId: string;
  changeBaseLayer: (index: number) => void;
  hasAccessToLayer: (layer: LayerInfo) => boolean;
}

export const LayersSheet: React.FC<LayersSheetProps> = ({
  baseLayers,
  selectedBaseLayerId,
  changeBaseLayer,
  hasAccessToLayer,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => setIsAnimating(true), 10);
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => setOpen(false), 300);
  };

  const openSheet = () => handleOpen();
  const closeSheet = () => handleClose();

  return (
    <Sheet open={open} onOpenChange={(isOpen) => (isOpen ? openSheet() : closeSheet())}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <button
              type="button"
              data-tour="layers"
              style={
                {
                  "--sidebar-color": "#10b981",
                  "--sidebar-bg": "#d1fae5",
                } as React.CSSProperties
              }
              className={cn(
                "cursor-pointer w-11 h-11 rounded-button flex items-center justify-center transition-all duration-normal relative group",
                "border-2 border-transparent hover:bg-muted"
              )}
            >
              <Layers className="cursor-pointer w-5 h-5 text-muted-foreground group-hover:text-foreground" />
            </button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Layers</p>
        </TooltipContent>
      </Tooltip>
      <SheetContent
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--topbar-height": TOPBAR_HEIGHT,
          } as React.CSSProperties
        }
        side="left"
        className={cn(
          "p-0 h-[calc(100%-var(--topbar-height))] w-[320px] mt-[var(--topbar-height)] ml-[var(--sidebar-width)]",
          "transition-transform duration-300 ease-in-out bg-card text-foreground",
          isAnimating ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-5 py-4 border-b border-border bg-muted/50">
          <SheetTitle className="font-semibold text-base flex items-center gap-2.5 text-foreground">
            <div className="p-1.5 rounded-lg bg-foreground">
              <Layers className="size-4 text-background" />
            </div>
            {t("mapLayers.title")}
          </SheetTitle>
          <p className="text-xs text-muted-foreground mt-1.5">{t("mapLayers.description")}</p>
        </div>

        <div className="relative overflow-y-auto no-scrollbar h-[calc(100%-80px)] px-4 py-4">
          <div className="relative">
            <Accordion type="single" collapsible defaultValue="base-layers">
              <AccordionItem value="base-layers" className="border-none">
                <AccordionTrigger className="hover:no-underline py-2 px-3 rounded-lg hover:bg-muted transition-colors">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <div className="p-1 rounded bg-muted">
                      <MapIcon className="size-3.5 text-muted-foreground" />
                    </div>
                    {t("mapLayers.baseLayers.title")}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0">
                  <p className="text-xs text-muted-foreground px-1 mb-3">
                    {t("mapLayers.baseLayers.description")}
                  </p>
                  <RadioGroup
                    className="gap-2"
                    value={selectedBaseLayerId}
                    onValueChange={(val) => {
                      const idx = baseLayers.findIndex((layer) => layer.id === val);
                      if (idx >= 0) changeBaseLayer(idx);
                    }}
                  >
                    {baseLayers.map((layer) => (
                      <BaseLayerOption key={layer.id} layer={layer} />
                    ))}
                  </RadioGroup>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <Separator className="my-4 bg-border" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="p-1 rounded bg-muted">
                <Layers className="size-3.5 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">{t("mapLayers.dataLayers.title")}</span>
            </div>
            <div className="space-y-2">
              {layers.map((layer) => (
                <LayerOption key={layer.id} layer={layer} hasAccess={hasAccessToLayer(layer)} />
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

interface BaseLayerOptionProps {
  layer: BaseLayerInfo;
}

const BaseLayerOption: React.FC<BaseLayerOptionProps> = ({ layer }) => {
  const { id, name } = layer;
  const { t } = useTranslation();

  const getLayerDescription = (layerId: string) => {
    const descriptionMap: Record<string, string> = {
      osm_standard: t("mapLayers.baseLayers.osmStandard"),
      osm_humanitarian: t("mapLayers.baseLayers.osmHumanitarian"),
      carto_positron: t("mapLayers.baseLayers.cartoPositron"),
      carto_voyager: t("mapLayers.baseLayers.cartoVoyager"),
      opentopomap: t("mapLayers.baseLayers.openTopoMap"),
      maplibre_dark: t("mapLayers.baseLayers.maplibreDark", "Dark vector basemap"),
      maplibre_voyager: t("mapLayers.baseLayers.maplibreVoyager", "Detailed vector basemap"),
    };
    return descriptionMap[layerId] || layer.description;
  };

  return (
    <label
      htmlFor={id}
      className="group border border-border has-data-[state=checked]:border-foreground has-data-[state=checked]:bg-muted relative flex w-full items-start gap-3 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-muted-foreground text-left"
    >
      <RadioGroupItem
        value={id}
        id={id}
        aria-describedby={`${id}-description`}
        className="order-1 mt-0.5 cursor-pointer border-muted-foreground data-[state=checked]:border-foreground data-[state=checked]:bg-foreground"
      />
      <div className="grid grow gap-1">
        <Label htmlFor={id} className="text-sm font-medium text-foreground cursor-pointer">
          {name}
        </Label>
        <p id={`${id}-description`} className="text-muted-foreground text-xs leading-relaxed">
          {getLayerDescription(id)}
        </p>
      </div>
    </label>
  );
};

interface LayerOptionProps {
  layer: LayerInfo;
  hasAccess: boolean;
}

const LayerOption: React.FC<LayerOptionProps> = ({ layer, hasAccess }) => {
  const { id, name, color, enabled, icon: LayerIcon } = layer;

  const getLayerDescription = (layerId: string) => {
    const descriptionMap: Record<string, string> = {};
    return descriptionMap[layerId] || layer.description;
  };

  return (
    <div className="relative">
      <div
        style={{ "--layer-color": color } as React.CSSProperties}
        className={cn(
          "group border border-border cursor-pointer relative flex w-full items-center gap-3 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200",
          "hover:border-muted-foreground",
          "has-data-[state=checked]:border-foreground has-data-[state=checked]:bg-muted",
          !hasAccess && "opacity-50 pointer-events-none"
        )}
      >
        <div className="p-2 rounded-lg bg-muted group-hover:bg-accent transition-colors">
          <LayerIcon className="size-4 text-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <Label htmlFor={id} className="text-sm font-medium text-foreground cursor-pointer block">
            {name}
          </Label>
          <p id={`${id}-description`} className="text-muted-foreground text-xs mt-0.5 leading-relaxed truncate">
            {getLayerDescription(id)}
          </p>
          {!hasAccess && (
            <span className="text-amber-600 dark:text-amber-400 text-xs mt-1 flex items-center gap-1">
              <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Requires {layer.accessLevel.replace("_", " ")} access
            </span>
          )}
        </div>

        <Switch
          id={id}
          className={cn("h-5 w-9 shrink-0", "data-[state=checked]:bg-foreground cursor-pointer")}
          aria-describedby={`${id}-description`}
          {...(enabled && { checked: enabled })}
        />
      </div>
    </div>
  );
};
