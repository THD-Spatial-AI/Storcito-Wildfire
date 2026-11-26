import React, { memo } from "react";
import { ChevronDown, Loader2, PencilLine, Users, Pin } from "lucide-react";
import { Model } from "@/features/model-dashboard/services/modelService";
import StatusBadge from "@/components/ui/StatusBadge";
import { remainingSeconds } from "@/features/model-dashboard/utils/runtimeEstimate";
import { useSecondTicker } from "@/hooks/use-second-ticker";
import { formatElapsedTime } from "@/utils/timeUtils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@spatialhub/ui";
import ModelRowActions from "./ModelRowActions";
import RiskScoreCell from "./RiskScoreCell";
import { formatDateTime, formatDateRange, formatShortDateTime } from "@/utils/dateHelpers";
import { useTranslation } from "@/i18n";
import { useFavoriteModelsStore } from "@/features/model-dashboard/store/favorite-models";
import {
  isRecentlyCompleted,
  useSeenCompletedModelsStore,
} from "@/features/model-dashboard/store/seen-completed-models";
import { isActiveStatus } from "@/features/model-dashboard/utils/statusHelpers";
import { displayTitle } from "@/features/model-dashboard/utils/modelDisplay";
import { useModelDashboardActions } from "./model-dashboard/ModelDashboardActionsContext";
import { focusModelName, modelNameId } from "@/features/model-dashboard/utils/dashboardHelpers";

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

/** compact duration */
const formatDuration = (seconds: number): string => {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return "<1 min";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
};

// short date full
const DateCell: React.FC<{ value?: string | null }> = ({ value }) => (
  <td className="hidden truncate px-4 py-2 xl:table-cell">
    {value ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs tabular-nums text-foreground/70">{formatShortDateTime(value)}</span>
        </TooltipTrigger>
        <TooltipContent>{formatDateTime(value)}</TooltipContent>
      </Tooltip>
    ) : (
      <span className="text-xs text-muted-foreground">—</span>
    )}
  </td>
);

/** version row id */
const versionRowId = (id: number): string => `model-version-row-${id}`;

// run time chip
const DurationText: React.FC<{ startTime?: string; totalSeconds?: number; status?: string; spinner?: boolean }> = ({
  startTime,
  totalSeconds,
  status,
  spinner = false,
}) => {
  const { t } = useTranslation();
  const startMs = startTime ? Date.parse(startTime) : NaN;
  const now = useSecondTicker(!Number.isNaN(startMs));
  const seconds = typeof totalSeconds === "number" ? totalSeconds : Number.isNaN(startMs) ? null : (now - startMs) / 1000;
  if (seconds === null) return null;
  const time = formatElapsedTime(Math.max(0, seconds));
  const chip = (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-px text-[11px] font-medium tabular-nums text-foreground/70">
      {spinner && <Loader2 aria-hidden className="h-3 w-3 animate-spin motion-reduce:animate-none" />}
      {time}
    </span>
  );
  // finished runs explain
  const tooltipKey =
    status === "failed"
      ? "notifications.failedAfter"
      : status === "cancelled"
        ? "notifications.cancelledAfter"
        : status === "completed"
          ? "notifications.completedIn"
          : null;
  if (!tooltipKey) return chip;
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>{chip}</TooltipTrigger>
        <TooltipContent>{t(tooltipKey, { time })}</TooltipContent>
      </Tooltip>
      {/* tooltip text spoken */}
      <span className="sr-only">{t(tooltipKey, { time })}</span>
    </>
  );
};

// clicks not open
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

interface ModelTableRowProps {
  model: Model;
  level?: number;
  parentModelTitle?: string;
  /** family row info */
  versionCount?: number;
  versionsExpanded?: boolean;
  familyRootId?: number;
  familyMemberIds?: number[];
  onToggleVersions?: (rootId: number) => void;
  /** last version */
  isLastVersion?: boolean;
  /** newest activity family */
  lastActivityAt?: string;
}

interface ModelNameCellProps {
  /** admin id chip */
  showId?: boolean;
  model: Model;
  level: number;
  parentModelTitle?: string;
  isNotModelOwner: boolean;
  isNew: boolean;
  versionCount?: number;
  /** shown below xl */
  updatedLabel?: string;
  versionsExpanded: boolean;
  versionRowIds: string;
  onToggleVersions?: () => void;
  /** name opens model */
  onOpen: () => void;
}

const ModelNameCell: React.FC<ModelNameCellProps> = ({
  model,
  showId = false,
  level,
  parentModelTitle,
  isNotModelOwner,
  isNew,
  versionCount,
  updatedLabel,
  versionsExpanded,
  versionRowIds,
  onToggleVersions,
  onOpen,
}) => {
  const { t } = useTranslation();
  const { editingModel, editTitle, setEditTitle, updateTitle, cancelTitleEdit, handleView, startTitleEdit } =
    useModelDashboardActions();
  const title = displayTitle(model);
  const renameLabel = t("model.rename", "Rename");
  const ownerText = `${t("model.ownedBy")}: ${model.user_email || t("common.unknown")}`;

  if (editingModel?.id === model.id) {
    return (
      <input
        type="text"
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
        onBlur={updateTitle}
        onClick={stop}
        onKeyDown={(e) => {
          e.stopPropagation();
          // back to name
          if (e.key === "Enter") {
            void updateTitle();
            focusModelName(model.id);
          }
          if (e.key === "Escape") {
            cancelTitleEdit();
            focusModelName(model.id);
          }
        }}
        autoFocus
        aria-label={renameLabel}
        className="w-full min-w-40 px-2.5 py-1 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-sm text-foreground"
      />
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="min-w-0 flex-1">
        <div className="group/name flex min-w-0 items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              {/* keyboard open target */}
              <button
                id={modelNameId(model.id)}
                type="button"
                onClick={(e) => {
                  stop(e);
                  onOpen();
                }}
                aria-label={t("model.openModel", { name: title, defaultValue: "Open {{name}}" })}
                className={`min-w-0 truncate rounded-sm text-left text-sm text-foreground decoration-foreground/30 underline-offset-[3px] transition-colors duration-150 hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  level > 0 ? "font-medium" : "font-semibold"
                }`}
              >
                {title}
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm break-words">{model.title.trim()}</TooltipContent>
          </Tooltip>
          {showId && (
            <span className="shrink-0 rounded-md bg-muted px-1.5 py-px text-[11px] font-medium tabular-nums text-foreground/60">
              #{model.id}
            </span>
          )}
          {/* always visible rename */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  stop(e);
                  startTitleEdit(model);
                }}
                onKeyDown={stop}
                aria-label={renameLabel}
                data-compact
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-60 transition-opacity hover:bg-muted hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PencilLine className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{renameLabel}</TooltipContent>
          </Tooltip>
          {/* tree shows versions */}
          {model.is_copy && level === 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex h-5 shrink-0 items-center rounded-md bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
                  {t("model.copyBadge", "Copy")}
                </span>
              </TooltipTrigger>
              <TooltipContent>{t("model.copyOf", { name: parentModelTitle || t("model.anotherModel") })}</TooltipContent>
            </Tooltip>
          )}
          {isNotModelOwner && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Users aria-hidden className="h-3 w-3 text-muted-foreground" />
                  <span className="sr-only">
                    {ownerText}
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {ownerText}
              </TooltipContent>
            </Tooltip>
          )}
          {isNew && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  data-tour="model-new-badge"
                  data-compact
                  onClick={(e) => {
                    stop(e);
                    handleView(model);
                  }}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-px text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-500/20 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
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
        </div>
        {/* versions own line */}
        {versionCount !== undefined && versionCount > 1 && onToggleVersions && (
          <div className="mt-0.5 flex min-w-0 flex-nowrap items-center gap-1.5 whitespace-nowrap text-[11px] text-foreground/65">
            <button
              type="button"
              data-tour="model-versions-toggle"
              data-compact
              onClick={(e) => {
                stop(e);
                onToggleVersions();
              }}
              onKeyDown={stop}
              aria-expanded={versionsExpanded}
              aria-controls={versionsExpanded ? versionRowIds : undefined}
              aria-label={
                versionsExpanded
                  ? t("model.hideVersions", { count: versionCount - 1, defaultValue: "Hide {{count}} versions" })
                  : t("model.showVersions", { count: versionCount - 1, defaultValue: "Show {{count}} versions" })
              }
              className={`inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-md py-px pl-1.5 pr-1 font-medium ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                versionsExpanded
                  ? "bg-foreground text-background ring-foreground"
                  : "bg-muted/60 text-foreground/80 ring-border hover:bg-accent hover:text-foreground"
              }`}
            >
              {t("model.versionCount", { count: versionCount, defaultValue: "{{count}} versions" })}
              <ChevronDown
                aria-hidden
                className={`h-3 w-3 transition-transform duration-200 motion-reduce:transition-none ${versionsExpanded ? "rotate-180" : ""}`}
              />
            </button>
            <span className="shrink-0">· {t("model.originalVersion", "Original")}</span>
            {updatedLabel && <span className="min-w-0 truncate tabular-nums xl:hidden">· {updatedLabel}</span>}
          </div>
        )}
      </div>
    </div>
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
  lastActivityAt,
}) => {
  const { t } = useTranslation();
  const activityAt = lastActivityAt ?? model.calculation_completed_at ?? model.updated_at;
  const updatedLabel = activityAt
    ? t("model.updatedAt", { date: formatShortDateTime(activityAt), defaultValue: "Updated {{date}}" })
    : undefined;
  // matches cell rule
  const hasVersionsLine = versionCount !== undefined && versionCount > 1 && !!onToggleVersions && familyRootId !== undefined;
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
    variant,
  } = useModelDashboardActions();

  const runtimeEstimate = runtimeEstimates[model.id] ?? null;
  const active = isActiveStatus(model.status);
  const remaining = active
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
  // own pin only
  const favorited = favoriteIds.includes(model.id);
  const handlePinToggle = () => toggleFavorite(model.id);
  const seenCompleted = useSeenCompletedModelsStore((s) => s.seen);
  const isNew = isRecentlyCompleted(model, seenCompleted);
  const isAdmin = variant === "admin";
  const isSelected = isModelSelected(model);
  const canManageModel = canUserDeleteModel(model);
  const currentUserId = user?.id ? String(user.id) : undefined;
  const userAccessLevel = user?.access_level ?? undefined;
  const isNotModelOwner = Boolean(
    currentUserId && model.user_id && String(model.user_id) !== String(currentUserId)
  );

  // finished running results
  const openModel = () => {
    if (model.status === "completed" || active) handleView(model);
    else handleEdit(model);
  };

  const rowClassName = `group h-14 cursor-pointer outline-none transition-colors duration-150 motion-reduce:transition-none focus-within:bg-muted/40 ${
    isSelected
      ? "bg-muted/50 shadow-[inset_2px_0_0_0_var(--primary)]"
      : isNew
        ? "bg-emerald-500/[0.06] shadow-[inset_2px_0_0_0_var(--color-emerald-500)] hover:bg-emerald-500/[0.1]"
        : level > 0
          ? "bg-gray-50 hover:bg-[#F0F2F4] dark:bg-muted/20 dark:hover:bg-muted/40"
          : "hover:bg-muted/40"
  }`;

  const statusBadge = <StatusBadge status={model.status} size="small" />;

  return (
    <tr
      data-tour="model-row"
      id={level > 0 ? versionRowId(model.id) : undefined}
      className={rowClassName}
      // pointer opens row
      onClick={openModel}
    >
      <td className="pl-2 pr-0 py-2" onClick={stop}>
        <div className="flex items-center justify-center gap-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleSelectModel(model)}
            aria-label={t("model.selectModel", { name: displayTitle(model), defaultValue: "Select {{name}}" })}
            className="h-4 w-4 cursor-pointer rounded border-input accent-primary focus:ring-ring focus:ring-offset-0"
          />
          {!isAdmin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                data-tour="model-pin"
                data-compact
                onClick={handlePinToggle}
                className={`rounded-md p-0.5 transition-all duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  favorited ? "" : "opacity-60 hover:opacity-100 focus-visible:opacity-100"
                }`}
                aria-label={favorited ? t("model.unpin", "Unpin") : t("model.pin", "Pin to top")}
                aria-pressed={favorited}
              >
                <Pin
                  className={`h-3.5 w-3.5 transition-colors ${favorited ? "fill-primary text-primary" : "text-muted-foreground"}`}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>{favorited ? t("model.unpin", "Unpin") : t("model.pin", "Pin to top")}</TooltipContent>
          </Tooltip>
          )}
        </div>
      </td>

      <td className={`relative py-2 pr-4 ${level > 0 ? "pl-10" : "pl-2"}`}>
        {level > 0 && (
          // tree line edge
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 w-5">
            {isLastVersion ? (
              <span className="absolute left-0 top-0 h-1/2 w-4 rounded-bl-lg border-b-[1.5px] border-l-[1.5px] border-gray-300 dark:border-gray-600" />
            ) : (
              <>
                <span className="absolute inset-y-0 left-0 border-l-[1.5px] border-gray-300 dark:border-gray-600" />
                <span className="absolute left-0 top-1/2 w-4 border-t-[1.5px] border-gray-300 dark:border-gray-600" />
              </>
            )}
          </span>
        )}
        <ModelNameCell
          model={model}
          showId={isAdmin}
          level={level}
          parentModelTitle={parentModelTitle}
          isNotModelOwner={isNotModelOwner && !isAdmin}
          isNew={isNew}
          versionCount={versionCount}
          updatedLabel={updatedLabel}
          versionsExpanded={versionsExpanded}
          versionRowIds={versionRowIds}
          onToggleVersions={
            onToggleVersions && familyRootId !== undefined ? () => onToggleVersions(familyRootId) : undefined
          }
          onOpen={openModel}
        />
        {/* no versions line */}
        {updatedLabel && !hasVersionsLine && (
          <p className="mt-0.5 truncate text-[11px] tabular-nums text-muted-foreground xl:hidden">{updatedLabel}</p>
        )}
      </td>

      {/* territory owner first */}
      {isAdmin && (
      <td className="px-4 py-2">
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold uppercase text-foreground/70">
            {(model.user_email || "?").charAt(0)}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate text-xs text-foreground/80">{model.user_email || t("common.unknown")}</span>
            </TooltipTrigger>
            <TooltipContent>{model.user_email || t("common.unknown")}</TooltipContent>
          </Tooltip>
        </span>
      </td>
      )}
      <td className="px-4 py-2">
        {model.region || model.country ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-foreground/80">
                <span className="truncate">{model.region || model.country}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>{model.region || model.country}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      {!isAdmin && (
      <td className="hidden truncate px-4 py-2 md:table-cell">
        <span className="text-xs tabular-nums text-foreground/70">
          {model.from_date && model.to_date ? formatDateRange(model.from_date, model.to_date) : "–"}
        </span>
      </td>
      )}

      <td className="px-4 py-2">{model.status === "completed" ? <RiskScoreCell modelId={model.id} /> : <span className="text-xs text-muted-foreground">—</span>}</td>

      <td className="px-4 py-2">
        <div data-tour="model-status" className="flex items-center gap-1.5">
          {model.status === "failed" ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>{statusBadge}</div>
              </TooltipTrigger>
              <TooltipContent>
                {model.results?.error
                  ? `${t("model.failed")}: ${getErrorMessage(model.results.error)}`
                  : t("model.failedDefaultMessage")}
              </TooltipContent>
            </Tooltip>
          ) : (
            statusBadge
          )}
          {/* run time next */}
        {active && calculationStartTimes[model.id] ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <DurationText startTime={calculationStartTimes[model.id]} spinner />
                {remainingLabel && <span className="sr-only">, {remainingLabel}</span>}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {remainingLabel && <span className="block font-medium">{remainingLabel}</span>}
              {runtimeEstimate === null ? (
                t("model.estimateUnavailable", "Not enough comparable successful runs to estimate a finish time")
              ) : (
                <>
                  <span>
                    {t("model.estimateBasis", {
                      typical: formatDuration(runtimeEstimate.totalSeconds),
                      count: runtimeEstimate.sampleCount,
                      defaultValue_one: "Based on 1 comparable run, which took {{typical}}",
                      defaultValue_other: "Based on {{count}} comparable runs, which typically take {{typical}}",
                    })}
                  </span>
                  {runtimeEstimate.approximate && (
                    <span className="mt-1 block text-muted-foreground">
                      {t("model.estimateApproximate", "Those runs predate queue tracking, so the real wait is likely longer.")}
                    </span>
                  )}
                </>
              )}
            </TooltipContent>
          </Tooltip>
        ) : (
          <DurationText
            totalSeconds={
              model.status === "completed" || model.status === "failed"
                ? calculationCompletionInfo[model.id]?.totalSeconds
                : undefined
            }
            status={model.status}
          />
        )}
        </div>
      </td>

      {isAdmin && <DateCell value={model.created_at} />}
      <DateCell value={activityAt} />

      <td className="sticky right-0 z-[1] bg-card group-data-[overflow=true]/table:shadow-[-8px_0_8px_-8px_rgb(0_0_0/0.12)] group-hover:bg-muted py-2 pl-2 pr-4" onClick={stop}>
        <div className="flex items-center justify-end">
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
            moveToWorkspaceTooltip={canManageModel ? t("common.tooltips.moveToWorkspace") : t("model.sharedCannotMove")}
            disableShare={!canManageModel}
            shareTooltip={canManageModel ? t("common.tooltips.share") : t("model.sharedCannotShare")}
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
  if (prev.lastActivityAt !== next.lastActivityAt) return false;
  if ((prev.familyMemberIds ?? []).join(",") !== (next.familyMemberIds ?? []).join(",")) return false;

  return true;
};

export const ModelTableRow = memo(ModelTableRowBase, areRowPropsEqual);
