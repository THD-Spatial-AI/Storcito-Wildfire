import { CheckCircle2, Edit, MoreHorizontal, Plus, Server, Trash2, Wrench, XCircle, Zap } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@spatialhub/ui";
import Pagination from "@/components/ui/Pagination";
import StatusBadge from "@/components/ui/StatusBadge";
import type { WebserviceInstance } from "@/features/admin-dashboard/types";
import { formatDateTime24h, formatShortDateTime } from "@/utils/dateHelpers";
import { useTranslation } from "@/i18n";
import { useHorizontalOverflow } from "@/hooks/useHorizontalOverflow";

export type EngineState = "online" | "busy" | "offline" | "inactive" | "maintenance";

// one combined state
export const engineState = (s: WebserviceInstance): EngineState => {
	if (s.status === "maintenance") return "maintenance";
	if (s.status === "inactive") return "inactive";
	if (!s.available) return "offline";
	if (s.busy || (s.max_concurrency > 0 && s.current_concurrency >= s.max_concurrency)) return "busy";
	return "online";
};

const STATE_VARIANT: Record<EngineState, "success" | "info" | "danger" | "default" | "warning"> = {
	online: "success",
	busy: "info",
	offline: "danger",
	inactive: "default",
	maintenance: "warning",
};

const STATE_FALLBACK: Record<EngineState, string> = {
	online: "Online",
	busy: "Busy",
	offline: "Offline",
	inactive: "Inactive",
	maintenance: "Maintenance",
};

const HEADER_LABEL = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";
// edge line scrolling
const STICKY = "sticky right-0 group-data-[overflow=true]/table:shadow-[-8px_0_8px_-8px_rgb(0_0_0/0.12)]";
const ICON_BUTTON =
	"inline-flex h-8 w-8 items-center justify-center rounded-lg text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface WebservicesTableProps {
	webservices: WebserviceInstance[];
	loading: boolean;
	readOnly: boolean;
	currentPage: number;
	itemsPerPage: number;
	setCurrentPage: (page: number) => void;
	setItemsPerPage: (itemsPerPage: number) => void;
	onAdd: () => void;
	onEdit: (service: WebserviceInstance) => void;
	onDelete: (service: WebserviceInstance) => void | Promise<void>;
	onServiceAction: (serviceId: number, action: string, serviceName?: string) => void | Promise<void>;
}

// percent when reported
const usage = (value?: number | null) => (value === null || value === undefined ? null : `${Math.round(value)}%`);

export function WebservicesTable({
	webservices, loading, readOnly, currentPage, itemsPerPage, setCurrentPage, setItemsPerPage, onAdd, onEdit, onDelete, onServiceAction,
}: WebservicesTableProps) {
	const { t } = useTranslation();
	const { setScrollEl, overflowX } = useHorizontalOverflow();
	const label = (s: WebserviceInstance) => s.name || `${t("webservicesManagement.table.service")} ${s.id}`;
	const rows = webservices.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
	const columns = readOnly ? 4 : 5;

	return (
		<>
			<div ref={setScrollEl} data-overflow={overflowX} className="group/table overflow-x-auto">
				<table className="w-full min-w-[760px] table-fixed">
					<colgroup>
						<col />
						<col className="w-[150px]" />
						<col className="w-[150px]" />
						<col className="w-[150px]" />
						{!readOnly && <col className="w-[104px]" />}
					</colgroup>
					<thead>
						<tr className="border-y border-border bg-muted/90">
							<th className="px-5 py-3 text-left"><span className={HEADER_LABEL}>{t("webservicesManagement.table.service")}</span></th>
							<th className="px-4 py-3 text-left"><span className={HEADER_LABEL}>{t("webservicesManagement.table.status")}</span></th>
							<th className="px-4 py-3 text-left"><span className={HEADER_LABEL}>{t("webservicesManagement.table.load", "Load")}</span></th>
							<th className="px-4 py-3 text-left"><span className={HEADER_LABEL}>{t("webservicesManagement.table.lastCheck")}</span></th>
							{!readOnly && (
								<th className={`${STICKY} z-[2] bg-muted py-3 pl-2 pr-4 text-right`}>
									<span className={HEADER_LABEL}>{t("webservicesManagement.table.actions")}</span>
								</th>
							)}
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{rows.length === 0 && loading &&
							// loading rows
							Array.from({ length: 3 }, (_, i) => (
								<tr key={`sk-${i}`}>
									<td colSpan={columns} className="px-5 py-4">
										<div className="h-9 animate-pulse rounded-md bg-muted" />
									</td>
								</tr>
							))}
						{rows.length === 0 && !loading && (
							<tr>
								<td colSpan={columns} className="px-6 py-14 text-center">
									<div className="mx-auto flex max-w-sm flex-col items-center gap-2">
										<Server className="h-8 w-8 text-muted-foreground" />
										<p className="text-sm font-medium text-foreground">{t("webservicesManagement.noWebservicesFound")}</p>
										<p className="text-sm text-muted-foreground">
											{readOnly ? t("webservicesManagement.noWebservicesAvailable") : t("webservicesManagement.noWebservicesDescription")}
										</p>
										{!readOnly && (
											<button
												type="button"
												onClick={onAdd}
												className="mt-2 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
											>
												<Plus className="h-4 w-4" />
												{t("webservicesManagement.registerNew")}
											</button>
										)}
									</div>
								</td>
							</tr>
						)}
						{rows.map((service) => {
							const state = engineState(service);
							const url = `${service.protocol}://${service.ip}:${service.port}${service.endpoint ?? ""}`;
							const cpu = usage(service.cpu_usage);
							const memory = usage(service.memory_usage);
							const running = state === "online" || state === "busy";
							return (
								<tr key={service.id} className="group transition-colors hover:bg-muted/40">
									<td className="px-5 py-3">
										<div className="flex min-w-0 items-center gap-3">
											<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
												<Server className="h-4 w-4 text-muted-foreground" />
											</span>
											<div className="min-w-0">
												<p className="truncate text-sm font-semibold text-foreground">{label(service)}</p>
												{!readOnly && (
													<p className="truncate font-mono text-xs text-muted-foreground" title={url}>{url}</p>
												)}
											</div>
										</div>
									</td>
									<td className="px-4 py-3">
										<StatusBadge
											size="small"
											variant={STATE_VARIANT[state]}
											text={t(`webservicesManagement.state.${state}`, STATE_FALLBACK[state])}
										/>
									</td>
									<td className="px-4 py-3 text-sm tabular-nums">
										{running ? (
											<>
												<span className="text-foreground">
													{t("webservicesManagement.loadJobs", {
														current: service.current_concurrency,
														max: service.max_concurrency,
														defaultValue: "{{current}} of {{max}} jobs",
													})}
												</span>
												{(cpu || memory) && (
													<span className="block text-xs text-muted-foreground">
														{[cpu && `CPU ${cpu}`, memory && `${t("webservicesManagement.memory", "Mem")} ${memory}`].filter(Boolean).join(" · ")}
													</span>
												)}
											</>
										) : (
											<span className="text-muted-foreground">—</span>
										)}
									</td>
									<td className="px-4 py-3 text-sm text-muted-foreground">
										{service.last_check ? (
											<span title={formatDateTime24h(service.last_check)}>{formatShortDateTime(service.last_check)}</span>
										) : (
											t("webservicesManagement.table.never")
										)}
									</td>
									{!readOnly && (
										<td className={`${STICKY} z-[1] bg-card py-2 pl-2 pr-4 group-hover:bg-muted`}>
											<div className="flex items-center justify-end gap-1">
												<Tooltip>
													<TooltipTrigger asChild>
														<button
															type="button"
															data-compact
															className={ICON_BUTTON}
															aria-label={t("webservicesManagement.actions.pingWebservice")}
															onClick={() => void onServiceAction(service.id, "ping", label(service))}
														>
															<Zap className="h-4 w-4" />
														</button>
													</TooltipTrigger>
													<TooltipContent>{t("webservicesManagement.actions.pingWebservice")}</TooltipContent>
												</Tooltip>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<button type="button" data-compact className={ICON_BUTTON} aria-label={t("webservicesManagement.table.actions")}>
															<MoreHorizontal className="h-4 w-4" />
														</button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end" className="min-w-[13rem] rounded-lg border-border/80 p-1 shadow-lg">
														<DropdownMenuItem onSelect={() => onEdit(service)}>
															<Edit className="h-4 w-4" />
															{t("webservicesManagement.actions.editWebservice")}
														</DropdownMenuItem>
														{service.available ? (
															<DropdownMenuItem onSelect={() => void onServiceAction(service.id, "mark_unavailable")}>
																<XCircle className="h-4 w-4" />
																{t("webservicesManagement.actions.markUnavailable", "Mark unavailable")}
															</DropdownMenuItem>
														) : (
															<DropdownMenuItem onSelect={() => void onServiceAction(service.id, "mark_available")}>
																<CheckCircle2 className="h-4 w-4" />
																{t("webservicesManagement.actions.markAvailable", "Mark available")}
															</DropdownMenuItem>
														)}
														{service.busy && (
															<DropdownMenuItem onSelect={() => void onServiceAction(service.id, "mark_idle")}>
																<Wrench className="h-4 w-4" />
																{t("webservicesManagement.actions.markIdle", "Reset to idle")}
															</DropdownMenuItem>
														)}
														<div role="separator" className="my-1 h-px bg-border" />
														<DropdownMenuItem
															variant="destructive"
															disabled={service.busy}
															onSelect={() => void onDelete(service)}
														>
															<Trash2 className="h-4 w-4" />
															{t("webservicesManagement.actions.deleteWebservice")}
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										</td>
									)}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			{webservices.length > 0 && (
				<Pagination
					currentPage={currentPage}
					totalItems={webservices.length}
					itemsPerPage={itemsPerPage}
					onPageChange={setCurrentPage}
					onItemsPerPageChange={(n: number) => {
						setItemsPerPage(n);
						setCurrentPage(0);
					}}
					pageSizeOptions={[10, 20, 50]}
					isLoading={loading}
				/>
			)}
		</>
	);
}
