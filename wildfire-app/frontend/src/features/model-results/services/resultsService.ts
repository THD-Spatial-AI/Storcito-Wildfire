import axios from "@/lib/axios";

interface ApiEnvelope<T> {
	success?: boolean;
	data?: T;
}

/** List model results. */
export async function getModelResults<T = unknown>(modelId: number): Promise<T[]> {
	const { data } = await axios.get<ApiEnvelope<T[]>>(`/models/${modelId}/results`);
	return Array.isArray(data?.data) ? (data.data as T[]) : [];
}

/** Result layer info. */
export async function getResultLayer<T = unknown>(resultId: number): Promise<T | undefined> {
	const { data } = await axios.get<ApiEnvelope<T>>(`/results/${resultId}/layer`);
	return data?.data;
}
