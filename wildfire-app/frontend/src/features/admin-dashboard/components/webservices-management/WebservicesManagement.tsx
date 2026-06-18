import { useAuthStore } from "@/store/auth-store";
import { WebservicesFilters } from "./WebservicesFilters";
import { WebservicesModals } from "./WebservicesModals";
import { WebservicesSummary } from "./WebservicesSummary";
import { WebservicesTable } from "./WebservicesTable";
import { useWebservices } from "./hooks/useWebservices";

interface WebservicesManagementProps {
readOnly?: boolean;
}

export const WebservicesManagement: React.FC<WebservicesManagementProps> = ({ readOnly = false }) => {
const { user } = useAuthStore();
const webservices = useWebservices();

if (!user) {
return (
<div className="flex justify-center items-center min-h-64">
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600" />
</div>
);
}

if (webservices.loading && webservices.webservices.length === 0) {
return (
<div className="flex justify-center items-center min-h-96">
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
</div>
);
}

return (
<div className="space-y-6">
<WebservicesSummary
summary={webservices.summary}
userQueueCount={webservices.userQueueCount}
userRunningCount={webservices.userRunningCount}
/>
<WebservicesFilters
readOnly={readOnly}
loading={webservices.loading}
isRefreshing={webservices.isRefreshing}
filters={webservices.filters}
searchInput={webservices.searchInput}
setSearchInput={webservices.setSearchInput}
setFilters={webservices.setFilters}
onRefresh={webservices.handleRefresh}
onAdd={webservices.handleAdd}
/>
<WebservicesTable
webservices={webservices.webservices}
loading={webservices.loading}
readOnly={readOnly}
currentPage={webservices.currentPage}
itemsPerPage={webservices.itemsPerPage}
setCurrentPage={webservices.setCurrentPage}
setItemsPerPage={webservices.setItemsPerPage}
onAdd={webservices.handleAdd}
onEdit={webservices.handleEdit}
onDelete={webservices.handleDelete}
onServiceAction={webservices.handleServiceAction}
/>
<WebservicesModals
addDialogOpen={webservices.addDialogOpen}
editDialogOpen={webservices.editDialogOpen}
selectedService={webservices.selectedService}
formData={webservices.formData}
formErrors={webservices.formErrors}
formLoading={webservices.formLoading}
notification={webservices.notification}
onCloseForm={webservices.closeForm}
onFormChange={webservices.handleFormChange}
onSubmit={webservices.handleSaveWebservice}
onCloseNotification={webservices.closeNotification}
/>
</div>
);
};
