import React, { useState, useEffect } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { UniversalForm, type FormSection, type FormDataConvertible } from "@spatialhub/forms";
import { User, Mail, Lock, Building2, Briefcase, Phone, UserPlus, ArrowRight } from "lucide-react";
import { useTranslation } from "@spatialhub/i18n";

export interface RegisterFormProps {
	/** Called when setting document title */
	onDocumentTitle?: (title: string) => void;
	/** Form sections configuration */
	formSections?: FormSection[];
	/** API base URL */
	apiBaseUrl?: string;
	/** App name to display */
	appName?: React.ReactNode;
	/** Background image URL (centered layout only) */
	backgroundImageUrl?: string;
	/**
	 * Page layout:
	 *  - "centered" (default): the form card floats over a full-bleed background image.
	 *  - "split": a two-column screen with `sideContent` on the left and the form on the right.
	 */
	layout?: "centered" | "split";
	/** Content rendered in the left column when `layout="split"` (e.g. branded imagery). */
	sideContent?: React.ReactNode;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
	onDocumentTitle,
	formSections,
	apiBaseUrl = "/api",
	appName = (
		<>
			<span className="text-gray-900 dark:text-white">Ener</span>
			<span className="text-primary">Plan</span>
			<span className="text-gray-900 dark:text-white">ET</span>
		</>
	),
	backgroundImageUrl = "/images/register-bg.jpg",
	layout = "centered",
	sideContent,
}) => {
	const { t } = useTranslation();

	const defaultFormSections: FormSection[] = [
		{
			title: t("auth.personalInformation"),
			columns: 2,
			fields: [
				{
					key: "name",
					label: t("auth.fullName"),
					type: "text",
					placeholder: t("auth.enterFullName"),
					required: true,
					icon: User,
				},
				{
					key: "email",
					label: t("auth.emailAddress"),
					type: "email",
					placeholder: t("auth.enterEmailAddress"),
					required: true,
					icon: Mail,
				},
			],
		},
		{
			title: t("auth.security"),
			columns: 2,
			fields: [
				{
					key: "password",
					label: t("auth.password"),
					type: "password",
					placeholder: t("auth.createPassword"),
					required: true,
					icon: Lock,
					showPasswordToggle: true,
					passwordRequirements: [
						{ label: t("auth.passwordRequirements.minChars"), test: (v: string) => v.length >= 8 },
						{ label: t("auth.passwordRequirements.uppercase"), test: (v: string) => /[A-Z]/.test(v) },
						{ label: t("auth.passwordRequirements.lowercase"), test: (v: string) => /[a-z]/.test(v) },
						{ label: t("auth.passwordRequirements.number"), test: (v: string) => /\d/.test(v) },
						{ label: t("auth.passwordRequirements.specialChar"), test: (v: string) => /[^A-Za-z0-9]/.test(v) },
					],
				},
				{
					key: "password_confirmation",
					label: t("auth.confirmPassword"),
					type: "password",
					placeholder: t("auth.confirmYourPassword"),
					required: true,
					icon: Lock,
					showPasswordToggle: true,
				},
			],
		},
		{
			title: t("auth.organizationDetails"),
			columns: 2,
			fields: [
				{
					key: "organization",
					label: t("auth.organization"),
					type: "text",
					placeholder: t("auth.enterOrganization"),
					required: false,
					icon: Building2,
				},
				{
					key: "position",
					label: t("auth.position"),
					type: "text",
					placeholder: t("auth.enterPosition"),
					required: false,
					icon: Briefcase,
				},
				{
					key: "phone",
					label: t("auth.phoneNumber"),
					type: "tel",
					placeholder: t("auth.enterPhoneNumber"),
					required: false,
					icon: Phone,
				},
			],
		},
	];

	const sections = formSections || defaultFormSections;

	useEffect(() => {
		onDocumentTitle?.(t("auth.createAccount"));
	}, [onDocumentTitle, t]);

	const navigate = useNavigate();
	const [values, setValues] = useState<Record<string, FormDataConvertible>>({
		name: "",
		email: "",
		password: "",
		password_confirmation: "",
		organization: "",
		position: "",
		phone: "",
		access_level: "very_low",
	});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [isLoading, setIsLoading] = useState(false);

	const onSubmit = async () => {
		setIsLoading(true);
		setErrors({});
		try {
			const resp = await fetch(`${apiBaseUrl}/register`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(values),
			});
			const data = await resp.json().catch(() => ({}));
			if (!resp.ok) {
				const fieldErrors = (data?.errors || data?.error || {}) as Record<string, string>;
				setErrors(fieldErrors);
				return;
			}
			navigate("/login", { replace: true });
		} finally {
			setIsLoading(false);
		}
	};

	const isSplit = layout === "split";

	const card = (
		<div className="w-full">
			<div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
				{/* Header section with gradient */}
				<div className="relative px-8 pt-4 pb-2 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800">
					<div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-gray-200/50 to-transparent dark:from-gray-700/30 rounded-bl-full" />
					<div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-transparent to-gray-200/30 dark:to-gray-700/20 rounded-br-full" />
					<div className="relative flex flex-col items-center gap-2">
						<div className="relative">
							<h1 className="text-xl font-bold tracking-tight">
								{appName}
							</h1>
						</div>
						<div className="text-center">
							<div className="flex items-center justify-center gap-2">
								<UserPlus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
								<h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("auth.createAccount")}</h2>
							</div>
							<p className="text-xs text-gray-500 dark:text-gray-400">{t("auth.joinUsAccess")}</p>
						</div>
					</div>
				</div>

				{/* Form section */}
				<div className="px-8 py-6">
					<UniversalForm
						isOpen={true}
						inline={true}
						showCloseButton={false}
						onClose={() => navigate("/login")}
						sections={sections}
						values={values}
						onChange={(k: string, v: FormDataConvertible) => setValues((prev) => ({ ...prev, [k]: v }))}
						onSubmit={onSubmit}
						submitText={
							<span className="flex items-center justify-center gap-2">
								{isLoading ? t("auth.creating") : t("auth.createAccount")}
								{!isLoading && <ArrowRight className="w-4 h-4" />}
							</span>
						}
						loading={isLoading}
						errors={errors}
						variant="user"
						maxWidth="2xl"
					/>
				</div>

				{/* Footer section */}
				<div className="px-8 pb-4">
					<div className="relative mb-2">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-gray-200 dark:border-gray-700" />
						</div>
						<div className="relative flex justify-center text-xs">
							<span className="px-3 bg-white dark:bg-gray-900 text-gray-400">{t("auth.or")}</span>
						</div>
					</div>

					<div className="text-center">
						<RouterLink
							to="/login"
							className="group inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
						>
							<span>{t("auth.alreadyHaveAccount")}</span>
							<span className="text-gray-900 dark:text-white font-semibold group-hover:underline underline-offset-2">{t("auth.signIn")}</span>
						</RouterLink>
					</div>
				</div>
			</div>

			<p className={`text-center text-[10px] mt-2 ${isSplit ? "text-gray-400 dark:text-gray-500" : "text-white/60"}`}>
				{t("auth.agreeToTerms")}
			</p>
		</div>
	);

	// ---- Split layout: branded imagery on the left, form on the right ----
	if (isSplit) {
		return (
			<div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
				<aside className="relative hidden lg:block lg:w-1/2 xl:w-3/5 overflow-hidden">
					{sideContent}
				</aside>
				<main className="flex w-full lg:w-1/2 xl:w-2/5 items-center justify-center overflow-y-auto p-6 sm:p-10">
					<div className="w-full max-w-xl">
						{card}
					</div>
				</main>
			</div>
		);
	}

	// ---- Centered layout (default): form card over a full-bleed background ----
	return (
		<div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
			{/* Background with overlay */}
			<div className="absolute inset-0">
				<img
					src={backgroundImageUrl}
					alt="Background"
					className="w-full h-full object-cover scale-105"
				/>
				<div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 via-gray-900/50 to-gray-800/70" />
				<div className="absolute inset-0 backdrop-blur-[2px]" />
			</div>

			{/* Decorative elements */}
			<div className="absolute top-40 left-10 w-80 h-80 bg-gray-500/10 rounded-full blur-3xl animate-pulse" />
			<div className="absolute bottom-10 right-10 w-96 h-96 bg-gray-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
			<div className="absolute top-10 right-40 w-64 h-64 bg-gray-600/10 rounded-full blur-3xl animate-pulse delay-500" />

			<div className="relative w-full max-w-2xl z-10">
				{card}
			</div>
		</div>
	);
};
