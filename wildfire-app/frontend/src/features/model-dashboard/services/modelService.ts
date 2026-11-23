import axios from "@/lib/axios";
import { ModelStatus } from "@/types/models";
import type { AxiosResponse } from "axios";

/** function avoids redos */
function extractBaseTitle(title: string): string {
  if (!title) return title;

  // cap title length
  if (title.length > 500) {
    title = title.substring(0, 500);
  }

  // match version suffix
  const trimmedTitle = title.trim();
  const lastSpaceIndex = trimmedTitle.lastIndexOf(" ");

  if (lastSpaceIndex === -1) {
    return trimmedTitle;
  }

  const possibleVersion = trimmedTitle.substring(lastSpaceIndex);
  // version suffix
  if (possibleVersion.length >= 3 && possibleVersion.startsWith(" v")) {
    const numberPart = possibleVersion.substring(2);
    // digits only
    if (/^\d{1,5}$/.test(numberPart)) {
      return trimmedTitle.substring(0, lastSpaceIndex);
    }
  }

  return trimmedTitle;
}

interface Workspace {
  id: number;
  name: string;
  description?: string;
  user_id: string;
  user_email?: string;
  is_default: boolean;
  members?: WorkspaceMember[];
  groups?: WorkspaceGroup[];
  created_at: string;
  updated_at: string;
}

interface WorkspaceMember {
  user_id: number | string;
  email?: string;
  [key: string]: unknown;
}

interface WorkspaceGroup {
  id: number;
  name: string;
  group_id?: string;
  [key: string]: unknown;
}

export interface Model {
  id: number;
  user_id: string;
  user_email: string;
  workspace_id?: number;
  workspace?: Workspace;
  title: string;
  description?: string;
  status: ModelStatus;

  // location
  region?: string;
  country?: string;
  coordinates?: Record<string, unknown>;
  selected_count?: number;

  // period
  from_date: string;
  to_date: string;

  config?: Record<string, unknown>;

  results?: Record<string, unknown>;

  // external
  session_id?: number;
  callback_url?: string;

  // group/hierarchy
  group_id?: number;
  parent_model_id?: number;
  parent_model_title?: string;
  child_model_ids?: number[];
  is_copy?: boolean;
  /** family versions grouped */
  versions?: Model[];

  // activation
  is_active?: boolean;

  // calculation timing
  calculation_queued_at?: string;
  calculation_started_at?: string;
  calculation_completed_at?: string;
  /** backfilled queue time */
  calculation_queued_at_estimated?: boolean;

  // sharing
  shares?: ModelShare[];

  // timestamps
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ModelShare {
  id: number;
  model_id: number;
  user_id: number | string;
  email: string;
  permission: "view" | "edit";
  shared_at: string;
  created_at: string;
  updated_at: string;
}

// shared request fields
interface ModelRequestFields {
  description?: string;
  workspace_id?: number;
  region?: string;
  country?: string;
  coordinates?: Record<string, unknown>;
  selected_count?: number;
  config?: Record<string, unknown>;
  group_id?: number;
  is_copy?: boolean;
}

interface CreateModelRequest extends ModelRequestFields {
  title: string;
  from_date: string;
  to_date: string;
  parent_model_id?: number;
}

export interface UpdateModelRequest extends ModelRequestFields {
  title?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  results?: Record<string, unknown>;
  session_id?: number;
  callback_url?: string;
  parent_model_id?: number | null;
}

/** list query filters */
export interface ModelListParams {
  limit?: number;
  offset?: number;
  search?: string;
  workspace_id?: number;
  sort_by?: string;
  sort_order?: string;
  mine?: boolean;
  from_date?: string;
  to_date?: string;
  pinned?: string;
  pinned_only?: string;
  status?: string;
  grouped?: boolean;
  owner?: string;
  territory?: string;
}

/** tab count filters */
export interface TabCountParams {
  search?: string;
  workspace_id?: number;
  from_date?: string;
  to_date?: string;
  pinned?: string;
  owner?: string;
  territory?: string;
}

export interface ModelStats {
  total: number;
  draft: number;
  queue: number;
  running: number;
  completed: number;
  published: number;
  failed: number;
  cancelled: number;
  model_limit?: number;
  remaining?: number;
  is_unlimited?: boolean;
}

export interface ModelListResponse {
  success: boolean;
  data: Model[];
  total: number;
  limit: number;
  offset: number;
  server_time?: string;
}

export interface ModelResponse {
  success: boolean;
  data: Model;
  message?: string;
}

interface ModelStatsResponse {
  success: boolean;
  data: ModelStats;
}

export interface AdminMetrics {
  total_models: number;
  created_today: number;
  runs_24h: number;
  failed_24h: number;
  queued: number;
  running: number;
  avg_run_seconds: number | null;
}

class ModelService {
  private readonly baseURL = "/models";

  async createModel(data: CreateModelRequest): Promise<ModelResponse> {
    const response = await axios.post(this.baseURL, data);
    return response.data;
  }

  async getModels(params?: ModelListParams): Promise<ModelListResponse> {
    const response = await axios.get(this.baseURL, { params });
    return response.data;
  }

  async getModelById(id: number): Promise<ModelResponse> {
    const response = await axios.get(`${this.baseURL}/${id}`);
    return response.data;
  }

  async updateModel(id: number, data: UpdateModelRequest): Promise<ModelResponse> {
    const response = await axios.put(`${this.baseURL}/${id}`, data);
    return response.data;
  }

  async deleteModel(id: number): Promise<{ success: boolean; message: string }> {
    const response = await axios.delete(`${this.baseURL}/${id}`);
    return response.data;
  }

  /** count dashboard tab */
  async getTabCounts(params: TabCountParams): Promise<Record<string, number>> {
    const response = await axios.get(`${this.baseURL}/tab-counts`, { params });
    const data = response.data?.data;
    return data && !Array.isArray(data) ? data : {};
  }

  /** system numbers admin */
  async getAdminMetrics(): Promise<AdminMetrics> {
    const response = await axios.get(`${this.baseURL}/admin-metrics`);
    return response.data?.data;
  }

  async getModelStats(): Promise<ModelStatsResponse> {
    const response = await axios.get(`${this.baseURL}/stats`);
    return response.data;
  }

  async startCalculation(id: number, options: { notify?: boolean } = {}): Promise<ModelResponse> {
    // notify=false no notification
    const query = options.notify === false ? "?notify=false" : "";
    const response = await axios.post(`/calculation/start/${id}${query}`);
    return response.data;
  }

  // upload optional inputs
  async uploadModelInputs(
    id: number,
    files: { stationData?: File | null; dtm?: File | null }
  ): Promise<void> {
    if (!files.stationData && !files.dtm) return;
    const formData = new FormData();
    if (files.stationData) formData.append("station_data", files.stationData);
    if (files.dtm) formData.append("dtm", files.dtm);
    await axios.post(`${this.baseURL}/${id}/inputs`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }

  async downloadModelResults(id: number): Promise<AxiosResponse<Blob>> {
    return axios.get(`${this.baseURL}/${id}/download`, {
      responseType: "blob",
    });
  }

  async updateModelActivation(id: number, isActive: boolean): Promise<ModelResponse> {
    const response = await axios.put(`${this.baseURL}/${id}/activation`, { is_active: isActive });
    return response.data;
  }

  async duplicateModel(id: number, cachedModels?: Model[]): Promise<ModelResponse> {
    // fetch original model
    const originalResponse = await this.getModelById(id);
    if (!originalResponse.success) {
      throw new Error("Failed to fetch original simulation");
    }

    const original = originalResponse.data;

    // yyyy-mm-dd formatter
    const formatDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      return date.toISOString().split("T")[0];
    };

    let groupId = original.group_id;
    let parentModelId: number;

    if (original.parent_model_id) {
      parentModelId = original.parent_model_id;
      groupId = groupId || original.parent_model_id;
    } else {
      parentModelId = original.id;
      groupId = groupId || original.id;
    }

    // reuse cache
    let allModels: Model[];
    if (cachedModels) {
      allModels = cachedModels;
    } else {
      const allModelsResponse = await this.getModels();
      if (!allModelsResponse.success) {
        throw new Error("Failed to fetch existing models for version calculation");
      }
      allModels = allModelsResponse.data;
    }

    // redos-safe extraction
    const baseTitle = extractBaseTitle(original.title);

    // match version suffix
    const versionRegex = /^ v(\d{1,5})$/;
    const siblings = allModels.filter((model) => {
      if (model.parent_model_id !== parentModelId) return false;
      if (!model.title.startsWith(baseTitle)) return false;

      const versionPart = model.title.slice(baseTitle.length);
      return versionRegex.test(versionPart);
    });

    // highest sibling version
    let maxVersion = 0;
    for (const sibling of siblings) {
      const versionPart = sibling.title.slice(baseTitle.length);
      const match = versionRegex.exec(versionPart);
      if (match) {
        const version = Number.parseInt(match[1], 10);
        if (version > maxVersion) {
          maxVersion = version;
        }
      }
    }

    const nextVersion = maxVersion + 1;
    const newTitle = `${baseTitle} v${nextVersion}`;

    const copyData: CreateModelRequest = {
      title: newTitle,
      description: original.description,
      workspace_id: original.workspace_id,
      region: original.region,
      country: original.country,
      coordinates: original.coordinates,
      selected_count: original.selected_count,
      from_date: formatDate(original.from_date),
      to_date: formatDate(original.to_date),
      config: original.config,
      group_id: groupId,
      parent_model_id: parentModelId,
      is_copy: true,
    };

    return this.createModel(copyData);
  }

  async moveModel(id: number, workspaceId: number): Promise<ModelResponse> {
    const response = await axios.patch(`${this.baseURL}/${id}/move`, {
      workspace_id: workspaceId,
    });
    return response.data;
  }

  async bulkMoveModels(
    modelIds: number[],
    workspaceId: number
  ): Promise<{ success: boolean; message: string }> {
    const response = await axios.patch(`${this.baseURL}/bulk-move`, {
      model_ids: modelIds,
      workspace_id: workspaceId,
    });
    return response.data;
  }

  async shareModel(id: number, email: string): Promise<{ success: boolean; data: ModelShare }> {
    const response = await axios.post(`${this.baseURL}/${id}/share`, {
      email: email,
    });
    return response.data;
  }

  async revokeModelShare(
    id: number,
    shareId: number
  ): Promise<{ success: boolean; message: string }> {
    const response = await axios.delete(`${this.baseURL}/${id}/shares/${shareId}`);
    return response.data;
  }
}

export const modelService = new ModelService();
