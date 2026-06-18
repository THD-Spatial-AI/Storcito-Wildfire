import React, { useState, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ArrowLeft, CheckCircle, Mail } from "lucide-react";
import { UniversalForm, type FormSection, type FormDataConvertible } from "@spatialhub/forms";
import { useTranslation } from "@spatialhub/i18n";

export interface ForgotPasswordFormProps {
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
	 *  - "centered" (default): the card floats over a full-bleed background image.
	 *  - "split": a two-column screen with `sideContent` on the left and the card on the right.
	 */
	layout?: "centered" | "split";
	/** Content rendered in the left column when `layout="split"` (e.g. branded imagery). */
	sideContent?: React.ReactNode;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
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
	backgroundImageUrl = "/images/login-bg.jpg",
	layout = "centered",
	sideContent,
}) => {
	const { t } = useTranslation();

	const defaultFormSections: FormSection[] = [
		{
			title: "",
			fields: [
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
	];

	const sections = formSections || defaultFormSections;

	useEffect(() => {
		onDocumentTitle?.(t("auth.forgotPasswordTitle"));
	}, [onDocumentTitle, t]);

	const [formData, setFormData] = useState({ email: "" });
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);

	const handleFieldChange = (key: string, value: FormDataConvertible) => {
		setFormData((prev) => ({ ...prev, [key]: String(value) }));
		setError("");
	};

	const handleSubmit = async () => {
		setError("");
		setIsLoading(true);

		try {
			const response = await fetch(`${apiBaseUrl}/auth/forgot-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ email: formData.email }),
			});
			const data = await response.json().catch(() => ({}));

			if (response.ok && data.success) {
				setSuccess(true);
			} else {
				setError(data?.error || "Failed to send password reset email. Please try again.");
			}
		} catch {
			setError("Failed to send password reset email. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const isSplit = layout === "split";

	// Wraps a card in either the centered (full-bleed image) or split layout.
	const shell = (children: React.ReactNode) =>
		isSplit ? (
			<div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
				<aside className="relative hidden lg:block lg:w-1/2 xl:w-3/5 overflow-hidden">
					{sideContent}
				</aside>
				<main className="flex w-full lg:w-1/2 xl:w-2/5 items-center justify-center p-6 sm:p-10">
					<div className="w-full max-w-md">{children}</div>
				</main>
			</div>
		) : (
			<div className="min-h-screen relative flex items-center justify-center p-4">
				<div className="absolute inset-0">
					<img src={backgroundImageUrl} alt="Background" className="w-full h-full object-cover" />
					<div className="absolute inset-0 bg-black/30" />
					<div className="absolute inset-0 bg-gradient-to-br from-gray-900/40 via-black/40 to-gray-800/40" />
				</div>
				<div className="relative w-full max-w-sm z-10">{children}</div>
			</div>
		);

	if (success) {
		return shell(
			<div className="bg-white/85 dark:bg-gray-900/85 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-6">
				<div className="text-center space-y-6">
					<div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center shadow-lg">
						<CheckCircle className="w-10 h-10 text-white" />
					</div>
					<div>
						<h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
							{t("auth.checkYourEmail")}
						</h2>
						<p className="text-gray-600 dark:text-gray-400 mb-2">
							{t("auth.sentResetInstructions")}
						</p>
						<p className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-all">{formData.email}</p>
					</div>

					<div className="bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-sm border border-blue-200 dark:border-blue-700 rounded-xl p-4">
						<p className="text-sm text-blue-800 dark:text-blue-200">
							<strong>{t("auth.note")}:</strong> {t("auth.checkSpamFolder")}
						</p>
					</div>

					<RouterLink
						to="/login"
						className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-gray-700 to-black dark:from-gray-200 dark:to-gray-100 hover:from-gray-800 hover:to-gray-900 dark:hover:from-gray-300 dark:hover:to-gray-200 text-white dark:text-gray-900 font-semibold rounded-xl transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg"
					>
						<ArrowLeft className="w-4 h-4" />
						{t("auth.backToLogin")}
					</RouterLink>
				</div>
			</div>
		);
	}

	const headerContent = (
		<div className="text-center mb-6">
			{/* Logo */}
			<div className="flex justify-center mb-4">
				<h1 className="text-2xl font-bold tracking-tight">
					{appName}
				</h1>
			</div>

			<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t("auth.forgotPasswordTitle")}</h1>
			<p className="text-gray-600 dark:text-gray-400 mb-4">{t("auth.forgotPasswordDescription")}</p>

			{/* Security Badge */}
			<div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
				<div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
				{t("auth.secureResetProcess")}
			</div>
		</div>
	);

	const footerContent = (
		<div className="mt-6 space-y-4">
			<div className="text-center">
				<RouterLink
					to="/login"
					className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-200"
				>
					<ArrowLeft className="w-4 h-4" />
					{t("auth.backToLogin")}
				</RouterLink>
			</div>

			<div className="pt-4 border-t border-gray-200 dark:border-gray-700">
				<p className="text-xs text-center text-gray-500 dark:text-gray-400">
					{t("auth.dontHaveAccount")}{" "}
					<RouterLink to="/register" className="font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
						{t("auth.signUpNow")}
					</RouterLink>
				</p>
			</div>
		</div>
	);

	return shell(
		<div className="bg-white/85 dark:bg-gray-900/85 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-6">
			<UniversalForm
				isOpen={true}
				onClose={() => {}}
				title=""
				sections={sections}
				values={formData as Record<string, FormDataConvertible>}
				onChange={handleFieldChange}
				onSubmit={handleSubmit}
				submitText={t("auth.sendResetInstructions")}
				loading={isLoading}
				errors={error ? { email: error } : {}}
				inline={true}
				showCloseButton={false}
				maxWidth="sm"
				headerContent={headerContent}
				footerContent={footerContent}
			/>
		</div>
	);
};
