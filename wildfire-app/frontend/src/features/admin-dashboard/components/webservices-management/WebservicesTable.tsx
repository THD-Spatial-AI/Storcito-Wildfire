import { Activity, CheckCircle, Clock, Cloud, Cpu, Edit, HardDrive, Plus, RotateCw, Server, Settings, Trash2, XCircle, Zap } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@spatialhub/ui";
import Pagination from "@/components/ui/Pagination";
import ModelActionGroup from "@/components/shared/ModelActionGroup";
import type { WebserviceInstance } from "@/features/admin-dashboard/types";
import { formatDateTime24h } from "@/utils/dateHelpers";
import { useTranslation } from "@/i18n";

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

const getStatusColor = (status: string) => {
switch (status) {
case "active":
return "bg-gray-600 text-white border-gray-700";
case "inactive":
return "bg-gray-300 text-gray-800 border-gray-400";
case "maintenance":
return "bg-gray-500 text-white border-gray-600";
default:
return "bg-gray-100 text-gray-800 border-gray-200";
}
};

const getStatusIcon = (status: string) => {
switch (status) {
case "active":
return <CheckCircle className="w-3 h-3" />;
case "inactive":
return <XCircle className="w-3 h-3" />;
case "maintenance":
return <Settings className="w-3 h-3" />;
default:
return <XCircle className="w-3 h-3" />;
}
};

export function WebservicesTable({ webservices, loading, readOnly, currentPage, itemsPerPage, setCurrentPage, setItemsPerPage, onAdd, onEdit, onDelete, onServiceAction }: WebservicesTableProps) {
const { t } = useTranslation();
const renderAvailabilityStatus = (service: WebserviceInstance) => (
<div className="flex items-center gap-2">
<div className={`w-2 h-2 rounded-full ${service.available ? "bg-green-500" : "bg-gray-400"}`} />
<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
{service.available ? t("webservicesManagement.status.online") : t("webservicesManagement.status.offline")}
</span>
</div>
);

const renderBusyStatus = (service: WebserviceInstance) => {
const isCalculating = service.current_concurrency > 0;
return (
<div className="flex items-center gap-2">
{service.available && isCalculating ? (
<>
<RotateCw className="w-4 h-4 text-gray-500 dark:text-gray-400 animate-spin" />
<span className="text-sm text-foreground">{t("webservicesManagement.busyStatus.calculating", { current: service.current_concurrency, max: service.max_concurrency })}</span>
</>
) : service.available ? (
<>
<Clock className="w-4 h-4 text-gray-500 dark:text-gray-400 dark:text-gray-300" />
<span className="text-sm text-gray-700 dark:text-gray-300">{t("webservicesManagement.busyStatus.idle", { max: service.max_concurrency })}</span>
</>
) : (
<span className="text-sm text-gray-500 dark:text-gray-400">N/A</span>
)}
</div>
);
};

return (
<div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
{loading && (
<div className="h-1 bg-muted overflow-hidden">
<div className="h-full w-1/3 bg-gradient-to-r from-blue-400 to-blue-600 animate-[shimmer_1.5s_infinite]"></div>
</div>
)}
<div className="overflow-x-auto">
<table className="min-w-full divide-y divide-border">
<thead className="bg-muted/50">
<tr>
<th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("webservicesManagement.table.service")}</th>
{!readOnly && <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("webservicesManagement.table.endpoint")}</th>}
<th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("webservicesManagement.table.status")}</th>
<th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("webservicesManagement.table.availability")}</th>
<th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("webservicesManagement.table.jobs")}</th>
<th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("webservicesManagement.table.performance")}</th>
<th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("webservicesManagement.table.user")}</th>
<th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("webservicesManagement.table.lastCheck")}</th>
<th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("webservicesManagement.table.actions")}</th>
</tr>
</thead>
<tbody className="divide-y divide-border">
{webservices.length === 0 && !loading ? (
<tr>
<td colSpan={readOnly ? 8 : 9} className="px-6 py-16 text-center">
<div className="flex flex-col items-center justify-center gap-3">
<div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
<Cloud className="w-8 h-8 text-gray-400 dark:text-gray-300" />
</div>
<div>
<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{t("webservicesManagement.noWebservicesFound")}</h3>
<p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
{readOnly ? t("webservicesManagement.noWebservicesAvailable") : t("webservicesManagement.noWebservicesDescription")}
</p>
</div>
{!readOnly && (
<button onClick={onAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-all shadow-sm hover:shadow-md">
<Plus className="w-4 h-4" />
{t("webservicesManagement.registerNew")}
</button>
)}
</div>
</td>
</tr>
) : (
webservices.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage).map((service) => (
<tr key={service.id} className="hover:bg-muted/50 transition-colors duration-150">
<td className="px-6 py-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted"><Server className="w-5 h-5 text-muted-foreground" /></div>
<div className="text-sm font-medium text-foreground">{service.name || `${t("webservicesManagement.table.service")} ${service.id}`}</div>
</div>
</td>
{!readOnly && (
<td className="px-6 py-4">
<div>
<div className="text-sm font-mono text-foreground">{service.protocol}://{service.ip}:{service.port}</div>
{service.endpoint && <div className="text-xs text-muted-foreground">{service.endpoint}</div>}
</div>
</td>
)}
<td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusColor(service.status)}`}>{getStatusIcon(service.status)}{service.status.charAt(0).toUpperCase() + service.status.slice(1)}</span></td>
<td className="px-6 py-4">{renderAvailabilityStatus(service)}</td>
<td className="px-6 py-4">{renderBusyStatus(service)}</td>
<td className="px-6 py-4">
<div className="space-y-1.5">
<div className="flex items-center gap-2">
<Cpu className="w-3.5 h-3.5 text-muted-foreground" />
<div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden w-16"><div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all" style={{ width: `${service.cpu_usage ?? 0}%` }}></div></div>
<span className="text-xs text-muted-foreground w-10">{service.cpu_usage !== null && service.cpu_usage !== undefined ? `${service.cpu_usage.toFixed(0)}%` : "N/A"}</span>
</div>
<div className="flex items-center gap-2">
<HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
<div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden w-16"><div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all" style={{ width: `${service.memory_usage ?? 0}%` }}></div></div>
<span className="text-xs text-muted-foreground w-10">{service.memory_usage !== null && service.memory_usage !== undefined ? `${service.memory_usage.toFixed(0)}%` : "N/A"}</span>
</div>
</div>
</td>
<td className="px-6 py-4"><span className="text-sm text-foreground">{service.user ? service.user.name : "-"}</span></td>
<td className="px-6 py-4"><span className="text-xs text-muted-foreground">{service.last_check ? formatDateTime24h(service.last_check) : t("webservicesManagement.table.never")}</span></td>
<td className="px-6 py-4">
<div className="flex items-center justify-end gap-3">
<Tooltip>
<TooltipTrigger asChild>
<div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted text-foreground rounded-lg border border-border cursor-default"><Activity className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs font-medium">{service.current_concurrency}/{service.max_concurrency}</span></div>
</TooltipTrigger>
<TooltipContent><p className="text-sm">{t("common.current")}: <span className="font-semibold">{service.current_concurrency}</span> / {t("common.max")}: <span className="font-semibold">{service.max_concurrency}</span></p></TooltipContent>
</Tooltip>
{!readOnly && (
<ModelActionGroup
actions={[
{ key: "ping", icon: Zap, tooltip: t("webservicesManagement.actions.pingWebservice"), variant: service.available ? "success" : "warning", onClick: () => { void onServiceAction(service.id, "ping", service.name || service.ip); } },
{ key: "edit", icon: Edit, tooltip: t("webservicesManagement.actions.editWebservice"), variant: "default", onClick: () => onEdit(service) },
{ key: "delete", icon: Trash2, tooltip: t("webservicesManagement.actions.deleteWebservice"), variant: "danger", onClick: () => { void onDelete(service); }, disabled: service.busy },
]}
layout="horizontal"
size="small"
/>
)}
</div>
</td>
</tr>
))
)}
</tbody>
</table>
</div>
<Pagination
currentPage={currentPage}
totalItems={webservices.length}
itemsPerPage={itemsPerPage}
onPageChange={setCurrentPage}
onItemsPerPageChange={(newItemsPerPage: number) => {
setItemsPerPage(newItemsPerPage);
setCurrentPage(0);
}}
isLoading={loading}
/>
</div>
);
}
