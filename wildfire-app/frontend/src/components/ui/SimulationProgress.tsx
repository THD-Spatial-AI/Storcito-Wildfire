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

  const stageLabels = STAGES.map((stage) => t(stage.labelKey, stage.defaultLabel));

  return (
    <div
      className="flex items-center gap-[3px]"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={STAGES.length}
      aria-valuenow={activeStage + 1}
      aria-valuetext={stageLabels[activeStage]}
      title={stageLabels.join(" → ")}
    >
      {STAGES.map((stage, i) => (
        <span
          key={stage.key}
          className={`h-1 rounded-full transition-all duration-300 ${
            i < activeStage
              ? "w-3 bg-blue-500/50"
              : i === activeStage
                ? "w-5 bg-blue-500 animate-pulse"
                : "w-3 bg-muted-foreground/20"
          }`}
        />
      ))}
    </div>
  );
};
