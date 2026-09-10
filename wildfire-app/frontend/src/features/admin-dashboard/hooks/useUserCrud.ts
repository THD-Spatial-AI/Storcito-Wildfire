import { useCallback } from "react";

import type { Group } from "@/components/workspace";
import type { CreateUserPayload, NotificationState, User, UserFormData } from "../components/user-management/types";
import { isExpert, isManager } from "../utils/accessLevelUtils";
import {
	createAdminUser,
	deleteAdminUser,
	disableAdminUser,
	enableAdminUser,
	updateAdminUser,
} from "@/services/userManagement";
import { useTranslation } from "@/i18n";

interface UseUserCrudParams {
	user: User | null;
	selectedGroup: Group | null;
	/** Fallback level. */
	formAccessLevel: string;
	fetchUsers: () => Promise<void>;
	setNotification: (notification: NotificationState) => void;
	confirm: (options: {
		type: "success" | "warning" | "delete";
		itemType: string;
		itemName: string;
		description?: string;
		onConfirm: () => Promise<void>;
	}) => Promise<void>;
	onUsersMutated?: () => void;
}

/** User CRUD flows. */
export function useUserCrud({
	user,
	selectedGroup,
	formAccessLevel,
	fetchUsers,
	setNotification,
	confirm,
	onUsersMutated,
}: UseUserCrudParams) {
	const { t } = useTranslation();

	const createUser = useCallback(async (userData: UserFormData): Promise<boolean> => {
		try {
			const payload: CreateUserPayload = {
				email: userData.email,
				name: userData.name,
				password: userData.password || undefined,
				access_level: userData.access_level,
			};

			if ((isManager(user) || isExpert(user)) && selectedGroup) {
				payload.group_id = selectedGroup.id;
			}

			const data = await createAdminUser(payload);

			if (data.success) {
				await new Promise(resolve => setTimeout(resolve, 200));
				await fetchUsers();
				setNotification({ open: true, message: t("userManagement.notifications.userCreated"), severity: "success" });
				if (onUsersMutated) onUsersMutated();
				return true;
			} else {
				throw new Error(data.message || t("userManagement.notifications.failedToCreate"));
			}
		} catch (error: unknown) {
			if (import.meta.env.DEV) console.error("Error creating user:", error);
			setNotification({ open: true, message: t("userManagement.notifications.failedToCreate"), severity: "error" });
			return false;
		}
	}, [user, selectedGroup, fetchUsers, setNotification, onUsersMutated, t]);

	const updateUser = useCallback(async (userId: string | number, userData: Partial<UserFormData>): Promise<boolean> => {
		try {
			const updateData = { ...userData };
			if (!updateData.password) {
				delete updateData.password;
				delete updateData.password_confirmation;
			}

			if (updateData.email_verified !== true) {
				delete (updateData as Partial<UserFormData> & Record<string, unknown>)["email_verified"];
			}

			// Blank means default.
			if (updateData.model_limit === "" || updateData.model_limit === undefined) {
				const level = (updateData.access_level || formAccessLevel || "very_low") as string;
				const defaults: Record<string, number> = { very_low: 10, intermediate: 25, manager: 50, expert: 0 };
				updateData.model_limit = defaults[level] ?? 10;
			}

			const data = await updateAdminUser(userId, updateData);

			if (data.success) {
				await new Promise(resolve => setTimeout(resolve, 500));
				await fetchUsers();
				setNotification({ open: true, message: t("userManagement.notifications.userUpdated"), severity: "success" });
				if (onUsersMutated) onUsersMutated();
				return true;
			} else {
				throw new Error(data.message || t("userManagement.notifications.failedToUpdate"));
			}
		} catch (error: unknown) {
			if (import.meta.env.DEV) console.error("Error updating user:", error);
			setNotification({ open: true, message: t("userManagement.notifications.failedToUpdate"), severity: "error" });
			return false;
		}
	}, [formAccessLevel, fetchUsers, setNotification, onUsersMutated, t]);

	const deleteUser = useCallback(async (userId: string | number): Promise<boolean> => {
		try {
			const data = await deleteAdminUser(userId);

			if (data.success) {
				await fetchUsers();
				setNotification({ open: true, message: t("userManagement.notifications.userDeleted"), severity: "success" });
				if (onUsersMutated) onUsersMutated();
				return true;
			} else {
				throw new Error(data.message || t("userManagement.notifications.failedToDelete"));
			}
		} catch (error) {
			if (import.meta.env.DEV) console.error("Error deleting user:", error);
			setNotification({ open: true, message: t("userManagement.notifications.failedToDelete"), severity: "error" });
			return false;
		}
	}, [fetchUsers, setNotification, onUsersMutated, t]);

	const disableUser = useCallback(async (userId: string | number): Promise<boolean> => {
		try {
			const data = await disableAdminUser(userId);
			if (data.success) {
				await fetchUsers();
				setNotification({ open: true, message: t("userManagement.notifications.userDisabled"), severity: "success" });
				if (onUsersMutated) onUsersMutated();
				return true;
			} else {
				throw new Error(data.message || t("userManagement.notifications.failedToDisable"));
			}
		} catch (error) {
			if (import.meta.env.DEV) console.error("Error disabling user:", error);
			setNotification({ open: true, message: t("userManagement.notifications.failedToDisable"), severity: "error" });
			return false;
		}
	}, [fetchUsers, setNotification, onUsersMutated, t]);

	const enableUser = useCallback(async (userId: string | number): Promise<boolean> => {
		try {
			const data = await enableAdminUser(userId);
			if (data.success) {
				await fetchUsers();
				setNotification({ open: true, message: t("userManagement.notifications.userEnabled"), severity: "success" });
				if (onUsersMutated) onUsersMutated();
				return true;
			} else {
				throw new Error(data.message || t("userManagement.notifications.failedToEnable"));
			}
		} catch (error) {
			if (import.meta.env.DEV) console.error("Error enabling user:", error);
			setNotification({ open: true, message: t("userManagement.notifications.failedToEnable"), severity: "error" });
			return false;
		}
	}, [fetchUsers, setNotification, onUsersMutated, t]);

	const handleDisableUser = useCallback(async (u: User) => {
		try {
			await confirm({
				type: "warning",
				itemType: "user",
				itemName: `${u.name} (${u.email})`,
				description: t("userManagement.confirmations.disableUserDescription"),
				onConfirm: async () => { await disableUser(u.id); },
			});
		} catch {
			// User cancelled the action
		}
	}, [confirm, disableUser, t]);

	const handleEnableUser = useCallback(async (u: User) => {
		try {
			await confirm({
				type: "success",
				itemType: "user",
				itemName: `${u.name} (${u.email})`,
				description: t("userManagement.confirmations.enableUserDescription"),
				onConfirm: async () => { await enableUser(u.id); },
			});
		} catch {
			// User cancelled the action
		}
	}, [confirm, enableUser, t]);

	const handleToggleUser = useCallback(async (u: User) => {
		const isEnabled = u.enabled !== false;
		if (isEnabled) {
			await handleDisableUser(u);
		} else {
			await handleEnableUser(u);
		}
	}, [handleDisableUser, handleEnableUser]);

	const handleDeleteUser = useCallback(async (u: User) => {
		try {
			await confirm({
				type: "delete",
				itemType: "user",
				itemName: `${u.name} (${u.email})`,
				onConfirm: async () => { await deleteUser(u.id); },
			});
		} catch {
			// User cancelled the action
		}
	}, [confirm, deleteUser]);

	return {
		createUser,
		updateUser,
		deleteUser,
		disableUser,
		enableUser,
		handleDisableUser,
		handleEnableUser,
		handleToggleUser,
		handleDeleteUser,
	};
}
