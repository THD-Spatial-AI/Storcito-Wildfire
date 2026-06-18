import Notification from "@/components/ui/Notification";
import { UniversalForm } from "@spatialhub/forms";
import { getWebserviceFormSections } from "@/configuration/formConfigurations";
import type { FormDataConvertible } from "@/hooks/useForm";
import type { WebserviceFormData, WebserviceInstance } from "@/features/admin-dashboard/types";
import { useTranslation } from "@/i18n";

interface NotificationState {
open: boolean;
message: string;
severity: "success" | "error" | "warning";
}

interface WebservicesModalsProps {
addDialogOpen: boolean;
editDialogOpen: boolean;
selectedService: WebserviceInstance | null;
formData: WebserviceFormData;
formErrors: Record<string, string>;
formLoading: boolean;
notification: NotificationState;
onCloseForm: () => void;
onFormChange: (key: string, value: FormDataConvertible) => void;
onSubmit: () => void;
onCloseNotification: () => void;
}

export function WebservicesModals({ addDialogOpen, editDialogOpen, selectedService, formData, formErrors, formLoading, notification, onCloseForm, onFormChange, onSubmit, onCloseNotification }: WebservicesModalsProps) {
const { t } = useTranslation();

return (
<>
<UniversalForm
isOpen={addDialogOpen || editDialogOpen}
onClose={onCloseForm}
title={selectedService ? t("webservicesManagement.dialog.editTitle") : t("webservicesManagement.dialog.createTitle")}
description={selectedService ? t("webservicesManagement.dialog.editDescription") : t("webservicesManagement.dialog.createDescription")}
variant="webservice"
sections={getWebserviceFormSections(t)}
values={formData as unknown as Record<string, FormDataConvertible>}
onChange={onFormChange}
onSubmit={onSubmit}
submitText={selectedService ? t("webservicesManagement.dialog.editButton") : t("webservicesManagement.dialog.createButton")}
loading={formLoading}
errors={formErrors}
maxWidth="xl"
/>

<div className="fixed top-16 right-4 z-[9999]">
<Notification
isOpen={notification.open}
message={notification.message}
severity={notification.severity}
onClose={onCloseNotification}
/>
</div>
</>
);
}
