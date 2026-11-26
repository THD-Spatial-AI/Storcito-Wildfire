import { useMemo, useState } from "react";
import { Activity, Plus, Zap } from "lucide-react";
import { AdminSectionHeader } from "../AdminSectionHeader";
import { useAuthStore } from "@/store/auth-store";
import { useTranslation } from "@/i18n";
import { RefreshButton, SearchInput } from "@/features/model-dashboard/components/model-dashboard/ToolbarControls";
import { WebservicesModals } from "./WebservicesModals";
import { WebservicesTable, engineState, type EngineState } from "./WebservicesTable";
import { useWebservices } from "./hooks/useWebservices";

interface WebservicesManagementProps {
	readOnly?: boolean;
}

type EngineTab = "all" | "online" | "available" | "busy" | "offline";
const TABS: EngineTab[] = ["all", "online", "available", "busy", "offline"];
const TAB_FALLBACK: Record<EngineTab, string> = { all: "All", online: "Online", available: "Available", busy: "Busy", offline: "Offline" };

// tab membership
const inTab = (tab: EngineTab, state: EngineState) => {
	switch (tab) {
		case "online": return state === "online" || state === "busy";
		case "available": return state === "online";
		case "busy": return state === "busy";
		case "offline": return state === "offline" || state === "inactive" || state === "maintenance";
		default: return true;
	}
};

export const WebservicesManagement: React.FC<WebservicesManagementProps> = ({ readOnly = false }) => {
	const { t } = useTranslation();
	const { user } = useAuthStore();
	const ws = useWebservices();
	const [tab, setTab] = useState<EngineTab>("all");

	const states = useMemo(() => ws.webservices.map((s) => ({ s, state: engineState(s) })), [ws.webservices]);
	const counts = useMemo(
		() => Object.fromEntries(TABS.map((k) => [k, states.filter((x) => inTab(k, x.state)).length])) as Record<EngineTab, number>,
		[states]
	);
	const visible = useMemo(() => states.filter((x) => inTab(tab, x.state)).map((x) => x.s), [states, tab]);

	if (!user) return null;

	return (
		<div className="space-y-4">
			<AdminSectionHeader
				icon={Zap}
				title={t("webservicesManagement.sectionTitle", "Simulation Engine")}
				subtitle={t("webservicesManagement.sectionSubtitle", "Calculation engines that run the risk models")}
			>
				<SearchInput
					value={ws.searchInput}
					onChange={ws.setSearchInput}
					placeholder={t("webservicesManagement.searchByNameOrAddress", "Search by name or address…")}
					className="w-full sm:w-72 sm:flex-none"
				/>
				<RefreshButton onClick={ws.handleRefresh} spinning={ws.isRefreshing} label={t("webservicesManagement.refresh")} />
				{!readOnly && (
					<button
						type="button"
						onClick={ws.handleAdd}
						className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
					>
						<Plus className="h-4 w-4" />
						{t("webservicesManagement.registerEngine", "Register engine")}
					</button>
				)}
			</AdminSectionHeader>

			{/* own runs note */}
			{(ws.userRunningCount > 0 || ws.userQueueCount > 0) && (
				<p className="flex items-center gap-2 text-sm text-muted-foreground">
					<Activity className="h-4 w-4" />
					{[
						ws.userRunningCount > 0 && t("webservicesManagement.modelsRunningDescription", { count: ws.userRunningCount }),
						ws.userQueueCount > 0 && t("webservicesManagement.modelsQueuedDescription", { count: ws.userQueueCount }),
					].filter(Boolean).join(" · ")}
				</p>
			)}

			<div className="md-card overflow-hidden">
				<div role="tablist" className="flex flex-wrap items-center gap-x-1 gap-y-2 px-2 sm:px-3">
					{TABS.map((key) => {
						const active = tab === key;
						return (
							<button
								key={key}
								type="button"
								role="tab"
								aria-selected={active}
								onClick={() => { setTab(key); ws.setCurrentPage(0); }}
								className={`inline-flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
									active ? "border-foreground font-semibold text-foreground" : "border-transparent text-foreground/60 hover:border-border hover:text-foreground"
								} ${!active && counts[key] === 0 ? "opacity-50" : ""}`}
							>
								{t(`webservicesManagement.tabs.${key}`, TAB_FALLBACK[key])}
								<span className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums leading-none ${active ? "bg-foreground text-background" : "bg-muted text-foreground/60"}`}>
									{counts[key]}
								</span>
							</button>
						);
					})}
				</div>

				<WebservicesTable
					webservices={visible}
					loading={ws.loading}
					readOnly={readOnly}
					currentPage={ws.currentPage}
					itemsPerPage={ws.itemsPerPage}
					setCurrentPage={ws.setCurrentPage}
					setItemsPerPage={ws.setItemsPerPage}
					onAdd={ws.handleAdd}
					onEdit={ws.handleEdit}
					onDelete={ws.handleDelete}
					onServiceAction={ws.handleServiceAction}
				/>
			</div>

			<WebservicesModals
				addDialogOpen={ws.addDialogOpen}
				editDialogOpen={ws.editDialogOpen}
				selectedService={ws.selectedService}
				formData={ws.formData}
				formErrors={ws.formErrors}
				formLoading={ws.formLoading}
				notification={ws.notification}
				onCloseForm={ws.closeForm}
				onFormChange={ws.handleFormChange}
				onSubmit={ws.handleSaveWebservice}
				onCloseNotification={ws.closeNotification}
			/>
		</div>
	);
};
