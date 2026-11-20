import {
	User,
	Mail,
	Shield,
	Lock,
	Cloud,
	Monitor,
	Globe,
	Hash,
	FileText,
	ToggleLeft,
	Server,
	FolderInput,
	Folder,
	Gauge,
	Copy,
} from "lucide-react";
import { FormSection } from "@spatialhub/forms";
import { isValidEmail } from "@/utils/email-validation";

type TranslateFunction = (key: string) => string;
type FormIcon = NonNullable<FormSection["fields"][number]["icon"]>;

const formIcon = (icon: unknown): FormIcon => icon as FormIcon;

// shared backend rules
const passwordRules = (t?: TranslateFunction) => [
	{ label: t?.("profile.password.requirements.minChars") ?? "At least 8 characters", test: (v: string) => v.length >= 8 },
	{ label: t?.("profile.password.requirements.uppercase") ?? "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
	{ label: t?.("profile.password.requirements.lowercase") ?? "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
	{ label: t?.("profile.password.requirements.number") ?? "One number", test: (v: string) => /\d/.test(v) },
	{ label: t?.("profile.password.requirements.specialChar") ?? "One special character", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

// what each level gets
const accessHint = (level: string | undefined, t?: TranslateFunction): string => {
	const hints: Record<string, string> = {
		very_low: t?.("forms.user.accessHints.very_low") ?? "Up to 10 models and the standard base map.",
		intermediate: t?.("forms.user.accessHints.intermediate") ?? "Up to 25 models and more base maps.",
		manager: t?.("forms.user.accessHints.manager") ?? "Up to 50 models, model comparison, and manages users in their groups.",
		expert: t?.("forms.user.accessHints.expert") ?? "No model limit, all features and the admin area.",
	};
	return hints[level ?? "very_low"] ?? hints.very_low;
};

export const getUserFormSections = (
	isEdit: boolean = false,
	t?: TranslateFunction,
	currentUserAccessLevel?: string,
	selectedAccessLevel?: string,
	sendInvite: boolean = true,
): FormSection[] => [
	{
		title: t?.("forms.user.personalInfo.title") ?? "Personal Information",
		description: t?.("forms.user.personalInfo.description") ?? "Basic user details and contact information",
		columns: 2,
		fields: [
			{
				key: "name",
				label: t?.("forms.user.fields.fullName") ?? "Full Name",
				type: "text",
				value: "",
				placeholder: t?.("forms.user.placeholders.fullName") ?? "Enter full name",
				required: true,
				icon: formIcon(User),
			},
			{
				key: "email",
				label: t?.("forms.user.fields.email") ?? "Email Address",
				type: "email",
				value: "",
				placeholder: t?.("forms.user.placeholders.email") ?? "Enter email address",
				required: true,
				icon: formIcon(Mail),
			},
			{
				key: "access_level",
				label: t?.("forms.user.fields.accessLevel") ?? "Access Level",
				type: "select",
				value: "very_low",
				required: true,
				icon: formIcon(Shield),
				description: accessHint(selectedAccessLevel, t),
				options: [
					{ value: "very_low", label: t?.("forms.user.accessLevels.veryLow") ?? "Very Low Access" },
					{ value: "intermediate", label: t?.("forms.user.accessLevels.intermediate") ?? "Intermediate Access" },
					{ value: "manager", label: t?.("forms.user.accessLevels.manager") ?? "Manager (Group Access)" },
					{ value: "expert", label: t?.("forms.user.accessLevels.expert") ?? "Expert (Full Access)" },
				],
			},
						...(isEdit
							? ([
					{
						key: "email_verified",
						label: t?.("forms.user.fields.emailVerified") ?? "Email Verified",
						type: "checkbox",
						value: false,
						description: t?.("forms.user.descriptions.emailVerified") ?? "Mark email as verified",
						icon: formIcon(Shield),
					},
							] as FormSection["fields"])
				: []),
			// model limit field
			...(isEdit && currentUserAccessLevel === "expert"
				? ([
					{
						key: "model_limit",
						label: t?.("forms.user.fields.modelLimit") ?? "Model Limit",
						type: "number",
						value: undefined,
						placeholder: t?.("forms.user.placeholders.modelLimit") ?? "Leave empty for default",
						description: t?.("forms.user.descriptions.modelLimit") ?? "Custom model creation limit (0 = unlimited, empty = use default)",
						icon: formIcon(Gauge),
						min: 0,
					},
				] as FormSection["fields"])
				: []),
		],
	},
	...(isEdit
		? []
					: ([
				{
					title: t?.("forms.user.security.title") ?? "Security",
					description: t?.("forms.user.security.inviteDescription") ?? "How the user gets their password",
					columns: 1,
					fields: [
						{
							key: "send_invite",
							label: t?.("forms.user.fields.sendInvite") ?? "E-mail the user a link to set their password",
							type: "checkbox",
							value: true,
							icon: formIcon(Mail),
							description: t?.("forms.user.descriptions.sendInvite") ?? "Recommended. The link works for 72 hours and opens the app afterwards.",
						},
					],
				},
				// typed password option
				...(sendInvite ? [] : [{
					title: t?.("forms.user.security.passwordTitle") ?? "Set a password now",
					description: t?.("forms.user.security.description") ?? "Account security credentials",
					columns: 2,
					fields: [
						{
							key: "password",
							label: t?.("forms.user.fields.password") ?? "Password",
							type: "password",
							value: "",
							placeholder: t?.("forms.user.placeholders.password") ?? "Enter password",
							required: true,
							icon: formIcon(Lock),
							showPasswordToggle: true,
							passwordRequirements: passwordRules(t),
							validation: (value: FormValue) => {
								const v = typeof value === 'string' ? value : '';
								if (v && !passwordRules(t).every((rule) => rule.test(v))) {
									return t?.("profile.password.requirementsNotMet") ?? "Password does not meet all requirements";
								}
								return null;
							},
						},
						{
							key: "password_confirmation",
							label: t?.("forms.user.fields.confirmPassword") ?? "Confirm Password",
							type: "password",
							value: "",
							placeholder: t?.("forms.user.placeholders.confirmPassword") ?? "Confirm password",
							required: true,
							icon: formIcon(Lock),
							showPasswordToggle: true,
						},
											] as FormSection["fields"],
				}]),
			] as FormSection[])),
];

type FormValue = string | number | boolean;

export const getWebserviceFormSections = (t?: TranslateFunction, autoScaling: boolean = false): FormSection[] => [
	{
		title: t?.("forms.webservice.serviceInfo.title") ?? "Service Information",
		description: t?.("forms.webservice.serviceInfo.description") ?? "Basic webservice identification and metadata",
		columns: 1,
		fields: [
			            {
							key: "name",
							label: t?.("forms.webservice.fields.serviceName") ?? "Service Name",
							type: "text",
							value: "",
							placeholder: t?.("forms.webservice.placeholders.serviceName") ?? "Enter service name",
							required: true,
							icon: formIcon(Cloud),
							description: t?.("forms.webservice.descriptions.serviceName") ?? "Human-readable name for the webservice",
						},
					],
				},
				{
					title: t?.("forms.webservice.connectionDetails.title") ?? "Connection Details",
					description: t?.("forms.webservice.connectionDetails.description") ?? "Network connection and endpoint configuration",
					columns: 2,
					fields: [
						{
							key: "protocol",
							label: t?.("forms.webservice.fields.protocol") ?? "Protocol",
							type: "select",
							value: "http",
							required: true,
							icon: formIcon(Globe),
							options: [
								{ value: "http", label: "HTTP" },
								{ value: "https", label: "HTTPS" },
							],
						},
						{
							key: "ip",
							label: t?.("forms.webservice.fields.ipAddress") ?? "IP Address / Hostname",
							type: "text",
							value: "",
							placeholder: t?.("forms.webservice.placeholders.ipAddress") ?? "e.g., 192.168.1.100 or sim-haproxy",
							required: true,
							icon: formIcon(Monitor),
							validation: (value: FormValue) => {
								const v = typeof value === 'string' ? value : '';
								const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
									const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
								if (v && !ipRegex.test(v) && !hostnameRegex.test(v)) {
									return t?.("forms.webservice.validation.ipInvalid") ?? "Please enter a valid IP address or hostname";
								}
								return null;
							},
						},
						{
							key: "port",
							label: t?.("forms.webservice.fields.port") ?? "Port",
							type: "number",
							value: 8080,
							required: true,
							icon: formIcon(Hash),
							min: 1,
							max: 65535,				validation: (value: FormValue) => {
					const num = typeof value === 'number' ? value : Number(value);
					if (num && (num < 1 || num > 65535)) {
						return t?.("forms.webservice.validation.portRange") ?? "Port must be between 1 and 65535";
					}
					return null;
				},
			},
			{
				key: "endpoint",
				label: t?.("forms.webservice.fields.endpoint") ?? "Endpoint Path",
				type: "text",
				value: "",
				placeholder: "/assessment/start",
				icon: formIcon(Server),
				description: t?.("forms.webservice.descriptions.endpoint") ?? "Leave empty to use /assessment/start.",
			},
		],
	},
	{
		title: t?.("forms.webservice.performanceSettings.title") ?? "Performance Settings",
		description: t?.("forms.webservice.performanceSettings.description") ?? "Service capacity and performance configuration",
		columns: 2,
		fields: [
			{
				key: "auto_scaling",
				label: t?.("forms.webservice.fields.autoScaling") ?? "Auto Scaling",
				type: "checkbox",
				value: false,
				icon: formIcon(ToggleLeft),
				description: t?.("forms.webservice.descriptions.autoScalingRuns") ?? "Allow more than one run at a time on this engine.",
			},
			{
				key: "max_concurrency",
				label: t?.("forms.webservice.fields.maxConcurrency") ?? "Max Concurrent Requests",
				type: "number",
				value: 1,
				required: true,
				icon: formIcon(Hash),
				min: 1,
				max: 100,
				// backend forces 1
				disabled: !autoScaling,
				description: autoScaling
					? t?.("forms.webservice.descriptions.maxConcurrency") ?? "Maximum number of concurrent requests (1-100)"
					: t?.("forms.webservice.descriptions.concurrencyLocked") ?? "Fixed at 1 while Auto Scaling is off.",
				validation: (value: FormValue) => {
					const num = typeof value === 'number' ? value : Number(value);
					if (num && (num < 1 || num > 100)) {
						return t?.("forms.webservice.validation.concurrencyRange") ?? "Max concurrency must be between 1 and 100";
					}
					return null;
				},
			},
			{
				key: "status",
				label: t?.("forms.webservice.fields.initialStatus") ?? "Initial Status",
				type: "select",
				value: "inactive",
				required: true,
				icon: formIcon(Shield),
				description: t?.("forms.webservice.descriptions.status") ?? "Only active engines receive runs.",
				options: [
					{ value: "active", label: t?.("forms.webservice.statusOptions.active") ?? "Active" },
					{ value: "inactive", label: t?.("forms.webservice.statusOptions.inactive") ?? "Inactive" },
					{ value: "maintenance", label: t?.("forms.webservice.statusOptions.maintenance") ?? "Maintenance" },
				],
			},
		],
	},
];

export const validateUserForm = (values: Record<string, unknown>, isEdit: boolean = false, t?: TranslateFunction): Record<string, string> => {
	const errors: Record<string, string> = {};

	validateUserBasicFields(errors, values, t);
	
	// invite sets password
	if (!isEdit && values.send_invite === false) {
		validateUserPasswords(errors, values, t);
	}

	return errors;
};

function validateUserBasicFields(errors: Record<string, string>, values: Record<string, unknown>, t?: TranslateFunction) {
	const name = typeof values.name === 'string' ? values.name : '';
	if (!name.trim()) {
		errors.name = t?.("forms.user.validation.nameRequired") ?? "Name is required";
	}

	const email = typeof values.email === 'string' ? values.email : '';
	if (!email.trim()) {
		errors.email = t?.("forms.user.validation.emailRequired") ?? "Email is required";
	} else if (!isValidEmail(email)) {
		errors.email = t?.("forms.user.validation.emailInvalid") ?? "Please enter a valid email address";
	}

	if (!values.access_level) {
		errors.access_level = t?.("forms.user.validation.accessLevelRequired") ?? "Access level is required";
	}
}

function validateUserPasswords(errors: Record<string, string>, values: Record<string, unknown>, t?: TranslateFunction) {
	// password validation logic
	const password = typeof values.password === 'string' ? values.password : ''; // not hard-coded password
	if (!password) {
		errors.password = t?.("forms.user.validation.passwordRequired") ?? "Password is required"; // error message
	} else if (password.length < 8) {
		errors.password = t?.("forms.user.validation.passwordLength") ?? "Password must be at least 8 characters long";
	}

	const password_confirmation = typeof values.password_confirmation === 'string' ? values.password_confirmation : '';
	if (!password_confirmation) {
		errors.password_confirmation = t?.("forms.user.validation.confirmPasswordRequired") ?? "Password confirmation is required";
	} else if (password !== password_confirmation) {
		errors.password_confirmation = t?.("forms.user.validation.passwordsMismatch") ?? "Passwords do not match";
	}
}

export const validateWebserviceForm = (values: Record<string, unknown>, t?: TranslateFunction): Record<string, string> => {
	const errors: Record<string, string> = {};

	const name = typeof values.name === 'string' ? values.name : '';
	if (name.trim() === '') {
		errors.name = t?.("forms.webservice.validation.nameRequired") ?? "Service name is required";
	}

	const ip = typeof values.ip === 'string' ? values.ip : '';
	if (ip.trim() === '') {
		errors.ip = t?.("forms.webservice.validation.ipRequired") ?? "IP address or hostname is required";
	} else {
		const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
		const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
		if (!ipRegex.test(ip) && !hostnameRegex.test(ip)) {
			errors.ip = t?.("forms.webservice.validation.ipInvalid") ?? "Please enter a valid IP address or hostname";
		}
	}

	const port = typeof values.port === 'number' ? values.port : Number(values.port);
	if (!port) {
		errors.port = t?.("forms.webservice.validation.portRequired") ?? "Port is required";
	} else if (port < 1 || port > 65535) {
		errors.port = t?.("forms.webservice.validation.portRange") ?? "Port must be between 1 and 65535";
	}

	return errors;
};

export const getWorkspaceFormSections = (t?: TranslateFunction): FormSection[] => [
	{
		title: t?.("forms.workspace.details.title") ?? "Details",
		description: t?.("forms.workspace.details.description") ?? "Enter the workspace name and optional description",
		columns: 1,
		fields: [
			{
				key: "name",
				label: t?.("forms.workspace.fields.name") ?? "Workspace Name",
				type: "text",
				value: "",
				placeholder: t?.("forms.workspace.placeholders.name") ?? "Enter workspace name",
				required: true,
				icon: formIcon(Folder),
				description: t?.("forms.workspace.descriptions.name") ?? "A unique name for your workspace",
			},
			{
				key: "description",
				label: t?.("forms.workspace.fields.description") ?? "Description",
				type: "textarea",
				value: "",
				placeholder: t?.("forms.workspace.placeholders.description") ?? "Enter workspace description (optional)",
				icon: formIcon(FileText),
				rows: 3,
				description: t?.("forms.workspace.descriptions.description") ?? "Optional description of the workspace purpose",
			},
		],
	},
];

export const getMoveModelFormSections = (workspaces: Array<{id: number; name: string; is_default: boolean}>, t?: TranslateFunction): FormSection[] => [
	{
		title: t?.("forms.moveModel.destination.title") ?? "Destination",
		description: t?.("forms.moveModel.destination.description") ?? "Select the target workspace for the model",
		columns: 1,
		fields: [
			{
				key: "workspace_id",
				label: t?.("forms.moveModel.fields.targetWorkspace") ?? "Target Workspace",
				type: "select",
				value: "",
				placeholder: t?.("forms.moveModel.placeholders.selectWorkspace") ?? "Select a workspace",
				required: true,
				icon: formIcon(FolderInput),
				options: workspaces.map(ws => ({
					value: String(ws.id),
					label: ws.is_default ? (t?.("forms.moveModel.defaultWorkspace") ?? 'Default Workspace') : ws.name
				})),
				description: t?.("forms.moveModel.descriptions.targetWorkspace") ?? "Choose the workspace to move the model to",
			},
		],
	},
];

export const validateWorkspaceForm = (values: Record<string, unknown>, t?: TranslateFunction): Record<string, string> => {
	const errors: Record<string, string> = {};

	const name = typeof values.name === 'string' ? values.name : '';
	if (!name.trim()) {
		errors.name = t?.("forms.workspace.validation.nameRequired") ?? "Workspace name is required";
	}

	return errors;
};

export const getShareModelFormSections = (t?: TranslateFunction): FormSection[] => [
	{
		title: t?.("forms.shareModel.title") ?? "Share with an Individual User",
		description: t?.("forms.shareModel.description") ?? "Enter the email address of the user to share with",
		columns: 1,
		fields: [
			{
				key: "email",
				label: t?.("forms.user.fields.email") ?? "Email Address",
				type: "email",
				value: "",
				placeholder: "name@email.com",
				required: true,
				icon: formIcon(Mail),
				description: t?.("forms.shareModel.emailDescription") ?? "The user will get access to this model",
			},
		],
	},
];

export const validateShareModelForm = (values: Record<string, unknown>, t?: TranslateFunction): Record<string, string> => {
	const errors: Record<string, string> = {};

	const email = typeof values.email === 'string' ? values.email : '';
	if (!email.trim()) {
		errors.email = t?.("forms.user.validation.emailRequired") ?? "Email address is required";
	} else if (!isValidEmail(email)) {
		errors.email = t?.("forms.user.validation.emailInvalid") ?? "Please enter a valid email address";
	}

	return errors;
};

export const getBulkCopyFormSections = (t?: TranslateFunction): FormSection[] => [
	{
		title: t?.("forms.bulkCopy.title") ?? "Number of Copies",
		description: t?.("forms.bulkCopy.description") ?? "Specify how many copies to create for each selected model",
		columns: 1,
		fields: [
			{
				key: "copyCount",
				label: t?.("forms.bulkCopy.fields.copyCount") ?? "Number of Copies",
				type: "number",
				value: 1,
				placeholder: "1",
				required: true,
				icon: formIcon(Copy),
				description: t?.("forms.bulkCopy.fields.copyCountDescription") ?? "Each selected model will be duplicated this many times",
				min: 1,
				max: 10,
			},
		],
	},
];

export const validateBulkCopyForm = (values: Record<string, unknown>, t?: TranslateFunction): Record<string, string> => {
	const errors: Record<string, string> = {};

	const copyCount = Number(values.copyCount);
	if (!copyCount || copyCount < 1) {
		errors.copyCount = t?.("forms.bulkCopy.validation.min") ?? "At least 1 copy is required";
	} else if (copyCount > 10) {
		errors.copyCount = t?.("forms.bulkCopy.validation.max") ?? "Maximum 10 copies allowed";
	} else if (!Number.isInteger(copyCount)) {
		errors.copyCount = t?.("forms.bulkCopy.validation.integer") ?? "Must be a whole number";
	}

	return errors;
};
