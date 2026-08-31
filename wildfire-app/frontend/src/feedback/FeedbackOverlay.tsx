import { useState, useRef, useEffect } from "react";
import { FeedbackButton } from "./FeedbackButton";
import { FeedbackDialog } from "./FeedbackDialog";
import { PersonaForm } from "./PersonaForm";
import { previewFeedback, submitFeedback } from "./api-client";
import { translations } from "./i18n";
import type {
  FeedbackFormState,
  FeedbackOverlayProps,
  Language,
  PersonaData,
  PreviewResult,
} from "./types";
import { C } from "./theme";

type OverlayMode = "idle" | "persona" | "selecting" | "dialog";

interface Point {
  x: number;
  y: number;
}
interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const LANG_STORAGE_KEY = "spatialhub-feedback-lang";
const PERSONA_STORAGE_KEY = "spatialhub-feedback-persona";

const LANGUAGE_OPTIONS: { value: Language; native: string }[] = [
  { value: "de", native: "Deutsch" },
  { value: "en", native: "English" },
  { value: "es", native: "Español" },
  { value: "gl", native: "Galego" },
];

const VALID_LANGS: Language[] = ["de", "en", "es", "gl"];

// ─── Screen capture helpers ───────────────────────────────────────────────────

async function captureScreen(): Promise<HTMLCanvasElement | null> {
  try {
    // html2canvas-pro (fork) supports Tailwind v4 oklch()/lab() colors — the original html2canvas
    // throws on them, which silently killed the whole capture and left the screenshot null.
    const { default: html2canvas } = await import("html2canvas-pro");
    return await html2canvas(document.body, {
      useCORS: true,
      allowTaint: false,
      logging: false,
      // Native pixel density (capped at 2×) — scale 0.5 was halving resolution, hence the blur.
      scale: Math.min(window.devicePixelRatio || 1, 2),
    });
  } catch {
    return null;
  }
}

function canvasToBase64(canvas: HTMLCanvasElement): string | null {
  try {
    return canvas.toDataURL("image/jpeg", 0.65).split(",")[1];
  } catch {
    return null;
  }
}

function cropRectToBase64(canvas: HTMLCanvasElement, rect: Rect): string | null {
  try {
    // html2canvas renders the whole page from the top-left at a uniform scale. The rect is normalised
    // to the VIEWPORT, so derive the scale from width (no horizontal scroll) and use it for BOTH axes
    // over page pixels — this keeps the crop's aspect ratio identical to what the user drew, even when
    // document.body is taller than the viewport (canvas.height would otherwise distort the Y mapping).
    const scale = canvas.width / window.innerWidth;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sx = (rect.x1 * vw + window.scrollX) * scale;
    const sy = (rect.y1 * vh + window.scrollY) * scale;
    const w = Math.max((rect.x2 - rect.x1) * vw * scale, 40);
    const h = Math.max((rect.y2 - rect.y1) * vh * scale, 40);
    const out = document.createElement("canvas");
    out.width = Math.round(w);
    out.height = Math.round(h);
    out.getContext("2d")!.drawImage(canvas, sx, sy, w, h, 0, 0, out.width, out.height);
    return out.toDataURL("image/jpeg", 0.9).split(",")[1];
  } catch {
    return null;
  }
}

function toRect(a: Point, b: Point): Rect {
  return {
    x1: Math.min(a.x, b.x) / window.innerWidth,
    y1: Math.min(a.y, b.y) / window.innerHeight,
    x2: Math.max(a.x, b.x) / window.innerWidth,
    y2: Math.max(a.y, b.y) / window.innerHeight,
  };
}

function loadPersona(): PersonaData | null {
  try {
    const saved = localStorage.getItem(PERSONA_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as PersonaData) : null;
  } catch {
    return null;
  }
}

function savePersona(data: PersonaData) {
  try {
    localStorage.setItem(PERSONA_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage can be unavailable in private browsing; feedback still works for this session.
  }
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

export function FeedbackOverlay({
  apiUrl,
  workshopToken,
  workshopTag,
  modelId,
  children,
  defaultLang = "en",
}: FeedbackOverlayProps) {
  const [mode, setMode] = useState<OverlayMode>("idle");
  const [persona, setPersona] = useState<PersonaData | null>(loadPersona);

  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY) as Language | null;
    return saved && VALID_LANGS.includes(saved) ? saved : defaultLang;
  });

  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragEnd, setDragEnd] = useState<Point | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedRect, setSelectedRect] = useState<Rect | null>(null);
  const [screenshotB64, setScreenshotB64] = useState<string | null>(null);
  const [overlayReady, setOverlayReady] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);

  const [topicOptions, setTopicOptions] = useState<string[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  const captureRef = useRef<Promise<HTMLCanvasElement | null> | null>(null);
  const fullScreenshotRef = useRef<string | null>(null);
  const tapCentreRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  const workshopMode = import.meta.env.VITE_WORKSHOP_MODE === "true";

  useEffect(() => {
    if (mode !== "selecting") {
      setOverlayReady(false);
      return;
    }
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setOverlayReady(true));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [mode]);

  // Escape (or Space while selecting) exits the feedback flow.
  useEffect(() => {
    if (mode !== "selecting" && mode !== "dialog") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || (mode === "selecting" && e.key === " ")) {
        e.preventDefault();
        handleClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  if (!workshopMode) return <>{children}</>;

  const t = translations[language];

  function startTopicFetch(lang: Language, fullShot: string | null, tap: { x: number; y: number }) {
    setTopicOptions([]);
    setLoadingTopics(true);
    previewFeedback(
      { x: tap.x, y: tap.y, screenshot_b64: fullShot },
      lang,
      apiUrl,
      workshopToken,
      workshopTag,
      modelId
    )
      .then((r: PreviewResult) => setTopicOptions(r.topic_options ?? []))
      .catch(() => setTopicOptions([]))
      .finally(() => setLoadingTopics(false));
  }

  function handleLanguageChange(l: Language) {
    setLanguageState(l);
    localStorage.setItem(LANG_STORAGE_KEY, l);
    if (mode === "dialog") {
      startTopicFetch(l, fullScreenshotRef.current, tapCentreRef.current);
    }
  }

  function beginSelecting() {
    captureRef.current = captureScreen();
    setMode("selecting");
  }

  function handleFabClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!persona) {
      setMode("persona");
    } else {
      beginSelecting();
    }
  }

  function handlePersonaComplete(data: PersonaData) {
    savePersona(data);
    setPersona(data);
    beginSelecting();
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!overlayReady) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = { x: e.clientX, y: e.clientY };
    setDragStart(pt);
    setDragEnd(pt);
    setIsDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setDragEnd({ x: e.clientX, y: e.clientY });
  }

  async function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging || !dragStart) return;
    setIsDragging(false);

    const end = { x: e.clientX, y: e.clientY };
    const dx = Math.abs(end.x - dragStart.x);
    const dy = Math.abs(end.y - dragStart.y);

    const rect =
      dx < 10 && dy < 10
        ? {
            x1: Math.max(0, dragStart.x - 60) / window.innerWidth,
            y1: Math.max(0, dragStart.y - 60) / window.innerHeight,
            x2: Math.min(window.innerWidth, dragStart.x + 60) / window.innerWidth,
            y2: Math.min(window.innerHeight, dragStart.y + 60) / window.innerHeight,
          }
        : toRect(dragStart, end);

    const tap = { x: (rect.x1 + rect.x2) / 2, y: (rect.y1 + rect.y2) / 2 };
    tapCentreRef.current = tap;

    setSelectedRect(rect);
    setDragStart(null);
    setDragEnd(null);
    setTopicOptions([]);
    setLoadingTopics(true);
    setMode("dialog");

    const canvas = captureRef.current ? await captureRef.current : null;
    const full = canvas ? canvasToBase64(canvas) : null;
    const cropped = canvas ? cropRectToBase64(canvas, rect) : null;

    fullScreenshotRef.current = full;
    setScreenshotB64(cropped);
    startTopicFetch(language, full, tap);
  }

  function handleClose() {
    setMode("idle");
    setSelectedRect(null);
    setScreenshotB64(null);
    setTopicOptions([]);
    setLoadingTopics(false);
    fullScreenshotRef.current = null;
    captureRef.current = null;
  }

  async function handleSubmit(form: FeedbackFormState) {
    await submitFeedback(
      { ...form, screenshot_b64: screenshotB64 },
      apiUrl,
      workshopToken,
      workshopTag,
      modelId,
      persona
    );
  }

  const dragRect =
    isDragging && dragStart && dragEnd
      ? {
          left: Math.min(dragStart.x, dragEnd.x),
          top: Math.min(dragStart.y, dragEnd.y),
          width: Math.abs(dragEnd.x - dragStart.x),
          height: Math.abs(dragEnd.y - dragStart.y),
        }
      : null;

  const tapX = selectedRect ? (selectedRect.x1 + selectedRect.x2) / 2 : 0.5;
  const tapY = selectedRect ? (selectedRect.y1 + selectedRect.y2) / 2 : 0.5;

  return (
    <div className="relative h-full">
      {children}

      {/* Persona modal */}
      {mode === "persona" && (
        <PersonaForm
          onComplete={handlePersonaComplete}
          onClose={() => setMode("idle")}
          lang={language}
          t={t}
        />
      )}

      {mode === "selecting" && (
        <div
          className={`fixed inset-0 z-[9999] select-none ${overlayReady ? "cursor-crosshair" : "cursor-wait"}`}
          style={{ background: "rgba(0,0,0,0.28)" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Cancel button — also exits via Escape/Space */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleClose}
            aria-label="Cancel"
            className="absolute right-6 top-6 flex size-9 items-center justify-center rounded-full text-zinc-200 shadow-lg ring-1 ring-white/10 transition-colors hover:text-white pointer-events-auto"
            style={{ backgroundColor: "oklch(0.15 0 0)" }}
          >
            <svg className="size-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>

          {!isDragging && (
            <div
              className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full px-5 py-2 text-sm font-medium text-zinc-200 shadow-lg ring-1 ring-white/10 pointer-events-none"
              style={{ backgroundColor: "oklch(0.15 0 0)" }}
            >
              {overlayReady ? t.selectReady : t.selectWaiting}
            </div>
          )}

          {dragRect && dragRect.width > 4 && dragRect.height > 4 && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: dragRect.left,
                top: dragRect.top,
                width: dragRect.width,
                height: dragRect.height,
                border: `2px solid ${C.primary}`,
                background: C.primaryFaint,
                boxShadow: `0 0 0 9999px rgba(0,0,0,0.35)`,
                transition: "width 50ms linear, height 50ms linear",
              }}
            />
          )}
        </div>
      )}

      {mode === "dialog" && selectedRect && (
        <>
          <div
            className="fixed z-[9998] pointer-events-none"
            style={{
              left: `${selectedRect.x1 * 100}%`,
              top: `${selectedRect.y1 * 100}%`,
              width: `${(selectedRect.x2 - selectedRect.x1) * 100}%`,
              height: `${(selectedRect.y2 - selectedRect.y1) * 100}%`,
              border: `2px solid ${C.primary}`,
              borderRadius: 4,
              boxShadow: `0 0 0 9999px rgba(0,0,0,0.3), 0 0 14px ${C.primaryGlow}`,
            }}
          />
          <FeedbackDialog
            topicOptions={topicOptions}
            loadingTopics={loadingTopics}
            onSubmit={handleSubmit}
            onClose={handleClose}
            x={tapX}
            y={tapY}
            selectedRect={selectedRect}
            language={language}
            onLanguageChange={handleLanguageChange}
          />
        </>
      )}

      {mode === "idle" && (
        <div
          className="fixed bottom-6 right-6 z-[9999] flex max-w-[calc(100vw-3rem)] items-stretch overflow-hidden rounded-full shadow-lg ring-1 ring-white/10"
          style={{ backgroundColor: C.bg, boxShadow: `0 4px 20px ${C.primaryGlow}, 0 1px 4px rgba(0,0,0,0.4)` }}
          role="group"
          aria-label="Feedback controls"
        >
          <FeedbackButton onClick={handleFabClick} embedded />
          <span className="my-2 w-px shrink-0 bg-white/15" aria-hidden="true" />
          <div className="flex items-center gap-0.5 p-1" role="group" aria-label="Select language">
            {showLanguages ? (
              LANGUAGE_OPTIONS.map(({ value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    handleLanguageChange(value);
                    setShowLanguages(false);
                  }}
                  aria-pressed={language === value}
                  className={`rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-white/30 ${
                    language === value ? "text-white" : "text-zinc-500 hover:text-zinc-200"
                  }`}
                  style={language === value ? { backgroundColor: C.primary } : {}}
                >
                  {value.toUpperCase()}
                </button>
              ))
            ) : (
              <button
                type="button"
                onClick={() => setShowLanguages(true)}
                aria-label="Change feedback language"
                aria-expanded={showLanguages}
                className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-white transition-colors duration-150 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-white/30"
                style={{ backgroundColor: C.primary }}
              >
                {language.toUpperCase()}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
