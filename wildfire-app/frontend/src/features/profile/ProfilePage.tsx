import React, { useCallback, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
	User,
	Shield,
	CheckCircle,
	Loader2,
	AlertCircle,
	Mail,
	Save,
	Camera,
	ArrowLeft,
	Lock,
	Eye,
	EyeOff,
	Check,
	X,
	KeyRound
} from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { getProfile, updateProfile, changePassword, type ProfileData } from "@/services/profileService";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@spatialhub/ui";
import { useTranslation } from "@/i18n";


const ProfilePage: React.FC = () => {
	const { t } = useTranslation();
	useDocumentTitle(t('profile.title'));
	const navigate = useNavigate();
	const location = useLocation();
	
	// Came from admin?
	const cameFromAdmin = location.state?.from === 'admin' || document.referrer.includes('admin-dashboard');
	
	const handleBack = () => {
		if (cameFromAdmin) {
			navigate('/app/admin-dashboard');
		} else {
			navigate(-1);
		}
	};
	
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
			let message = t('profile.notifications.failedToLoad');
			if (typeof err === 'object' && err !== null) {
				const maybeAxios = err as { response?: { data?: { error?: string } } };
				message = maybeAxios.response?.data?.error || message;
			}
			setError(message);
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
			let message = t('profile.notifications.failedToUpdate');
			if (typeof err === 'object' && err !== null) {
				const maybeAxios = err as { response?: { data?: { error?: string } } };
				message = maybeAxios.response?.data?.error || message;
			}
			setError(message);
		} finally {
			setIsSaving(false);
		}
	};

	// --- Change Password ---
	const [pwData, setPwData] = useState({
		new_password: "",
		new_password_confirmation: "",
	});
	const [pwVisible, setPwVisible] = useState({ new: false, confirm: false });
	const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
	const [pwError, setPwError] = useState("");
	const [pwSuccess, setPwSuccess] = useState(false);
	const [isChangingPw, setIsChangingPw] = useState(false);

	const passwordRequirements = [
		{ key: "minChars", test: (v: string) => v.length >= 8 },
		{ key: "uppercase", test: (v: string) => /[A-Z]/.test(v) },
		{ key: "lowercase", test: (v: string) => /[a-z]/.test(v) },
		{ key: "number", test: (v: string) => /\d/.test(v) },
		{ key: "specialChar", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
	];

	const handlePwChange = (field: keyof typeof pwData, value: string) => {
		setPwData((prev) => ({ ...prev, [field]: value }));
		// Clear field error.
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

		// Client-side check.
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
			// Clear on success.
			setPwData({ new_password: "", new_password_confirmation: "" });
			setTimeout(() => setPwSuccess(false), 3000);
		} catch (err: unknown) {
			const maybe = err as { response?: { data?: { errors?: Record<string, string>; error?: string } } };
			const fieldErrors = maybe.response?.data?.errors;
			if (fieldErrors && typeof fieldErrors === "object") {
				setPwErrors(fieldErrors);
			} else {
				setPwError(maybe.response?.data?.error || t("profile.password.failed", "Failed to change password. Please try again."));
			}
		} finally {
			setIsChangingPw(false);
		}
	};

	const getAccessLevelConfig = (level: string) => {
		const configs = {
			very_low: { 
				label: t('profile.accessLevels.basic'), 
				color: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600",
				description: t('profile.accessLevels.basicDescription')
			},
			intermediate: { 
				label: t('profile.accessLevels.intermediate'), 
				color: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700",
				description: t('profile.accessLevels.intermediateDescription')
			},
			expert: { 
				label: t('profile.accessLevels.expert'), 
				color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700",
				description: t('profile.accessLevels.expertDescription')
			},
		};
		return configs[level as keyof typeof configs] || configs.very_low;
	};

	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map(n => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2) || 'U';
	};

	if (isLoading) {
		return (
			<div className="md-scope max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 min-h-screen bg-background text-foreground">
				<div className="mb-6 flex items-center gap-3">
					<div className="md-skeleton h-9 w-9 rounded-lg bg-muted" />
					<div className="space-y-2">
						<div className="md-skeleton h-5 w-40 rounded-md bg-muted" />
						<div className="md-skeleton h-3 w-64 rounded-md bg-muted" style={{ animationDelay: "90ms" }} />
					</div>
				</div>
				<p className="sr-only">{t('profile.loadingProfile')}</p>
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-1">
						<div className="rounded-2xl border border-border bg-card p-6 space-y-3">
							<div className="md-skeleton mx-auto h-20 w-20 rounded-full bg-muted" />
							<div className="md-skeleton mx-auto h-4 w-32 rounded-md bg-muted" style={{ animationDelay: "90ms" }} />
							<div className="md-skeleton mx-auto h-3 w-40 rounded-md bg-muted" style={{ animationDelay: "180ms" }} />
						</div>
					</div>
					<div className="lg:col-span-2 space-y-6">
						{[0, 1].map((card) => (
							<div key={card} className="rounded-2xl border border-border bg-card p-6 space-y-4">
								<div className="md-skeleton h-4 w-40 rounded-md bg-muted" style={{ animationDelay: `${card * 120}ms` }} />
								{[0, 1].map((field) => (
									<div key={field} className="space-y-2">
										<div className="md-skeleton h-3 w-24 rounded-md bg-muted" style={{ animationDelay: `${card * 120 + field * 90}ms` }} />
										<div className="md-skeleton h-10 w-full rounded-xl bg-muted" style={{ animationDelay: `${card * 120 + field * 90 + 45}ms` }} />
									</div>
								))}
							</div>
						))}
					</div>
				</div>
			</div>
		);
	}

	const accessConfig = getAccessLevelConfig(formData.access_level);

	return (
		<div className="md-scope max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 min-h-screen bg-background text-foreground">
			{/* Page Header */}
			<div className="md-rise mb-6">
				<div className="flex items-center gap-3 mb-1">
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={handleBack}
								className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-all duration-200 hover:scale-105 active:scale-95"
							>
								<ArrowLeft className="w-4 h-4" />
							</button>
						</TooltipTrigger>
						<TooltipContent side="left">{t('profile.goBack')}</TooltipContent>
					</Tooltip>
					<div>
						<h1 className="text-2xl font-bold text-foreground">{t('profile.title')}</h1>
						<p className="text-sm text-muted-foreground">
							{t('profile.subtitle')}
						</p>
					</div>
				</div>
			</div>

			{/* Notifications */}
			{success && (
				<div className="md-rise mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
					<div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
						<CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
					</div>
					<p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">{t('profile.notifications.updated')}</p>
				</div>
			)}

			{error && (
				<div className="md-rise mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
					<div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
						<AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
					</div>
					<p className="text-sm text-red-700 dark:text-red-300">{error}</p>
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Profile card. */}
				<div className="lg:col-span-1">
					<div className="md-rise bg-card text-card-foreground rounded-2xl border border-border overflow-hidden shadow-sm transition-shadow duration-300 hover:shadow-md" style={{ animationDelay: "60ms" }}>
						{/* Profile Header */}
						<div className="bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-900 dark:to-black p-6 text-center relative">
							<div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
							<div className="relative">
								<div className="w-20 h-20 mx-auto mb-3 relative group">
									<div className="w-full h-full rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center text-2xl font-bold text-white transition-transform duration-200 group-hover:scale-105">
										{getInitials(formData.name)}
									</div>
									<button className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center active:scale-95">
										<Camera className="w-5 h-5 text-white" />
									</button>
								</div>
								<h2 className="text-lg font-semibold text-white truncate">{formData.name || t('profile.defaultUser')}</h2>
								<p className="text-gray-300 text-sm truncate">{formData.email}</p>
							</div>
						</div>

						<div className="p-4 border-b border-border">
							<div className="flex items-center justify-between">
								<span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('profile.accessLevel')}</span>
								<span className={cn(
									"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
									accessConfig.color
								)}>
									<Shield className="w-3 h-3" />
									{accessConfig.label}
								</span>
							</div>
							<p className="text-xs text-muted-foreground mt-2">{accessConfig.description}</p>
						</div>
					</div>
				</div>

				{/* Edit form. */}
				<div className="lg:col-span-2 space-y-6">
					<form onSubmit={handleSubmit} className="md-rise bg-card text-card-foreground rounded-2xl border border-border shadow-sm overflow-hidden transition-shadow duration-300 hover:shadow-md" style={{ animationDelay: "120ms" }}>
						<div className="px-6 py-4 border-b border-border">
							<h3 className="text-base font-semibold text-foreground">{t('profile.personalInfo')}</h3>
							<p className="text-xs text-muted-foreground mt-0.5">{t('profile.personalInfoDescription')}</p>
						</div>

						<div className="p-6 space-y-5">
							{/* Name Field */}
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
									className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground placeholder-muted-foreground hover:border-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-150"
								/>
							</div>

							{/* Email Field (Read-only) */}
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

						{/* Form Footer */}
						<div className="px-6 py-4 bg-muted/50 border-t border-border flex items-center justify-end gap-3">
							<button
								type="button"
								onClick={loadProfile}
								className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-xl transition-all duration-150 active:scale-[0.98]"
							>
								{t('common.reset')}
							</button>
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
						</div>
					</form>

					{/* Change Password */}
					<form onSubmit={handlePwSubmit} className="md-rise bg-card text-card-foreground rounded-2xl border border-border shadow-sm overflow-hidden transition-shadow duration-300 hover:shadow-md" style={{ animationDelay: "180ms" }}>
						<div className="px-6 py-4 border-b border-border">
							<h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
								<KeyRound className="w-4 h-4 text-muted-foreground" />
								{t('profile.password.title', 'Change Password')}
							</h3>
							<p className="text-xs text-muted-foreground mt-0.5">{t('profile.password.description', 'Update the password you use to sign in')}</p>
						</div>

						<div className="p-6 space-y-5">
							{pwSuccess && (
								<div className="md-fade-in p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
									<CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
									<p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">{t('profile.password.updated', 'Password changed successfully!')}</p>
								</div>
							)}
							{pwError && (
								<div className="md-fade-in p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
									<AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
									<p className="text-sm text-red-700 dark:text-red-300">{pwError}</p>
								</div>
							)}

							{/* New Password */}
							<div>
								<label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
									<Lock className="w-4 h-4 text-muted-foreground" />
									{t('profile.password.new', 'New Password')}
								</label>
								<div className="relative">
									<input
										type={pwVisible.new ? 'text' : 'password'}
										value={pwData.new_password}
										onChange={(e) => handlePwChange('new_password', e.target.value)}
										placeholder={t('profile.password.newPlaceholder', 'Enter a new password')}
										autoComplete="new-password"
										className={cn(
											"w-full px-4 py-2.5 pr-11 bg-muted border rounded-xl text-sm text-foreground placeholder-muted-foreground hover:border-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-150",
											pwErrors.new_password ? "border-red-400 dark:border-red-600" : "border-border"
										)}
									/>
									<button
										type="button"
										onClick={() => setPwVisible((p) => ({ ...p, new: !p.new }))}
										className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground transition-colors duration-150 hover:text-foreground active:scale-95"
										tabIndex={-1}
									>
										{pwVisible.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
									</button>
								</div>
								{pwErrors.new_password && <p className="md-fade-in text-xs text-red-600 dark:text-red-400 mt-1.5">{pwErrors.new_password}</p>}

								{/* Requirements checklist. */}
								{pwData.new_password.length > 0 && (
									<div className="md-fade-in mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 p-3 bg-muted rounded-lg border border-border">
										{passwordRequirements.map((req, index) => {
											const met = req.test(pwData.new_password);
											return (
												<div
													key={req.key}
													style={{ animationDelay: `${Math.min(index * 30, 240)}ms` }}
													className="md-row-in flex items-center gap-2 text-xs"
												>
													{met ? (
														<Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
													) : (
														<X className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
													)}
													<span className={`transition-colors duration-150 ${met ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}`}>
														{t(`profile.password.requirements.${req.key}`)}
													</span>
												</div>
											);
										})}
									</div>
								)}
							</div>

							{/* Confirm New Password */}
							<div>
								<label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
									<Lock className="w-4 h-4 text-muted-foreground" />
									{t('profile.password.confirm', 'Confirm New Password')}
								</label>
								<div className="relative">
									<input
										type={pwVisible.confirm ? 'text' : 'password'}
										value={pwData.new_password_confirmation}
										onChange={(e) => handlePwChange('new_password_confirmation', e.target.value)}
										placeholder={t('profile.password.confirmPlaceholder', 'Re-enter your new password')}
										autoComplete="new-password"
										className={cn(
											"w-full px-4 py-2.5 pr-11 bg-muted border rounded-xl text-sm text-foreground placeholder-muted-foreground hover:border-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-150",
											pwErrors.new_password_confirmation ? "border-red-400 dark:border-red-600" : "border-border"
										)}
									/>
									<button
										type="button"
										onClick={() => setPwVisible((p) => ({ ...p, confirm: !p.confirm }))}
										className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground transition-colors duration-150 hover:text-foreground active:scale-95"
										tabIndex={-1}
									>
										{pwVisible.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
									</button>
								</div>
								{pwErrors.new_password_confirmation && <p className="md-fade-in text-xs text-red-600 dark:text-red-400 mt-1.5">{pwErrors.new_password_confirmation}</p>}
							</div>
						</div>

						{/* Footer */}
						<div className="px-6 py-4 bg-muted/50 border-t border-border flex items-center justify-end">
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
				</div>
			</div>
		</div>
	);
};

export default ProfilePage;
