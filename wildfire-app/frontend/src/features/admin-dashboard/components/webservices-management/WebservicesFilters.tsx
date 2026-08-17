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
<div className="md-rise space-y-4" style={{ animationDelay: "60ms" }}>
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
<div className="flex items-center gap-3.5">
<div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
<Cloud className="w-5 h-5 text-muted-foreground" />
</div>
<div>
<h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{t("webservicesManagement.title")}</h2>
<p className="mt-0.5 text-sm text-muted-foreground">{t("webservicesManagement.subtitle")}</p>
</div>
</div>
<div className="flex items-center gap-2">
<Tooltip>
<TooltipTrigger asChild>
<button
onClick={onRefresh}
disabled={loading}
className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors duration-150 hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
>
<RefreshCw className={`w-4 h-4 transition-transform duration-500 ${loading || isRefreshing ? "animate-spin" : ""}`} />
</button>
</TooltipTrigger>
<TooltipContent>{t("webservicesManagement.refresh")}</TooltipContent>
</Tooltip>
{!readOnly && (
<button
onClick={onAdd}
className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
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
<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
<input
type="text"
placeholder={t("webservicesManagement.searchPlaceholder")}
value={searchInput}
onChange={(e) => setSearchInput(e.target.value)}
className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground shadow-sm transition-colors duration-150 placeholder:text-muted-foreground hover:border-muted-foreground/40"
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
