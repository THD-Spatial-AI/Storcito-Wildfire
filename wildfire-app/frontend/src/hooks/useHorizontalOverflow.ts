import { useEffect, useState } from "react";

/** table wider than box */
export function useHorizontalOverflow() {
	const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
	const [overflowX, setOverflowX] = useState(false);
	useEffect(() => {
		if (!scrollEl || typeof ResizeObserver === "undefined") return;
		const check = () => setOverflowX(scrollEl.scrollWidth > scrollEl.clientWidth + 1);
		const observer = new ResizeObserver(check);
		observer.observe(scrollEl);
		if (scrollEl.firstElementChild) observer.observe(scrollEl.firstElementChild);
		check();
		return () => observer.disconnect();
	}, [scrollEl]);
	return { setScrollEl, overflowX };
}
