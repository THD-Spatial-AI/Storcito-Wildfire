import { Check, CheckCircle, Copy, Edit, KeyRound, Mail, Shield, Trash2, UserCheck, UserCog, Users, UserX, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import Pagination from "@/components/ui/Pagination";
import ModelActionGroup from "@/components/shared/ModelActionGroup";
import StatusBadge from "@/components/ui/StatusBadge";
import type { Group } from "@/components/workspace";
import { getGroupDisplayName, getGroupFullDisplayName } from "@/components/workspace";
import { getAccessLevelColor, getAccessLevelIconColor, getAccessLevelName, isExpertOrManager, isManager } from "@/features/admin-dashboard/utils/accessLevelUtils";
import { useTranslation } from "@/i18n";
import type { User } from "./types";

function getUsersEmptyMessage(t: (key: string, params?: Record<string, string>) => string, user: User | null | undefined, noResults: boolean, search: string): string {
	if (user && isManager(user)) {
		return t("userManagement.noUsersInGroup");
	}
	if (noResults) {
		return t("userManagement.noUsersMatch", { search });
	}
	return t("userManagement.noUsersFound");
}

function getUserGroupDisplay(tableUser: User, groups: Group[], t: (key: string) => string): string {
	if (!tableUser.group_id) return t("userManagement.groups.default");
	const group = groups.find(g => g.id === tableUser.group_id);
	return group ? getGroupDisplayName(group) : t("userManagement.groups.unknown");
}

function getUserGroupTooltip(tableUser: User, groups: Group[], t: (key: string) => string): string {
	if (!tableUser.group_id) return t("userManagement.groups.defaultGroup");
	const group = groups.find(g => g.id === tableUser.group_id);
	return group ? getGroupFullDisplayName(group) : t("userManagement.groups.unknownGroup");
}

function TableSkeleton({ rows = 6 }: { rows?: number }) {
	return (
		<div className="overflow-hidden rounded-xl border border-border">
			<div className="border-b border-border bg-muted/40 px-4 py-3">
				<div className="md-skeleton h-3 w-36 rounded-md bg-muted" />
			</div>
			<div className="divide-y divide-border">
				{Array.from({ length: rows }, (_, i) => (
					<div key={i} className="flex items-center gap-4 px-4 py-3.5">
						<div className="md-skeleton h-4 w-4 shrink-0 rounded bg-muted" />
						<div
							className="md-skeleton h-3.5 w-full max-w-[220px] rounded-md bg-muted"
							style={{ animationDelay: `${i * 90}ms` }}
						/>
						<div className="md-skeleton hidden h-5 w-20 shrink-0 rounded-full bg-muted sm:block" />
						<div className="md-skeleton hidden h-3.5 w-24 shrink-0 rounded-md bg-muted md:block" />
						<div className="md-skeleton ml-auto h-6 w-24 shrink-0 rounded-md bg-muted" />
					</div>
				))}
			</div>
		</div>
	);
}

interface UserManagementTableProps {
	user: User | null | undefined;
	users: User[];
	groups: Group[];
	loading: boolean;
	selectedUsers: User[];
	isSelected: (user: User) => boolean;
	handleSelectUser: (user: User) => void;
	handleSelectAll: (users: User[]) => void;
	handleCopyEmail: (email: string) => void;
	copiedEmail: string | null;
	handleChangeGroup: (user: User) => void;
	handleToggleUser: (user: User) => void;
	handleEditUser: (user: User) => void;
	handleDeleteUser: (user: User) => void | Promise<void>;
	handleApiTokens: (user: User) => void;
	noResults: boolean;
	debouncedSearch: string;
	page: number;
	totalCount: number;
	rowsPerPage: number;
	setPage: (page: number) => void;
	setRowsPerPage: (rows: number) => void;
}

export function UserManagementTable({
	user, users, groups, loading, selectedUsers, isSelected, handleSelectUser, handleSelectAll, handleCopyEmail, copiedEmail, handleChangeGroup, handleToggleUser, handleEditUser, handleDeleteUser, handleApiTokens, noResults, debouncedSearch, page, totalCount, rowsPerPage, setPage, setRowsPerPage,
}: UserManagementTableProps) {
	const { t } = useTranslation();
	const canManageUsers = isExpertOrManager(user);
	const getAccessLevelIcon = (level: string) => <Shield className={`w-3 h-3 ${getAccessLevelIconColor(level)}`} />;

	return (
		<div className="md-rise bg-card rounded-xl border border-border overflow-visible shadow-sm" style={{ animationDelay: "60ms" }}>
			{loading ? (
				<div className="space-y-3 p-4 sm:p-5">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<span>{t("userManagement.loadingUsers")}</span>
					</div>
					<TableSkeleton />
				</div>
			) : users.length === 0 ? (
				<div className="p-4 sm:p-5">
					<div className="md-fade-in flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
						<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
							<Users className="h-7 w-7 text-muted-foreground" />
						</div>
						<h3 className="text-base font-semibold tracking-tight text-foreground">{t("userManagement.noUsersFound")}</h3>
						<p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
							{getUsersEmptyMessage(t, user, noResults, debouncedSearch)}
						</p>
					</div>
				</div>
			) : (
				<div className="md-fade-in overflow-x-auto overflow-y-visible">
					<table className="min-w-full divide-y divide-border">
						<thead>
							<tr className="border-b border-border bg-muted/40">
								{canManageUsers && (
									<th className="px-3 py-2 w-10">
										<Tooltip>
											<TooltipTrigger asChild>
												<input
													type="checkbox"
													checked={selectedUsers.length === users.length && users.length > 0}
													onChange={() => handleSelectAll(users)}
													className="w-4 h-4 text-foreground rounded border-input focus:ring-ring focus:ring-offset-0 cursor-pointer"
												/>
											</TooltipTrigger>
											<TooltipContent>
												{selectedUsers.length > 0 ? t("userManagement.actions.deselectAll") : t("userManagement.actions.selectAll")}
											</TooltipContent>
										</Tooltip>
									</th>
								)}
								<th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("userManagement.table.user")}</th>
								<th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("userManagement.table.accessLevel")}</th>
								<th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("userManagement.table.group")}</th>
								<th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("userManagement.table.emailVerified")}</th>
								<th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("userManagement.table.actions")}</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{users.map((tableUser) => (
								<tr key={tableUser.id} className={`transition-colors duration-150 hover:bg-muted/40 ${canManageUsers && isSelected(tableUser) ? "bg-muted" : ""}`}>
									{canManageUsers && (
										<td className="px-3 py-2 w-10">
											<input
												type="checkbox"
												checked={isSelected(tableUser)}
												onChange={() => handleSelectUser(tableUser)}
												className="w-4 h-4 text-foreground rounded border-input focus:ring-ring focus:ring-offset-0 cursor-pointer"
											/>
										</td>
									)}
									<td className="px-3 py-2">
										<div className="flex items-center gap-2.5">
											<Tooltip>
												<TooltipTrigger asChild>
													<div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-foreground text-xs font-medium cursor-default">
														{tableUser.name.charAt(0).toUpperCase()}
													</div>
												</TooltipTrigger>
												<TooltipContent side="top">
													{tableUser.created_at
														? `Created: ${new Date(tableUser.created_at).toLocaleString()}`
														: "Creation date unknown"}
												</TooltipContent>
											</Tooltip>
											<div className="min-w-0">
												<div className="text-sm font-medium text-foreground">{tableUser.name}</div>
												<div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
													<Mail className="w-2.5 h-2.5" />
													<span className="truncate">{tableUser.email}</span>
													<Tooltip>
														<TooltipTrigger asChild>
															<button
																onClick={() => handleCopyEmail(tableUser.email)}
																className="inline-flex items-center justify-center p-0.5 rounded hover:bg-muted transition-colors duration-150 cursor-pointer"
															>
																{copiedEmail === tableUser.email ? (
																	<Check className="w-2.5 h-2.5 text-green-600" />
																) : (
																	<Copy className="w-2.5 h-2.5 text-muted-foreground hover:text-foreground dark:text-white" />
																)}
															</button>
														</TooltipTrigger>
														<TooltipContent side="top">
															{copiedEmail === tableUser.email ? t("userManagement.actions.copied") : t("userManagement.actions.copyEmail")}
														</TooltipContent>
													</Tooltip>
												</div>
											</div>
										</div>
									</td>
									<td className="px-3 py-2">
										<StatusBadge
											icon={getAccessLevelIcon(tableUser.access_level)}
											text={getAccessLevelName(tableUser.access_level)}
											variant="default"
											size="small"
											className={getAccessLevelColor(tableUser.access_level)}
										/>
									</td>
									<td className="px-3 py-2">
										<Tooltip>
											<TooltipTrigger asChild>
												<div className="inline-block">
													<StatusBadge
														icon={<Users className="w-3 h-3" />}
														text={getUserGroupDisplay(tableUser, groups, t)}
														variant="info"
														size="small"
													/>
												</div>
											</TooltipTrigger>
											<TooltipContent>
												{getUserGroupTooltip(tableUser, groups, t)}
											</TooltipContent>
										</Tooltip>
									</td>
									<td className="px-3 py-2">
										<StatusBadge
											icon={tableUser.email_verified ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
											text={tableUser.email_verified ? t("userManagement.emailStatus.verified") : t("userManagement.emailStatus.unverified")}
											variant={tableUser.email_verified ? "success" : "default"}
											size="small"
										/>
									</td>
									<td className="px-3 py-2 text-right">
										<ModelActionGroup
											actions={[
												// Experts and managers can change user groups
												...(canManageUsers ? [{
													key: "group",
													icon: UserCog,
													tooltip: t("userManagement.actions.changeGroup"),
													variant: "default" as const,
													onClick: () => handleChangeGroup(tableUser),
												}] : []),
												// Single toggle enable/disable icon
												...(canManageUsers ? [{
													key: "toggle-enabled",
													icon: (tableUser.enabled === false) ? UserX : UserCheck,
													tooltip: (tableUser.enabled === false) ? t("userManagement.actions.enableUser") : t("userManagement.actions.disableUser"),
													variant: "default" as const,
													onClick: () => handleToggleUser(tableUser),
												}] : []),
												// Experts and managers (for their group users); the key turns green when the user has an active token.
												...(canManageUsers ? [{
													key: "api-tokens",
													icon: KeyRound,
													tooltip: tableUser.has_api_access
														? t("userManagement.actions.apiTokensActive", "API access enabled — manage tokens")
														: t("userManagement.actions.apiTokens", "API tokens"),
													variant: "default" as const,
													className: tableUser.has_api_access
														? "!text-emerald-800 dark:!text-emerald-300 bg-emerald-600/20 hover:bg-emerald-600/30"
														: undefined,
													onClick: () => handleApiTokens(tableUser),
												}] : []),
												{
													key: "edit",
													icon: Edit,
													tooltip: t("userManagement.actions.editUser"),
													variant: "default" as const,
													onClick: () => handleEditUser(tableUser),
												},
												{
													key: "delete",
													icon: Trash2,
													tooltip: t("userManagement.actions.deleteUser"),
													variant: "danger" as const,
													onClick: () => { void handleDeleteUser(tableUser); },
												},
											]}
											layout="horizontal"
											size="small"
											className="justify-end"
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<Pagination
				currentPage={page}
				totalItems={totalCount}
				itemsPerPage={rowsPerPage}
				onPageChange={setPage}
				onItemsPerPageChange={(newItemsPerPage: number) => {
					setRowsPerPage(newItemsPerPage);
					setPage(0);
				}}
				isLoading={loading}
			/>
		</div>
	);
}
