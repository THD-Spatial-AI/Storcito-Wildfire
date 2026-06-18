import { useState, useEffect, type FC } from "react";
import { X, MousePointer2, CircleDot, Check, Move, Plus, Trash2, Edit3, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "@/i18n";

const TEXT_FOREGROUND = "text-foreground";
const TEXT_MUTED_FOREGROUND = "text-muted-foreground";
const STEP_MARKER_CLASS = "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300";

interface PolygonDrawingGuideProps {
	/** Whether polygon drawing is available (no polygon exists yet or multiple allowed) */
	canDraw: boolean;
	/** Whether user is currently drawing */
	isDrawing: boolean;
	/** Number of existing polygons */
	polygonCount: number;
	/** Number of points in current drawing */
	currentPointCount?: number;
	/** Whether editing is enabled for completed polygons */
	enableEditing?: boolean;
}

export const PolygonDrawingGuide: FC<PolygonDrawingGuideProps> = ({
	canDraw,
	isDrawing,
	polygonCount,
	currentPointCount = 0,
	enableEditing = true,
}) => {
	const { t } = useTranslation();
	const [isDrawGuideVisible, setIsDrawGuideVisible] = useState(true);
	const [isDrawGuideDismissed, setIsDrawGuideDismissed] = useState(false);
	const [isEditGuideVisible, setIsEditGuideVisible] = useState(false);
	const [isEditGuideDismissed, setIsEditGuideDismissed] = useState(false);
	const [isEditExpanded, setIsEditExpanded] = useState(true);

	// Determine current step based on drawing state
	const currentStep = !isDrawing ? 1 : currentPointCount >= 3 ? 3 : currentPointCount >= 1 ? 2 : 1;

	// Show draw guide until polygon is finished or dismissed
	useEffect(() => {
		if (polygonCount > 0 || isDrawGuideDismissed) {
			setIsDrawGuideVisible(false);
		} else if (canDraw && polygonCount === 0 && !isDrawGuideDismissed) {
			setIsDrawGuideVisible(true);
		}
	}, [canDraw, polygonCount, isDrawGuideDismissed]);

	// Show edit guide when polygon exists
	useEffect(() => {
		if (polygonCount > 0 && enableEditing && !isEditGuideDismissed) {
			setIsEditGuideVisible(true);
		} else if (polygonCount === 0) {
			setIsEditGuideVisible(false);
			// Reset dismissed state when polygon is cleared so it shows again for new polygons
			setIsEditGuideDismissed(false);
		}
	}, [polygonCount, enableEditing, isEditGuideDismissed]);

	const handleDismissDrawGuide = () => {
		setIsDrawGuideDismissed(true);
		setIsDrawGuideVisible(false);
	};

	const handleDismissEditGuide = () => {
		setIsEditGuideDismissed(true);
		setIsEditGuideVisible(false);
	};

	// Show nothing if both guides are hidden
	if (!isDrawGuideVisible && !isEditGuideVisible) return null;

	const drawSteps = [
		{
			step: 1,
			title: t('polygon.clickToStart'),
			description: t('polygon.clickAnywhere'),
		},
		{
			step: 2,
			title: t('polygon.addMorePoints'),
			description: t('polygon.continueClicking'),
		},
		{
			step: 3,
			title: t('polygon.closePolygon'),
			description: t('polygon.doubleClickOrClick'),
			hasCloseIcon: true,
		},
	];

	const getStepStyle = (step: number) => {
		if (step < currentStep) {
			// Completed step
			return {
				circle: "bg-foreground border-foreground",
				number: "text-background",
				showCheck: true,
			};
		} else if (step === currentStep) {
			// Current step
			return {
				circle: "bg-foreground/10 border-foreground animate-pulse",
				number: TEXT_FOREGROUND,
				showCheck: false,
			};
		} else {
			// Future step
			return {
				circle: "bg-muted border-muted-foreground/30",
				number: TEXT_MUTED_FOREGROUND,
				showCheck: false,
			};
		}
	};

	// Edit guide (shown when polygon exists)
	if (isEditGuideVisible) {
		return (
			<div
				className="absolute z-40 animate-in slide-in-from-right-2 fade-in duration-300 flex flex-col"
				style={{
					top: "10rem",
					maxHeight: "calc(100vh - 14rem)",
					right: "calc(1rem + var(--sidebar-offset, 0rem))"
				}}
			>
				<div className="relative w-64 max-h-full flex flex-col bg-card/98 backdrop-blur-md border border-border rounded-lg shadow-xl overflow-hidden">
					{/* Close button */}
					<button
						onClick={handleDismissEditGuide}
						className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground z-10 bg-card/80"
						aria-label="Dismiss guide"
					>
						<X className="w-3.5 h-3.5" />
					</button>

					{/* Scrollable Content */}
					<div className="overflow-y-auto flex-1 p-4">
						{/* Edit Polygon Section - Collapsible */}
						<button
							onClick={() => setIsEditExpanded(!isEditExpanded)}
							className="w-full flex items-center justify-between mb-2"
						>
							<h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
								<Edit3 className="w-4 h-4 text-primary" />
								{t('polygon.editPolygon', 'Edit Polygon')}
							</h4>
							{isEditExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
						</button>

						{isEditExpanded && (
							<div className="space-y-2 mb-3">
								{/* Move vertices */}
								<div className="flex items-center gap-2">
									<div className="flex-shrink-0 w-6 h-6 rounded bg-muted flex items-center justify-center">
										<Move className="w-3.5 h-3.5 text-foreground" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-xs font-medium text-foreground">{t('polygon.moveVertex', 'Move corners')}</p>
									</div>
								</div>

								{/* Add vertex */}
								<div className="flex items-center gap-2">
									<div className="flex-shrink-0 w-6 h-6 rounded bg-muted flex items-center justify-center">
										<Plus className="w-3.5 h-3.5 text-foreground" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-xs font-medium text-foreground">{t('polygon.addVertex', 'Add point')}</p>
									</div>
								</div>

								{/* Remove vertex */}
								<div className="flex items-center gap-2">
									<div className="flex-shrink-0 w-6 h-6 rounded bg-muted flex items-center justify-center">
										<Trash2 className="w-3.5 h-3.5 text-foreground" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-xs font-medium text-foreground">
											<kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono">Alt</kbd>
											<span className="mx-1">+</span>
											<span>{t('polygon.removeVertexHint', 'click on vertex')}</span>
										</p>
									</div>
								</div>

								{/* Escape hint */}
								<div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
									<kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono">Esc</kbd>
									<span>{t('polygon.escToClear', 'to clear polygon')}</span>
								</div>

							</div>
						)}

					</div>
				</div>
			</div>
		);
	}

	// Draw guide (shown when no polygon exists)
	if (!isDrawGuideVisible) return null;

	return (
		<div
			className="absolute z-40 animate-in slide-in-from-right-2 fade-in duration-300"
			style={{
				top: "calc(4rem + 8rem)",
				right: "calc(1rem + var(--sidebar-offset, 0rem))"
			}}
		>
			<div className="relative w-64 bg-card/98 backdrop-blur-md border border-border rounded-lg shadow-xl overflow-hidden">
				{/* Close button */}
				<button
					onClick={handleDismissDrawGuide}
					className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
					aria-label="Dismiss guide"
				>
					<X className="w-3.5 h-3.5" />
				</button>

				{/* Content */}
				<div className="p-4 pt-4">
					<h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
						<MousePointer2 className="w-4 h-4 text-primary" />
						{t('polygon.drawRegion')}
					</h4>

					<div className="space-y-3">
						{drawSteps.map(({ step, title, description, hasCloseIcon }) => {
							const style = getStepStyle(step);
							const isCurrent = currentStep === step;
							return (
								<div key={step} className="flex gap-3">
									<div className={`${STEP_MARKER_CLASS} ${style.circle}`}>
										{style.showCheck ? (
											<Check className="w-3.5 h-3.5 text-background" />
										) : (
											<span className={`text-xs font-bold ${style.number}`}>{step}</span>
										)}
									</div>
									<div className="flex-1 pt-0.5">
										<p className={`text-xs font-medium ${hasCloseIcon ? 'flex items-center gap-1.5' : ''} ${isCurrent ? TEXT_FOREGROUND : TEXT_MUTED_FOREGROUND}`}>
											{title}
											{step === 2 && isCurrent && currentPointCount > 0 && (
												<span className="ml-1.5 text-[10px] text-foreground/70">({t('polygon.pointsAdded', { count: currentPointCount })})</span>
											)}
											{hasCloseIcon && <CircleDot className="w-3 h-3 text-cyan-500" />}
										</p>
										<p className={`text-[10px] ${TEXT_MUTED_FOREGROUND} mt-0.5`}>
											{description}
										</p>
									</div>
								</div>
							);
						})}
					</div>

					{/* Animated polygon creation hint */}
					<div className="mt-4 p-3 bg-muted/50 rounded-md border border-border/50">
						<div className="flex flex-col items-center gap-2">
							<svg width="120" height="80" viewBox="0 0 120 80" className="text-foreground" role="img" aria-label="Animated polygon drawing guide">
								<path
									d="M20 60 L50 15 L100 25 L90 65 L35 70 Z"
									fill="#06b6d4"
									opacity="0.08"
								>
									<animate attributeName="opacity" values="0;0;0.08;0.08;0" keyTimes="0;0.48;0.58;0.86;1" dur="4s" repeatCount="indefinite" />
								</path>
								<path
									d="M20 60 L50 15 L100 25 L90 65 L35 70 Z"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeDasharray="260"
									strokeDashoffset="260"
									opacity="0.65"
								>
									<animate attributeName="stroke-dashoffset" values="260;0;0;260" keyTimes="0;0.58;0.84;1" dur="4s" repeatCount="indefinite" />
									<animate attributeName="opacity" values="0.25;0.75;0.75;0.25" keyTimes="0;0.25;0.84;1" dur="4s" repeatCount="indefinite" />
								</path>

								{[
									{ x: 20, y: 60, label: "1", delay: "0s", start: true },
									{ x: 50, y: 15, label: "2", delay: "0.45s" },
									{ x: 100, y: 25, label: "3", delay: "0.9s" },
									{ x: 90, y: 65, label: "4", delay: "1.35s" },
									{ x: 35, y: 70, label: "5", delay: "1.8s" },
								].map((point) => (
									<g key={point.label} opacity="0">
										<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.78;1" dur="4s" begin={point.delay} repeatCount="indefinite" />
										<circle cx={point.x} cy={point.y} r={point.start ? 8 : 5} className={point.start ? "fill-cyan-500" : "fill-foreground"} opacity={point.start ? 1 : 0.7}>
											{point.start && <animate attributeName="r" values="8;10;8" dur="1.1s" repeatCount="indefinite" />}
										</circle>
										<text x={point.x} y={point.y + (point.start ? 4 : 3)} textAnchor="middle" className={point.start ? "fill-white text-[10px] font-bold" : "fill-background text-[8px] font-medium"}>
											{point.label}
										</text>
									</g>
								))}

								<circle r="4" className="fill-cyan-500">
									<animateMotion
										dur="4s"
										repeatCount="indefinite"
										path="M20 60 L50 15 L100 25 L90 65 L35 70 L20 60"
									/>
									<animate attributeName="opacity" values="1;1;0" keyTimes="0;0.82;1" dur="4s" repeatCount="indefinite" />
								</circle>
							</svg>
							
							<div className="flex items-center justify-center gap-1.5 text-[11px]">
								<span className="w-3 h-3 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0">
									<span className="text-[8px] font-bold text-white">1</span>
								</span>
								<span className="font-medium text-foreground">{t('polygon.startEnd')}</span>
								<span className="text-muted-foreground">— {t('polygon.clickHereToClose')}</span>
							</div>
						</div>
					</div>

					{/* Escape hint - show when drawing */}
					{isDrawing && (
						<div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
							<kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[9px] font-mono">Esc</kbd>
							<span>{t('polygon.escToCancel')}</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
