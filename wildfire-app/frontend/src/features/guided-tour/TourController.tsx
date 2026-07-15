import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactJoyride, { CallBackProps, STATUS, Step, EVENTS, ACTIONS } from "react-joyride";
import { buildCurvedPath } from "@/features/guided-tour/utils/tourUtils";
import { useTranslation } from "@/i18n";

interface TourControllerProps {
  steps: Step[];
  run: boolean;
  stepIndex: number;
  setStepIndex: (index: number) => void;
  onComplete: () => void;
  onSkip: () => void;
  children?: React.ReactNode;
}

export const TourController: React.FC<TourControllerProps> = ({
  steps,
  run,
  stepIndex,
  setStepIndex,
  onComplete,
  onSkip,
  children,
}) => {
  const [connector, setConnector] = useState<{
    path: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const lastActionRef = useRef<(typeof ACTIONS)[keyof typeof ACTIONS]>(ACTIONS.NEXT);
  const { t } = useTranslation();

  const applyConnector = useCallback(
    (next: { path: string; startX: number; startY: number; endX: number; endY: number } | null) => {
      setConnector((prev) => {
        if (prev === next) return prev;
        if (!prev || !next) return prev === null && next === null ? prev : next;
        const unchanged =
          prev.path === next.path &&
          prev.startX === next.startX &&
          prev.startY === next.startY &&
          prev.endX === next.endX &&
          prev.endY === next.endY;
        return unchanged ? prev : next;
      });
    },
    []
  );

  const updateConnector = useCallback(() => {
    // Small delay to ensure DOM is updated
    requestAnimationFrame(() => {
      const tooltip = document.querySelector(".react-joyride__tooltip");
      if (!tooltip) {
        applyConnector(null);
        return;
      }

      // Find target from current step
      const currentStep = steps[stepIndex];
      if (!currentStep?.target) {
        applyConnector(null);
        return;
      }

      let target: Element | null = null;
      if (typeof currentStep.target === "string") {
        target = document.querySelector(currentStep.target);
      } else if (currentStep.target instanceof Element) {
        target = currentStep.target;
      }

      if (!target || currentStep.target === "body") {
        applyConnector(null);
        return;
      }

      const tooltipRect = tooltip.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const placement = currentStep.placement || "bottom";

      applyConnector(buildCurvedPath(tooltipRect, targetRect, placement));
    });
  }, [applyConnector, stepIndex, steps]);

  // Update connector when step changes or window resizes
  useEffect(() => {
    if (run) {
      // Debounced update to prevent flickering
      let timeoutId: ReturnType<typeof setTimeout>;
      const debouncedUpdate = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(updateConnector, 50);
      };

      updateConnector();
      window.addEventListener("resize", debouncedUpdate);
      window.addEventListener("scroll", debouncedUpdate, true);

      // Watch only the configurator panel, not document.body. The map canvas
      // and react-joyride's own portal mutate the body subtree constantly, and
      // observing all of it made the connector recompute (and the floater arrow
      // re-animate) non-stop — that was the blinking. The panel is where the
      // tour targets live and switch, so it is the only thing worth watching.
      const observed = document.querySelector('[data-tour="configurator-panel"]') ?? document.body;
      const observer = new MutationObserver(debouncedUpdate);
      observer.observe(observed, { childList: true, subtree: true, attributes: false });

      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener("resize", debouncedUpdate);
        window.removeEventListener("scroll", debouncedUpdate, true);
        observer.disconnect();
      };
    } else {
      setConnector(null);
    }
  }, [run, stepIndex, updateConnector]);

  // Advance forward from `index`, completing the tour past the last step.
  const goForward = useCallback(
    (index: number) => {
      const nextIndex = index + 1;
      if (nextIndex >= steps.length) {
        onComplete();
      } else {
        setStepIndex(nextIndex);
      }
    },
    [onComplete, setStepIndex, steps.length]
  );

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;

    const isFinished = status === STATUS.FINISHED || status === STATUS.SKIPPED;
    const isClosed = action === ACTIONS.CLOSE || action === ACTIONS.SKIP;
    if (isFinished || isClosed) {
      if (action === ACTIONS.SKIP || status === STATUS.SKIPPED) {
        onSkip();
      } else {
        onComplete();
      }
      return;
    }

    // Skip a missing target in the direction the user is travelling. Always
    // stepping forward here would trap the Back button on any step whose target
    // has not mounted yet.
    if (type === EVENTS.TARGET_NOT_FOUND) {
      if (lastActionRef.current === ACTIONS.PREV) {
        if (index > 0) setStepIndex(index - 1);
      } else {
        goForward(index);
      }
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.PREV) {
        lastActionRef.current = ACTIONS.PREV;
        setStepIndex(Math.max(0, index - 1));
      } else if (action === ACTIONS.NEXT) {
        lastActionRef.current = ACTIONS.NEXT;
        goForward(index);
      }
    }
  };

  return (
    <>
      {run && connector && (
        <svg
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            pointerEvents: "none",
            zIndex: 20000,
            willChange: "auto",
          }}
        >
          <path
            d={connector.path}
            fill="none"
            stroke="#6B7280"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="6 4"
            style={{ opacity: 0.6 }}
          />
          <circle
            cx={connector.startX}
            cy={connector.startY}
            r="4"
            fill="#374151"
            stroke="white"
            strokeWidth="2"
          />
          <circle
            cx={connector.endX}
            cy={connector.endY}
            r="5"
            fill="#374151"
            stroke="white"
            strokeWidth="2"
          />
        </svg>
      )}

      {children}

      <ReactJoyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous={true}
        showProgress={false}
        showSkipButton={true}
        disableScrolling={true}
        disableOverlay={false}
        callback={handleJoyrideCallback}
        disableOverlayClose={false}
        hideCloseButton={false}
        spotlightClicks={false}
        disableScrollParentFix={true}
        floaterProps={{
          disableAnimation: true,
        }}
        spotlightPadding={4}
        styles={{
          options: {
            primaryColor: "#374151",
            backgroundColor: "var(--background, #ffffff)",
            textColor: "var(--foreground, #374151)",
            arrowColor: "var(--background, #ffffff)",
            zIndex: 20000,
          },
          tooltip: {
            fontSize: "14px",
            padding: "20px",
            borderRadius: "8px",
            maxWidth: "440px",
            maxHeight: "70vh",
            overflowY: "auto",
          },
          tooltipContainer: {
            textAlign: "left",
          },
          tooltipTitle: {
            fontSize: "18px",
            fontWeight: "bold",
            marginBottom: "10px",
          },
          tooltipContent: {
            fontSize: "14px",
            lineHeight: "1.5",
          },
          buttonNext: {
            backgroundColor: "#374151",
            color: "white",
            fontSize: "14px",
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            whiteSpace: "nowrap",
          },
          buttonBack: {
            color: "#6B7280",
            backgroundColor: "transparent",
            fontSize: "14px",
            padding: "8px 16px",
            border: "1px solid #E5E7EB",
            borderRadius: "6px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          },
          buttonSkip: {
            color: "#9CA3AF",
            backgroundColor: "transparent",
            fontSize: "14px",
            border: "none",
            cursor: "pointer",
            whiteSpace: "nowrap",
          },
          buttonClose: {
            fontSize: "14px",
            color: "#6B7280",
            cursor: "pointer",
          },
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          },
          spotlight: {
            backgroundColor: "transparent",
          },
          tooltipFooter: {
            display: "flex",
            flexWrap: "nowrap",
            gap: "8px",
            marginTop: "16px",
          },
        }}
        locale={{
          back: t("tour.buttons.back"),
          close: t("tour.buttons.close"),
          last: t("tour.buttons.finish"),
          next: t("tour.buttons.next"),
          skip: t("tour.buttons.skip"),
        }}
      />
    </>
  );
};
