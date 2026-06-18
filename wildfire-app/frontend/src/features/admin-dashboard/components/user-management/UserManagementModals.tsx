import type { Dispatch, SetStateAction } from "react";
import { UniversalForm } from "@spatialhub/forms";
import Notification from "@/components/ui/Notification";
import type { FormDataConvertible } from "@/hooks/useForm";
import { getUserFormSections } from "@/configuration/formConfigurations";
import { GroupManagement } from "../../GroupManagement";
import type { Group } from "@/components/workspace";
import { getGroupFullDisplayName } from "@/components/workspace";
import { isExpertOrManager } from "@/features/admin-dashboard/utils/accessLevelUtils";
import { useTranslation } from "@/i18n";
import type { NotificationState, User, UserFormData } from "./types";

interface DialogState<T = unknown> {
	isOpen: boolean;
	selectedItem: T | null;
	close: () => void;
}

interface UserManagementModalsProps {
	user: User | null | undefined;
	editDialog: DialogState<User>;
	addDialog: DialogState;
	groupManagementDialog: DialogState;
	changeGroupDialog: DialogState<User>;
	bulkChangeGroupDialog: DialogState;
	renameGroupDialog: DialogState<Group>;
	formData: UserFormData;
	formLoading: boolean;
	formErrors: Record<string, string>;
	handleFormChange: (key: string, value: FormDataConvertible) => void;
	handleSaveUser: () => void | Promise<void>;
	resetForm: () => void;
	fetchGroups: () => void;
	fetchUsers: () => void;
	setGroupReloadKey: Dispatch<SetStateAction<number>>;
	setNotification: (notification: NotificationState) => void;
	groups: Group[];
	selectedGroupId: string | null;
	setSelectedGroupId: (id: string | null) => void;
	handleConfirmGroupChange: () => void | Promise<void>;
	selectedUsersCount: number;
	bulkSelectedGroupId: string | null;
	setBulkSelectedGroupId: (id: string | null) => void;
	handleConfirmBulkGroupChange: () => void | Promise<void>;
	groupNewName: string;
	setGroupNewName: (name: string) => void;
	handleConfirmRenameGroup: () => void | Promise<void>;
	notification: NotificationState;
	hideNotification: () => void;
}

export function UserManagementModals({
	user, editDialog, addDialog, groupManagementDialog, changeGroupDialog, bulkChangeGroupDialog, renameGroupDialog, formData, formLoading, formErrors, handleFormChange, handleSaveUser, resetForm, fetchGroups, fetchUsers, setGroupReloadKey, setNotification, groups, selectedGroupId, setSelectedGroupId, handleConfirmGroupChange, selectedUsersCount, bulkSelectedGroupId, setBulkSelectedGroupId, handleConfirmBulkGroupChange, groupNewName, setGroupNewName, handleConfirmRenameGroup, notification, hideNotification,
}: UserManagementModalsProps) {
	const { t } = useTranslation();

	return (
		<>
		<UniversalForm
			isOpen={editDialog.isOpen || addDialog.isOpen}
			onClose={() => {
				editDialog.close();
				addDialog.close();
				resetForm();
			}}
			title={editDialog.selectedItem ? t("userManagement.dialog.editTitle") : t("userManagement.dialog.addTitle")}
			sections={getUserFormSections(!!editDialog.selectedItem, t, user?.access_level)}
			values={formData as unknown as Record<string, FormDataConvertible>}
			onChange={handleFormChange}
			onSubmit={handleSaveUser}
			submitText={editDialog.selectedItem ? t("userManagement.dialog.updateUser") : t("userManagement.dialog.createUser")}
			loading={formLoading}
			errors={formErrors}
			maxWidth="lg"
		/>
		{isExpertOrManager(user) && (
			<GroupManagement
				isOpen={groupManagementDialog.isOpen}
				onClose={groupManagementDialog.close}
				onSuccess={() => {
					fetchGroups();
					fetchUsers();
					setGroupReloadKey(prev => prev + 1);
				}}
				onNotification={(message, severity) => setNotification({ open: true, message, severity })}
			/>
		)}


		<UniversalForm
			isOpen={changeGroupDialog.isOpen}
			onClose={() => {
				changeGroupDialog.close();
				setSelectedGroupId(null);
			}}
			title={t("userManagement.groups.changeUserGroup")}
			sections={[
				{
					title: t("userManagement.groups.groupAssignment"),
					fields: [
						{
							key: "user",
							label: t("userManagement.table.user"),
							type: "text",
							value: changeGroupDialog.selectedItem?.name || "",
							disabled: true,
						},
						{
							key: "group_id",
							label: t("userManagement.groups.selectGroup"),
							type: "select",
							required: true,
							options: groups.map(g => ({
								value: g.id,
								label: getGroupFullDisplayName(g)
							})),
						},
					],
			},
		]}
		values={{ user: changeGroupDialog.selectedItem?.name || "", group_id: selectedGroupId || "" }}
		onChange={(key, value) => {
			if (key === "group_id") {
				setSelectedGroupId(value as string);
			}
		}}
		onSubmit={handleConfirmGroupChange}
		submitText={t("userManagement.groups.changeGroup")}
		loading={false}
		errors={{}}
		maxWidth="sm"
	/>

	<UniversalForm
		isOpen={bulkChangeGroupDialog.isOpen}
		onClose={() => {
			bulkChangeGroupDialog.close();
			setBulkSelectedGroupId(null);
		}}
		title={t("userManagement.groups.bulkChangeGroup")}
		sections={[
			{
				title: t("userManagement.groups.groupAssignment"),
				fields: [
					{
						key: "users",
						label: t("userManagement.table.user"),
						type: "text",
						value: t("userManagement.actions.selected", { count: selectedUsersCount }),
						disabled: true,
					},
					{
						key: "group_id",
						label: t("userManagement.groups.selectGroup"),
						type: "select",
						required: true,
						options: groups.map(g => ({
							value: g.id,
							label: getGroupFullDisplayName(g)
						})),
					},
				],
			},
		]}
		values={{ users: t("userManagement.actions.selected", { count: selectedUsersCount }), group_id: bulkSelectedGroupId || "" }}
		onChange={(key, value) => {
			if (key === "group_id") {
				setBulkSelectedGroupId(value as string);
			}
		}}
		onSubmit={handleConfirmBulkGroupChange}
		submitText={t("userManagement.groups.moveUsers")}
		loading={false}
		errors={{}}
		maxWidth="sm"
	/>

	<UniversalForm
		isOpen={renameGroupDialog.isOpen}
		onClose={() => {
			renameGroupDialog.close();
			setGroupNewName('');
		}}
		title={t("userManagement.groups.renameGroupTitle")}
		sections={[
			{
				title: t("userManagement.groups.groupName"),
				fields: [
					{
						key: "name",
						label: t("userManagement.groups.newGroupName"),
						type: "text",
						required: true,
						placeholder: t("userManagement.groups.enterNewGroupName"),
					},
				],
			},
		]}
		values={{ name: groupNewName }}
		onChange={(key, value) => {
			if (key === "name") {
				setGroupNewName(value as string);
			}
		}}
		onSubmit={handleConfirmRenameGroup}
		submitText={t("userManagement.groups.rename")}
		loading={false}
		errors={{}}
		maxWidth="sm"
	/>

	<Notification
		isOpen={notification.open}
		message={notification.message}
		severity={notification.severity}
		onClose={hideNotification}
	/>
		</>
	);
}
