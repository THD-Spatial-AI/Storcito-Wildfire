import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Flame,
  Map as MapIcon,
  Activity,
  Layers,
  GitCompare,
  ShieldCheck,
  Globe,
  Users,
  ArrowRight,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Languages as LanguagesIcon,
  Check,
  ChevronDown,
} from "lucide-react";
import { config } from "@/configuration/app";
import { getCSRFToken } from "@/utils/csrf";
import { PrivacyConsentDialog, PrivacyBanner } from "@/features/privacy-controls";
import { useTranslation, languages, changeLanguage, type LanguageCode } from "@/i18n";

const IMG = "/images/landing-page";

const NAV = [
  { key: "challenge", href: "#challenge" },
  { key: "platform", href: "#platform" },
  { key: "personas", href: "#personas" },
  { key: "contact", href: "#contact" },
] as const;

const STEPS = [
  { icon: MapIcon, img: `${IMG}/define-area.jpg`, key: "define" },
  { icon: Flame, img: `${IMG}/run-model.jpg`, key: "run" },
  { icon: Layers, img: `${IMG}/inspect-results.jpg`, key: "inspect" },
  { icon: GitCompare, img: `${IMG}/compare-share.jpg`, key: "compare" },
] as const;

const CAPABILITIES = [
  { icon: MapIcon, key: "mapping", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  { icon: Flame, key: "engine", color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  { icon: Activity, key: "metrics", color: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
  { icon: Layers, key: "fuel", color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  { icon: Globe, key: "multilingual", color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20" },
  { icon: ShieldCheck, key: "secure", color: "text-slate-600 bg-slate-500/10 border-slate-500/20" },
] as const;

const PERSONAS = [
  { icon: ShieldCheck, key: "planners", color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  { icon: Activity, key: "analysts", color: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
  { icon: Layers, key: "researchers", color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  { icon: Users, key: "leads", color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20" },
] as const;

const CHALLENGE_CARDS = ["hotter", "vegetation", "cascading", "tooling"] as const;

// Category select: the submitted value must be one the feedback backend accepts
// (bug | feature | improvement | general); the visible label is translated.
const CATEGORY_OPTIONS = [
  { value: "general", key: "general" },
  { value: "feature", key: "partnership" },
  { value: "bug", key: "bug" },
] as const;

type Status = "idle" | "loading" | "success" | "error";

const LanguageMenu: React.FC = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = i18n.language?.split("-")[0] || "en";
  const active = languages.find((l) => l.code === current) || languages[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = async (code: LanguageCode) => {
    await changeLanguage(code, "wildfire-app_language");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-3 py-2 ring-1 ring-white/20 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <LanguagesIcon className="h-4 w-4" />
        <span className="hidden sm:inline">{active.flag}</span>
        <span className="uppercase">{active.code}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-44 rounded-xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden py-1 z-50"
        >
          {languages.map((l) => (
            <button
              key={l.code}
              role="option"
              aria-selected={l.code === current}
              onClick={() => pick(l.code)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span>{l.flag}</span>
                <span className="font-medium">{l.nativeName}</span>
              </span>
              {l.code === current && <Check className="h-4 w-4 text-amber-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};


export const LandingPage: React.FC = () => {
  const { t } = useTranslation();


  useEffect(() => {
    document.title = "Wildfire App — Geospatial wildfire risk assessment";
  }, []);

  // Reveal-on-scroll: fade/slide elements marked with data-reveal into view once.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("lp-reveal--visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, []);

  const [form, setForm] = useState({
    name: "",
    email: "",
    category: CATEGORY_OPTIONS[0].value,
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.subject || !form.message) {
      setError(t("landing.contact.validationError"));
      return;
    }
    setStatus("loading");
    try {
      const baseUrl = config.api.baseUrl || "/api";
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("email", form.email);
      fd.append("category", form.category);
      fd.append("subject", form.subject);
      fd.append("message", form.message);
      const res = await fetch(`${baseUrl}/feedback/public`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": getCSRFToken() || "" },
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || data?.message || t("landing.contact.submitFailed"));
      }
      setStatus("success");
      setForm({ name: "", email: "", category: CATEGORY_OPTIONS[0].value, subject: "", message: "" });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : t("landing.contact.genericError"));
    }
  };

  // Cookie/data consent — reuses the app's PrivacyConsentDialog, persisted locally for guests
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("privacy_accepted");
    setConsentAccepted(stored === "true");
    if (stored === null) setConsentOpen(true);
  }, []);

  const acceptConsent = () => {
    localStorage.setItem("privacy_accepted", "true");
    setConsentAccepted(true);
    setConsentOpen(false);
    globalThis.dispatchEvent(new CustomEvent("privacy-accepted"));
  };
  const denyConsent = () => {
    localStorage.setItem("privacy_accepted", "false");
    setConsentAccepted(false);
    setConsentOpen(false);
  };

  return (
    <div ref={rootRef} className="h-screen overflow-y-auto bg-white text-slate-800 scroll-smooth">
      {/* Floating capsule nav */}
      <div className="floating-capsule-nav-container fixed top-0 left-0 right-0 z-50">
        <header className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between floating-capsule-nav">
          <a href="#top" className="flex items-center transition-transform hover:scale-[1.02]">
            <img src={`${IMG}/storcito-logo-white.webp`} alt="Storcito" className="h-7 w-auto" />
          </a>
          <nav className="hidden md:flex items-center gap-7">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="text-sm font-medium text-white/80 hover:text-white transition-all relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-amber-400 after:transition-all hover:after:w-full"
              >
                {t(`landing.nav.${n.key}`)}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <LanguageMenu />
            <Link
              to="/app/map"
              className="group inline-flex items-center gap-2 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 shadow-lg shadow-amber-500/25 transition-all btn-glow-amber"
            >
              <span className="hidden sm:inline">{t("landing.openApp")}</span>
              <span className="sm:hidden">{t("landing.nav.platform")}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </header>
      </div>

      {/* Hero Section */}
      <section id="top" className="relative overflow-hidden pt-28 pb-24 md:pt-36 md:pb-32 border-b border-white/5 bg-slate-950">
        {/* AI Background Image */}
        <div 
          className="absolute inset-0 bg-[url('/images/landing-page/hero-fire-bg.jpg')] bg-cover bg-center bg-no-repeat opacity-40 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/60 to-slate-950/90" />
        
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/20 rounded-full filter blur-[100px] animate-drift-slow-1 pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-rose-600/15 rounded-full filter blur-[120px] animate-drift-slow-2 pointer-events-none mix-blend-screen" />
        
        {/* Decorative sparks */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="spark-particle"></div>
          <div className="spark-particle"></div>
          <div className="spark-particle"></div>
          <div className="spark-particle"></div>
          <div className="spark-particle"></div>
        </div>

        <div className="relative mx-auto max-w-7xl px-5">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Text column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 text-amber-300 text-xs font-semibold px-3 py-1.5 ring-1 ring-amber-400/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <Flame className="h-3.5 w-3.5" /> {t("landing.hero.badge")}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/15 text-blue-300 text-xs font-semibold px-3 py-1.5 ring-1 ring-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                  <Globe className="h-3.5 w-3.5" /> Horizon Europe Project
                </span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.05] text-white">
                <span className="bg-gradient-to-r from-white via-amber-100 to-orange-200 bg-clip-text text-transparent block pb-2 drop-shadow-2xl">
                  {t("landing.hero.title")}
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-300/90 leading-relaxed max-w-2xl font-medium tracking-wide">
                {t("landing.hero.subtitle")}
              </p>
              
              <div className="flex flex-wrap gap-4 pt-4">
                <Link
                  to="/app/map"
                  className="group inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3.5 btn-glow-amber transition-all duration-300 hover:scale-[1.02]"
                >
                  {t("landing.hero.explore")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#challenge"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold px-6 py-3.5 ring-1 ring-white/10 backdrop-blur-md transition-all duration-300 hover:scale-[1.02]"
                >
                  {t("landing.hero.why")}
                </a>
              </div>
            </div>

            {/* Recent Simulations Panel */}
            <div className="lg:col-span-5 relative w-full flex items-center justify-center lg:justify-end">
              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/60 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)] transform hover:-translate-y-1 transition-transform duration-500 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <Activity className="w-5 h-5 text-amber-500 animate-pulse" />
                    <h3 className="font-bold tracking-tight">Recent Simulations</h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Feed</span>
                </div>

                {/* Live AI Map Preview */}
                <div className="w-full h-36 rounded-xl overflow-hidden border border-white/10 relative group">
                  <img src="/images/landing-page/live-map-preview.jpg" alt="Live Map UI" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 text-white text-[10px] font-bold flex items-center gap-1.5 tracking-wide uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Active Risk Zone
                  </div>
                </div>
                
                <div className="space-y-3">
                  {/* Model 1 */}
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5 transition-colors hover:bg-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-white text-sm font-bold">O Porriño Region</div>
                        <div className="text-[10px] text-slate-400">21 May 2026, 16:39</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Completed</div>
                      <div className="text-xs text-slate-300 font-mono mt-0.5">21s</div>
                    </div>
                  </div>

                  {/* Model 2 */}
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5 transition-colors hover:bg-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-white text-sm font-bold">Vigo Metro East</div>
                        <div className="text-[10px] text-slate-400">21 May 2026, 14:46</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Completed</div>
                      <div className="text-xs text-slate-300 font-mono mt-0.5">20s</div>
                    </div>
                  </div>

                  {/* Model 3 */}
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5 transition-colors hover:bg-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-white text-sm font-bold">Pontevedra South</div>
                        <div className="text-[10px] text-slate-400">18 May 2026, 19:11</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Completed</div>
                      <div className="text-xs text-slate-300 font-mono mt-0.5">9m 20s</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Ribbon */}
      <section className="relative z-20 -mt-10 max-w-7xl mx-auto px-5">
        <div className="rounded-3xl border border-white/10 bg-[#2E2D52]/95 backdrop-blur-md p-6 md:p-8 shadow-2xl grid grid-cols-2 lg:grid-cols-4 gap-6 items-center divide-y lg:divide-y-0 lg:divide-x divide-white/10 text-center">
          <div className="pt-2 lg:pt-0 first:pt-0">
            <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-amber-200 via-orange-400 to-rose-500 bg-clip-text text-transparent tracking-tight leading-none">Km²</div>
            <div className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mt-2">{t("landing.stats.affectedArea")}</div>
          </div>
          <div className="pt-4 lg:pt-0 lg:pl-6">
            <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-amber-200 via-orange-400 to-rose-500 bg-clip-text text-transparent tracking-tight leading-none">313</div>
            <div className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mt-2">{t("landing.stats.municipalities")}</div>
          </div>
          <div className="pt-4 lg:pt-0 lg:pl-6">
            <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-amber-200 via-orange-400 to-rose-500 bg-clip-text text-transparent tracking-tight leading-none">5-Tier</div>
            <div className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mt-2">{t("landing.stats.riskDistribution")}</div>
          </div>
          <div className="pt-4 lg:pt-0 lg:pl-6">
            <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-amber-200 via-orange-400 to-rose-500 bg-clip-text text-transparent tracking-tight leading-none">Live</div>
            <div className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mt-2">{t("landing.stats.trendAnalysis")}</div>
          </div>
        </div>
      </section>



      {/* Challenge */}
      <section id="challenge" className="py-20 md:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-5 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-amber-600">
              {t("landing.challenge.eyebrow")}
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-[#2E2D52] tracking-tight leading-tight">
              {t("landing.challenge.title")}
            </h2>
            <p className="mt-5 text-slate-600 leading-relaxed font-medium">{t("landing.challenge.p1")}</p>
            <p className="mt-4 text-slate-600 leading-relaxed font-medium">{t("landing.challenge.p2")}</p>
            
            <div className="mt-10 grid sm:grid-cols-2 gap-6">
              {CHALLENGE_CARDS.map((card, i) => (
                // Outer element owns the scroll-reveal transform; inner owns the
                // hover transform — keeping them separate so the lift works.
                <div key={card} data-reveal style={{ transitionDelay: `${i * 80}ms` }} className="lp-reveal">
                  <div className="group relative flex h-full flex-col p-6 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-2 hover:border-amber-300/70 hover:shadow-[0_16px_40px_rgba(0,0,0,0.10)]">
                    {/* Step counter badge */}
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0 transition-colors duration-300 group-hover:bg-amber-500 group-hover:text-white">
                        {i + 1}
                      </div>
                      <h3 className="font-bold text-[#2E2D52] tracking-tight text-[17px] leading-snug">
                        {t(`landing.challenge.cards.${card}.title`)}
                      </h3>
                    </div>

                    <p className="mt-3 text-[14px] text-slate-500 leading-relaxed font-medium">
                      {t(`landing.challenge.cards.${card}.text`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div data-reveal className="lp-reveal group relative px-4">
            {/* Background glowing frame blob */}
            <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500 to-rose-500 rounded-3xl blur opacity-20 group-hover:opacity-35 transition duration-1000 group-hover:duration-200" />
            
            <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-slate-200 bg-white">
              <img
                src={`${IMG}/roadside-wildfire.webp`}
                alt={t("landing.challenge.imgAlt1")}
                className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            
            <div className="lp-float hidden md:block absolute -bottom-8 -left-4 w-48 rounded-2xl shadow-2xl ring-4 ring-white overflow-hidden transition-transform duration-500 hover:scale-105">
              <img
                src={`${IMG}/firefighter-hose.webp`}
                alt={t("landing.challenge.imgAlt2")}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Platform / workflow */}
      <section
        id="platform"
        className="py-20 md:py-28 bg-[#2E2D52] text-white lp-grid-pattern border-t border-b border-white/5 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#2E2D52]/95 via-[#3B3A66]/90 to-[#56557F]/85 pointer-events-none" />
        
        <div className="relative mx-auto max-w-7xl px-5">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-amber-300">
              {t("landing.platform.eyebrow")}
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">{t("landing.platform.title")}</h2>
            <p className="mt-4 text-white/80 leading-relaxed text-base md:text-lg font-medium">{t("landing.platform.subtitle")}</p>
          </div>

          {/* Progress Connector Track */}
          <div className="relative mt-16">
            <div className="absolute top-[176px] left-[12.5%] right-[12.5%] h-[1px] bg-white/10 hidden lg:block z-0" />

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
              {STEPS.map((s, i) => (
                <div
                  key={s.key}
                  data-reveal
                  style={{ transitionDelay: `${i * 90}ms` }}
                  className="lp-reveal group flex flex-col overflow-hidden rounded-[24px] bg-[#1a1b26] border border-white/5 transition-all duration-400 hover:bg-[#1f202e] hover:-translate-y-1 shadow-2xl relative"
                >
                  {/* Image container with padding to mimic the "inset" screen look */}
                  <div className="relative h-44 p-3 pb-0">
                    <div className="w-full h-full rounded-t-[16px] overflow-hidden relative bg-[#0f111a] border border-white/5">
                      <img
                        src={s.img}
                        alt=""
                        aria-hidden
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover opacity-70 transition-all duration-700 group-hover:opacity-100 group-hover:scale-105"
                      />
                      {/* Gradient to blend the bottom edge of the image */}
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#1a1b26] to-transparent opacity-90 group-hover:from-[#1f202e] transition-colors duration-400" />
                    </div>
                  </div>
                  
                  {/* Content block */}
                  <div className="p-6 pt-8 bg-[#1a1b26] group-hover:bg-[#1f202e] transition-colors duration-400 relative flex-1 flex flex-col">
                    {/* Floating Icon */}
                    <div className="absolute -top-6 left-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f111a] border border-white/10 shadow-lg transition-all duration-300 group-hover:border-amber-500/40">
                      <s.icon className="h-5 w-5 text-amber-500" />
                    </div>

                    <div className="mb-4">
                      <span className="text-[10px] font-extrabold text-amber-500 tracking-wider uppercase bg-[#2a2015] px-2.5 py-1 rounded-full">
                        {t("landing.platform.step")} 0{i + 1}
                      </span>
                    </div>
                    <h3 className="text-[19px] font-bold text-white tracking-tight leading-snug">{t(`landing.platform.steps.${s.key}.title`)}</h3>
                    <p className="mt-3 text-[15px] text-slate-400 leading-relaxed font-medium">
                      {t(`landing.platform.steps.${s.key}.text`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            data-reveal
            className="lp-reveal group mt-16 overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-2xl relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 z-10 transition-opacity duration-300 group-hover:opacity-40" />
            <img
              src={`${IMG}/firefighting-crew.webp`}
              alt={t("landing.platform.imgAlt")}
              className="w-full max-h-[400px] object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            />
            {/* Simulation Preview Decoration */}
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-amber-500/90 text-white flex items-center justify-center shadow-2xl ring-4 ring-amber-500/30 scale-90 group-hover:scale-100 transition-transform duration-300">
                <Activity className="h-6 w-6 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20 md:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-5">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-amber-600">
              {t("landing.capabilities.eyebrow")}
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-[#2E2D52] tracking-tight leading-tight">
              {t("landing.capabilities.title")}
            </h2>
          </div>
          
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CAPABILITIES.map((c, i) => (
              <div
                key={c.key}
                data-reveal
                style={{ transitionDelay: `${(i % 3) * 90}ms` }}
                className="lp-reveal group relative p-8 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] flex flex-col"
              >
                {/* Custom badge colors */}
                <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center border transition-transform duration-500 group-hover:scale-105 ${c.color}`}>
                  <c.icon className="h-6 w-6" />
                </div>
                
                <h3 className="mt-6 text-[19px] font-bold text-[#2E2D52] tracking-tight">
                  {t(`landing.capabilities.items.${c.key}.title`)}
                </h3>
                <p className="mt-3 text-[15px] text-slate-500 leading-relaxed font-medium">
                  {t(`landing.capabilities.items.${c.key}.text`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Personas */}
      <section id="personas" className="py-20 md:py-28 bg-slate-50 border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-5">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-amber-600">
              {t("landing.personas.eyebrow")}
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-[#2E2D52] tracking-tight leading-tight">
              {t("landing.personas.title")}
            </h2>
          </div>
          
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PERSONAS.map((p, i) => (
              <div
                key={p.key}
                data-reveal
                style={{ transitionDelay: `${i * 90}ms` }}
                className="lp-reveal group relative p-8 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] flex flex-col"
              >
                {/* Specific persona icon wrapping */}
                <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center border transition-transform duration-500 group-hover:scale-105 ${p.color}`}>
                  <p.icon className="h-6 w-6" />
                </div>
                
                <h3 className="mt-6 text-[17px] font-bold text-[#2E2D52] tracking-tight leading-snug">
                  {t(`landing.personas.items.${p.key}.title`)}
                </h3>
                <p className="mt-3 text-[14px] text-slate-500 leading-relaxed font-medium">
                  {t(`landing.personas.items.${p.key}.text`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="py-20 md:py-28 bg-[#2E2D52] lp-grid-pattern text-white border-t border-white/5 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#2E2D52] to-[#3B3A66] pointer-events-none" />
        
        {/* Glow Spheres */}
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-5 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-amber-300">
              {t("landing.contact.eyebrow")}
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">{t("landing.contact.title")}</h2>
            <p className="mt-5 text-white/80 leading-relaxed text-base font-medium">{t("landing.contact.subtitle")}</p>
            <div className="mt-8 flex items-center gap-3 text-white/80">
              <Mail className="h-5 w-5 text-amber-300" />
              <span className="text-sm">{t("landing.contact.responseTime")}</span>
            </div>
          </div>

          <div className="border border-white/10 rounded-2xl bg-slate-950/40 backdrop-blur-md p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            
            {status === "success" ? (
              <div className="flex flex-col items-center text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-bounce" />
                <h3 className="mt-4 text-xl font-bold text-white">
                  {t("landing.contact.successTitle")}
                </h3>
                <p className="mt-2 text-white/80">{t("landing.contact.successText")}</p>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-6 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                >
                  {t("landing.contact.sendAnother")}
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4 relative z-10">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      {t("landing.contact.name")}
                    </label>
                    <input
                      value={form.name}
                      onChange={set("name")}
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white/10 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      {t("landing.contact.email")}
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white/10 transition-all font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    {t("landing.contact.category")}
                  </label>
                  <select
                    value={form.category}
                    onChange={set("category")}
                    className="w-full rounded-xl border border-white/10 bg-[#252445] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium cursor-pointer"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value} className="bg-[#2E2D52]">
                        {t(`landing.contact.categories.${c.key}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    {t("landing.contact.subject")}
                  </label>
                  <input
                    value={form.subject}
                    onChange={set("subject")}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white/10 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    {t("landing.contact.message")}
                  </label>
                  <textarea
                    value={form.message}
                    onChange={set("message")}
                    required
                    rows={4}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white/10 transition-all resize-y font-medium"
                  />
                </div>
                {status === "error" && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2.5 text-sm text-red-300 animate-pulse">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold px-5 py-3 btn-glow-amber transition-all cursor-pointer"
                >
                  {status === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  {status === "loading" ? t("landing.contact.sending") : t("landing.contact.send")}
                </button>
                <p className="text-xs text-slate-400 text-center font-medium">
                  {t("landing.contact.agree")}{" "}
                  <Link to="/privacy" className="underline text-amber-400 hover:text-amber-300 transition-colors">
                    {t("landing.contact.privacyPolicy")}
                  </Link>
                  .
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#4E4D75] text-white border-t border-white/5 relative z-10">
        <div className="mx-auto max-w-7xl px-5 py-14 grid md:grid-cols-3 gap-12 items-start">
          <div className="space-y-4">
            <img src={`${IMG}/storcito-logo-white.webp`} alt="Storcito" className="h-9 w-auto hover:opacity-95 transition-opacity" />
            <p className="text-sm text-white/70 max-w-xs leading-relaxed font-medium">{t("landing.footer.tagline")}</p>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            <Link to="/privacy" className="text-white/70 hover:text-white transition-colors py-0.5">
              {t("landing.footer.privacy")}
            </Link>
            <Link to="/legal" className="text-white/70 hover:text-white transition-colors py-0.5">
              {t("landing.footer.cookies")}
            </Link>
            <Link to="/impressum" className="text-white/70 hover:text-white transition-colors py-0.5">
              {t("landing.footer.impressum")}
            </Link>
            <Link to="/terms-and-conditions" className="text-white/70 hover:text-white transition-colors py-0.5">
              {t("landing.footer.terms")}
            </Link>
          </div>
          <div className="space-y-4">
            <img
              src={`${IMG}/eu-funded.webp`}
              alt={t("landing.footer.euFundedAlt")}
              className="h-12 w-auto bg-white rounded p-1 hover:scale-[1.02] transition-transform"
            />
            <p className="text-[11px] leading-relaxed text-white/55">
              {t("landing.footer.euDisclaimer")}
            </p>
          </div>
        </div>
        <div className="border-t border-white/5 bg-slate-900/20">
          <div className="mx-auto max-w-7xl px-5 py-6 text-xs text-white/50 flex flex-wrap items-center justify-between gap-4 font-medium">
            <span>© {new Date().getFullYear()} {t("landing.footer.copyright")}</span>
            <span>{t("landing.footer.builtOn")}</span>
          </div>
        </div>
      </footer>

      <PrivacyBanner onClick={() => setConsentOpen(true)} hasAccepted={consentAccepted} />
      <PrivacyConsentDialog
        isOpen={consentOpen}
        onAccept={acceptConsent}
        onDeny={denyConsent}
        onClose={() => setConsentOpen(false)}
      />
    </div>
  );
};

export default LandingPage;
