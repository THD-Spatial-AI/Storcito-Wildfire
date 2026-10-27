import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactJoyride, { CallBackProps, STATUS, Step, EVENTS, ACTIONS, TooltipRenderProps } from "react-joyride";
import { buildCurvedPath } from "@/features/guided-tour/utils/tourUtils";
import { useTranslation } from "@/i18n";
import { TourTooltip, type TourSectionLink } from "./TourStepComponents";
import { buildTourSections, type TourStepDef } from "./steps/tourStepTypes";
import "./tour.css";

interface TourControllerProps {
	steps: Step[];
	run: boolean;
	stepIndex: number;
	setStepIndex: (index: number) => void;
	onComplete: () => void;
	onSkip: () => void;
	whatsNew?: boolean;
	children?: React.ReactNode;
}

const WAIT_POLL_MS = 250;
const WAIT_TIMEOUT_MS = 8000;
const LOADED_MARKER = '[data-tour="models-loaded"]';

export const TourController: React.FC<TourControllerProps> = ({
	steps: rawSteps,
	run,
	stepIndex,
	setStepIndex,
	onComplete,
	onSkip,
	whatsNew = false,
	children,
}) => {
	const [connector, setConnector] = useState<{
		path: string;
		startX: number;
		startY: number;
		endX: number;
		endY: number;
	} | null>(null);
	const [pendingStep, setPendingStep] = useState<number | null>(null);
	const lastActionRef = useRef<(typeof ACTIONS)[keyof typeof ACTIONS]>(ACTIONS.NEXT);
	const waitFailedRef = useRef(false);
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { pathname } = useLocation();

	// Swap in fallback targets.
	const steps = useMemo(
		() =>
			rawSteps.map((step) => {
				const def = step.data?.def as TourStepDef | undefined;
				if (!def?.fallbackTarget || typeof step.target !== "string") return step;
				return document.querySelector(step.target) ? step : { ...step, target: def.fallbackTarget };
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps -- recheck DOM per step
		[rawSteps, stepIndex, pendingStep]
	);

	const sectionLinks = useMemo<TourSectionLink[]>(() => {
		const defs = steps
			.map((step) => step.data?.def as TourStepDef | undefined)
			.filter((def): def is TourStepDef => Boolean(def));
		return buildTourSections(defs).map((section) => ({
			id: section.id,
			label: t(section.labelKey),
			firstIndex: section.firstIndex,
		}));
	}, [steps, t]);

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
		// Wait for DOM.
		requestAnimationFrame(() => {
			const tooltip = document.querySelector(".tour-tooltip-card");
			if (!tooltip) {
				applyConnector(null);
				return;
			}

			// Current step target.
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

	// Track connector position.
	useEffect(() => {
		if (run) {
			// Debounce to avoid flicker.
			let timeoutId: ReturnType<typeof setTimeout>;
			const debouncedUpdate = () => {
				clearTimeout(timeoutId);
				timeoutId = setTimeout(updateConnector, 50);
			};

			updateConnector();
			window.addEventListener("resize", debouncedUpdate);
			window.addEventListener("scroll", debouncedUpdate, true);

			// Watch panel, not body.
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

	// Advance, awaiting targets.
	const advanceTo = useCallback(
		(next: number) => {
			if (next >= steps.length) {
				onComplete();
				return;
			}
			if (next < 0) return;

			const step = steps[next];
			const def = step?.data?.def as TourStepDef | undefined;
			// Open the step's page.
			if (def?.route && !pathname.startsWith(def.route)) {
				waitFailedRef.current = false;
				navigate(def.route);
				setPendingStep(next);
				return;
			}
			if (
				def?.waitForTarget &&
				!waitFailedRef.current &&
				typeof step.target === "string" &&
				!document.querySelector(step.target)
			) {
				setPendingStep(next);
				return;
			}
			setStepIndex(next);
		},
		[steps, setStepIndex, onComplete, pathname, navigate]
	);

	// Poll held step.
	useEffect(() => {
		if (pendingStep === null || !run) return;
		const startedAt = Date.now();
		const interval = setInterval(() => {
			const step = steps[pendingStep];
			const found =
				typeof step?.target === "string" && Boolean(document.querySelector(step.target));
			const loaded = Boolean(document.querySelector(LOADED_MARKER));
			if (found || loaded) {
				waitFailedRef.current = false;
				setPendingStep(null);
				setStepIndex(pendingStep);
			} else if (Date.now() - startedAt > WAIT_TIMEOUT_MS) {
				waitFailedRef.current = true;
				setPendingStep(null);
				setStepIndex(pendingStep);
			}
		}, WAIT_POLL_MS);
		return () => clearInterval(interval);
	}, [pendingStep, run, steps, setStepIndex]);

	// Scroll target into view.
	useEffect(() => {
		if (!run || pendingStep !== null) return;
		const step = steps[stepIndex];
		if (!step || typeof step.target !== "string" || step.target === "body") return;
		if (step.disableScrolling === false) return;

		const timeout = window.setTimeout(() => {
			const target = document.querySelector(step.target as string);
			target?.scrollIntoView({
				behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
				block: "center",
			});
		}, 80);
		return () => window.clearTimeout(timeout);
	}, [run, stepIndex, steps, pendingStep]);

	// Arrow and Esc keys.
	useEffect(() => {
		if (!run) return;
		const onKeyDown = (event: KeyboardEvent) => {
			const tooltip = document.querySelector(".tour-tooltip-card");
			if (!tooltip) return;
			if (event.key === "ArrowRight") {
				event.preventDefault();
				tooltip.querySelector<HTMLElement>('[data-action="primary"]')?.click();
			} else if (event.key === "ArrowLeft") {
				event.preventDefault();
				tooltip.querySelector<HTMLElement>('[data-action="back"]')?.click();
			} else if (event.key === "Escape") {
				event.preventDefault();
				tooltip.querySelector<HTMLElement>('[data-action="close"]')?.click();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [run]);

	const handleGoToStep = useCallback(
		(index: number) => {
			lastActionRef.current = index >= stepIndex ? ACTIONS.NEXT : ACTIONS.PREV;
			advanceTo(index);
		},
		[stepIndex, advanceTo]
	);

	const renderTooltip = useCallback(
		(props: TooltipRenderProps) => (
			<TourTooltip {...props} sections={sectionLinks} whatsNew={whatsNew} onGoToStep={handleGoToStep} />
		),
		[sectionLinks, whatsNew, handleGoToStep]
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

		// Skip in travel direction.
		if (type === EVENTS.TARGET_NOT_FOUND) {
			if (lastActionRef.current === ACTIONS.PREV) {
				if (index > 0) advanceTo(index - 1);
			} else {
				advanceTo(index + 1);
			}
			return;
		}

		if (type === EVENTS.STEP_AFTER) {
			if (action === ACTIONS.PREV) {
				lastActionRef.current = ACTIONS.PREV;
				advanceTo(index - 1);
			} else if (action === ACTIONS.NEXT) {
				lastActionRef.current = ACTIONS.NEXT;
				advanceTo(index + 1);
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
						className="tour-connector-path"
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
				disableCloseOnEsc={true}
				hideCloseButton={false}
				spotlightClicks={false}
				disableScrollParentFix={true}
				tooltipComponent={renderTooltip}
				floaterProps={{
					disableAnimation: true,
					hideArrow: true,
				}}
				spotlightPadding={6}
				styles={{
					options: {
						zIndex: 20000,
					},
					overlay: {
						backgroundColor: "rgba(0, 0, 0, 0.55)",
					},
					spotlight: {
						backgroundColor: "transparent",
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
