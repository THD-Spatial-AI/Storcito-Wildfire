import React, { useMemo } from "react";
import { useProductTour } from "@/features/guided-tour/hooks/useProductTour";
import { TourController } from "./TourController";
import { stepsForMode } from "./steps/productTourSteps";
import { buildTourSteps } from "./steps/tourStepTypes";

interface ProductTourProps {
	children?: React.ReactNode;
}

export const ProductTour: React.FC<ProductTourProps> = ({ children }) => {
	const { showTour, completeTour, tourStep, setTourStep, tourMode } = useProductTour();
	const tourSteps = useMemo(
		() => buildTourSteps(stepsForMode(tourMode)),
		[tourMode]
	);

	return (
		<TourController
			steps={tourSteps}
			run={showTour}
			stepIndex={tourStep}
			setStepIndex={setTourStep}
			onComplete={completeTour}
			onSkip={completeTour}
			whatsNew={tourMode === "whatsNew"}
		>
			{children}
		</TourController>
	);
};
