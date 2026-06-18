import type { ReactNode } from "react";
import { Check, Edit, RefreshCw, Trash2, UserPlus, Users, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import { GroupSelector } from "@/components/group/GroupSelector";
import type { Group } from "@/components/workspace";
import { isExpertOrManager } from "@/features/admin-dashboard/utils/accessLevelUtils";
import { useTranslation } from "@/i18n";
import type { User } from "./types";

interface UserManagementFiltersProps {
	user: User | null | undefined;
	searchTerm: string;
	setSearchTerm: (value: string) => void;
	isRefreshing: boolean;
	loading: boolean;
	setIsRefreshing: (value: boolean) => void;
	fetchUsers: () => void;
	fetchGroups: () => void;
	selectedGroup: Group | null;
	selectedGroupDisabled: boolean | null;
	setSelectedGroup: (group: Group | null) => void;
	onCreateGroup: () => void;
	groupReloadKey: number;
	handleRenameGroup: () => void;
	handleEnableGroup: () => void;
	handleDisableGroup: () => void;
	handleDeleteGroup: () => void;
	handleAddUser: () => void;
	bulkActions?: ReactNode;
}

export function UserManagementFilters({
	user,
	searchTerm,
	setSearchTerm,
	isRefreshing,
	loading,
	setIsRefreshing,
	fetchUsers,
	fetchGroups,
	selectedGroup,
	selectedGroupDisabled,
	setSelectedGroup,
	onCreateGroup,
	groupReloadKey,
	handleRenameGroup,
	handleEnableGroup,
	handleDisableGroup,
	handleDeleteGroup,
	handleAddUser,
	bulkActions,
}: UserManagementFiltersProps) {
	const { t } = useTranslation();

	return (
			<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-muted rounded-lg">
						<Users className="w-5 h-5 text-muted-foreground" />
					</div>
					<div>
						<h2 className="text-lg font-semibold text-foreground">{t("userManagement.title")}</h2>
						<p className="text-xs text-muted-foreground">{t("userManagement.subtitle")}</p>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<div className="relative">
						<input
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder={t("userManagement.searchPlaceholder")}
							className="pl-9 pr-8 py-2.5 border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent w-full sm:w-72 bg-background text-foreground"
							aria-label="Search users"
						/>
						<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
								<path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z" />
							</svg>
						</span>
						{searchTerm && (
							<button
								onClick={() => setSearchTerm("")}
								className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								aria-label="Clear search"
							>
								×
							</button>
						)}
					</div>
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							onClick={() => {
								setIsRefreshing(true);
								fetchUsers();
								fetchGroups();
								setTimeout(() => setIsRefreshing(false), 1000);
							}}
							disabled={loading}
							className="p-2.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors duration-200 disabled:opacity-50"
						>
							<RefreshCw className={`w-4 h-4 transition-transform duration-500 ${loading || isRefreshing ? "animate-spin" : ""}`} />
						</button>
					</TooltipTrigger>
					<TooltipContent>{t("userManagement.refresh")}</TooltipContent>
				</Tooltip>
					{isExpertOrManager(user) && (
						<Tooltip>
							<TooltipTrigger asChild>
								<div>
									<GroupSelector
										onGroupChange={setSelectedGroup}
										onCreateGroup={onCreateGroup}
										reloadKey={groupReloadKey}
										activeGroup={selectedGroup}
										accessLevel={user?.access_level}
									/>
								</div>
							</TooltipTrigger>
							<TooltipContent>{t("userManagement.groups.selectOrCreate")}</TooltipContent>
						</Tooltip>
					)}
					{/* Group actions when a group is selected - single toggle icon (hidden for Default) */}
					{selectedGroup && isExpertOrManager(user) && (
						<div className="flex items-center gap-2">
							{selectedGroup.name?.toLowerCase() !== 'default' && (
								<>
									<Tooltip>
										<TooltipTrigger asChild>
											<button
												onClick={handleRenameGroup}
												className="p-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
												aria-label="Rename group"
											>
												<Edit className="w-4 h-4 text-muted-foreground" />
											</button>
										</TooltipTrigger>
										<TooltipContent>{t("userManagement.groups.renameGroup")}</TooltipContent>
									</Tooltip>
									<Tooltip>
										<TooltipTrigger asChild>
											<button
												onClick={() => (selectedGroupDisabled ? handleEnableGroup() : handleDisableGroup())}
												className="p-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
												aria-label={selectedGroupDisabled ? "Enable group" : "Disable group"}
											>
												{selectedGroupDisabled ? (
													<Check className="w-4 h-4 text-green-600" />
												) : (
													<XCircle className="w-4 h-4 text-muted-foreground" />
												)}
											</button>
										</TooltipTrigger>
										<TooltipContent>{selectedGroupDisabled ? t("userManagement.groups.enableGroup") : t("userManagement.groups.disableGroup")}</TooltipContent>
									</Tooltip>
								</>
							)}
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										onClick={handleDeleteGroup}
										className="p-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
										aria-label="Delete group"
										disabled={selectedGroup.name?.toLowerCase() === 'default'}
									>
										<Trash2 className="w-4 h-4" />
									</button>
								</TooltipTrigger>
								<TooltipContent>{selectedGroup.name?.toLowerCase() === 'default' ? t("userManagement.groups.defaultCannotDelete") : t("userManagement.groups.deleteGroup")}</TooltipContent>
							</Tooltip>
						</div>
					)}
					{bulkActions}
				<button
					onClick={handleAddUser}
					className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
				>
					<UserPlus className="w-4 h-4" />
					<span className="hidden sm:inline">{t("userManagement.addNewUser")}</span>
					<span className="sm:hidden">{t("userManagement.add")}</span>
				</button>
			</div>
		</div>
	);
}
