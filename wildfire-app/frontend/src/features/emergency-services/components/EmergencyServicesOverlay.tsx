import { FC, useEffect, useState } from "react";
import type Map from "ol/Map";

import { EmergencyServicesLayer } from "./EmergencyServicesLayer";
import { EmergencyServicePopup } from "./EmergencyServicePopup";
import type { EmergencyService } from "../types";

interface EmergencyServicesOverlayProps {
	map: Map;
	services: EmergencyService[] | undefined;
	visible: boolean;
}

// Marker layer + popup; never blocks the viewer on missing data.
export const EmergencyServicesOverlay: FC<EmergencyServicesOverlayProps> = ({
	map,
	services,
	visible,
}) => {
	const [selected, setSelected] = useState<EmergencyService | null>(null);

	useEffect(() => {
		if (!visible) setSelected(null);
	}, [visible]);

	if (!visible || !services || services.length === 0) return null;

	return (
		<>
			<EmergencyServicesLayer
				map={map}
				services={services}
				visible={visible}
				onSelect={setSelected}
			/>
			{selected && (
				<EmergencyServicePopup
					map={map}
					service={selected}
					onClose={() => setSelected(null)}
				/>
			)}
		</>
	);
};
