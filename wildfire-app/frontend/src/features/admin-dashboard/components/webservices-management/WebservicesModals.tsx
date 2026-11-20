import Notification from "@/components/ui/Notification";
import { UniversalForm } from "@spatialhub/forms";
import { Server } from "lucide-react";
import { getWebserviceFormSections } from "@/configuration/formConfigurations";
import type { FormDataConvertible } from "@/hooks/useForm";
import type { WebserviceFormData, WebserviceInstance } from "@/features/admin-dashboard/types";
import { useTranslation } from "@/i18n";

interface NotificationState {
title?: string;
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

// url the platform calls
function EndpointPreview({ data }: { data: WebservicesModalsProps["formData"] }) {
const { t } = useTranslation();
if (!data.ip) return null;
const path = data.endpoint?.trim() ? (data.endpoint.startsWith("/") ? data.endpoint : `/${data.endpoint}`) : "/assessment/start";
return (
<p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
{t("forms.webservice.preview", "Runs are sent to")}{" "}
<code className="font-mono text-foreground">{`${data.protocol || "http"}://${data.ip}:${data.port || ""}${path}`}</code>
</p>
);
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
sections={getWebserviceFormSections(t, Boolean(formData.auto_scaling))}
Icon={Server}
beforeSubmitContent={<EndpointPreview data={formData} />}
values={formData as unknown as Record<string, FormDataConvertible>}
onChange={(key, value) => {
onFormChange(key, value);
// mirror backend rule
if (key === "auto_scaling" && !value) onFormChange("max_concurrency", 1);
}}
onSubmit={onSubmit}
submitText={selectedService ? t("webservicesManagement.dialog.editButton") : t("webservicesManagement.dialog.createButton")}
loading={formLoading}
errors={formErrors}
maxWidth="xl"
/>

<Notification
isOpen={notification.open}
title={notification.title}
message={notification.message}
severity={notification.severity}
onClose={onCloseNotification}
/>
</>
);
}
