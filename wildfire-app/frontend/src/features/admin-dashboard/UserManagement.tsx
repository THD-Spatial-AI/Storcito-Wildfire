import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import type { FormDataConvertible } from "@/hooks/useForm";
import { useConfirm } from "@/hooks/useConfirmDialog";
import { validateUserForm } from "@/configuration/formConfigurations";
import type { Group } from "@/components/workspace";
import { useNotification } from "@/features/notifications";
import { useDebounce } from "@/hooks/useDebounce";
import { useDialog } from "@/hooks/useDialog";
import { isManager, isExpertOrManager } from "@/features/admin-dashboard/utils/accessLevelUtils";
import { getPaginationParams, filterByGroup, paginateArray } from "@/utils/paginationUtils";
import { useTranslation } from "@/i18n";
import { useUserSelection } from "@/features/admin-dashboard/hooks/useUserSelection";
import { useUserCrud } from "@/features/admin-dashboard/hooks/useUserCrud";
import { useUserGroupActions } from "@/features/admin-dashboard/hooks/useUserGroupActions";
import { UserManagementFilters } from "./components/user-management/UserManagementFilters";
import { UserManagementBulkActions } from "./components/user-management/UserManagementBulkActions";
import { UserManagementTable } from "./components/user-management/UserManagementTable";
import { UserManagementModals } from "./components/user-management/UserManagementModals";
import { ApiTokensDialog } from "./components/user-management/ApiTokensDialog";
import type { NotificationState, User, UserFormData } from "./components/user-management/types";
import {
	deleteAdminUser,
	listAdminUsers,
} from "@/services/userManagement";

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
	const bulkChangeGroupDialog = useDialog();

	const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

	const confirm = useConfirm();

	const {
		selectedUsers,
		isSelected,
		handleSelectUser,
		handleSelectAll,
		clearSelection,
	} = useUserSelection<User>();

	const [formData, setFormData] = useState<UserFormData>({
		name: "",
		email: "",
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

	// Drop stale selection.
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

	// User CRUD.
	const {
		createUser,
		updateUser,
		handleToggleUser,
		handleDeleteUser,
	} = useUserCrud({
		user,
		selectedGroup,
		formAccessLevel: formData.access_level,
		fetchUsers,
		setNotification,
		confirm,
		onUsersMutated,
	});

	// Group state.
	const {
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
	} = useUserGroupActions({
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
	});

	useEffect(() => {
		fetchUsers();
		if (isExpertOrManager(user)) {
			fetchGroups();
		}
	}, [fetchUsers, fetchGroups, user]);

	const handleEditUser = (user: User) => {
		setFormData({
			name: user.name,
			email: user.email,
			access_level: user.access_level,
			email_verified: user.email_verified ?? false,
			model_limit: user.model_limit,
		});
		editDialog.open(user);
	};

	const handleAddUser = () => {
		resetForm();
		addDialog.open();
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
			access_level: "very_low",
			email_verified: false,
			password: "",
			password_confirmation: "",
			model_limit: undefined,
		});
		setFormErrors({});
	};

	// Default limits.
	const defaultModelLimits: Record<string, number> = {
		very_low: 10,
		intermediate: 25,
		manager: 50,
		expert: 0,
	};

	const handleFormChange = (key: string, value: FormDataConvertible) => {
		setFormData((prev) => {
			const updated = { ...prev, [key]: value };

			// Sync limit to level.
			if (key === "access_level" && typeof value === "string") {
				updated.model_limit = defaultModelLimits[value] ?? 10;
			}

			return updated;
		});

		// Clear field error.
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
					// Refresh key icon.
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

// Paginated fetch.
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
