import React from "react";
import type { ModelStatus } from "@/types/models";
import { useTranslation } from "@/i18n";

interface SimulationProgressProps {
  status: ModelStatus;
}

const STAGES = [
  { key: "queued", labelKey: "simulation.progress.queued", defaultLabel: "Queued" },
  { key: "assessing", labelKey: "simulation.progress.assessing", defaultLabel: "Assessing" },
  { key: "done", labelKey: "simulation.progress.done", defaultLabel: "Done" },
] as const;

const getActiveStage = (status: ModelStatus): number => {
  switch (status) {
    case "queue":
      return 0;
    case "calculating":
      return 1;
    case "running":
      return 1;
    case "processing":
      return 1;
    default:
      return -1;
  }
};

export const SimulationProgress: React.FC<SimulationProgressProps> = ({ status }) => {
  const { t } = useTranslation();
  const activeStage = getActiveStage(status);
  if (activeStage < 0) return null;

  return (
    <div className="flex items-center gap-1">
      {STAGES.map((stage, i) => {
        const isActive = i === activeStage;
        const isCompleted = i < activeStage;

        return (
          <React.Fragment key={stage.key}>
            {i > 0 && (
              <div
                className={`w-3 h-px ${
                  isCompleted || isActive ? "bg-blue-400" : "bg-muted-foreground/30"
                }`}
              />
            )}
            <div className="flex items-center gap-0.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  isActive
                    ? "bg-blue-500 ring-2 ring-blue-200 dark:ring-blue-800 animate-pulse"
                    : isCompleted
                    ? "bg-blue-400"
                    : "bg-muted-foreground/30"
                }`}
              />
              <span
                className={`text-[10px] ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400 font-medium"
                    : isCompleted
                    ? "text-blue-400"
                    : "text-muted-foreground/50"
                }`}
              >
                {t(stage.labelKey, stage.defaultLabel)}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
