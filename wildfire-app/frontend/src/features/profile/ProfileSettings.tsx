import React, { useCallback, useState, useEffect } from "react";
import {
	User,
	CheckCircle,
	Loader2,
	AlertCircle,
	Mail,
	Save,
	Lock,
	Eye,
	EyeOff,
	Check,
	X,
	KeyRound
} from "lucide-react";
import { getProfile, updateProfile, changePassword, type ProfileData } from "@/services/profileService";
import { cn } from "@/lib/utils";
import { passwordRules } from "@/configuration/formConfigurations";
import { useTranslation } from "@/i18n";
import type { User as AuthUser } from "@/types/user";
import { AccessCapabilitiesCard } from "@/features/admin-dashboard/components/AccessCapabilitiesCard";
import { SettingsSection } from "@/features/settings/SettingsSection";
import { YourAreas, YourPeriods } from "@/features/area-access";

const INPUT_CLASS =
	"w-full px-4 py-2.5 bg-muted border rounded-xl text-sm text-foreground placeholder-muted-foreground hover:border-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-150";

// server error text
const apiError = (err: unknown, fallback: string) =>
	(err as { response?: { data?: { error?: string } } } | null)?.response?.data?.error || fallback;

// success or error
const StatusMessage = ({ tone, children }: { tone: "success" | "error"; children: React.ReactNode }) => {
	const ok = tone === "success";
	const Icon = ok ? CheckCircle : AlertCircle;
	return (
		<div
			role={ok ? "status" : "alert"}
			className={cn(
				"md-fade-in flex items-center gap-3 rounded-xl border p-3",
				ok
					? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
					: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
			)}
		>
			<Icon className={cn("h-4 w-4 flex-shrink-0", ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")} />
			<p className={cn("text-sm", ok ? "font-medium text-emerald-800 dark:text-emerald-200" : "text-red-700 dark:text-red-300")}>{children}</p>
		</div>
	);
};

interface PasswordFieldProps {
	label: string;
	value: string;
	placeholder: string;
	error?: string;
	onChange: (value: string) => void;
	children?: React.ReactNode;
}

// password with toggle
const PasswordField = ({ label, value, placeholder, error, onChange, children }: PasswordFieldProps) => {
	const [visible, setVisible] = useState(false);
	return (
		<div>
			<label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
				<Lock className="w-4 h-4 text-muted-foreground" />
				{label}
			</label>
			<div className="relative">
				<input
					type={visible ? "text" : "password"}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					autoComplete="new-password"
					className={cn(INPUT_CLASS, "pr-11", error ? "border-red-400 dark:border-red-600" : "border-border")}
				/>
				<button
					type="button"
					onClick={() => setVisible((v) => !v)}
					className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground transition-colors duration-150 hover:text-foreground active:scale-95"
					tabIndex={-1}
				>
					{visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
				</button>
			</div>
			{error && <p className="md-fade-in text-xs text-red-600 dark:text-red-400 mt-1.5">{error}</p>}
			{children}
		</div>
	);
};

interface ProfileSettingsProps {
	/** which part */
	section?: "profile" | "security";
}

// profile and password
const ProfileSettings: React.FC<ProfileSettingsProps> = ({ section = "profile" }) => {
	const { t } = useTranslation();
	const [formData, setFormData] = useState<ProfileData>({
		name: "",
		email: "",
		access_level: "",
	});
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);

	const loadProfile = useCallback(async () => {
		try {
			const profile = await getProfile();
			if (profile) {
				setFormData(profile);
			}
		} catch (err: unknown) {
			setError(apiError(err, t('profile.notifications.failedToLoad')));
		} finally {
			setIsLoading(false);
		}
	}, [t]);

	useEffect(() => {
		loadProfile();
	}, [loadProfile]);

	const handleChange = (field: keyof ProfileData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		setError("");
		setSuccess(false);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSuccess(false);
		setIsSaving(true);

		try {
			const payload = {
				name: formData.name,
			};

			const success = await updateProfile(payload);

			if (success) {
				setSuccess(true);
				setTimeout(() => setSuccess(false), 3000);
			}
		} catch (err: unknown) {
			setError(apiError(err, t('profile.notifications.failedToUpdate')));
		} finally {
			setIsSaving(false);
		}
	};

	// change password
	const [pwData, setPwData] = useState({
		new_password: "",
		new_password_confirmation: "",
	});
	const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
	const [pwError, setPwError] = useState("");
	const [pwSuccess, setPwSuccess] = useState(false);
	const [isChangingPw, setIsChangingPw] = useState(false);

	const passwordRequirements = passwordRules(t);

	const handlePwChange = (field: keyof typeof pwData, value: string) => {
		setPwData((prev) => ({ ...prev, [field]: value }));
		// clear field error
		setPwErrors((prev) => {
			const next = { ...prev };
			delete next[field];
			return next;
		});
		setPwError("");
		setPwSuccess(false);
	};

	const handlePwSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setPwError("");
		setPwErrors({});
		setPwSuccess(false);

		// client-side check
		const errs: Record<string, string> = {};
		if (!passwordRequirements.every((r) => r.test(pwData.new_password))) {
			errs.new_password = t("profile.password.requirementsNotMet", "Password does not meet all requirements");
		}
		if (pwData.new_password !== pwData.new_password_confirmation) {
			errs.new_password_confirmation = t("profile.password.mismatch", "Passwords do not match");
		}
		if (Object.keys(errs).length > 0) {
			setPwErrors(errs);
			return;
		}

		setIsChangingPw(true);
		try {
			await changePassword(pwData);
			setPwSuccess(true);
			// clear on success
			setPwData({ new_password: "", new_password_confirmation: "" });
			setTimeout(() => setPwSuccess(false), 3000);
		} catch (err: unknown) {
			const fieldErrors = (err as { response?: { data?: { errors?: Record<string, string> } } }).response?.data?.errors;
			if (fieldErrors && typeof fieldErrors === "object") {
				setPwErrors(fieldErrors);
			} else {
				setPwError(apiError(err, t("profile.password.failed", "Failed to change password. Please try again.")));
			}
		} finally {
			setIsChangingPw(false);
		}
	};


	if (isLoading) {
		return (
			<div className="space-y-4" aria-busy="true">
				<p className="sr-only">{t('profile.loadingProfile')}</p>
				{[0, 1].map((card) => (
					<div key={card} className="md-card space-y-4 p-6">
						<div className="md-skeleton h-4 w-40 rounded-md bg-muted" style={{ animationDelay: `${card * 120}ms` }} />
						<div className="md-skeleton h-10 w-full rounded-xl bg-muted" style={{ animationDelay: `${card * 120 + 60}ms` }} />
					</div>
				))}
			</div>
		);
	}


	return section === "security" ? (
		<SettingsSection
			title={t('profile.password.title', 'Change Password')}
			description={t('profile.password.description', 'Update the password you use to sign in')}
		>
			{/* change password */}
			<form onSubmit={handlePwSubmit} className="max-w-xl">
				<div className="space-y-5">
					{pwSuccess && <StatusMessage tone="success">{t('profile.password.updated', 'Password changed successfully!')}</StatusMessage>}
					{pwError && <StatusMessage tone="error">{pwError}</StatusMessage>}

					<PasswordField
						label={t('profile.password.new', 'New Password')}
						value={pwData.new_password}
						placeholder={t('profile.password.newPlaceholder', 'Enter a new password')}
						error={pwErrors.new_password}
						onChange={(v) => handlePwChange('new_password', v)}
					>
						{/* password rules */}
						{pwData.new_password.length > 0 && (
							<div className="md-fade-in mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 p-3 bg-muted rounded-lg border border-border">
								{passwordRequirements.map((req, index) => {
									const met = req.test(pwData.new_password);
									return (
										<div
											key={req.label}
											style={{ animationDelay: `${Math.min(index * 30, 240)}ms` }}
											className="md-row-in flex items-center gap-2 text-xs"
										>
											{met ? (
												<Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
											) : (
												<X className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
											)}
											<span className={`transition-colors duration-150 ${met ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}`}>
												{req.label}
											</span>
										</div>
									);
								})}
							</div>
						)}
					</PasswordField>

					<PasswordField
						label={t('profile.password.confirm', 'Confirm New Password')}
						value={pwData.new_password_confirmation}
						placeholder={t('profile.password.confirmPlaceholder', 'Re-enter your new password')}
						error={pwErrors.new_password_confirmation}
						onChange={(v) => handlePwChange('new_password_confirmation', v)}
					/>
				</div>

				{/* form footer */}
				<div className="flex items-center pt-5">
					<button
						type="submit"
						disabled={isChangingPw}
						className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm disabled:active:scale-100"
					>
						{isChangingPw ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								{t('profile.password.updating', 'Updating...')}
							</>
						) : (
							<>
								<KeyRound className="w-4 h-4" />
								{t('profile.password.submit', 'Update Password')}
							</>
						)}
					</button>
				</div>
			</form>
		</SettingsSection>
	) : (
		<div>
			{/* save messages */}
			{(success || error) && (
				<div className="mb-4">
					{success && <StatusMessage tone="success">{t('profile.notifications.updated')}</StatusMessage>}
					{error && <StatusMessage tone="error">{error}</StatusMessage>}
				</div>
			)}

			<div className="space-y-10">
			<SettingsSection title={t('profile.personalInfo')} description={t('profile.personalInfoDescription')}>
				<form onSubmit={handleSubmit} className="max-w-xl">
						<div className="space-y-5">
							{/* name field */}
							<div>
								<label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
									<User className="w-4 h-4 text-muted-foreground" />
									{t('profile.fields.fullName')}
								</label>
								<input
									type="text"
									value={formData.name}
									onChange={(e) => handleChange('name', e.target.value)}
									placeholder={t('profile.placeholders.fullName')}
									className={cn(INPUT_CLASS, "border-border")}
								/>
							</div>

							{/* email read-only */}
							<div>
								<label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
									<Mail className="w-4 h-4 text-muted-foreground" />
									{t('profile.fields.email')}
									<span className="text-xs text-muted-foreground font-normal">({t('profile.readOnly')})</span>
								</label>
								<input
									type="email"
									value={formData.email}
									disabled
									className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-muted-foreground cursor-not-allowed"
								/>
							</div>

						</div>

						{/* form footer */}
						<div className="flex items-center gap-3 pt-5">
							<button
								type="submit"
								disabled={isSaving}
								className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm disabled:active:scale-100"
							>
								{isSaving ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin" />
										{t('profile.saving')}
									</>
								) : (
									<>
										<Save className="w-4 h-4" />
										{t('profile.saveChanges')}
									</>
								)}
							</button>
							<button
								type="button"
								onClick={loadProfile}
								className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-xl transition-all duration-150 active:scale-[0.98]"
							>
								{t('common.reset')}
							</button>
						</div>
					</form>
			</SettingsSection>

			{/* what level allows */}
			{formData.access_level && (
				<SettingsSection
					title={t('adminDashboard.accessPermissions.title')}
					description={t('adminDashboard.access.subtitle', 'What your access level allows')}
				>
					<AccessCapabilitiesCard accessLevel={formData.access_level as AuthUser["access_level"]} />
					<YourAreas />
					<YourPeriods />
				</SettingsSection>
			)}
			</div>
		</div>
	);
};

export default ProfileSettings;
