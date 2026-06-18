import React, { useState, useEffect } from "react";
import { Step } from "react-joyride";
import { TourController } from "./TourController";
import { useTranslation } from "@/i18n";
import {
  TourStepHeader,
  TourStepContent,
  TourTipBox,
  TourDescription,
  TourIcons,
} from "./TourStepComponents";

interface AreaSelectTourProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onConfiguratorStepChange?: (step: number) => void;
}

const CONFIGURATOR_STEP_BY_TOUR_INDEX: Array<number | null> = [
  null,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  4,
  5,
  5,
];

const useAreaSelectSteps = (): Step[] => {
  const { t } = useTranslation();
  
  return [
    {
      target: "body",
      content: (
        <TourStepContent spacing="large">
          <TourStepHeader icon={TourIcons.map("w-5 h-5 text-foreground")} title={t('tour.areaSelect.welcome.title')} variant="large" />
          <TourDescription variant="muted">
            {t('tour.areaSelect.welcome.description')}
          </TourDescription>
          <TourTipBox icon={TourIcons.info("w-4 h-4 text-muted-foreground")}>
            {t('tour.areaSelect.welcome.tip')}
          </TourTipBox>
        </TourStepContent>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[data-tour="model-name"]',
      content: (
        <TourStepContent>
          <TourStepHeader icon={TourIcons.edit("w-4 h-4 text-background")} title={t('tour.areaSelect.modelName.title')} />
          <TourDescription>
            {t('tour.areaSelect.modelName.description')}
          </TourDescription>
          <TourTipBox icon={TourIcons.pencil("w-4 h-4 text-muted-foreground")} variant="compact">
            {t('tour.areaSelect.modelName.tip')}
          </TourTipBox>
        </TourStepContent>
      ),
      placement: "left",
    },
    {
      target: '[data-tour="date-range"]',
      content: (
        <TourStepContent>
          <TourStepHeader icon={TourIcons.calendar("w-4 h-4 text-background")} title={t('tour.areaSelect.dateRange.title')} />
          <TourDescription>
            {t('tour.areaSelect.dateRange.description')}
          </TourDescription>
          <TourTipBox icon={TourIcons.lightning("w-4 h-4 text-muted-foreground")} variant="compact">
            {t('tour.areaSelect.dateRange.tip')}
          </TourTipBox>
        </TourStepContent>
      ),
      placement: "left",
    },
    {
      target: '[data-tour="calculation-status"]',
      content: (
        <TourStepContent>
          <TourStepHeader icon={TourIcons.info("w-4 h-4 text-background")} title={t('tour.areaSelect.calculationStatus.title', 'Calculation status')} />
          <TourDescription>
            {t('tour.areaSelect.calculationStatus.description', 'This line tells you whether static dates are loading, unavailable, errored, or ready for selection.')}
          </TourDescription>
          <TourTipBox icon={TourIcons.checkCircle("w-4 h-4 text-muted-foreground")} variant="compact">
            {t('tour.areaSelect.calculationStatus.tip', 'If this shows a blocker, the continue button stays disabled until the date selection is valid.')}
          </TourTipBox>
        </TourStepContent>
      ),
      placement: "left",
    },
    {
      target: '[data-tour="calculation-mode"]',
      content: (
        <TourStepContent>
          <TourStepHeader icon={TourIcons.settings("w-4 h-4 text-background")} title={t('tour.areaSelect.calculationMode.title', 'Calculation mode')} />
          <TourDescription>
            {t('tour.areaSelect.calculationMode.description', 'Choose static mode for one available fire-risk date or dynamic mode for a date range that the backend can process later.')}
          </TourDescription>
          <TourTipBox icon={TourIcons.info("w-4 h-4 text-muted-foreground")} variant="compact">
            {t('tour.areaSelect.calculationMode.tip', 'The status text below the date control tells you whether available static dates are loaded and whether the selected date is valid.')}
          </TourTipBox>
        </TourStepContent>
      ),
      placement: "left",
    },
    {
      target: '[data-tour="map-container"]',
      content: (
        <TourStepContent>
          <TourStepHeader icon={TourIcons.map("w-4 h-4 text-background")} title={t('tour.areaSelect.mapContainer.title')} />
          <TourDescription>
            {t('tour.areaSelect.mapContainer.description')}
          </TourDescription>
          <TourTipBox icon={TourIcons.search("w-4 h-4 text-muted-foreground")} variant="compact">
            {t('tour.areaSelect.mapContainer.tip')}
          </TourTipBox>
        </TourStepContent>
      ),
      placement: "center",
      spotlightClicks: true,
      disableScrolling: false,
    },
    {
      target: '[data-tour="municipality-search"]',
      content: (
        <TourStepContent>
          <TourStepHeader icon={TourIcons.search("w-4 h-4 text-background")} title={t('tour.areaSelect.search.title')} />
          <TourDescription>
            {t('tour.areaSelect.search.description')}
          </TourDescription>
          <TourTipBox icon={TourIcons.search("w-4 h-4 text-muted-foreground")} variant="compact">
            {t('tour.areaSelect.search.tip')}
          </TourTipBox>
        </TourStepContent>
      ),
      placement: "right",
    },
    {
      target: '[data-tour="area-input-mode"]',
      content: (
        <TourStepContent>
          <TourStepHeader icon={TourIcons.pencil("w-4 h-4 text-background")} title={t('tour.areaSelect.areaInput.title', 'Area input')} />
          <TourDescription>
            {t('tour.areaSelect.areaInput.description', 'Draw the area directly on the map or upload a GeoJSON Polygon/MultiPolygon boundary.')}
          </TourDescription>
          <TourTipBox icon={TourIcons.location("w-4 h-4 text-muted-foreground")} variant="compact">
            {t('tour.areaSelect.areaInput.tip', 'The model can continue only after one valid area of interest is available.')}
          </TourTipBox>
        </TourStepContent>
      ),
      placement: "right",
    },
    {
      target: '[data-tour="area-status"]',
      content: (
        <TourStepContent>
          <TourStepHeader icon={TourIcons.info("w-4 h-4 text-background")} title={t('tour.areaSelect.areaStatus.title', 'AOI status')} />
          <TourDescription>
            {t('tour.areaSelect.areaStatus.description', 'This status confirms whether the boundary is missing, drawn, uploaded, or blocked by an upload error.')}
          </TourDescription>
        </TourStepContent>
      ),
      placement: "right",
    },
    {
      target: '[data-tour="optional-layers"]',
      content: (
        <TourStepContent>
          <TourStepHeader icon={TourIcons.layers("w-4 h-4 text-background")} title={t('tour.areaSelect.optionalLayers.title', 'Risk signals')} />
          <TourDescription>
            {t('tour.areaSelect.optionalLayers.description', 'These toggles control which optional signals are sent with the model request, including fire-weather, terrain, and historical fires.')}
          </TourDescription>
          <TourTipBox icon={TourIcons.fire("w-4 h-4 text-muted-foreground")} variant="compact">
            {t('tour.areaSelect.optionalLayers.tip', 'Keep fire-weather enabled for normal risk runs; disabling it is useful only for a baseline comparison.')}
          </TourTipBox>
        </TourStepContent>
      ),
      placement: "right",
    },
    {
      target: '[data-tour="final-review"]',
      content: (
        <TourStepContent>
          <TourStepHeader icon={TourIcons.checkCircle("w-4 h-4 text-background")} title={t('tour.areaSelect.finalReview.title', 'Validation status')} />
          <TourDescription>
            {t('tour.areaSelect.finalReview.description', 'The review step checks the model name, date, AOI, risk components, and buffer before the run can start.')}
          </TourDescription>
        </TourStepContent>
      ),
      placement: "right",
    },
    {
      target: '[data-tour="save-run-summary"]',
      content: (
        <TourStepContent>
          <TourStepHeader icon={TourIcons.clipboard("w-4 h-4 text-background")} title={t('tour.areaSelect.saveSummary.title', 'Save summary')} />
          <TourDescription>
            {t('tour.areaSelect.saveSummary.description', 'This final summary shows the values that will be saved with the model and sent to the calculation workflow.')}
          </TourDescription>
        </TourStepContent>
      ),
      placement: "right",
    },
    {
      target: '[data-tour="save-button"]',
      content: (
        <TourStepContent>
          <TourStepHeader icon={TourIcons.save("w-4 h-4 text-background")} title={t('tour.areaSelect.save.title')} />
          <TourDescription>
            {t('tour.areaSelect.save.description')}
          </TourDescription>
          <TourTipBox icon={TourIcons.checkCircle("w-4 h-4 text-muted-foreground")} variant="compact">
            {t('tour.areaSelect.save.tip')}
          </TourTipBox>
        </TourStepContent>
      ),
      placement: "top",
    },
  ];
};

export const AreaSelectTour: React.FC<AreaSelectTourProps> = ({
  isOpen,
  onComplete,
  onSkip,
  onConfiguratorStepChange,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isStepReady, setIsStepReady] = useState(true);
  const areaSelectSteps = useAreaSelectSteps();

  // Reset step index when tour opens
  useEffect(() => {
    if (isOpen) {
      setStepIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const targetConfiguratorStep = CONFIGURATOR_STEP_BY_TOUR_INDEX[stepIndex] ?? null;

    setIsStepReady(false);
    if (targetConfiguratorStep) {
      onConfiguratorStepChange?.(targetConfiguratorStep);
    }

    const timeout = window.setTimeout(() => {
      setIsStepReady(true);
    }, targetConfiguratorStep ? 220 : 0);

    return () => window.clearTimeout(timeout);
  }, [isOpen, onConfiguratorStepChange, stepIndex]);

  // Keep the current tour target visible after the configurator panel changes.
  useEffect(() => {
    if (!isOpen || !isStepReady) return;
    const currentTarget = areaSelectSteps[stepIndex]?.target;
    if (typeof currentTarget !== "string" || currentTarget === "body") return;

    const timeout = window.setTimeout(() => {
        const target = document.querySelector(currentTarget);
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 80);

    return () => window.clearTimeout(timeout);
  }, [areaSelectSteps, isOpen, isStepReady, stepIndex]);

  return (
    <TourController
      steps={areaSelectSteps}
      run={isOpen && isStepReady}
      stepIndex={stepIndex}
      setStepIndex={setStepIndex}
      onComplete={onComplete}
      onSkip={onSkip}
    />
  );
};
