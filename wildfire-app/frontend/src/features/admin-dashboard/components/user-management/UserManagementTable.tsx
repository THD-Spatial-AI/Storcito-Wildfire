import { Briefcase, Building, Check, CheckCircle, Copy, Edit, KeyRound, Mail, Phone, Shield, Trash2, UserCheck, UserCog, Users, UserX, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import Pagination from "@/components/ui/Pagination";
import ModelActionGroup from "@/components/shared/ModelActionGroup";
import StatusBadge from "@/components/ui/StatusBadge";
import { TableIconCell } from "@/components/table/TableIconCell";
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
		<div className="bg-card rounded-xl border border-border overflow-visible shadow-sm">
			<div className="overflow-x-auto overflow-y-visible">
				<table className="min-w-full divide-y divide-border">
						<thead className="bg-muted/50">
							<tr>
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
								<th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("userManagement.table.user")}</th>
								<th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("userManagement.table.organization")}</th>
								<th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("userManagement.table.position")}</th>
								<th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("userManagement.table.accessLevel")}</th>
								<th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("userManagement.table.group")}</th>
								<th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("userManagement.table.emailVerified")}</th>
								<th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("userManagement.table.phone")}</th>
								<th className="px-3 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("userManagement.table.actions")}</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{loading ? (
								<tr>
									<td colSpan={canManageUsers ? 9 : 8} className="px-6 py-16 text-center">
										<div className="flex flex-col items-center justify-center gap-3">
											<div className="relative">
												<div className="w-10 h-10 rounded-full border-4 border-muted"></div>
												<div className="absolute top-0 left-0 w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
											</div>
											<span className="text-sm text-muted-foreground">{t("userManagement.loadingUsers")}</span>
										</div>
									</td>
								</tr>
							) : (
								<>
									{users.length === 0 ? (
										<tr>
											<td colSpan={canManageUsers ? 9 : 8} className="px-6 py-16 text-center">
												<div className="flex flex-col items-center justify-center gap-3">
													<div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center">
														<Users className="w-8 h-8 text-muted-foreground" />
													</div>
													<div>
														<p className="text-lg font-medium text-foreground mb-1">{t("userManagement.noUsersFound")}</p>
														<p className="text-sm text-muted-foreground">
															{getUsersEmptyMessage(t, user, noResults, debouncedSearch)}
														</p>
													</div>
												</div>
											</td>
										</tr>
									) : (
										users.map((tableUser) => (
									<tr key={tableUser.id} className={`hover:bg-muted/50 transition-colors duration-150 ${canManageUsers && isSelected(tableUser) ? "bg-muted" : ""}`}>
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
											<TableIconCell
												icon={<Building className="w-3 h-3 text-muted-foreground" />}
												text={tableUser.organization}
											/>
										</td>
										<td className="px-3 py-2">
											<TableIconCell
												icon={<Briefcase className="w-3 h-3 text-muted-foreground" />}
												text={tableUser.position}
											/>
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
										<td className="px-3 py-2">
											<TableIconCell
												icon={<Phone className="w-3 h-3 text-muted-foreground" />}
												text={tableUser.phone}
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
											/>
										</td>
									</tr>
								))
								)}
								</>
							)}
						</tbody>
					</table>
				</div>


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
