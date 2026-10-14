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
import { GithubIcon } from "@/components/ui/GithubIcon";
import { GITHUB_URL } from "@/components/app-layout/app-layout/constants";

const IMG = "/images/landing-page";

const NAV = [
  { key: "challenge", href: "#challenge" },
  { key: "platform", href: "#platform" },
  { key: "contact", href: "#contact" },
] as const;

// Type scale.
const EYEBROW = "block font-bold text-[10px] tracking-[0.4em] uppercase text-[#1A1A1A]/50";
const H2 = "text-3xl md:text-4xl font-black tracking-tighter uppercase leading-none text-[#1A1A1A]";
const DOTS = "bg-[radial-gradient(circle,#D4D2D0_1px,transparent_1px)] bg-[size:40px_40px]";
const BAND = "bg-gradient-to-br from-[#544B78] to-[#38304F] text-white";
const BUTTON = "inline-flex items-center justify-center gap-2 px-6 py-3 font-black uppercase text-[11px] tracking-widest transition-all";
const FIELD = "w-full px-4 py-3 bg-white border border-[#D4D2D0] text-[#1A1A1A] text-[13px] placeholder:text-[#B0AAA4] focus:outline-none focus:border-[#1A1A1A] transition-colors";
const LABEL = "block font-bold text-[10px] uppercase tracking-widest text-[#1A1A1A]/50 mb-2";
const NAV_LINK = "font-semibold text-[0.875rem] tracking-tight uppercase text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors whitespace-nowrap";
const FOOTER_LINK = "text-[11px] font-semibold uppercase tracking-widest text-white/60 hover:text-white transition-colors py-0.5";

// Section heading.
const SectionHead: React.FC<{ eyebrow: string; title: string; description?: string }> = ({ eyebrow, title, description }) => (
  <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
    <div className="max-w-2xl">
      <span className={EYEBROW}>{eyebrow}</span>
      <h2 className={`${H2} mt-4`}>{title}</h2>
    </div>
    {description && <p className="text-sm text-[#333333] max-w-sm leading-relaxed">{description}</p>}
  </div>
);

const STEPS = [
  { icon: MapIcon, img: `${IMG}/define-area.jpg`, key: "define" },
  { icon: Flame, img: `${IMG}/run-model.jpg`, key: "run" },
  { icon: Layers, img: `${IMG}/inspect-results.jpg`, key: "inspect" },
  { icon: GitCompare, img: `${IMG}/compare-share.jpg`, key: "compare" },
] as const;

const CAPABILITIES = [
  { icon: MapIcon, key: "mapping" },
  { icon: Flame, key: "engine" },
  { icon: Activity, key: "metrics" },
  { icon: Layers, key: "fuel" },
  { icon: Globe, key: "multilingual" },
  { icon: ShieldCheck, key: "secure" },
] as const;

const PERSONAS = [
  { icon: ShieldCheck, key: "planners" },
  { icon: Activity, key: "analysts" },
  { icon: Layers, key: "researchers" },
  { icon: Users, key: "leads" },
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
        className="inline-flex items-center gap-1.5 bg-white/70 hover:bg-[#D4D2D0] text-[#1A1A1A] text-xs font-semibold px-2.5 py-1.5 ring-1 ring-[#D4D2D0] transition-colors"
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
          className="absolute right-0 mt-2 w-44 bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden py-1 z-50"
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
  const euAlt = t("landing.footer.euFundedAlt");


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
    <div ref={rootRef} className={`h-screen overflow-y-auto bg-[#EDEAE7] text-[#1A1A1A] scroll-smooth selection:bg-[#1A1A1A] selection:text-[#EDEAE7] ${DOTS}`}>
      {/* Nav bar. */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#EDEAE7]/95 backdrop-blur-md border-b border-[#1A1A1A]/15">
        <div className="grid grid-cols-2 md:grid-cols-3 items-center w-full px-6 md:px-8 h-16">
          <a href="#top" className="flex items-center" aria-label="STORCITO">
            <img src={`${IMG}/storcito-logo-dark.webp`} alt="STORCITO" className="h-8 w-auto" />
          </a>

          <div className="hidden md:flex justify-center">
            <a href="#top" className="text-2xl lg:text-3xl font-black tracking-tighter uppercase leading-none text-[#1A1A1A] select-none whitespace-nowrap">
              Wildfire Risk
            </a>
          </div>

          <div className="flex justify-end items-center gap-6 h-full">
            <nav className="hidden min-[1800px]:flex items-center gap-6 h-full">
              {NAV.map((n) => (
                <a key={n.href} href={n.href} className={NAV_LINK}>
                  {t(`landing.nav.${n.key}`)}
                </a>
              ))}
              <Link to="/docs" className={NAV_LINK}>
                {t("landing.nav.docs")}
              </Link>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={NAV_LINK} aria-label={t("landing.nav.github")}>
                <GithubIcon className="h-4 w-4" />
              </a>
            </nav>
            <LanguageMenu />
            <Link
              to="/app/map"
              className="font-semibold text-[0.875rem] tracking-tight uppercase text-[#1A1A1A] border-b-2 border-[#1A1A1A] pb-0.5 whitespace-nowrap"
            >
              <span className="hidden sm:inline">{t("landing.openApp")}</span>
              <span className="sm:hidden">{t("landing.nav.platform")}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-16">
        {/* Hero. */}
        <section id="top" className="relative flex w-full flex-col md:flex-row min-h-[calc(100vh-4rem)] overflow-hidden bg-[#EDEAE7]">
          <div className="relative z-10 flex w-full flex-col justify-start p-8 md:w-1/2 md:p-12 lg:w-3/5 lg:px-16 lg:pt-44 lg:pb-[20.5vw]">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight text-[#1A1A1A] max-w-2xl">
                {t("landing.hero.title")}
              </h1>
              <div className="my-6 h-1 w-20 bg-[#4A3F6B]" />
              <p className="mb-8 max-w-md text-base text-[#333333] leading-relaxed">
                {t("landing.hero.subtitle")}
              </p>

              <div className="flex flex-wrap gap-3 lg:mb-24">
                <Link to="/app/map" className={`${BUTTON} bg-[#1A1A1A] hover:bg-[#333333] text-[#EDEAE7]`}>
                  <span>{t("landing.hero.explore")}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#challenge" className={`${BUTTON} border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#EDEAE7]`}>
                  {t("landing.hero.why")}
                </a>
              </div>
            </div>

            {/* Metrics strip. */}
            <div className="mt-12 lg:mt-auto pt-8 border-t border-[#1A1A1A]/10">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#D4D2D0] border border-[#D4D2D0]">
                {[
                  { value: "29,574 km²", label: t("landing.stats.affectedArea") },
                  { value: "313", label: t("landing.stats.municipalities") },
                  { value: "5 tiers", label: t("landing.stats.riskDistribution") },
                  { value: "Live", label: t("landing.stats.trendAnalysis") },
                ].map(({ value, label }) => (
                  <div key={label} className="bg-white p-5">
                    <p className="font-black text-xl tracking-tight text-[#1A1A1A]">{value}</p>
                    <p className="font-bold text-[10px] uppercase tracking-widest text-[#1A1A1A]/50 mt-1">{label}</p>
                  </div>
                ))}
              </div>
              <img src={`${IMG}/eu-funded.webp`} alt={euAlt} className="mt-6 h-10 w-auto" />
            </div>
          </div>

          {/* Fire photo. */}
          <div className="relative w-full min-h-[300px] md:w-1/2 md:min-h-full lg:w-2/5 bg-[#D4D2D0] md:animate-[hero-clip_1.2s_cubic-bezier(0,0.55,0.45,1)_both] md:[clip-path:polygon(25%_0,100%_0,100%_100%,0%_100%)]">
            <img
              src={`${IMG}/aerial-forest-fire.webp`}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover grayscale opacity-60 mix-blend-multiply pointer-events-none select-none"
            />
            {/* Fade into scene. */}
            <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-b from-[#EDEAE700] via-[#EDEAE7cc] to-[#EDEAE7]" />
          </div>
        </section>

        {/* Hero scene. */}
        <div className="relative h-0 pointer-events-none select-none" aria-hidden="true">
          <div className="absolute left-0 right-0 top-0 aspect-[12/5] -translate-y-full overflow-hidden opacity-40">
            <img src={`${IMG}/wildfire-hero.svg`} alt="" className="absolute bottom-0 left-0 w-full aspect-[12/7]" />
          </div>
        </div>

        {/* Workflow. */}
        <section id="platform" className={`pb-32 pt-24 px-8 ${BAND}`}>
          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <span className="block font-bold text-[10px] tracking-[0.4em] uppercase text-white/50">{t("landing.platform.eyebrow")}</span>
              <h2 className="text-3xl md:text-4xl font-black mt-4 tracking-tighter uppercase leading-none">{t("landing.platform.title")}</h2>
              <p className="mt-6 text-[0.9375rem] text-white/60 leading-relaxed max-w-2xl mx-auto">{t("landing.platform.subtitle")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-white/10">
              {STEPS.map((s, i) => (
                <div
                  key={s.key}
                  data-reveal
                  style={{ transitionDelay: `${i * 90}ms` }}
                  className="lp-reveal group flex flex-col border-white/10 border-b sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:border-r lg:last:border-r-0"
                >
                  <div className="relative h-44 overflow-hidden border-b border-white/10">
                    <img
                      src={s.img}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover opacity-70 transition-all duration-700 group-hover:opacity-100 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-8 flex flex-col items-center text-center">
                    <s.icon className="w-6 h-6 mb-6" strokeWidth={1.5} />
                    <span className="font-bold uppercase text-[10px] tracking-[0.3em] text-white/50 mb-2">
                      {t("landing.platform.step")} 0{i + 1}
                    </span>
                    <h3 className="font-bold uppercase text-[11px] tracking-[0.3em] mb-3">{t(`landing.platform.steps.${s.key}.title`)}</h3>
                    <p className="text-[13px] text-white/60 leading-relaxed">{t(`landing.platform.steps.${s.key}.text`)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div data-reveal className="lp-reveal mt-16 border border-white/10 overflow-hidden">
              <img
                src={`${IMG}/firefighting-crew.webp`}
                alt={t("landing.platform.imgAlt")}
                className="w-full max-h-[400px] object-cover opacity-90"
              />
            </div>
          </div>
        </section>

        {/* Challenge. */}
        <section id="challenge" className="py-24 px-8 bg-[#E4E1DE] border-y border-[#D4D2D0]">
          <div className="max-w-7xl mx-auto">
            <SectionHead eyebrow={t("landing.challenge.eyebrow")} title={t("landing.challenge.title")} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-16">
              <div>
                <p className="text-[0.9375rem] text-[#333333]/80 leading-relaxed mb-6">{t("landing.challenge.p1")}</p>
                <p className="text-[0.9375rem] text-[#333333]/80 leading-relaxed">{t("landing.challenge.p2")}</p>
              </div>
              <div data-reveal className="lp-reveal grid grid-cols-3 gap-px bg-[#D4D2D0] border border-[#D4D2D0] self-start">
                <img src={`${IMG}/roadside-wildfire.webp`} alt={t("landing.challenge.imgAlt1")} className="col-span-2 h-full w-full object-cover" />
                <img src={`${IMG}/firefighter-hose.webp`} alt={t("landing.challenge.imgAlt2")} className="h-full w-full object-cover" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-[#D4D2D0] border border-[#D4D2D0]">
              {CHALLENGE_CARDS.map((card, i) => (
                <div key={card} data-reveal style={{ transitionDelay: `${i * 80}ms` }} className="lp-reveal bg-white p-8 flex flex-col gap-4">
                  <span className="text-[2rem] font-black text-[#1A1A1A]/15 leading-none">0{i + 1}</span>
                  <div>
                    <h4 className="font-black text-[0.875rem] uppercase tracking-tight mb-2">{t(`landing.challenge.cards.${card}.title`)}</h4>
                    <p className="text-[13px] text-[#333333]/80 leading-relaxed">{t(`landing.challenge.cards.${card}.text`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Capabilities. */}
        <section className="py-32 px-8">
          <div className="max-w-7xl mx-auto">
            <SectionHead eyebrow={t("landing.capabilities.eyebrow")} title={t("landing.capabilities.title")} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#D4D2D0] border border-[#D4D2D0]">
              {CAPABILITIES.map((c, i) => (
                <div key={c.key} data-reveal style={{ transitionDelay: `${(i % 3) * 90}ms` }} className="lp-reveal p-12 bg-white hover:bg-[#F6F4F2] transition-colors">
                  <c.icon className="w-6 h-6 mb-8 text-[#1A1A1A]" strokeWidth={1.5} />
                  <h4 className="text-sm font-bold mb-4 uppercase tracking-widest">{t(`landing.capabilities.items.${c.key}.title`)}</h4>
                  <p className="text-[13px] text-[#333333]/80 leading-relaxed">{t(`landing.capabilities.items.${c.key}.text`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Personas. */}
        <section id="personas" className="py-32 px-8 bg-white border-y border-[#D4D2D0]">
          <div className="max-w-7xl mx-auto">
            <SectionHead eyebrow={t("landing.personas.eyebrow")} title={t("landing.personas.title")} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#D4D2D0] border border-[#D4D2D0]">
              {PERSONAS.map((p, i) => (
                <div key={p.key} data-reveal style={{ transitionDelay: `${i * 90}ms` }} className="lp-reveal bg-white p-10">
                  <p.icon className="w-6 h-6 mb-6 text-[#1A1A1A]" strokeWidth={1.5} />
                  <p className="font-black text-[0.9375rem] uppercase tracking-tight mb-3">{t(`landing.personas.items.${p.key}.title`)}</p>
                  <p className="text-[12px] text-[#333333]/80 leading-relaxed">{t(`landing.personas.items.${p.key}.text`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact. */}
        <section id="contact" className="py-32 px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <span className={EYEBROW}>{t("landing.contact.eyebrow")}</span>
              <h2 className="text-3xl md:text-6xl font-black tracking-tighter leading-tight mt-4">{t("landing.contact.title")}</h2>
              <p className="text-sm text-[#333333]/80 mt-4">{t("landing.contact.subtitle")}</p>
              <p className="mt-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/50">
                <Mail className="h-3.5 w-3.5" />
                {t("landing.contact.responseTime")}
              </p>
            </div>

            <div className="border border-[#D4D2D0] bg-[#F6F4F2] p-8 md:p-10">
              {status === "success" ? (
                <div className="flex flex-col items-center text-center py-8">
                  <CheckCircle2 className="h-10 w-10 text-[#4A3F6B]" strokeWidth={1.5} />
                  <h3 className="mt-4 font-black text-[0.9375rem] uppercase tracking-wider">{t("landing.contact.successTitle")}</h3>
                  <p className="mt-2 text-[13px] text-[#333333]/80">{t("landing.contact.successText")}</p>
                  <button onClick={() => setStatus("idle")} className={`${BUTTON} mt-6 border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#EDEAE7]`}>
                    {t("landing.contact.sendAnother")}
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className={LABEL}>{t("landing.contact.name")}</label>
                      <input value={form.name} onChange={set("name")} required className={FIELD} />
                    </div>
                    <div>
                      <label className={LABEL}>{t("landing.contact.email")}</label>
                      <input type="email" value={form.email} onChange={set("email")} required className={FIELD} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className={LABEL}>{t("landing.contact.category")}</label>
                      <select value={form.category} onChange={set("category")} className={`${FIELD} cursor-pointer`}>
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {t(`landing.contact.categories.${c.key}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>{t("landing.contact.subject")}</label>
                      <input value={form.subject} onChange={set("subject")} required className={FIELD} />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>{t("landing.contact.message")}</label>
                    <textarea value={form.message} onChange={set("message")} required rows={4} className={`${FIELD} resize-y`} />
                  </div>
                  {status === "error" && (
                    <div className="flex items-start gap-2.5 p-4 border border-[#B0AAA4] bg-white text-[#1A1A1A] text-[13px]">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  <button type="submit" disabled={status === "loading"} className={`${BUTTON} w-full bg-[#1A1A1A] hover:bg-[#333333] text-[#EDEAE7] py-4 disabled:opacity-50`}>
                    {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    {status === "loading" ? t("landing.contact.sending") : t("landing.contact.send")}
                  </button>
                  <p className="text-[11px] text-[#1A1A1A]/50 text-center">
                    {t("landing.contact.agree")}{" "}
                    <Link to="/privacy" className="underline text-[#1A1A1A] hover:opacity-70">
                      {t("landing.contact.privacyPolicy")}
                    </Link>
                    .
                  </p>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer. */}
      <footer className={`w-full ${BAND}`}>
        <div className="max-w-7xl mx-auto px-8 py-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-4 items-start">
          <div className="flex flex-col gap-4 max-w-xs">
            <img src={`${IMG}/storcito-logo-white.webp`} alt="STORCITO" className="h-10 w-auto self-start" />
            <p className="text-[11px] font-medium tracking-wide uppercase leading-relaxed text-white/60">{t("landing.footer.tagline")}</p>
          </div>

          <div className="flex flex-col gap-4 max-w-xs">
            <img src={`${IMG}/thd-logo.svg`} alt="Technische Hochschule Deggendorf" className="h-8 w-auto self-start brightness-0 invert" />
            <p className="text-[11px] font-medium tracking-wide uppercase leading-relaxed text-white/60">Technische Hochschule Deggendorf</p>
            <p className="text-[11px] leading-relaxed text-white/60">
              University of Applied Sciences.<br />
              BigGeoData & Spatial AI Research Group.<br />
              Deggendorf, Bavaria, Germany.
            </p>
            <a
              href="https://www.th-deg.de"
              target="_blank"
              rel="noopener noreferrer"
              className="self-start inline-flex items-center gap-2 border border-white/30 px-4 py-2 font-black uppercase text-[10px] tracking-widest text-white hover:bg-white/10 transition-all"
            >
              www.th-deg.de
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>

          <div className="flex flex-col gap-3">
            <Link to="/privacy" className={FOOTER_LINK}>{t("landing.footer.privacy")}</Link>
            <Link to="/legal" className={FOOTER_LINK}>{t("landing.footer.cookies")}</Link>
            <Link to="/impressum" className={FOOTER_LINK}>{t("landing.footer.impressum")}</Link>
            <Link to="/terms-and-conditions" className={FOOTER_LINK}>{t("landing.footer.terms")}</Link>
            <Link to="/docs" className={FOOTER_LINK}>{t("landing.nav.docs")}</Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={`${FOOTER_LINK} inline-flex items-center gap-2`}>
              <GithubIcon className="h-3.5 w-3.5" />
              {t("landing.nav.github")}
            </a>
          </div>

          <div className="space-y-4">
            <img src={`${IMG}/eu-funded.webp`} alt={euAlt} className="h-12 w-auto bg-white p-1" />
            <p className="text-[11px] leading-relaxed text-white/50">{t("landing.footer.euDisclaimer")}</p>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 px-8 py-6 text-[10px] uppercase tracking-widest text-white/40">
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
