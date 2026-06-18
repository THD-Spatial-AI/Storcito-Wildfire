export interface WebserviceFilters {
  status?: string;
  available?: string;
  busy?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface WebserviceInstance {
  id: number;
  name?: string | null;
  ip: string;
  port: number;
  protocol: string;
  endpoint?: string | null;
  status: "active" | "inactive" | "maintenance";
  available: boolean;
  busy: boolean;
  auto_scaling: boolean;
  max_concurrency: number;
  current_concurrency: number;
  user_id?: number | null;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  last_check: string;
  last_heartbeat?: string | null;
  cpu_usage?: number | null;
  memory_usage?: number | null;
  created_at: string;
  updated_at: string;
}

export interface WebserviceCreateData {
  name?: string;
  ip: string;
  port: number;
  protocol: string;
  endpoint?: string;
  auto_scaling: boolean;
  max_concurrency: number;
}

export interface WebserviceFormData extends WebserviceCreateData {
  status: "active" | "inactive" | "maintenance";
}
