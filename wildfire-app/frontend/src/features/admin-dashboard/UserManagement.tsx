import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import type { FormDataConvertible } from "@/hooks/useForm";
import { useConfirm } from "@/hooks/useConfirmDialog";
import { validateUserForm } from "@/configuration/formConfigurations";
import { groupService, type Group } from "@/components/workspace";
import { getGroupFullDisplayName } from "@/components/workspace";
import { useNotification } from "@/features/notifications/hooks/useNotification";
import { useDebounce } from "@/hooks/useDebounce";
import { useDialog } from "@/hooks/useDialog";
import { isExpert, isManager, isExpertOrManager } from "@/features/admin-dashboard/utils/accessLevelUtils";
import { getPaginationParams, filterByGroup, paginateArray } from "@/utils/paginationUtils";
import { useTranslation } from "@/i18n";
import { useUserSelection } from "@/features/admin-dashboard/hooks/useUserSelection";
import { UserManagementFilters } from "./components/user-management/UserManagementFilters";
import { UserManagementBulkActions } from "./components/user-management/UserManagementBulkActions";
import { UserManagementTable } from "./components/user-management/UserManagementTable";
import { UserManagementModals } from "./components/user-management/UserManagementModals";
import { ApiTokensDialog } from "./components/user-management/ApiTokensDialog";
import type { CreateUserPayload, NotificationState, User, UserFormData } from "./components/user-management/types";
import {
	createAdminUser,
	deleteAdminUser,
	disableAdminUser,
	enableAdminUser,
	listAdminUsers,
	updateAdminUser,
} from "@/services/userManagement";

type UserDialogState = Pick<ReturnType<typeof useDialog<User>>, "selectedItem" | "close">;

interface UserManagementProps {
	onUsersMutated?: () => void;
}

export const UserManagement = ({ onUsersMutated }: UserManagementProps) => {
	const { t } = useTranslation();
	const { user } = useAuthStore();
	const navigate = useNavigate();
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [totalCount, setTotalCount] = useState(0);
	const editDialog = useDialog<User>();
	const addDialog = useDialog();
	const groupManagementDialog = useDialog();
	const changeGroupDialog = useDialog<User>();
	const renameGroupDialog = useDialog<Group>();

	const [groups, setGroups] = useState<Group[]>([]);
	const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
	const [groupReloadKey, setGroupReloadKey] = useState(0);
	const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
	const [selectedGroupDisabled, setSelectedGroupDisabled] = useState<boolean | null>(null);
	const [groupNewName, setGroupNewName] = useState<string>('');

	const confirm = useConfirm();

	const {
		selectedUsers,
		isSelected,
		handleSelectUser,
		handleSelectAll,
		clearSelection,
	} = useUserSelection<User>();

	const bulkChangeGroupDialog = useDialog();
	const [bulkSelectedGroupId, setBulkSelectedGroupId] = useState<string | null>(null);

	const [formData, setFormData] = useState<UserFormData>({
		name: "",
		email: "",
		organization: "",
		position: "",
		phone: "",
		access_level: "very_low",
		email_verified: false,
		password: "",
		password_confirmation: "",
		model_limit: undefined,
	});
	const { notification, showSuccess, showError, hide: hideNotification, setNotification } = useNotification();
	const [formErrors, setFormErrors] = useState<Record<string, string>>({});
	const [formLoading, setFormLoading] = useState(false);

	const [searchTerm, setSearchTerm] = useState("");
	const debouncedSearch = useDebounce(searchTerm.trim(), 400);
	const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
	const [apiTokensUser, setApiTokensUser] = useState<User | null>(null);

	const handleCopyEmail = useCallback((email: string) => {
		navigator.clipboard.writeText(email).then(() => {
			setCopiedEmail(email);
			setTimeout(() => setCopiedEmail(null), 2000);
		}).catch(() => {
			showError(t("userManagement.notifications.failedToCopyEmail"));
		});
	}, [showError, t]);

	useEffect(() => { setPage(0); }, [debouncedSearch]);

	useEffect(() => { setPage(0); }, [selectedGroup]);

	// Clear selection when filters/page change to prevent stale references
	useEffect(() => { clearSelection(); }, [debouncedSearch, selectedGroup, page, clearSelection]);

	const fetchUsers = useCallback(async () => {
		await fetchUsersWithPagination({
			user,
			selectedGroup,
			debouncedSearch,
			page,
			rowsPerPage,
			setUsers,
			setTotalCount,
			setLoading,
			setNotification,
			navigate
		});
	}, [debouncedSearch, page, rowsPerPage, selectedGroup, user, navigate, setNotification]);

	const createUser = async (userData: UserFormData): Promise<boolean> => {
		try {
			const payload: CreateUserPayload = {
				email: userData.email,
				name: userData.name,
				password: userData.password || undefined,
				access_level: userData.access_level,
				organization: userData.organization,
				position: userData.position,
				phone: userData.phone,
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
	};

	const updateUser = async (userId: string | number, userData: Partial<UserFormData>): Promise<boolean> => {
		try {
			const updateData = { ...userData };
			if (!updateData.password) {
				delete updateData.password;
				delete updateData.password_confirmation;
			}

			if (updateData.email_verified !== true) {
				delete (updateData as Partial<UserFormData> & Record<string, unknown>)["email_verified"];
			}

			// When model_limit is blank, reset to default for the user's access level
			if (updateData.model_limit === "" || updateData.model_limit === undefined) {
				const level = (updateData.access_level || formData.access_level || "very_low") as string;
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
	};

	const deleteUser = async (userId: string | number): Promise<boolean> => {
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
	};

	const disableUser = async (userId: string | number): Promise<boolean> => {
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
	};

	const enableUser = async (userId: string | number): Promise<boolean> => {
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
	};

	const handleDisableUser = async (u: User) => {
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
	};

	const handleEnableUser = async (u: User) => {
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
	};

	const handleToggleUser = async (u: User) => {
		const isEnabled = u.enabled !== false;
		if (isEnabled) {
			await handleDisableUser(u);
		} else {
			await handleEnableUser(u);
		}
	};

	const fetchGroups = useCallback(async () => {
		try {
			const data = await groupService.getGroups();
			setGroups(data);
		} catch {
			if (import.meta.env.DEV) console.error("Failed to fetch groups");
		}
	}, []);

	const handleChangeGroup = (user: User) => {
		setSelectedGroupId(user.group_id || null);
		changeGroupDialog.open(user);
	};

	const handleConfirmGroupChange = async () => {
		await handleGroupChangeConfirmation({
			changeGroupDialog,
			selectedGroupId,
			setUsers,
			showSuccess,
			showError,
			fetchUsers,
			fetchGroups,
			setSelectedGroupId
		});
	};

	useEffect(() => {
		fetchUsers();
		if (isExpertOrManager(user)) {
			fetchGroups();
		}
	}, [fetchUsers, fetchGroups, user]);

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


	const handleEditUser = (user: User) => {
		setFormData({
			name: user.name,
			email: user.email,
			organization: user.organization || "",
			position: user.position || "",
			phone: user.phone || "",
			access_level: user.access_level,
			email_verified: user.email_verified ?? false,
			model_limit: user.model_limit,
		});
		editDialog.open(user);
	};

	const handleDeleteUser = async (user: User) => {
		try {
			await confirm({
				type: "delete",
				itemType: "user",
				itemName: `${user.name} (${user.email})`,
				onConfirm: async () => { await deleteUser(user.id); },
			});
		} catch {
			// User cancelled the action
		}
	};

	const handleAddUser = () => {
		resetForm();
		addDialog.open();
	};

	// Group actions (enable/disable/delete)
	const handleDisableGroup = async () => {
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
	};

	const handleEnableGroup = async () => {
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
	};

	const handleDeleteGroup = async () => {
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

					// Reload groups to get updated list
					await fetchGroups();

					if (isManager(user)) {
						// Fetch updated groups and select first available
						const updatedGroups = await groupService.getGroups();
						if (updatedGroups.length > 0) {
							setSelectedGroup(updatedGroups[0]);
						}
					} else {
						// Expert can view all users
						setSelectedGroup(null);
					}

					setGroupReloadKey(prev => prev + 1);
					await fetchUsers();
				},
			});
		} catch {
			// User cancelled the action
		}
	};

	const handleRenameGroup = () => {
		if (!selectedGroup) return;
		const currentName = selectedGroup.attributes?.display_name?.[0] || selectedGroup.name;
		setGroupNewName(currentName);
		renameGroupDialog.open(selectedGroup);
	};

	const handleConfirmRenameGroup = async () => {
		if (!renameGroupDialog.selectedItem || !groupNewName.trim()) return;

		try {
			await groupService.updateGroup(renameGroupDialog.selectedItem.id, { name: groupNewName.trim() });
			showSuccess(t("userManagement.notifications.groupRenamed", { name: groupNewName.trim() }));
			
			// Fetch the updated group details to get the new display_name
			const updatedGroup = await groupService.getGroupDetail(renameGroupDialog.selectedItem.id);
			setSelectedGroup(updatedGroup);
			// Optimistically update groups state so all consumers reflect the change immediately
			setGroups((prev) => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
			// Also refresh the groups list so any other UI using it sees the new display name
			await fetchGroups();
			
			renameGroupDialog.close();
			setGroupNewName('');
			setGroupReloadKey(prev => prev + 1);
			await fetchUsers();
		} catch (error: unknown) {
			const maybeAxiosError = typeof error === "object" && error !== null
				? (error as { response?: { data?: { error?: string } } })
				: null;
			const message = maybeAxiosError?.response?.data?.error ?? t("userManagement.notifications.failedToRenameGroup");
			showError(message);
		}
	};

	const handleBulkMoveToGroup = () => {
		setBulkSelectedGroupId(null);
		bulkChangeGroupDialog.open();
	};

	const handleConfirmBulkGroupChange = async () => {
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
	};

	const handleBulkDelete = async () => {
		if (selectedUsers.length === 0) return;

		try {
			await confirm({
				type: "delete",
				itemType: "user",
				itemName: t("userManagement.actions.selected", { count: selectedUsers.length }),
				description: t("userManagement.confirmations.bulkDeleteDescription", { count: selectedUsers.length }),
				onConfirm: async () => {
					const results = await Promise.allSettled(
						selectedUsers.map((u) => deleteAdminUser(u.id))
					);
					const succeeded = results.filter((r) => r.status === "fulfilled").length;
					const failed = results.length - succeeded;

					if (failed === 0) {
						showSuccess(t("userManagement.notifications.bulkDeleted", { count: succeeded }));
					} else {
						setNotification({
							open: true,
							message: t("userManagement.notifications.bulkDeletePartial", {
								succeeded: String(succeeded),
								total: String(results.length),
								failed: String(failed),
							}),
							severity: "warning",
						});
					}

					clearSelection();
					await fetchUsers();
					if (onUsersMutated) onUsersMutated();
				},
			});
		} catch {
			// User cancelled the action
		}
	};

	const handleSaveUser = async () => {
		setFormLoading(true);
		setFormErrors({});

		try {
			const isEdit = !!editDialog.selectedItem;
			const errors = validateUserForm(formData as unknown as Record<string, unknown>, isEdit, t);

			if (Object.keys(errors).length > 0) {
				setFormErrors(errors);
				return;
			}

			let success = false;

			if (editDialog.selectedItem) {
				success = await updateUser(editDialog.selectedItem.id, formData);
			} else {
				if (!formData.password || formData.password !== formData.password_confirmation) {
					setFormErrors({ password_confirmation: t("userManagement.notifications.passwordMismatch") });
					return;
				}
				success = await createUser(formData);
			}

			if (success) {
				editDialog.close();
				addDialog.close();
				resetForm();
			}
		} catch {
			if (import.meta.env.DEV) console.error("Error saving user");
		} finally {
			setFormLoading(false);
		}
	};

	const resetForm = () => {
		setFormData({
			name: "",
			email: "",
			organization: "",
			position: "",
			phone: "",
			access_level: "very_low",
			email_verified: false,
			password: "",
			password_confirmation: "",
			model_limit: undefined,
		});
		setFormErrors({});
	};

	// Default model limits per access level
	const defaultModelLimits: Record<string, number> = {
		very_low: 10,
		intermediate: 25,
		manager: 50,
		expert: 0,
	};

	const handleFormChange = (key: string, value: FormDataConvertible) => {
		setFormData((prev) => {
			const updated = { ...prev, [key]: value };
			
			// Auto-update model_limit when access_level changes
			if (key === "access_level" && typeof value === "string") {
				updated.model_limit = defaultModelLimits[value] ?? 10;
			}
			
			return updated;
		});

		// Clear error for this field
		if (formErrors[key]) {
			setFormErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors[key];
				return newErrors;
			});
		}
	};

	const noResults = !loading && users.length === 0 && !!debouncedSearch;

return (
		<div className="space-y-6 overflow-visible">
			<UserManagementFilters
				user={user}
				searchTerm={searchTerm}
				setSearchTerm={setSearchTerm}
				isRefreshing={isRefreshing}
				loading={loading}
				setIsRefreshing={setIsRefreshing}
				fetchUsers={fetchUsers}
				fetchGroups={fetchGroups}
				selectedGroup={selectedGroup}
				selectedGroupDisabled={selectedGroupDisabled}
				setSelectedGroup={setSelectedGroup}
				onCreateGroup={groupManagementDialog.open}
				groupReloadKey={groupReloadKey}
				handleRenameGroup={handleRenameGroup}
				handleEnableGroup={handleEnableGroup}
				handleDisableGroup={handleDisableGroup}
				handleDeleteGroup={handleDeleteGroup}
				handleAddUser={handleAddUser}
				bulkActions={selectedUsers.length > 0 && isExpertOrManager(user) ? (
					<UserManagementBulkActions
						selectedCount={selectedUsers.length}
						handleBulkMoveToGroup={handleBulkMoveToGroup}
						handleBulkDelete={handleBulkDelete}
					/>
				) : null}
			/>

			<UserManagementTable
				user={user}
				users={users}
				groups={groups}
				loading={loading}
				selectedUsers={selectedUsers}
				isSelected={isSelected}
				handleSelectUser={handleSelectUser}
				handleSelectAll={handleSelectAll}
				handleCopyEmail={handleCopyEmail}
				copiedEmail={copiedEmail}
				handleChangeGroup={handleChangeGroup}
				handleToggleUser={handleToggleUser}
				handleEditUser={handleEditUser}
				handleDeleteUser={handleDeleteUser}
				handleApiTokens={setApiTokensUser}
				noResults={noResults}
				debouncedSearch={debouncedSearch}
				page={page}
				totalCount={totalCount}
				rowsPerPage={rowsPerPage}
				setPage={setPage}
				setRowsPerPage={setRowsPerPage}
			/>

			<ApiTokensDialog
				user={apiTokensUser}
				isOpen={apiTokensUser !== null}
				onClose={() => {
					setApiTokensUser(null);
					// Refresh so the key icon reflects token changes immediately.
					void fetchUsers();
				}}
			/>

			<UserManagementModals
				user={user}
				editDialog={editDialog}
				addDialog={addDialog}
				groupManagementDialog={groupManagementDialog}
				changeGroupDialog={changeGroupDialog}
				bulkChangeGroupDialog={bulkChangeGroupDialog}
				renameGroupDialog={renameGroupDialog}
				formData={formData}
				formLoading={formLoading}
				formErrors={formErrors}
				handleFormChange={handleFormChange}
				handleSaveUser={handleSaveUser}
				resetForm={resetForm}
				fetchGroups={fetchGroups}
				fetchUsers={fetchUsers}
				setGroupReloadKey={setGroupReloadKey}
				setNotification={setNotification}
				groups={groups}
				selectedGroupId={selectedGroupId}
				setSelectedGroupId={setSelectedGroupId}
				handleConfirmGroupChange={handleConfirmGroupChange}
				selectedUsersCount={selectedUsers.length}
				bulkSelectedGroupId={bulkSelectedGroupId}
				setBulkSelectedGroupId={setBulkSelectedGroupId}
				handleConfirmBulkGroupChange={handleConfirmBulkGroupChange}
				groupNewName={groupNewName}
				setGroupNewName={setGroupNewName}
				handleConfirmRenameGroup={handleConfirmRenameGroup}
				notification={notification}
				hideNotification={hideNotification}
			/>
		</div>
	);
};

// Helper function for fetching users with pagination
async function fetchUsersWithPagination(params: {
	user: User | null;
	selectedGroup: Group | null;
	debouncedSearch: string;
	page: number;
	rowsPerPage: number;
	setUsers: (users: User[]) => void;
	setTotalCount: (count: number) => void;
	setLoading: (loading: boolean) => void;
	setNotification: (notification: NotificationState) => void;
	navigate: NavigateFunction;
}) {
	const { user, selectedGroup, debouncedSearch, page, rowsPerPage, setUsers, setTotalCount, setLoading, setNotification, navigate } = params;

	if (!user) {
		setNotification({ open: true, message: "Please log in to view users", severity: "error" });
		navigate("/login");
		return;
	}

	if (isManager(user) && !selectedGroup) {
		setUsers([]);
		setTotalCount(0);
		setLoading(false);
		return;
	}

	setLoading(true);
	try {
		const paginationParams = getPaginationParams({
			page,
			rowsPerPage,
			accessLevel: user.access_level,
			selectedGroup
		});
		const perPageParam = paginationParams.perPage;
		const pageParam = paginationParams.pageNumber;

		const data = await listAdminUsers({
			page: pageParam,
			perPage: perPageParam,
			search: debouncedSearch,
		});

		if (data.success) {
			const list = data.data?.data || [];
			const backendTotal = data.data?.total || 0;

			if (paginationParams.shouldFilterClient) {
				const filtered = filterByGroup(list, selectedGroup);
				const paginated = paginateArray(filtered, page, rowsPerPage);
				setUsers(paginated.items);
				setTotalCount(paginated.total);
			} else {
				setUsers(list);
				setTotalCount(backendTotal);
			}
		} else {
			throw new Error(data.message || "Failed to fetch users");
		}
	} catch {
		if (import.meta.env.DEV) console.error("Error fetching users");
		setNotification({ open: true, message: "Failed to fetch users", severity: "error" });
	} finally {
		setLoading(false);
	}
}

// Helper function for handling group change confirmation
async function handleGroupChangeConfirmation(params: {
	changeGroupDialog: UserDialogState;
	selectedGroupId: string | null;
	setUsers: React.Dispatch<React.SetStateAction<User[]>>;
	showSuccess: (message: string) => void;
	showError: (message: string) => void;
	fetchUsers: () => Promise<void>;
	fetchGroups: () => Promise<void>;
	setSelectedGroupId: (id: string | null) => void;
}) {
	const { changeGroupDialog, selectedGroupId, setUsers, showSuccess, showError, fetchUsers, fetchGroups, setSelectedGroupId } = params;

	if (!changeGroupDialog.selectedItem || selectedGroupId === null) return;

	const movedUserId = changeGroupDialog.selectedItem.id;

	try {
		await groupService.addMember(selectedGroupId, { user_id: String(movedUserId) });

		// Optimistically update the user in the local state
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

		// Refresh in background without blocking UI
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
}
