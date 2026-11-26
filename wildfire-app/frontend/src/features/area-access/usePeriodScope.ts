import { useEffect, useState } from "react";
import { periodAccessService, type Period } from "./service";

/** null when unrestricted */
export function usePeriodScope(): { ready: boolean; periods: Period[] | null } {
	const [state, setState] = useState<{ ready: boolean; periods: Period[] | null }>({ ready: false, periods: null });
	useEffect(() => {
		let alive = true;
		periodAccessService
			.mine()
			.then((me) => alive && setState({ ready: true, periods: me.restricted ? me.effective : null }))
			// server still enforces
			.catch(() => alive && setState({ ready: true, periods: null }));
		return () => {
			alive = false;
		};
	}, []);
	return state;
}
