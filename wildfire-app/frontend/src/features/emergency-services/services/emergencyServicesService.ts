import axios from "@/lib/axios";

import type { EmergencyService } from "../types";

interface ApiEnvelope<T> {
	success?: boolean;
	data?: T;
}

interface EmergencyServiceDto {
	id: number;
	name: string;
	category: string;
	service_type: string | null;
	address: string | null;
	postcode: string | null;
	city: string | null;
	phone: string | null;
	email: string | null;
	longitude: number;
	latitude: number;
	distance_m: number | null;
}

const toEmergencyService = (dto: EmergencyServiceDto): EmergencyService => ({
	id: dto.id,
	name: dto.name,
	category: dto.category,
	serviceType: dto.service_type,
	address: dto.address,
	postcode: dto.postcode,
	city: dto.city,
	phone: dto.phone,
	email: dto.email,
	longitude: dto.longitude,
	latitude: dto.latitude,
	distanceM: dto.distance_m,
});

/** Nearest emergency services per category for a model. */
export async function getNearestEmergencyServices(
	modelId: number,
	limit = 1
): Promise<EmergencyService[]> {
	const { data } = await axios.get<ApiEnvelope<EmergencyServiceDto[]>>(
		`/models/${modelId}/emergency-services/nearest`,
		{ params: { limit } }
	);
	const list = Array.isArray(data?.data) ? data.data : [];
	return list.map(toEmergencyService);
}
