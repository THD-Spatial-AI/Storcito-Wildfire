import { Activity, Clock, RotateCw, Server, Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "@/i18n";

interface WebservicesSummaryProps {
summary: {
total: number;
online: number;
available: number;
busy: number;
offline: number;
} | null;
userQueueCount: number;
userRunningCount: number;
}

export function WebservicesSummary({ summary, userQueueCount, userRunningCount }: WebservicesSummaryProps) {
const { t } = useTranslation();

return (
<>
<div className="grid grid-cols-2 md:grid-cols-5 gap-3">
{[
{ icon: Server, label: t("webservicesManagement.summary.total"), value: summary?.total || 0 },
{ icon: Wifi, label: t("webservicesManagement.summary.online"), value: summary?.online || 0 },
{ icon: Clock, label: t("webservicesManagement.summary.available"), value: summary?.available || 0 },
{ icon: RotateCw, label: t("webservicesManagement.summary.busy"), value: summary?.busy || 0 },
{ icon: WifiOff, label: t("webservicesManagement.summary.offline"), value: summary?.offline || 0 },
].map((stat) => (
<div key={stat.label} className="bg-card rounded-lg p-3 border border-border shadow-sm hover:shadow-md transition-all duration-200">
<div className="flex items-center gap-3">
<div className="p-2 rounded-lg bg-muted flex-shrink-0">
<stat.icon className="w-4 h-4 text-muted-foreground" />
</div>
<div className="flex-1 min-w-0">
<p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
<p className="text-lg font-bold text-foreground">{stat.value}</p>
</div>
</div>
</div>
))}
</div>

{(userQueueCount > 0 || userRunningCount > 0) && (
<div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20">
<div className="flex items-center gap-4">
<div className="p-3 rounded-full bg-primary/10">
<Activity className="w-5 h-5 text-primary" />
</div>
<div className="flex-1">
<h3 className="text-sm font-semibold text-foreground">
{t("webservicesManagement.yourSimulationStatus")}
</h3>
<div className="flex flex-col gap-1 mt-1">
{userRunningCount > 0 && (
<span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
<RotateCw className="w-3 h-3 animate-spin" />
{t("webservicesManagement.modelsRunningDescription", { count: userRunningCount })}
</span>
)}
{userQueueCount > 0 && (
<span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
<Clock className="w-3 h-3" />
{t("webservicesManagement.modelsQueuedDescription", { count: userQueueCount })}
</span>
)}
</div>
</div>
</div>
</div>
)}
</>
);
}
