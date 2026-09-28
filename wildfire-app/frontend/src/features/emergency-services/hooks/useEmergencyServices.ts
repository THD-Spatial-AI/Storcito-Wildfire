import { useQuery } from "@tanstack/react-query";

import { getNearestEmergencyServices } from "../services/emergencyServicesService";

export const emergencyServicesKeys = {
	all: ["emergency-services"] as const,
	nearest: (modelId: number | undefined, limit: number) =>
		[...emergencyServicesKeys.all, "nearest", modelId, limit] as const,
};

export const useEmergencyServices = (
	modelId: number | undefined,
	layerReady: boolean,
	limit = 1
) => {
	return useQuery({
		queryKey: emergencyServicesKeys.nearest(modelId, limit),
		queryFn: () => getNearestEmergencyServices(modelId as number, limit),
		enabled: layerReady && modelId !== undefined,
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	});
};
