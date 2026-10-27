import React, { useState, useEffect, useMemo, useCallback } from "react";
import { TourController } from "./TourController";
import { AREA_SELECT_TOUR_STEPS } from "./steps/areaSelectSteps";
import { buildTourSteps } from "./steps/tourStepTypes";

interface AreaSelectTourProps {
	isOpen: boolean;
	onComplete: () => void;
	onSkip: () => void;
	onConfiguratorStepChange?: (step: number) => void;
}

export const AreaSelectTour: React.FC<AreaSelectTourProps> = ({
	isOpen,
	onComplete,
	onSkip,
	onConfiguratorStepChange,
}) => {
	const [stepIndex, setStepIndex] = useState(0);
	const [isStepReady, setIsStepReady] = useState(true);
	const areaSelectSteps = useMemo(() => buildTourSteps(AREA_SELECT_TOUR_STEPS), []);

	// Pause during step change.
	const changeStep = useCallback((next: number) => {
		setIsStepReady(false);
		setStepIndex(next);
	}, []);

	// Reset on open.
	useEffect(() => {
		if (isOpen) {
			setStepIndex(0);
		}
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const targetConfiguratorStep = AREA_SELECT_TOUR_STEPS[stepIndex]?.configuratorStep ?? null;

		setIsStepReady(false);
		if (targetConfiguratorStep) {
			onConfiguratorStepChange?.(targetConfiguratorStep);
		}

		const timeout = window.setTimeout(
			() => {
				setIsStepReady(true);
			},
			targetConfiguratorStep ? 220 : 0
		);

		return () => window.clearTimeout(timeout);
	}, [isOpen, onConfiguratorStepChange, stepIndex]);

	return (
		<TourController
			steps={areaSelectSteps}
			run={isOpen && isStepReady}
			stepIndex={stepIndex}
			setStepIndex={changeStep}
			onComplete={onComplete}
			onSkip={onSkip}
		/>
	);
};
