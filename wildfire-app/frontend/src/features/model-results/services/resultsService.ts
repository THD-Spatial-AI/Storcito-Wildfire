import axios from "@/lib/axios";

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
}

/** list model results */
export async function getModelResults<T = unknown>(modelId: number): Promise<T[]> {
  const { data } = await axios.get<ApiEnvelope<T[]>>(`/models/${modelId}/results`);
  return Array.isArray(data?.data) ? (data.data as T[]) : [];
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** localhost wms via page */
export function sameOriginWms(url: string): string {
  try {
    const parsed = new URL(url, window.location.href);
    // other devices, dev only
    if (LOCAL_HOSTS.has(parsed.hostname) && !LOCAL_HOSTS.has(window.location.hostname)) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // keep as given
  }
  return url;
}

/** result layer info */
export async function getResultLayer<T = unknown>(resultId: number): Promise<T | undefined> {
  const { data } = await axios.get<ApiEnvelope<T>>(`/results/${resultId}/layer`);
  const info = data?.data as (T & { wms_url?: string }) | undefined;
  if (info?.wms_url) info.wms_url = sameOriginWms(info.wms_url);
  return info;
}
