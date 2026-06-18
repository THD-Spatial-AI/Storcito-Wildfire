import { Activity, CheckCircle, Cloud, Plus, RefreshCw, Search, Settings, Wifi, WifiOff, XCircle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@spatialhub/ui";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import type { WebserviceFilters } from "@/features/admin-dashboard/types";
import { useTranslation } from "@/i18n";

interface WebservicesFiltersProps {
readOnly: boolean;
loading: boolean;
isRefreshing: boolean;
filters: WebserviceFilters;
searchInput: string;
setSearchInput: (value: string) => void;
setFilters: (filters: WebserviceFilters) => void;
onRefresh: () => void;
onAdd: () => void;
}

export function WebservicesFilters({ readOnly, loading, isRefreshing, filters, searchInput, setSearchInput, setFilters, onRefresh, onAdd }: WebservicesFiltersProps) {
const { t } = useTranslation();

return (
<div className="space-y-4">
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
<div className="flex items-center gap-3">
<div className="p-2 bg-muted rounded-lg">
<Cloud className="w-5 h-5 text-muted-foreground" />
</div>
<div>
<h2 className="text-lg font-semibold text-foreground">{t("webservicesManagement.title")}</h2>
<p className="text-xs text-muted-foreground">{t("webservicesManagement.subtitle")}</p>
</div>
</div>
<div className="flex items-center gap-2">
<Tooltip>
<TooltipTrigger asChild>
<button
onClick={onRefresh}
disabled={loading}
className="p-2.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors duration-200 disabled:opacity-50"
>
<RefreshCw className={`w-4 h-4 transition-transform duration-500 ${loading || isRefreshing ? "animate-spin" : ""}`} />
</button>
</TooltipTrigger>
<TooltipContent>{t("webservicesManagement.refresh")}</TooltipContent>
</Tooltip>
{!readOnly && (
<button
onClick={onAdd}
className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
>
<Plus className="w-4 h-4" />
<span className="hidden sm:inline">{t("webservicesManagement.registerNew")}</span>
<span className="sm:hidden">{t("common.add")}</span>
</button>
)}
</div>
</div>

<div className="flex flex-col sm:flex-row gap-3">
<div className="relative flex-1">
<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
<input
type="text"
placeholder={t("webservicesManagement.searchPlaceholder")}
value={searchInput}
onChange={(e) => setSearchInput(e.target.value)}
className="w-full pl-10 pr-4 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-sm text-foreground"
/>
</div>
<div className="flex gap-2">
<FilterDropdown
options={[
{ value: "", label: t("webservicesManagement.filters.allStatus") },
{ value: "active", label: t("webservicesManagement.filters.active"), icon: <CheckCircle className="w-3.5 h-3.5 text-green-500" /> },
{ value: "inactive", label: t("webservicesManagement.filters.inactive"), icon: <XCircle className="w-3.5 h-3.5 text-gray-400 dark:text-gray-300" /> },
{ value: "maintenance", label: t("webservicesManagement.filters.maintenance"), icon: <Settings className="w-3.5 h-3.5 text-yellow-500" /> },
{ value: "error", label: t("webservicesManagement.filters.error"), icon: <XCircle className="w-3.5 h-3.5 text-red-500" /> },
]}
value={filters.status || ""}
onChange={(value) => setFilters({ ...filters, status: value })}
placeholder={t("webservicesManagement.filters.allStatus")}
icon={<Activity className="w-3.5 h-3.5 text-muted-foreground" />}
/>
<FilterDropdown
options={[
{ value: "", label: t("webservicesManagement.filters.allAvailability") },
{ value: "true", label: t("webservicesManagement.filters.available"), icon: <Wifi className="w-3.5 h-3.5 text-green-500" /> },
{ value: "false", label: t("webservicesManagement.filters.unavailable"), icon: <WifiOff className="w-3.5 h-3.5 text-gray-400 dark:text-gray-300" /> },
]}
value={filters.available || ""}
onChange={(value) => setFilters({ ...filters, available: value })}
placeholder={t("webservicesManagement.filters.allAvailability")}
icon={<Wifi className="w-3.5 h-3.5 text-muted-foreground" />}
/>
</div>
</div>
</div>
);
}
