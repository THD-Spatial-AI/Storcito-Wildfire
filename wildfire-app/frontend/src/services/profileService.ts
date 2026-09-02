import axios from '@/lib/axios';

export interface ProfileData {
	name: string;
	email: string;
	access_level: string;
}

/** Fetch profile. */
export async function getProfile(): Promise<ProfileData | null> {
	const response = await axios.get<{ data?: ProfileData }>('/users/profile');
	return response.data.data ?? null;
}

/** Update profile. */
export async function updateProfile(payload: { name: string }): Promise<boolean> {
	const response = await axios.put<{ success: boolean }>('/users/profile', payload);
	return response.data.success;
}

/** Change password. */
export async function changePassword(data: {
	new_password: string;
	new_password_confirmation: string;
}): Promise<void> {
	await axios.post('/auth/change-password', data);
}
