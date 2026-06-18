import axios from '@/lib/axios';

export type UserAccessLevel = 'very_low' | 'intermediate' | 'manager' | 'expert';

export interface AdminUser {
	id: string | number;
	name: string;
	email: string;
	email_verified?: boolean;
	enabled?: boolean;
	organization?: string;
	position?: string;
	phone?: string;
	access_level: UserAccessLevel;
	group_id?: string;
	model_limit?: number;
	created_at?: number;
}

export interface ApiResponse<T> {
	success: boolean;
	message: string;
	data?: T;
	users?: T;
	errors?: Record<string, string>;
}

export interface CreateAdminUserPayload {
	email: string;
	name: string;
	password?: string;
	access_level: UserAccessLevel;
	organization: string;
	position: string;
	phone: string;
	group_id?: string;
}

export interface UpdateAdminUserPayload {
	name?: string;
	email?: string;
	organization?: string;
	position?: string;
	phone?: string;
	access_level?: UserAccessLevel;
	email_verified?: boolean;
	password?: string;
	password_confirmation?: string;
	model_limit?: number | string;
}

export interface ListAdminUsersParams {
	page: number;
	perPage: number;
	search?: string;
}

export interface ListAdminUsersData {
	data: AdminUser[];
	total: number;
}

export async function listAdminUsers({ page, perPage, search }: ListAdminUsersParams): Promise<ApiResponse<ListAdminUsersData>> {
	const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
	const { data } = await axios.get<ApiResponse<ListAdminUsersData>>(`/users?page=${page}&per_page=${perPage}${searchParam}`);
	return data;
}

export async function createAdminUser(payload: CreateAdminUserPayload): Promise<ApiResponse<AdminUser>> {
	const { data } = await axios.post<ApiResponse<AdminUser>>('/users', payload);
	return data;
}

export async function updateAdminUser(userId: string | number, payload: UpdateAdminUserPayload): Promise<ApiResponse<AdminUser>> {
	const { data } = await axios.put<ApiResponse<AdminUser>>(`/users/${userId}`, payload);
	return data;
}

export async function deleteAdminUser(userId: string | number): Promise<ApiResponse<null>> {
	const { data } = await axios.delete<ApiResponse<null>>(`/users/${userId}`);
	return data;
}

export async function disableAdminUser(userId: string | number): Promise<ApiResponse<null>> {
	const { data } = await axios.put<ApiResponse<null>>(`/users/${userId}/disable`);
	return data;
}

export async function enableAdminUser(userId: string | number): Promise<ApiResponse<null>> {
	const { data } = await axios.put<ApiResponse<null>>(`/users/${userId}/enable`);
	return data;
}
