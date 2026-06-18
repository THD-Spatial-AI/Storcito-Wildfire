import { useEffect, useRef, useState } from "react";
import { validateWebserviceForm } from "@/configuration/formConfigurations";
import type { FormDataConvertible } from "@/hooks/useForm";
import { useConfirm } from "@/hooks/useConfirmDialog";
import { useWebservices as useWebservicesApi } from "@/features/admin-dashboard/hooks/useWebservices";
import { modelService } from "@/features/model-dashboard/services/modelService";
import type { WebserviceFilters, WebserviceFormData, WebserviceInstance } from "@/features/admin-dashboard/types";
import { useTranslation } from "@/i18n";

type NotificationState = {
open: boolean;
message: string;
severity: "success" | "error" | "warning";
};

const initialFormData: WebserviceFormData = {
name: "",
ip: "",
port: 8085,
protocol: "http",
endpoint: "",
auto_scaling: false,
max_concurrency: 1,
status: "inactive",
};

export function useWebservices() {
const { t } = useTranslation();
const confirm = useConfirm();
const api = useWebservicesApi({}, { autoRefresh: true, refreshInterval: 30000 });
const [userQueueCount, setUserQueueCount] = useState(0);
const [userRunningCount, setUserRunningCount] = useState(0);
const [addDialogOpen, setAddDialogOpen] = useState(false);
const [editDialogOpen, setEditDialogOpen] = useState(false);
const [selectedService, setSelectedService] = useState<WebserviceInstance | null>(null);
const [isRefreshing, setIsRefreshing] = useState(false);
const [notification, setNotification] = useState<NotificationState>({ open: false, message: "", severity: "success" });
const [formData, setFormData] = useState<WebserviceFormData>(initialFormData);
const [formErrors, setFormErrors] = useState<Record<string, string>>({});
const [formLoading, setFormLoading] = useState(false);
const [filters, setFilters] = useState<WebserviceFilters>({ status: "", available: "", search: "" });
const [searchInput, setSearchInput] = useState("");
const [currentPage, setCurrentPage] = useState(0);
const [itemsPerPage, setItemsPerPage] = useState(5);
const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
const fetchUserStats = async () => {
try {
const response = await modelService.getModelStats();
if (response.success && response.data) {
setUserQueueCount(response.data.queue || 0);
setUserRunningCount(response.data.running || 0);
}
} catch {
// Ignore errors
}
};
fetchUserStats();
const interval = setInterval(fetchUserStats, 30000);
return () => clearInterval(interval);
}, []);

useEffect(() => {
if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
debounceTimerRef.current = setTimeout(() => {
setFilters(prev => ({ ...prev, search: searchInput }));
}, 500);
return () => {
if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
};
}, [searchInput]);

const { loadWebservices } = api;

useEffect(() => {
loadWebservices({ status: "", available: "", search: "" });
}, [loadWebservices]);

useEffect(() => {
loadWebservices({ status: filters.status, available: filters.available, search: filters.search });
setCurrentPage(0);
}, [filters.status, filters.available, filters.search, loadWebservices]);

useEffect(() => {
if (api.error) setNotification({ open: true, message: api.error, severity: "error" });
}, [api.error]);

const resetForm = () => {
setFormData(initialFormData);
setFormErrors({});
setSelectedService(null);
};

const handleAdd = () => {
resetForm();
setAddDialogOpen(true);
};

const closeForm = () => {
setAddDialogOpen(false);
setEditDialogOpen(false);
resetForm();
};

const handleRefresh = () => {
setIsRefreshing(true);
api.loadWebservices(filters);
setTimeout(() => setIsRefreshing(false), 1000);
};

const handleServiceAction = async (serviceId: number, action: string, serviceName?: string) => {
try {
switch (action) {
case "mark_available":
await api.markAvailable(serviceId);
break;
case "mark_unavailable":
await api.markUnavailable(serviceId);
break;
case "mark_busy":
await api.markBusy(serviceId);
break;
case "mark_idle":
await api.markIdle(serviceId);
break;
case "health_check":
case "ping": {
const pingResult = await api.pingWebservice(serviceId);
const isAvailable = pingResult?.available;
const status = isAvailable ? t("webservicesManagement.status.available") : t("webservicesManagement.status.unavailable");
const serviceLabel = serviceName || `${t("webservicesManagement.table.service")} ${serviceId}`;
setNotification({ open: true, message: `${t("webservicesManagement.healthCheck")}: ${serviceLabel} - ${status}`, severity: isAvailable ? "success" : "warning" });
return;
}
default:
return;
}
setNotification({ open: true, message: t("webservicesManagement.notifications.statusChanged", { status: action.replace("_", " ") }), severity: "success" });
} catch (error: unknown) {
const fallbackMessage = action === "ping" || action === "health_check" ? t("webservicesManagement.notifications.failedToPing") : t("webservicesManagement.notifications.failedToUpdate");
const message = typeof error === "object" && error && "message" in error ? String((error as { message?: string }).message) : fallbackMessage;
setNotification({ open: true, message, severity: "error" });
}
};

const handleFormChange = (key: string, value: FormDataConvertible) => {
setFormData(prev => ({ ...prev, [key]: value }));
if (formErrors[key]) {
setFormErrors(prev => {
const newErrors = { ...prev };
delete newErrors[key];
return newErrors;
});
}
};

const handleSaveWebservice = async () => {
setFormLoading(true);
setFormErrors({});
try {
const errors = validateWebserviceForm(formData as unknown as Record<string, unknown>, t);
if (Object.keys(errors).length > 0) {
setFormErrors(errors);
return;
}
const apiData = {
name: formData.name || undefined,
ip: formData.ip,
port: formData.port,
protocol: formData.protocol,
endpoint: formData.endpoint || undefined,
auto_scaling: formData.auto_scaling,
max_concurrency: formData.max_concurrency,
status: formData.status,
};
const result = selectedService ? await api.updateWebservice(selectedService.id, apiData) : await api.createWebservice(apiData);
if (result) {
setAddDialogOpen(false);
setEditDialogOpen(false);
resetForm();
setNotification({ open: true, message: selectedService ? t("webservicesManagement.notifications.updated") : t("webservicesManagement.notifications.created"), severity: "success" });
}
} catch (error: unknown) {
const fallback = selectedService ? t("webservicesManagement.notifications.failedToUpdate") : t("webservicesManagement.notifications.failedToCreate");
const message = typeof error === "object" && error && "message" in error ? String((error as { message?: string }).message) : fallback;
setNotification({ open: true, message, severity: "error" });
} finally {
setFormLoading(false);
}
};

const handleEdit = (service: WebserviceInstance) => {
setSelectedService(service);
setFormData({
name: service.name || "",
ip: service.ip,
port: service.port,
protocol: service.protocol,
endpoint: service.endpoint || "",
auto_scaling: service.auto_scaling,
max_concurrency: service.max_concurrency || 1,
status: service.status || "inactive",
});
setEditDialogOpen(true);
};

const handleDelete = async (service: WebserviceInstance) => {
await confirm({
type: "delete",
itemType: "webservice",
itemName: service.name || service.ip,
isDangerous: false,
onConfirm: async () => {
try {
await api.deleteWebservice(service.id);
} catch (error) {
if (import.meta.env.DEV) console.error("Failed to delete webservice:", error);
}
},
});
};

return {
...api,
userQueueCount,
userRunningCount,
addDialogOpen,
editDialogOpen,
selectedService,
isRefreshing,
notification,
formData,
formErrors,
formLoading,
filters,
searchInput,
currentPage,
itemsPerPage,
setFilters,
setSearchInput,
setCurrentPage,
setItemsPerPage,
handleAdd,
closeForm,
handleRefresh,
handleServiceAction,
handleFormChange,
handleSaveWebservice,
handleEdit,
handleDelete,
closeNotification: () => setNotification(prev => ({ ...prev, open: false })),
};
}
