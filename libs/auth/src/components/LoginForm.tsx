import { useEffect, useState } from "react";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { UniversalForm, type FormSection } from "@spatialhub/forms";
import { useTranslation } from "@spatialhub/i18n";

export interface LoginFormProps {
  /** Called when setting document title */
  onDocumentTitle?: (title: string) => void;
  /** Auth store init function */
  onAuthInit?: (data: { user: unknown; token: null; sessionTimeout?: number }) => Promise<void>;
  /** Refresh user function */
  onRefreshUser?: () => Promise<void>;
  /** Ensure CSRF token function */
  onEnsureCSRF?: () => Promise<void>;
  /** Form sections configuration */
  formSections?: FormSection[];
  /** API base URL */
  apiBaseUrl?: string;
  /** App name to display */
  appName?: React.ReactNode;
  /** Background image URL (centered layout only) */
  backgroundImageUrl?: string;
  /** Namespace for per-app local storage keys (e.g. "enerplanet", "storcito", "wildfire") */
  storageNamespace?: string;
  /**
   * Page layout:
   *  - "centered" (default): the form card floats over a full-bleed background image.
   *  - "split": a two-column screen with `sideContent` on the left and the form on the right.
   */
  layout?: "centered" | "split";
  /** Content rendered in the left column when `layout="split"` (e.g. branded imagery). */
  sideContent?: React.ReactNode;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onDocumentTitle,
  onAuthInit,
  onRefreshUser,
  onEnsureCSRF,
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
  storageNamespace = "app",
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
          label: t("auth.email"),
          type: "email",
          placeholder: t("auth.enterYourEmail"),
          required: true,
          icon: Mail,
        },
        {
          key: "password",
          label: t("auth.password"),
          type: "password",
          placeholder: t("auth.enterYourPassword"),
          required: true,
          icon: Lock,
          showPasswordToggle: true,
        },
        {
          key: "rememberEmail",
          label: t("auth.rememberMe"),
          type: "checkbox",
          required: false,
        },
      ],
    },
  ];

  const sections = formSections || defaultFormSections;

  useEffect(() => {
    onDocumentTitle?.(t("auth.signIn"));
  }, [onDocumentTitle, t]);

  const navigate = useNavigate();
  const [emailNotVerifiedError, setEmailNotVerifiedError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Load remembered email from localStorage (namespaced per app/brand)
  const REMEMBER_EMAIL_KEY = `${storageNamespace}_remembered_email`;
  const [values, setValues] = useState<{ email: string; password: string; rememberEmail: boolean }>(
    () => {
      const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
      return {
        email: savedEmail || "",
        password: "",
        rememberEmail: !!savedEmail,
      };
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const CONTENT_TYPE_JSON = "application/json";

  const onSubmit = async () => {
    setEmailNotVerifiedError(null);
    setResendSuccess(false);
    setLoginError(null);

    setIsLoading(true);
    setErrors({});
    try {
      const resp = await fetch(`${apiBaseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": CONTENT_TYPE_JSON },
        credentials: "include",
        body: JSON.stringify(values),
      });
      const response = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const errorMsg = response?.error || response?.message || "";
        const errorMsgLower = errorMsg.toLowerCase();

        const isEmailVerificationError =
          resp.status === 403 &&
          (errorMsgLower.includes("verify") || errorMsgLower.includes("email"));

        const isDisabledAccountError =
          resp.status === 403 &&
          (errorMsgLower.includes("disabled") ||
            errorMsgLower.includes("account has been disabled"));

        if (isEmailVerificationError) {
          setEmailNotVerifiedError(
            errorMsg ||
              "Please verify your email address before signing in. Check your inbox for the verification email."
          );
        } else if (isDisabledAccountError) {
          setLoginError(
            errorMsg ||
              "Your account has been disabled. Please contact an administrator for assistance."
          );
        } else {
          const fullErrorMsg = errorMsg
            ? `${errorMsg}. Please check your credentials and try again.`
            : "Invalid email or password. Please check your credentials and try again.";
          setLoginError(fullErrorMsg);
        }
        return;
      }

      if (onAuthInit) {
        await onAuthInit({
          user: response.user || response.data?.user,
          token: null,
          sessionTimeout:
            response.session?.timeout_minutes || response.data?.session?.timeout_minutes,
        });
      }

      // Save or clear remembered email based on checkbox
      if (values.rememberEmail) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, values.email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      if (onRefreshUser) {
        await onRefreshUser();
      }
      if (onEnsureCSRF) {
        await onEnsureCSRF();
      }
      navigate("/", { replace: true });
    } catch {
      setLoginError("Sign in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!values.email) {
      return;
    }

    setResendingEmail(true);
    setResendSuccess(false);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/resend-verification`, {
        method: "POST",
        headers: {
          "Content-Type": CONTENT_TYPE_JSON,
        },
        body: JSON.stringify({ email: values.email }),
        credentials: "include",
      });

      if (response.ok) {
        setResendSuccess(true);
        setEmailNotVerifiedError(null);
      }
    } catch {
      // Silently fail
    } finally {
      setResendingEmail(false);
    }
  };

  const [isVisible, setIsVisible] = useState(true);

  const ALERT_ANIMATION_CLASS = `transform transition-all duration-300 ${isVisible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}`;

  const handleCloseWithFade = () => {
    setIsVisible(false);
    setTimeout(() => navigate("/", { replace: true }), 400);
  };

  const isSplit = layout === "split";

  // Alert container classes adapt to the surface: translucent-on-dark for the
  // centered layout (over an image), solid panels for the light split column.
  const alertCls = (tone: "error" | "success" | "warning") => {
    const split = {
      error:
        "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-200 shadow-sm",
      success:
        "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-200 shadow-sm",
      warning:
        "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 shadow-sm",
    };
    const centered = {
      error: "bg-red-500/10 backdrop-blur-xl border-red-500/20 text-red-100 shadow-lg",
      success: "bg-green-500/10 backdrop-blur-xl border-green-500/20 text-green-100 shadow-lg",
      warning: "bg-amber-500/10 backdrop-blur-xl border-amber-500/20 text-amber-100 shadow-lg",
    };
    return `flex items-start gap-3 p-4 rounded-xl text-sm border ${(isSplit ? split : centered)[tone]}`;
  };

  const alerts = (
    <>
      {loginError && (
        <div className={ALERT_ANIMATION_CLASS}>
          <div className={alertCls("error")}>
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Lock className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{t("auth.loginFailed")}</p>
              <p className="opacity-80 text-xs mt-0.5">{loginError}</p>
            </div>
          </div>
        </div>
      )}

      {resendSuccess && (
        <div className={ALERT_ANIMATION_CLASS}>
          <div className={alertCls("success")}>
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Mail className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{t("auth.verificationEmailSent")}</p>
              <p className="opacity-80 text-xs mt-0.5">{t("auth.checkInboxVerify")}</p>
            </div>
          </div>
        </div>
      )}

      {emailNotVerifiedError && (
        <div className={ALERT_ANIMATION_CLASS}>
          <div className={alertCls("warning")}>
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Mail className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{t("auth.emailVerificationRequired")}</p>
              <p className="opacity-80 text-xs mt-0.5">{emailNotVerifiedError}</p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendingEmail}
                className="mt-2 text-xs font-medium underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:opacity-80"
              >
                {resendingEmail ? t("auth.sending") : t("auth.resendVerificationEmail")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const card = (
    <div
      className={`transform transition-all duration-500 ease-out ${isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95"}`}
    >
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
        {/* Header section with gradient */}
        <div className="relative px-8 pt-6 pb-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-200/50 to-transparent dark:from-gray-700/30 rounded-bl-full" />
          <div className="relative flex flex-col items-center gap-2">
            <div className="relative">
              <h1 className="text-xl font-bold tracking-tight">{appName}</h1>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t("auth.welcomeBack")}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t("auth.signInToContinue")}
              </p>
            </div>
          </div>
        </div>

        {/* Form section */}
        <div className="px-8 py-8">
          <UniversalForm
            isOpen={true}
            inline={true}
            showCloseButton={false}
            onClose={handleCloseWithFade}
            sections={sections}
            values={values}
            onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
            onSubmit={onSubmit}
            submitText={
              <span className="flex items-center justify-center gap-2">
                {isLoading ? t("auth.signingIn") : t("auth.signIn")}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </span>
            }
            loading={isLoading}
            errors={errors}
            variant="default"
            maxWidth="sm"
          />
        </div>

        {/* Footer section */}
        <div className="px-8 pb-8 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white dark:bg-gray-900 text-gray-400">{t("auth.or")}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-center">
            <RouterLink
              to="/register"
              className="group inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <span>{t("auth.dontHaveAccount")}</span>
              <span className="text-gray-900 dark:text-white font-semibold group-hover:underline underline-offset-2">
                {t("auth.signUp")}
              </span>
            </RouterLink>

            <RouterLink
              to="/forgot-password"
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              {t("auth.forgotPassword")}
            </RouterLink>
          </div>

          {/* Protected by encryption text - inside the card */}
          <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            {t("auth.protectedByEncryption")}
          </p>
        </div>
      </div>
    </div>
  );

  // ---- Split layout: branded imagery on the left, form on the right ----
  if (isSplit) {
    return (
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
        <aside className="relative hidden lg:block lg:w-1/2 xl:w-3/5 overflow-hidden">
          {sideContent}
        </aside>
        <main className="flex w-full lg:w-1/2 xl:w-2/5 items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md space-y-4">
            {alerts}
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
      <div className="absolute top-20 left-20 w-72 h-72 bg-gray-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-gray-400/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative w-full max-w-md z-10 space-y-4">
        {alerts}
        {card}
      </div>
    </div>
  );
};
