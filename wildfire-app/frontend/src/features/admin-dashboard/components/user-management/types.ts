import type { Group } from "@/components/workspace";

export interface User {
	id: string | number;
	name: string;
	email: string;
	email_verified?: boolean;
	enabled?: boolean;
	organization?: string;
	position?: string;
	phone?: string;
	access_level: "very_low" | "intermediate" | "manager" | "expert";
	group_id?: string;
	model_limit?: number;
	created_at?: number;
	/** True when the user holds at least one active API token. */
	has_api_access?: boolean;
}

export interface UserFormData {
	name: string;
	email: string;
	organization: string;
	position: string;
	phone: string;
	access_level: "very_low" | "intermediate" | "manager" | "expert";
	email_verified?: boolean;
	password?: string;
	password_confirmation?: string;
	model_limit?: number | string;
}

export interface ApiResponse<T> {
	success: boolean;
	message: string;
	data?: T;
	users?: T;
	errors?: Record<string, string>;
}

export interface NotificationState {
	open: boolean;
	message: string;
	severity: "success" | "error" | "warning" | "info";
}

export type CreateUserPayload = {
	email: string;
	name: string;
	password?: string;
	access_level: User["access_level"];
	organization: string;
	position: string;
	phone: string;
	group_id?: Group["id"];
};
