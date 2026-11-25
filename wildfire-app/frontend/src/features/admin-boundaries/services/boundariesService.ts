import axios from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { BoundaryDetail, BoundaryItem, BoundaryLevelId } from "../types";

const BASE = "/webservices/boundaries";

class BoundariesService {
  private listCache = new Map<string, Promise<BoundaryItem[]>>();

  /** items one level */
  list(level: BoundaryLevelId, parent?: string): Promise<BoundaryItem[]> {
    const key = `${level}:${parent ?? ""}`;
    const cached = this.listCache.get(key);
    if (cached) return cached;
    const request = axios
      .get<ApiResponse<{ items: BoundaryItem[] }>>(`${BASE}/${level}`, {
        params: parent ? { parent } : undefined,
      })
      .then(({ data }) => data?.data?.items ?? [])
      .catch((error: unknown) => {
        this.listCache.delete(key);
        throw error;
      });
    this.listCache.set(key, request);
    return request;
  }

  /** one boundary geometry */
  async get(level: BoundaryLevelId, code: string): Promise<BoundaryDetail> {
    const { data } = await axios.get<ApiResponse<BoundaryDetail>>(
      `${BASE}/${level}/${encodeURIComponent(code)}`
    );
    if (!data?.data?.geometry) throw new Error("Boundary has no geometry");
    return data.data;
  }
}

export const boundariesService = new BoundariesService();
