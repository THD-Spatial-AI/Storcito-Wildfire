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
		<div className="md-rise flex flex-wrap items-center justify-between gap-3">
			<div className="flex items-center gap-3.5">
				<div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
					<Users className="h-5 w-5 text-muted-foreground" />
				</div>
				<div>
					<h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{t("userManagement.title")}</h2>
					<p className="mt-0.5 text-sm text-muted-foreground">{t("userManagement.subtitle")}</p>
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<div className="relative">
					<input
						type="text"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder={t("userManagement.searchPlaceholder")}
						className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-8 text-sm text-foreground shadow-sm transition-colors duration-150 placeholder:text-muted-foreground hover:border-muted-foreground/40 sm:w-72"
						aria-label="Search users"
					/>
					<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
							className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors duration-150 hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
							aria-label={t("userManagement.refresh")}
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
											className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors duration-150 hover:bg-accent hover:text-foreground"
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
											className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors duration-150 hover:bg-accent hover:text-foreground"
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
									className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 dark:border-red-800 bg-card text-red-600 dark:text-red-400 shadow-sm transition-colors duration-150 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-50"
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
					className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
				>
					<UserPlus className="w-4 h-4" />
					<span className="hidden sm:inline">{t("userManagement.addNewUser")}</span>
					<span className="sm:hidden">{t("userManagement.add")}</span>
				</button>
			</div>
		</div>
	);
}
