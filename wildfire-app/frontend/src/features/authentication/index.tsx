// Wrapper components that integrate @spatialhub/auth with our app's stores
import React from "react";
import {
	LoginForm as LibLoginForm,
	RegisterForm as LibRegisterForm,
	ForgotPasswordForm as LibForgotPasswordForm,
	type LoginFormProps,
	type RegisterFormProps,
	type ForgotPasswordFormProps,
} from "@spatialhub/auth";
import { useAuthStore } from "@/store/auth-store";
import { ensureCSRFToken } from "@/utils/csrf";
import { config } from "@/configuration/app";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, Flame } from "lucide-react";
import { useTranslation } from "@/i18n";

const IMG = "/images/landing-page";

// Left-hand imagery panel shown beside the login form on the split layout.
const WildfireSidePanel: React.FC = () => {
	const { t } = useTranslation();
	return (
		<div className="absolute inset-0">
			<img
				src={`${IMG}/aerial-forest-fire.webp`}
				alt=""
				aria-hidden
				className="absolute inset-0 h-full w-full object-cover"
			/>
			<div className="absolute inset-0 bg-gradient-to-br from-[#2E2D52]/90 via-[#3B3A66]/80 to-[#56557F]/70" />
			{/* Dark bottom fade for text contrast */}
			<div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-[#0b0918] via-[#0b0918]/70 to-transparent" />
			<div className="relative flex h-full flex-col justify-between p-10 xl:p-14 text-white">
				<img
					src={`${IMG}/storcito-logo-white.webp`}
					alt="Storcito"
					className="h-8 w-auto self-start shrink-0"
				/>

				<div className="max-w-lg">
					<span className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/30">
						<Flame className="h-3.5 w-3.5" /> {t("auth.sidePanel.badge")}
					</span>
					<h2 className="auth-title-3d mt-6 text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight">
						{t("auth.sidePanel.title")}
					</h2>
					<p className="mt-4 text-base text-white/80 leading-relaxed">
						{t("auth.sidePanel.subtitle")}
					</p>
				</div>

				<p className="text-[11px] text-white/55">{t("auth.sidePanel.funded")}</p>
			</div>
		</div>
	);
};

const BrandLogo = (
	<div className="flex flex-col items-center gap-1.5 mb-1">
		<img
			src="/images/logo/Logo_Storcito_Web_Imagotipo_Oscuro-1024x230.png"
			alt="Storcito"
			className="w-auto max-w-[95%] md:max-w-[600px] object-contain dark:brightness-0 dark:invert"
			style={{
				height: '36px'
			}}
		/>
		<span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
			Wildfire Assessment
		</span>
	</div>
);

// LoginForm wrapper that connects to auth store
export const LoginForm: React.FC<Partial<LoginFormProps>> = (props) => {
	const { init } = useAuthStore();
	const [searchParams] = useSearchParams();
	const isVerified = searchParams.get("verified") === "true";

	return (
		<>
			{isVerified && (
				<div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-500">
					<div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 shadow-lg text-sm text-emerald-700 dark:text-emerald-300">
						<CheckCircle className="w-4 h-4 flex-shrink-0" />
						<span>Email verified successfully! You can now log in.</span>
					</div>
				</div>
			)}
			<LibLoginForm
				onDocumentTitle={(title) => {
					document.title = title;
				}}
				onAuthInit={async (data) => {
					await init({
						user: data.user as Parameters<typeof init>[0]["user"],
						token: data.token,
						sessionTimeout: data.sessionTimeout,
					});
				}}
				onEnsureCSRF={async () => { await ensureCSRFToken(); }}
				apiBaseUrl={config.api.baseUrl || "/api"}
				appName={BrandLogo}
				backgroundImageUrl="/images/landing-page/forest-wildfire.webp"
				layout="split"
				sideContent={<WildfireSidePanel />}
				{...props}
			/>
		</>
	);
};

// RegisterForm wrapper that connects to auth store
export const RegisterForm: React.FC<Partial<RegisterFormProps>> = (props) => {
	return (
		<LibRegisterForm
			onDocumentTitle={(title) => {
				document.title = title;
			}}
			apiBaseUrl={config.api.baseUrl || "/api"}
			appName={BrandLogo}
			backgroundImageUrl="/images/landing-page/forest-wildfire.webp"
			layout="split"
			sideContent={<WildfireSidePanel />}
			{...props}
		/>
	);
};

// ForgotPasswordForm wrapper
export const ForgotPasswordForm: React.FC<Partial<ForgotPasswordFormProps>> = (props) => {
	return (
		<LibForgotPasswordForm
			onDocumentTitle={(title) => {
				document.title = title;
			}}
			apiBaseUrl={config.api.baseUrl || "/api"}
			appName={BrandLogo}
			backgroundImageUrl="/images/landing-page/forest-wildfire.webp"
			layout="split"
			sideContent={<WildfireSidePanel />}
			{...props}
		/>
	);
};
