import React, { memo } from "react";
import { ChevronRight, Copy, PencilLine, Users, Clock, Pin } from "lucide-react";
import { Model } from "@/features/model-dashboard/services/modelService";
import StatusBadge from "@/components/ui/StatusBadge";
import ElapsedTimer from "@/components/ui/ElapsedTimer";
import { remainingSeconds } from "@/features/model-dashboard/utils/runtimeEstimate";
import { SimulationProgress } from "@/components/ui/SimulationProgress";
import CompletedTimer from "@/components/ui/CompletedTimer";
import { Tooltip, TooltipTrigger, TooltipContent } from "@spatialhub/ui";
import ModelRowActions from "./ModelRowActions";
import RiskLevelBadge from "./RiskLevelBadge";
import { formatDateTime, formatDateRange, formatShortDateTime } from "@/utils/dateHelpers";
import { useTranslation } from "@/i18n";
import { useFavoriteModelsStore } from "@/features/model-dashboard/store/favorite-models";
import {
  isRecentlyCompleted,
  useSeenCompletedModelsStore,
} from "@/features/model-dashboard/store/seen-completed-models";
import { isActiveStatus } from "@/features/model-dashboard/utils/statusHelpers";
import { useModelDashboardActions } from "./model-dashboard/ModelDashboardActionsContext";

const getErrorMessage = (error: unknown): string => {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
    if ("error" in error && typeof error.error === "string") {
      return error.error;
    }
    return JSON.stringify(error);
  }
  return String(error);
};

/** Compact duration. */
const formatDuration = (seconds: number): string => {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return "<1 min";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
};

/** Version row id. */
const versionRowId = (id: number): string => `model-version-row-${id}`;

interface ModelTableRowProps {
  model: Model;
  level?: number;
  parentModelTitle?: string;
  /** Family row info. */
  versionCount?: number;
  versionsExpanded?: boolean;
  familyRootId?: number;
  familyMemberIds?: number[];
  onToggleVersions?: (rootId: number) => void;
  /** Last version. */
  isLastVersion?: boolean;
}

interface ModelNameCellProps {
  modelTitle: string;
  parentModelTitle?: string;
  level: number;
  model: Model;
  isNotModelOwner: boolean | "" | 0 | null | undefined;
}

const ModelNameCell: React.FC<ModelNameCellProps> = ({
  modelTitle,
  parentModelTitle,
  level,
  model,
  isNotModelOwner,
}) => {
  const { t } = useTranslation();
  const { editingModel, editTitle, setEditTitle, updateTitle, cancelTitleEdit, startTitleEdit } =
    useModelDashboardActions();
  const isEditing = editingModel?.id === model.id;

  if (isEditing) {
    return (
      <input
        type="text"
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
        onBlur={updateTitle}
        onKeyDown={(e) => {
          if (e.key === "Enter") updateTitle();
          if (e.key === "Escape") cancelTitleEdit();
        }}
        autoFocus
        className="min-w-40 px-3 py-1.5 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-sm text-foreground"
      />
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => startTitleEdit(model)}
          className="flex min-w-0 max-w-full items-center gap-2 py-1.5 px-2.5 rounded-lg hover:bg-muted transition-colors group/title"
        >
          {level > 0 && (
            <div className="flex items-center mr-0.5">
              <div className="w-3 h-3 border-l border-b border-gray-300 dark:border-gray-600 rounded-bl-md"></div>
            </div>
          )}

          <div className="flex shrink-0 items-center gap-1.5">
            {model.is_copy && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center justify-center w-5 h-5 bg-muted rounded-md">
                    <Copy className="w-3 h-3 text-muted-foreground" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {t("model.copyOf", { name: parentModelTitle || t("model.anotherModel") })}
                </TooltipContent>
              </Tooltip>
            )}
            {isNotModelOwner && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center justify-center w-5 h-5 bg-muted rounded-md">
                    <Users className="w-3 h-3 text-muted-foreground" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {t("model.ownedBy")}: {model.user_email || t("common.unknown")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <span className={`text-sm text-foreground truncate ${level > 0 ? "font-medium" : "font-semibold"}`}>{modelTitle}</span>

          <PencilLine className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity flex-shrink-0" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <p className="break-words font-medium">{modelTitle}</p>
        <p className="text-muted-foreground">{t("common.tooltips.editName")}</p>
      </TooltipContent>
    </Tooltip>
  );
};

const ModelTableRowBase: React.FC<ModelTableRowProps> = ({
  model,
  level = 0,
  parentModelTitle,
  versionCount,
  versionsExpanded = false,
  familyRootId,
  familyMemberIds,
  onToggleVersions,
  isLastVersion = false,
}) => {
  const { t } = useTranslation();
  const {
    user,
    isSelected: isModelSelected,
    calculationStartTimes,
    runtimeEstimates,
    calculationCompletionInfo,
    canUserDeleteModel,
    hasAvailableWebservice,
    handleSelectModel,
    handleView,
    handleEdit,
    handleDownload,
    handleCopy,
    handleCalculateSingle,
    handleSingleDelete,
    handleShare,
    handleMoveToWorkspace,
  } = useModelDashboardActions();

  const runtimeEstimate = runtimeEstimates[model.id] ?? null;
  // Estimates span queued to completed,
  const remaining = isActiveStatus(model.status)
    ? remainingSeconds(
        runtimeEstimate?.totalSeconds ?? null,
        model.calculation_queued_at ?? calculationStartTimes[model.id]
      )
    : null;
  const remainingLabel =
    remaining === null
      ? null
      : remaining <= 0
        ? t("model.estimateOverdue", "taking longer than usual")
        : t("model.estimateRemaining", {
            duration: formatDuration(remaining),
            defaultValue: "~{{duration}} left",
          });
  const favoriteIds = useFavoriteModelsStore((s) => s.favoriteIds);
  const toggleFavorite = useFavoriteModelsStore((s) => s.toggleFavorite);
  const memberIds = familyMemberIds ?? [model.id];
  const versionRowIds = memberIds
    .filter((id) => id !== familyRootId)
    .map(versionRowId)
    .join(" ");
  const favorited = memberIds.some((id) => favoriteIds.includes(id));
  const handlePinToggle = () => {
    const pinned = memberIds.filter((id) => favoriteIds.includes(id));
    if (pinned.length > 0) {
      pinned.forEach(toggleFavorite);
    } else {
      toggleFavorite(memberIds[0]);
    }
  };
  const seenCompleted = useSeenCompletedModelsStore((s) => s.seen);
  const isNew = isRecentlyCompleted(model, seenCompleted);
  const indentClass = level > 0 ? "pl-8" : "";
  const isSelected = isModelSelected(model);
  const canManageModel = canUserDeleteModel(model);
  const currentUserId = user?.id ? String(user.id) : undefined;
  const userAccessLevel = user?.access_level ?? undefined;

  const isNotModelOwner =
    currentUserId && model.user_id && String(model.user_id) !== String(currentUserId);

  // Selected, then new, then version.
  const rowClassName = `group transition-colors duration-150 ${
    isSelected
      ? "bg-muted/50 shadow-[inset_2px_0_0_0_var(--primary)]"
      : isNew
        ? "bg-emerald-500/[0.06] shadow-[inset_2px_0_0_0_var(--color-emerald-500)]"
        : level > 0
          ? "bg-gray-50 hover:bg-[#F0F2F4] dark:bg-muted/20 dark:hover:bg-muted/40"
          : "hover:bg-muted/40"
  }`;

  return (
    <tr data-tour="model-row" id={level > 0 ? versionRowId(model.id) : undefined} className={rowClassName}>
      <td className={`pl-4 pr-2 py-2.5 ${indentClass}`}>
        <div className="flex items-center justify-center gap-1.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleSelectModel(model)}
            className="h-4 w-4 cursor-pointer rounded border-input accent-primary focus:ring-ring focus:ring-offset-0"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                data-tour="model-pin"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePinToggle();
                }}
                className={`rounded-md p-1 transition-all duration-150 hover:bg-muted ${
                  favorited ? "" : "opacity-40 group-hover:opacity-100 focus-visible:opacity-100"
                }`}
                aria-label={favorited ? t("model.unpin", "Unpin") : t("model.pin", "Pin to top")}
                aria-pressed={favorited}
              >
                <Pin
                  className={`h-3.5 w-3.5 transition-colors ${favorited ? "fill-primary text-primary" : "text-muted-foreground"}`}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {favorited ? t("model.unpin", "Unpin") : t("model.pin", "Pin to top")}
            </TooltipContent>
          </Tooltip>
        </div>
      </td>

      <td className={`relative w-[40%] max-w-0 pl-2 pr-4 py-2.5 ${indentClass}`}>
        {level > 0 && (
          // Version connector.
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-[2.625rem] top-0 w-px bg-gray-300 dark:bg-gray-600 ${isLastVersion ? "h-1/2" : "bottom-0"}`}
          />
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <ModelNameCell
            modelTitle={model.title.trim()}
            parentModelTitle={parentModelTitle}
            level={level}
            model={model}
            isNotModelOwner={isNotModelOwner}
          />
          {versionCount !== undefined && versionCount > 1 && onToggleVersions && familyRootId !== undefined && (
            <div className="ml-2.5 flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                data-tour="model-versions-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVersions(familyRootId);
                }}
                onKeyDown={(e) => e.stopPropagation()}
                aria-expanded={versionsExpanded}
                aria-controls={versionsExpanded ? versionRowIds : undefined}
                aria-label={
                  versionsExpanded
                    ? t("model.hideVersions", { count: versionCount - 1, defaultValue: "Hide {{count}} versions" })
                    : t("model.showVersions", { count: versionCount - 1, defaultValue: "Show {{count}} versions" })
                }
                className="relative inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-foreground/70 transition-colors before:absolute before:-inset-x-1 before:-top-0.5 before:-bottom-2 before:content-[''] hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
              >
                <ChevronRight
                  aria-hidden="true"
                  className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none ${versionsExpanded ? "rotate-90" : ""}`}
                />
                {t("model.versions", { count: versionCount - 1 })}
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="truncate text-[11px] text-muted-foreground">
                    · {t("model.originalVersion", "Original")}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {t(
                    "model.originalVersionHint",
                    "This row is the original model. Its status, period and activity are its own; each version has its own row."
                  )}
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </td>

      <td className="w-[12%] max-w-0 px-4 py-2.5">
        <span className="block truncate text-xs text-muted-foreground">
          {model.region || model.country || "—"}
        </span>
      </td>

      <td className="hidden w-[14%] whitespace-nowrap px-4 py-2.5 md:table-cell">
        <span className="text-xs tabular-nums text-muted-foreground">
          {model.from_date && model.to_date ? formatDateRange(model.from_date, model.to_date) : "–"}
        </span>
      </td>

      <td className="w-px whitespace-nowrap px-4 py-2.5">
        {model.status === "completed" && <RiskLevelBadge modelId={model.id} />}
      </td>

      <td className="whitespace-nowrap px-4 py-2.5">
        <div data-tour="model-status" className="flex items-center gap-2">
          {model.status === "failed" ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <StatusBadge status={model.status} size="small" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {model.results?.error
                  ? `${t("model.failed")}: ${getErrorMessage(model.results.error)}`
                  : t("model.failedDefaultMessage")}
              </TooltipContent>
            </Tooltip>
          ) : (
            <StatusBadge status={model.status} size="small" />
          )}

          {isNew && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  data-tour="model-new-badge"
                  onClick={() => handleView(model)}
                  className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/20 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  {t("model.recentlyCompleted", "New")}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {t("model.recentlyCompletedTooltip", {
                  time: formatDateTime(model.calculation_completed_at!),
                  defaultValue: "Finished {{time}}. Open it to see the results.",
                })}
              </TooltipContent>
            </Tooltip>
          )}

          {isActiveStatus(model.status) && calculationStartTimes[model.id] && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md">
                  <ElapsedTimer
                    startTime={calculationStartTimes[model.id]}
                    isRunning={true}
                    className="text-xs font-medium text-foreground"
                    showBlinkingIcon={true}
                  />
                  {remainingLabel && (
                    <span className="text-xs text-muted-foreground">· {remainingLabel}</span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {runtimeEstimate === null ? (
                  t(
                    "model.estimateUnavailable",
                    "Not enough comparable successful runs to estimate a finish time"
                  )
                ) : (
                  <>
                    <span>
                      {t("model.estimateBasis", {
                        typical: formatDuration(runtimeEstimate.totalSeconds),
                        count: runtimeEstimate.sampleCount,
                        defaultValue_one: "Based on 1 comparable run, which took {{typical}}",
                        defaultValue_other:
                          "Based on {{count}} comparable runs, which typically take {{typical}}",
                      })}
                    </span>
                    {runtimeEstimate.approximate && (
                      <span className="mt-1 block text-muted-foreground">
                        {t(
                          "model.estimateApproximate",
                          "Those runs predate queue tracking, so the real wait is likely longer."
                        )}
                      </span>
                    )}
                  </>
                )}
              </TooltipContent>
            </Tooltip>
          )}

          {model.status === "queue" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative flex items-center justify-center w-6 h-6 cursor-pointer">
                  <span className="absolute w-5 h-5 bg-amber-100 dark:bg-amber-900/30 rounded-full"></span>
                  <span className="absolute w-5 h-5 bg-amber-300 dark:bg-amber-600 rounded-full animate-ping opacity-50"></span>
                  <Clock className="relative w-3 h-3 text-amber-600 dark:text-amber-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("model.queuedTooltip")}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {(model.status === "queue" ||
            model.status === "calculating" ||
            model.status === "running" ||
            model.status === "processing") && <SimulationProgress status={model.status} />}

          {(model.status === "completed" ||
            model.status === "failed" ||
            model.status === "cancelled") &&
            calculationCompletionInfo[model.id] && (
              <CompletedTimer
                totalSeconds={calculationCompletionInfo[model.id].totalSeconds}
                status={model.status}
              />
            )}
        </div>
      </td>

      <td className="hidden w-px whitespace-nowrap px-4 py-2.5 md:table-cell">
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatShortDateTime(model.calculation_completed_at ?? model.updated_at)}
        </span>
      </td>

      <td className="w-px whitespace-nowrap px-4 py-2.5">
        <div className="flex items-center gap-1 transition-opacity duration-150 sm:opacity-80 sm:group-hover:opacity-100">
          <ModelRowActions
            model={model}
            currentUserId={currentUserId}
            userAccessLevel={userAccessLevel}
            onView={handleView}
            onEdit={handleEdit}
            onDownload={handleDownload}
            onCopy={handleCopy}
            onCalculate={handleCalculateSingle}
            onDelete={handleSingleDelete}
            onShare={handleShare}
            onMoveToWorkspace={handleMoveToWorkspace}
            disableDelete={!canManageModel}
            deleteTooltip={canManageModel ? t("common.delete") : t("model.sharedCannotDelete")}
            disableMoveToWorkspace={!canManageModel}
            moveToWorkspaceTooltip={
              canManageModel ? t("common.tooltips.moveToWorkspace") : t("model.sharedCannotMove")
            }
            disableShare={!canManageModel}
            shareTooltip={
              canManageModel ? t("common.tooltips.share") : t("model.sharedCannotShare")
            }
            hasAvailableWebservice={hasAvailableWebservice}
          />
        </div>
      </td>
    </tr>
  );
};

const modelSnapshotEqual = (prev: Model, next: Model): boolean =>
  prev.id === next.id &&
  prev.title === next.title &&
  prev.status === next.status &&
  prev.updated_at === next.updated_at &&
  prev.calculation_completed_at === next.calculation_completed_at &&
  prev.user_id === next.user_id &&
  prev.user_email === next.user_email &&
  prev.is_copy === next.is_copy &&
  prev.parent_model_id === next.parent_model_id &&
  prev.region === next.region &&
  prev.country === next.country &&
  prev.from_date === next.from_date &&
  prev.to_date === next.to_date &&
  modelSharesSnapshot(prev) === modelSharesSnapshot(next) &&
  getErrorMessage(prev.results?.error) === getErrorMessage(next.results?.error);

const modelSharesSnapshot = (model: Model): string =>
  (model.shares ?? [])
    .map((share) => `${share.id}:${share.email}:${share.permission}`)
    .sort()
    .join("|");

const areRowPropsEqual = (prev: ModelTableRowProps, next: ModelTableRowProps): boolean => {
  if (!modelSnapshotEqual(prev.model, next.model)) return false;

  if (prev.level !== next.level) return false;
  if (prev.parentModelTitle !== next.parentModelTitle) return false;
  if (prev.versionCount !== next.versionCount) return false;
  if (prev.versionsExpanded !== next.versionsExpanded) return false;
  if (prev.familyRootId !== next.familyRootId) return false;
  if (prev.isLastVersion !== next.isLastVersion) return false;
  if ((prev.familyMemberIds ?? []).join(",") !== (next.familyMemberIds ?? []).join(",")) return false;

  return true;
};

export const ModelTableRow = memo(ModelTableRowBase, areRowPropsEqual);
