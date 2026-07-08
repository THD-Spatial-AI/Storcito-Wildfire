import { FC } from "react";
import { ArrowLeft, Calendar, Loader2, MapPin, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@spatialhub/ui";
import { WorkspaceSelector, type Workspace } from "@/components/workspace";
import type { Model } from "@/features/model-dashboard/services/modelService";

interface ViewerHeaderProps {
  model: Model | null;
  dateRange: string | null;
  loading: boolean;
  isLoadingPreference: boolean;
  selectedWorkspace: Workspace | null;
  currentWorkspace: Workspace | null;
  preferredWorkspaceId: number | null;
  workspaceModels: Model[];
  selectedModelId: number | null;
  isLoadingModels: boolean;
  wsReloadKey: number;
  hasRiskLayers: boolean;
  layerOpacity: number;
  onWorkspaceChange: (workspace: Workspace | null) => void;
  onCreateWorkspace: () => void;
  onModelChange: (modelId: string) => void;
  onOpacityChange: (opacity: number) => void;
  onRefresh: () => void;
}

// Top bar: back button, workspace/model selectors, model context, opacity, refresh.
export const ViewerHeader: FC<ViewerHeaderProps> = ({
  model,
  dateRange,
  loading,
  isLoadingPreference,
  selectedWorkspace,
  currentWorkspace,
  preferredWorkspaceId,
  workspaceModels,
  selectedModelId,
  isLoadingModels,
  wsReloadKey,
  hasRiskLayers,
  layerOpacity,
  onWorkspaceChange,
  onCreateWorkspace,
  onModelChange,
  onOpacityChange,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <header className="bg-card border-b border-border flex-shrink-0">
      <div className="px-4 py-1.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate("/app/model-dashboard")}
            className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
            aria-label={t("common.back", "Back")}
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>

          {isLoadingPreference ? (
            <div className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg bg-card text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="font-medium text-foreground">
                {t("modelResults.loadingWorkspace", "Loading workspace…")}
              </span>
            </div>
          ) : (
            <>
              <WorkspaceSelector
                onWorkspaceChange={onWorkspaceChange}
                onCreateWorkspace={onCreateWorkspace}
                reloadKey={wsReloadKey}
                initialWorkspaceId={model?.workspace?.id ?? preferredWorkspaceId ?? undefined}
                activeWorkspace={selectedWorkspace ?? currentWorkspace}
              />

              {selectedWorkspace && (
                <Select
                  value={selectedModelId?.toString() ?? ""}
                  onValueChange={onModelChange}
                  disabled={isLoadingModels || workspaceModels.length === 0}
                >
                  <SelectTrigger className="w-[220px] h-9">
                    <SelectValue
                      placeholder={
                        isLoadingModels
                          ? t("modelResults.loadingModels", "Loading models…")
                          : workspaceModels.length === 0
                            ? t("modelResults.noCompletedModels", "No completed models")
                            : t("modelResults.selectModel", "Select a model")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaceModels.map((m) => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        {m.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}

          {model && (
            <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground border-l border-border pl-4 min-w-0">
              {model.region && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">
                    {model.region
                      .split(", ")
                      .map((part) => t(`locations.${part}`, part))
                      .join(", ")}
                  </span>
                </span>
              )}
              {dateRange && (
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  {dateRange}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {hasRiskLayers && (
            <div className="h-8 px-3 inline-flex items-center gap-2 text-xs border border-border rounded-lg bg-card">
              <label htmlFor="mr-opacity" className="font-medium text-foreground">
                {t("modelResults.layer.opacity", "Opacity")}
              </label>
              <input
                id="mr-opacity"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={layerOpacity}
                onChange={(e) => onOpacityChange(Number.parseFloat(e.target.value))}
                className="w-24 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #ea580c 0%, #ea580c ${layerOpacity * 100}%, var(--muted) ${layerOpacity * 100}%, var(--muted) 100%)`,
                }}
                aria-label="Layer opacity"
              />
              <span className="w-9 text-right font-medium text-muted-foreground">
                {Math.round(layerOpacity * 100)}%
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            className="h-8 px-3 inline-flex items-center gap-2 border border-border bg-card hover:bg-muted rounded-lg transition-colors text-xs font-medium text-foreground"
            aria-label={t("common.refresh", "Refresh")}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {t("common.refresh", "Refresh")}
          </button>
        </div>
      </div>
    </header>
  );
};
