// ipad safari pencil fix

const MAX_MOVE_PX = 10;
const MAX_PRESS_MS = 700;
const DEDUPE_MS = 600;

interface PenDown {
	target: Element;
	x: number;
	y: number;
	time: number;
}

/** pencil taps click */
export function installPenClickFix(): void {
	if (typeof document === "undefined") return;
	let down: PenDown | null = null;
	let fired: { target: Element; until: number } | null = null;

	document.addEventListener(
		"pointerdown",
		(event) => {
			if (event.pointerType !== "pen" || !(event.target instanceof Element)) return;
			down = { target: event.target, x: event.clientX, y: event.clientY, time: Date.now() };
		},
		true
	);

	document.addEventListener(
		"pointerup",
		(event) => {
			if (event.pointerType !== "pen" || !down) return;
			const start = down;
			down = null;
			const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
			if (moved > MAX_MOVE_PX || Date.now() - start.time > MAX_PRESS_MS) return;
			// same element only
			const hit = document.elementFromPoint(event.clientX, event.clientY);
			if (!hit || !(start.target === hit || start.target.contains(hit) || hit.contains(start.target))) return;
			// icon svg parent
			const target = start.target instanceof HTMLElement ? start.target : start.target.closest<HTMLElement>("*:not(svg *):not(svg)");
			if (!target) return;
			// after tap events finish
			window.setTimeout(() => {
				if (!target.isConnected) return;
				fired = { target, until: Date.now() + DEDUPE_MS };
				target.click();
			}, 0);
		},
		true
	);

	// drop late native click
	document.addEventListener(
		"click",
		(event) => {
			if (!fired || !event.isTrusted) return;
			const late = Date.now() < fired.until && event.target instanceof Node && (fired.target === event.target || fired.target.contains(event.target));
			fired = null;
			if (late) {
				event.preventDefault();
				event.stopImmediatePropagation();
			}
		},
		true
	);

	document.addEventListener("pointercancel", () => {
		down = null;
	}, true);
}
