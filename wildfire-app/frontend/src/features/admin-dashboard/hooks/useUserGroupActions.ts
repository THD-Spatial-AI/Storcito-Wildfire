import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { groupService, getGroupFullDisplayName, type Group } from "@/components/workspace";
import type { NotificationState, User } from "../components/user-management/types";
import { isManager } from "../utils/accessLevelUtils";
import { useTranslation } from "@/i18n";

interface DialogState<T> {
	selectedItem: T | null;
	open: (item?: T) => void;
	close: () => void;
}

interface UseUserGroupActionsParams {
	user: User | null;
	selectedGroup: Group | null;
	setSelectedGroup: (group: Group | null) => void;
	setUsers: Dispatch<SetStateAction<User[]>>;
	showSuccess: (message: string) => void;
	showError: (message: string) => void;
	setNotification: (notification: NotificationState) => void;
	fetchUsers: () => Promise<void>;
	confirm: (options: {
		type: "success" | "warning" | "delete";
		itemType: string;
		itemName: string;
		description?: string;
		onConfirm: () => Promise<void>;
	}) => Promise<void>;
	selectedUsers: User[];
	clearSelection: () => void;
	onUsersMutated?: () => void;
	changeGroupDialog: DialogState<User>;
	renameGroupDialog: DialogState<Group>;
	bulkChangeGroupDialog: DialogState<null>;
}

/** Group actions. */
export function useUserGroupActions({
	user,
	selectedGroup,
	setSelectedGroup,
	setUsers,
	showSuccess,
	showError,
	setNotification,
	fetchUsers,
	confirm,
	selectedUsers,
	clearSelection,
	onUsersMutated,
	changeGroupDialog,
	renameGroupDialog,
	bulkChangeGroupDialog,
}: UseUserGroupActionsParams) {
	const { t } = useTranslation();

	const [groups, setGroups] = useState<Group[]>([]);
	const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
	const [groupReloadKey, setGroupReloadKey] = useState(0);
	const [selectedGroupDisabled, setSelectedGroupDisabled] = useState<boolean | null>(null);
	const [groupNewName, setGroupNewName] = useState<string>("");
	const [bulkSelectedGroupId, setBulkSelectedGroupId] = useState<string | null>(null);

	const fetchGroups = useCallback(async () => {
		try {
			const data = await groupService.getGroups();
			setGroups(data);
		} catch {
			if (import.meta.env.DEV) console.error("Failed to fetch groups");
		}
	}, []);

	// Disabled flag.
	useEffect(() => {
		let active = true;
		(async () => {
			if (selectedGroup) {
				try {
					const detail = await groupService.getGroupDetail(selectedGroup.id);
					if (active) setSelectedGroupDisabled(!!detail.disabled);
				} catch {
					if (active) setSelectedGroupDisabled(null);
				}
			} else {
				setSelectedGroupDisabled(null);
			}
		})();
		return () => { active = false; };
	}, [selectedGroup]);

	const handleChangeGroup = useCallback((target: User) => {
		setSelectedGroupId(target.group_id || null);
		changeGroupDialog.open(target);
	}, [changeGroupDialog]);

	const handleConfirmGroupChange = useCallback(async () => {
		if (!changeGroupDialog.selectedItem || selectedGroupId === null) return;

		const movedUserId = changeGroupDialog.selectedItem.id;

		try {
			await groupService.addMember(selectedGroupId, { user_id: String(movedUserId) });

			// Optimistic update.
			setUsers(prevUsers =>
				prevUsers.map(u =>
					u.id === movedUserId
						? { ...u, group_id: selectedGroupId }
						: u
				)
			);

			showSuccess("User moved to new group and logged out. They must re-login to access their new workspace.");
			changeGroupDialog.close();
			setSelectedGroupId(null);

			// Background refresh.
			Promise.all([fetchUsers(), fetchGroups()])
				.catch(err => {
					if (import.meta.env.DEV) console.error("Failed to refresh after group change:", err);
				});
		} catch (error: unknown) {
			if (import.meta.env.DEV) console.error("Failed to update user group:", error);
			const maybeAxiosError = typeof error === "object" && error !== null
				? (error as { response?: { data?: { error?: string; message?: string } } })
				: null;
			const errorMsg = maybeAxiosError?.response?.data?.error
				|| maybeAxiosError?.response?.data?.message
				|| "Failed to update user group";
			showError(errorMsg);
		}
	}, [changeGroupDialog, selectedGroupId, setUsers, showSuccess, showError, fetchUsers, fetchGroups]);

	const handleDisableGroup = useCallback(async () => {
		if (!selectedGroup) return;
		try {
			await confirm({
				type: "warning",
				itemType: "group",
				itemName: getGroupFullDisplayName(selectedGroup),
				description: t("userManagement.confirmations.disableGroupDescription"),
				onConfirm: async () => {
					await groupService.disableGroup(selectedGroup.id);
					setNotification({ open: true, message: t("userManagement.notifications.groupDisabled", { name: getGroupFullDisplayName(selectedGroup) }), severity: "success" });
					setSelectedGroupDisabled(true);
					await fetchUsers();
				},
			});
		} catch {
			// User cancelled the action
		}
	}, [selectedGroup, confirm, t, setNotification, fetchUsers]);

	const handleEnableGroup = useCallback(async () => {
		if (!selectedGroup) return;
		try {
			await confirm({
				type: "success",
				itemType: "group",
				itemName: getGroupFullDisplayName(selectedGroup),
				description: t("userManagement.confirmations.enableGroupDescription"),
				onConfirm: async () => {
					await groupService.enableGroup(selectedGroup.id);
					setNotification({ open: true, message: t("userManagement.notifications.groupEnabled", { name: getGroupFullDisplayName(selectedGroup) }), severity: "success" });
					setSelectedGroupDisabled(false);
					await fetchUsers();
				},
			});
		} catch {
			// User cancelled the action
		}
	}, [selectedGroup, confirm, t, setNotification, fetchUsers]);

	const handleDeleteGroup = useCallback(async () => {
		if (!selectedGroup) return;

		try {
			await confirm({
				type: "delete",
				itemType: "group",
				itemName: getGroupFullDisplayName(selectedGroup),
				description: t("userManagement.confirmations.deleteGroupDescription"),
				onConfirm: async () => {
					await groupService.deleteGroup(selectedGroup.id);
					setNotification({ open: true, message: t("userManagement.notifications.groupDeleted", { name: getGroupFullDisplayName(selectedGroup) }), severity: "success" });

					// Reload groups.
					await fetchGroups();

					if (isManager(user)) {
						// Reload and select.
						const updatedGroups = await groupService.getGroups();
						if (updatedGroups.length > 0) {
							setSelectedGroup(updatedGroups[0]);
						}
					} else {
						// Experts see all.
						setSelectedGroup(null);
					}

					setGroupReloadKey(prev => prev + 1);
					await fetchUsers();
				},
			});
		} catch {
			// User cancelled the action
		}
	}, [selectedGroup, confirm, t, setNotification, fetchGroups, user, setSelectedGroup, fetchUsers]);

	const handleRenameGroup = useCallback(() => {
		if (!selectedGroup) return;
		const currentName = selectedGroup.attributes?.display_name?.[0] || selectedGroup.name;
		setGroupNewName(currentName);
		renameGroupDialog.open(selectedGroup);
	}, [selectedGroup, renameGroupDialog]);

	const handleConfirmRenameGroup = useCallback(async () => {
		if (!renameGroupDialog.selectedItem || !groupNewName.trim()) return;

		try {
			await groupService.updateGroup(renameGroupDialog.selectedItem.id, { name: groupNewName.trim() });
			showSuccess(t("userManagement.notifications.groupRenamed", { name: groupNewName.trim() }));

			// Read new name.
			const updatedGroup = await groupService.getGroupDetail(renameGroupDialog.selectedItem.id);
			setSelectedGroup(updatedGroup);
			// Optimistic update.
			setGroups((prev) => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
			// Refresh group list.
			await fetchGroups();

			renameGroupDialog.close();
			setGroupNewName("");
			setGroupReloadKey(prev => prev + 1);
			await fetchUsers();
		} catch (error: unknown) {
			const maybeAxiosError = typeof error === "object" && error !== null
				? (error as { response?: { data?: { error?: string } } })
				: null;
			const message = maybeAxiosError?.response?.data?.error ?? t("userManagement.notifications.failedToRenameGroup");
			showError(message);
		}
	}, [renameGroupDialog, groupNewName, showSuccess, t, setSelectedGroup, fetchGroups, fetchUsers, showError]);

	const handleBulkMoveToGroup = useCallback(() => {
		setBulkSelectedGroupId(null);
		bulkChangeGroupDialog.open();
	}, [bulkChangeGroupDialog]);

	const handleConfirmBulkGroupChange = useCallback(async () => {
		if (!bulkSelectedGroupId || selectedUsers.length === 0) return;

		try {
			await Promise.all(
				selectedUsers.map((u) =>
					groupService.addMember(bulkSelectedGroupId, { user_id: String(u.id) })
				)
			);
			showSuccess(t("userManagement.notifications.bulkGroupChanged", { count: selectedUsers.length }));
			clearSelection();
			bulkChangeGroupDialog.close();
			setBulkSelectedGroupId(null);
			await Promise.all([fetchUsers(), fetchGroups()]);
			if (onUsersMutated) onUsersMutated();
		} catch {
			showError(t("userManagement.notifications.bulkGroupChangeFailed"));
		}
	}, [bulkSelectedGroupId, selectedUsers, showSuccess, t, clearSelection, bulkChangeGroupDialog, fetchUsers, fetchGroups, onUsersMutated, showError]);

	return {
		groups,
		selectedGroupId,
		setSelectedGroupId,
		groupReloadKey,
		setGroupReloadKey,
		selectedGroupDisabled,
		groupNewName,
		setGroupNewName,
		bulkSelectedGroupId,
		setBulkSelectedGroupId,
		fetchGroups,
		handleChangeGroup,
		handleConfirmGroupChange,
		handleDisableGroup,
		handleEnableGroup,
		handleDeleteGroup,
		handleRenameGroup,
		handleConfirmRenameGroup,
		handleBulkMoveToGroup,
		handleConfirmBulkGroupChange,
	};
}
