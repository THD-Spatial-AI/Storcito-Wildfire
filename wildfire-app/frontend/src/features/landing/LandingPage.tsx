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
import { submitPublicFeedback } from "@/features/user-feedback";
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
  { icon: MapIcon, key: "mapping", color: "text-[#4A3F6B] bg-[#4A3F6B]/10 border-[#4A3F6B]/20" },
  { icon: Flame, key: "engine", color: "text-[#4A3F6B] bg-[#4A3F6B]/10 border-[#4A3F6B]/20" },
  { icon: Activity, key: "metrics", color: "text-[#4A3F6B] bg-[#4A3F6B]/10 border-[#4A3F6B]/20" },
  { icon: Layers, key: "fuel", color: "text-[#4A3F6B] bg-[#4A3F6B]/10 border-[#4A3F6B]/20" },
  { icon: Globe, key: "multilingual", color: "text-[#4A3F6B] bg-[#4A3F6B]/10 border-[#4A3F6B]/20" },
  { icon: ShieldCheck, key: "secure", color: "text-[#333333] bg-[#B0AAA4]/10 border-[#B0AAA4]/20" },
] as const;

const PERSONAS = [
  { icon: ShieldCheck, key: "planners", color: "text-[#4A3F6B] bg-[#4A3F6B]/10 border-[#4A3F6B]/20" },
  { icon: Activity, key: "analysts", color: "text-[#4A3F6B] bg-[#4A3F6B]/10 border-[#4A3F6B]/20" },
  { icon: Layers, key: "researchers", color: "text-[#4A3F6B] bg-[#4A3F6B]/10 border-[#4A3F6B]/20" },
  { icon: Users, key: "leads", color: "text-[#4A3F6B] bg-[#4A3F6B]/10 border-[#4A3F6B]/20" },
] as const;

const CHALLENGE_CARDS = ["hotter", "vegetation", "cascading", "tooling"] as const;

  // Backend category values.
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
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4D2D0]/50 hover:bg-[#D4D2D0] text-[#1A1A1A] text-sm font-medium px-3 py-2 ring-1 ring-[#B0AAA4]/40 transition-colors"
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
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-[#333333] hover:bg-[#D4D2D0] transition-colors"
            >
              <span className="flex items-center gap-2">
                <span>{l.flag}</span>
                <span className="font-medium">{l.nativeName}</span>
              </span>
              {l.code === current && <Check className="h-4 w-4 text-[#4A3F6B]" />}
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

  // Reveal on scroll.
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
      await submitPublicFeedback(form);
      setStatus("success");
      setForm({ name: "", email: "", category: CATEGORY_OPTIONS[0].value, subject: "", message: "" });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error && err.message ? err.message : t("landing.contact.genericError"));
    }
  };

  // Guest consent.
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
    <div ref={rootRef} className="h-screen overflow-y-auto bg-white text-[#1A1A1A] scroll-smooth">
      {/* Full-width nav bar */}
      <div className="fixed top-0 left-0 right-0 z-50 border-b border-[#D4D2D0] bg-white/90 backdrop-blur-md">
        <header className="mx-auto max-w-screen-2xl px-6 md:px-10 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center transition-transform hover:scale-[1.02]">
            <img src={`${IMG}/storcito-logo-dark.webp`} alt="Storcito" className="h-7 w-auto" />
          </a>
          <nav className="hidden md:flex items-center gap-7">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="text-sm font-medium text-[#333333] hover:text-[#1A1A1A] transition-all relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#4A3F6B] after:transition-all hover:after:w-full"
              >
                {t(`landing.nav.${n.key}`)}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <LanguageMenu />
            <Link
              to="/app/map"
              className="group inline-flex items-center gap-2 text-sm font-semibold rounded-lg bg-[#1A1A1A] hover:bg-[#333333] text-[#EDEAE7] px-5 py-2 transition-colors"
            >
              <span className="hidden sm:inline">{t("landing.openApp")}</span>
              <span className="sm:hidden">{t("landing.nav.platform")}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </header>
      </div>

      {/* Hero Section */}
      <section id="top" className="relative overflow-hidden pt-28 pb-24 md:pt-36 md:pb-32 border-b border-[#D4D2D0] bg-[#EDEAE7]">
        {/* Background photograph. */}
        <div className="absolute inset-0 bg-[url('/images/landing-page/hero-fire-bg.jpg')] bg-cover bg-center bg-no-repeat opacity-25" />
        <div className="absolute inset-0 bg-[#EDEAE7]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#EDEAE7] via-[#EDEAE7]/80 to-[#EDEAE7]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#EDEAE7] via-transparent to-[#EDEAE7]/60" />

        <div className="relative mx-auto max-w-7xl px-5">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Text column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#4A3F6B]/10 text-[#4A3F6B] text-xs font-semibold px-3 py-1.5 ring-1 ring-[#4A3F6B]/20">
                  <Flame className="h-3.5 w-3.5" /> {t("landing.hero.badge")}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/5 text-[#333333] text-xs font-semibold px-3 py-1.5 ring-1 ring-[#D4D2D0]">
                  <Globe className="h-3.5 w-3.5 text-[#4A3F6B]" /> Horizon Europe Project
                </span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-[#1A1A1A] max-w-2xl">
                {t("landing.hero.title")}
              </h1>

              <p className="text-base md:text-lg text-[#333333] leading-relaxed max-w-xl">
                {t("landing.hero.subtitle")}
              </p>
              
              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  to="/app/map"
                  className="group inline-flex items-center gap-2 rounded-lg bg-[#1A1A1A] hover:bg-[#333333] text-[#EDEAE7] font-semibold px-6 py-3 transition-colors"
                >
                  {t("landing.hero.explore")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#challenge"
                  className="inline-flex items-center gap-2 rounded-lg hover:bg-[#D4D2D0]/40 text-[#1A1A1A] font-semibold px-6 py-3 ring-1 ring-[#D4D2D0] transition-colors"
                >
                  {t("landing.hero.why")}
                </a>
              </div>

              {/* EU funding credibility cue */}
              <div className="flex items-center gap-3 pt-6 mt-2 border-t border-[#D4D2D0] max-w-xl">
                <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-[3px] bg-[#003399]">
                  <span className="text-white text-sm leading-none">★</span>
                </div>
                <p className="text-xs text-[#B0AAA4] leading-snug">
                  Funded by the European Union under the Horizon Europe research &amp; innovation programme.
                </p>
              </div>
            </div>

            {/* Recent Simulations Panel */}
            <div className="lg:col-span-5 relative w-full flex items-center justify-center lg:justify-end">
              <div className="w-full max-w-md rounded-2xl border border-[#D4D2D0] bg-white/80 backdrop-blur-md shadow-2xl shadow-[#4A3F6B]/20 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4D2D0]">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4A3F6B]/15 text-[#4A3F6B] ring-1 ring-[#4A3F6B]/20">
                      <Activity className="w-4 h-4" />
                    </span>
                    <div className="leading-tight">
                      <h3 className="text-sm font-semibold text-[#1A1A1A] tracking-tight">Recent Simulations</h3>
                      <p className="text-[11px] text-[#B0AAA4]">Galicia · last 7 days</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4A3F6B]/10 text-[#4A3F6B] ring-1 ring-[#4A3F6B]/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4A3F6B] animate-pulse" /> Live
                  </span>
                </div>

                {/* Map preview */}
                <div className="px-5 pt-5">
                  <div className="w-full h-36 rounded-xl overflow-hidden border border-[#D4D2D0] relative group">
                    <img src="/images/landing-page/live-map-preview.jpg" alt="Live wildfire risk map" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent pointer-events-none" />
                    <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-md bg-black/60 backdrop-blur-sm px-2 py-1 ring-1 ring-[#D4D2D0]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4A3F6B]" />
                      <span className="text-[10px] font-semibold text-white">High risk</span>
                    </div>
                    <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 text-white text-[10px] font-semibold tracking-wide uppercase ">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4A3F6B] animate-pulse" /> Active Risk Zone
                    </div>
                  </div>
                </div>

                {/* Simulation list */}
                <div className="px-3 py-3 divide-y divide-[#D4D2D0]">
                  {[
                    { region: "O Porriño Region", date: "21 May 2026, 16:39", duration: "21s", risk: "High", dot: "bg-[#4A3F6B]", pill: "bg-[#4A3F6B]/15 text-[#4A3F6B]" },
                    { region: "Vigo Metro East", date: "21 May 2026, 14:46", duration: "20s", risk: "Moderate", dot: "bg-[#4A3F6B]", pill: "bg-[#4A3F6B]/15 text-[#4A3F6B]" },
                    { region: "Pontevedra South", date: "18 May 2026, 19:11", duration: "9m 20s", risk: "Low", dot: "bg-[#4A3F6B]", pill: "bg-[#4A3F6B]/15 text-[#4A3F6B]" },
                  ].map((s) => (
                    <div key={s.region} className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[#D4D2D0]/40">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#1A1A1A] truncate">{s.region}</span>
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${s.pill}`}>{s.risk}</span>
                        </div>
                        <div className="text-[11px] text-[#B0AAA4] mt-0.5">{s.date}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="inline-flex items-center gap-1 text-[#4A3F6B] text-[10px] font-semibold uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3" /> Done
                        </div>
                        <div className="text-xs text-[#B0AAA4] font-mono mt-0.5">{s.duration}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Ribbon */}
      <section className="relative z-20 -mt-12 max-w-7xl mx-auto px-5">
        <div className="rounded-3xl border border-[#D4D2D0] bg-gradient-to-br from-white/90 to-white/90 backdrop-blur-xl p-2 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.7)]">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {[
              { icon: MapIcon, value: "29,574", unit: "km²", label: t("landing.stats.affectedArea") },
              { icon: Users, value: "313", unit: "", label: t("landing.stats.municipalities") },
              { icon: ShieldCheck, value: "5", unit: "tiers", label: t("landing.stats.riskDistribution") },
              { icon: Activity, value: "Live", unit: "", label: t("landing.stats.trendAnalysis"), live: true },
            ].map(({ icon: Icon, value, unit, label, live }) => (
              <div
                key={label}
                className="group flex items-center gap-4 p-5 lg:p-6 rounded-2xl transition-colors hover:bg-[#D4D2D0]/40 lg:border-l lg:border-[#D4D2D0] lg:first:border-l-0"
              >
                <div className="shrink-0 w-11 h-11 rounded-xl bg-[#4A3F6B]/10 ring-1 ring-[#4A3F6B]/20 flex items-center justify-center text-[#4A3F6B] transition-transform duration-300 group-hover:scale-110">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    {live && <span className="w-2 h-2 rounded-full bg-[#4A3F6B] animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.7)]" />}
                    <span className="text-2xl md:text-3xl font-extrabold text-[#1A1A1A] tracking-tight leading-none">{value}</span>
                    {unit && <span className="text-sm font-bold text-[#4A3F6B]">{unit}</span>}
                  </div>
                  <div className="text-[11px] font-semibold text-[#B0AAA4] uppercase tracking-wider mt-1.5 truncate">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* Challenge */}
      <section id="challenge" className="py-20 md:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-5 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-[#4A3F6B]">
              {t("landing.challenge.eyebrow")}
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-[#4A3F6B] tracking-tight leading-tight">
              {t("landing.challenge.title")}
            </h2>
            <p className="mt-5 text-[#333333] leading-relaxed font-medium">{t("landing.challenge.p1")}</p>
            <p className="mt-4 text-[#333333] leading-relaxed font-medium">{t("landing.challenge.p2")}</p>
            
            <div className="mt-10 grid sm:grid-cols-2 gap-6">
              {CHALLENGE_CARDS.map((card, i) => (
        // Separate transforms.
                <div key={card} data-reveal style={{ transitionDelay: `${i * 80}ms` }} className="lp-reveal">
                  <div className="group relative flex h-full flex-col p-6 rounded-3xl bg-white border border-[#D4D2D0]/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-2 hover:border-[#4A3F6B]/70 hover:shadow-[0_16px_40px_rgba(0,0,0,0.10)]">
                    {/* Step counter badge */}
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#4A3F6B]/10 text-[#4A3F6B] flex items-center justify-center font-bold text-xs shrink-0 transition-colors duration-300 group-hover:bg-[#4A3F6B] group-hover:text-white">
                        {i + 1}
                      </div>
                      <h3 className="font-bold text-[#4A3F6B] tracking-tight text-[17px] leading-snug">
                        {t(`landing.challenge.cards.${card}.title`)}
                      </h3>
                    </div>

                    <p className="mt-3 text-[14px] text-[#B0AAA4] leading-relaxed font-medium">
                      {t(`landing.challenge.cards.${card}.text`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div data-reveal className="lp-reveal group relative px-4">
            {/* Background glowing frame blob */}
            <div className="absolute -inset-1.5 bg-gradient-to-r from-[#6A5F94] to-[#4A3F6B] rounded-3xl blur opacity-20 group-hover:opacity-35 transition duration-1000 group-hover:duration-200" />
            
            <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-[#D4D2D0] bg-white">
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
        className="py-20 md:py-28 bg-[#4A3F6B] text-white lp-grid-pattern border-t border-b border-white/5 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#4A3F6B]/95 via-[#544B78]/90 to-[#6A5F94]/85 pointer-events-none" />
        
        <div className="relative mx-auto max-w-7xl px-5">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-[#6A5F94]">
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
                  className="lp-reveal group flex flex-col overflow-hidden rounded-[24px] bg-[#38304F] border border-white/5 transition-all duration-400 hover:bg-[#4A3F6B] hover:-translate-y-1 shadow-2xl relative"
                >
                  {/* Inset screen look. */}
                  <div className="relative h-44 p-3 pb-0">
                    <div className="w-full h-full rounded-t-[16px] overflow-hidden relative bg-[#38304F] border border-white/5">
                      <img
                        src={s.img}
                        alt=""
                        aria-hidden
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover opacity-70 transition-all duration-700 group-hover:opacity-100 group-hover:scale-105"
                      />
                      {/* Bottom edge blend. */}
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#38304F] to-transparent opacity-90 group-hover:from-[#4A3F6B] transition-colors duration-400" />
                    </div>
                  </div>
                  
                  {/* Content block */}
                  <div className="p-6 pt-8 bg-[#38304F] group-hover:bg-[#4A3F6B] transition-colors duration-400 relative flex-1 flex flex-col">
                    {/* Floating Icon */}
                    <div className="absolute -top-6 left-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#38304F] border border-white/10 shadow-lg transition-all duration-300 group-hover:border-[#4A3F6B]/40">
                      <s.icon className="h-5 w-5 text-[#4A3F6B]" />
                    </div>

                    <div className="mb-4">
                      <span className="text-[10px] font-extrabold text-[#4A3F6B] tracking-wider uppercase bg-[#4A3F6B] px-2.5 py-1 rounded-full">
                        {t("landing.platform.step")} 0{i + 1}
                      </span>
                    </div>
                    <h3 className="text-[19px] font-bold text-white tracking-tight leading-snug">{t(`landing.platform.steps.${s.key}.title`)}</h3>
                    <p className="mt-3 text-[15px] text-white/60 leading-relaxed font-medium">
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
            <div className="absolute inset-0 bg-gradient-to-t from-[#38304F]/80 via-transparent to-transparent opacity-60 z-10 transition-opacity duration-300 group-hover:opacity-40" />
            <img
              src={`${IMG}/firefighting-crew.webp`}
              alt={t("landing.platform.imgAlt")}
              className="w-full max-h-[400px] object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            />
            {/* Simulation Preview Decoration */}
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-[#4A3F6B]/90 text-white flex items-center justify-center shadow-2xl ring-4 ring-[#4A3F6B]/30 scale-90 group-hover:scale-100 transition-transform duration-300">
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
            <p className="text-sm font-bold uppercase tracking-wider text-[#4A3F6B]">
              {t("landing.capabilities.eyebrow")}
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-[#4A3F6B] tracking-tight leading-tight">
              {t("landing.capabilities.title")}
            </h2>
          </div>
          
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CAPABILITIES.map((c, i) => (
              <div
                key={c.key}
                data-reveal
                style={{ transitionDelay: `${(i % 3) * 90}ms` }}
                className="lp-reveal group relative p-8 rounded-3xl bg-white border border-[#D4D2D0]/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] flex flex-col"
              >
                {/* Custom badge colors */}
                <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center border transition-transform duration-500 group-hover:scale-105 ${c.color}`}>
                  <c.icon className="h-6 w-6" />
                </div>
                
                <h3 className="mt-6 text-[19px] font-bold text-[#4A3F6B] tracking-tight">
                  {t(`landing.capabilities.items.${c.key}.title`)}
                </h3>
                <p className="mt-3 text-[15px] text-[#B0AAA4] leading-relaxed font-medium">
                  {t(`landing.capabilities.items.${c.key}.text`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Personas */}
      <section id="personas" className="py-20 md:py-28 bg-[#EDEAE7] border-t border-[#D4D2D0]">
        <div className="mx-auto max-w-7xl px-5">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-[#4A3F6B]">
              {t("landing.personas.eyebrow")}
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-[#4A3F6B] tracking-tight leading-tight">
              {t("landing.personas.title")}
            </h2>
          </div>
          
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PERSONAS.map((p, i) => (
              <div
                key={p.key}
                data-reveal
                style={{ transitionDelay: `${i * 90}ms` }}
                className="lp-reveal group relative p-8 rounded-3xl bg-white border border-[#D4D2D0]/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] flex flex-col"
              >
                {/* Specific persona icon wrapping */}
                <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center border transition-transform duration-500 group-hover:scale-105 ${p.color}`}>
                  <p.icon className="h-6 w-6" />
                </div>
                
                <h3 className="mt-6 text-[17px] font-bold text-[#4A3F6B] tracking-tight leading-snug">
                  {t(`landing.personas.items.${p.key}.title`)}
                </h3>
                <p className="mt-3 text-[14px] text-[#B0AAA4] leading-relaxed font-medium">
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
        className="py-20 md:py-28 bg-[#EDEAE7] lp-grid-pattern text-[#1A1A1A] border-t border-[#D4D2D0] relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#EDEAE7] to-[#EDEAE7] pointer-events-none" />
        
        {/* Glow Spheres */}
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#4A3F6B]/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-5 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-[#4A3F6B]">
              {t("landing.contact.eyebrow")}
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight leading-tight text-[#1A1A1A]">{t("landing.contact.title")}</h2>
            <p className="mt-5 text-[#333333] leading-relaxed text-base font-medium">{t("landing.contact.subtitle")}</p>
            <div className="mt-8 flex items-center gap-3 text-[#333333]">
              <Mail className="h-5 w-5 text-[#4A3F6B]" />
              <span className="text-sm">{t("landing.contact.responseTime")}</span>
            </div>
          </div>

          <div className="border border-[#D4D2D0] rounded-2xl bg-white p-6 md:p-8 text-[#1A1A1A] shadow-2xl relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#4A3F6B]/5 rounded-full blur-2xl pointer-events-none" />
            
            {status === "success" ? (
              <div className="flex flex-col items-center text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-[#4A3F6B] animate-bounce" />
                <h3 className="mt-4 text-xl font-bold text-[#1A1A1A]">
                  {t("landing.contact.successTitle")}
                </h3>
                <p className="mt-2 text-[#333333]">{t("landing.contact.successText")}</p>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-6 text-sm font-semibold text-[#4A3F6B] hover:text-[#4A3F6B] transition-colors"
                >
                  {t("landing.contact.sendAnother")}
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4 relative z-10">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5">
                      {t("landing.contact.name")}
                    </label>
                    <input
                      value={form.name}
                      onChange={set("name")}
                      required
                      className="w-full rounded-xl border border-[#D4D2D0] bg-[#EDEAE7]/60 px-3 py-2.5 text-sm text-[#1A1A1A] placeholder-[#B0AAA4] focus:outline-none focus:ring-2 focus:ring-[#4A3F6B] focus:bg-white transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5">
                      {t("landing.contact.email")}
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      required
                      className="w-full rounded-xl border border-[#D4D2D0] bg-[#EDEAE7]/60 px-3 py-2.5 text-sm text-[#1A1A1A] placeholder-[#B0AAA4] focus:outline-none focus:ring-2 focus:ring-[#4A3F6B] focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5">
                    {t("landing.contact.category")}
                  </label>
                  <select
                    value={form.category}
                    onChange={set("category")}
                    className="w-full rounded-xl border border-[#D4D2D0] bg-white px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#4A3F6B] transition-all font-medium cursor-pointer"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value} className="bg-white text-[#1A1A1A]">
                        {t(`landing.contact.categories.${c.key}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5">
                    {t("landing.contact.subject")}
                  </label>
                  <input
                    value={form.subject}
                    onChange={set("subject")}
                    required
                    className="w-full rounded-xl border border-[#D4D2D0] bg-[#EDEAE7]/60 px-3 py-2.5 text-sm text-[#1A1A1A] placeholder-[#B0AAA4] focus:outline-none focus:ring-2 focus:ring-[#4A3F6B] focus:bg-white transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5">
                    {t("landing.contact.message")}
                  </label>
                  <textarea
                    value={form.message}
                    onChange={set("message")}
                    required
                    rows={4}
                    className="w-full rounded-xl border border-[#D4D2D0] bg-[#EDEAE7]/60 px-3 py-2.5 text-sm text-[#1A1A1A] placeholder-[#B0AAA4] focus:outline-none focus:ring-2 focus:ring-[#4A3F6B] focus:bg-white transition-all resize-y font-medium"
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
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] hover:bg-[#333333] disabled:opacity-60 text-[#EDEAE7] font-semibold px-5 py-3 transition-all cursor-pointer"
                >
                  {status === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  {status === "loading" ? t("landing.contact.sending") : t("landing.contact.send")}
                </button>
                <p className="text-xs text-[#B0AAA4] text-center font-medium">
                  {t("landing.contact.agree")}{" "}
                  <Link to="/privacy" className="underline text-[#4A3F6B] hover:text-[#4A3F6B] transition-colors">
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
      <footer className="bg-[#4A3F6B] text-white border-t border-white/5 relative z-10">
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
        <div className="border-t border-white/5 bg-[#4A3F6B]/20">
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

