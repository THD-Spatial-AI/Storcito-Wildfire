import { useState } from "react";
import { translations } from "./i18n";
import type { FeedbackFormState, FeedbackType, Language } from "./types";
import { C } from "./theme";

// ─── Static chip bases ────────────────────────────────────────────────────────

const EMOJI_BASE = [
  { emoji: "😡", rating: 1 },
  { emoji: "😕", rating: 2 },
  { emoji: "😐", rating: 3 },
  { emoji: "🙂", rating: 4 },
  { emoji: "😊", rating: 5 },
];

const TYPE_BASE: { value: FeedbackType; emoji: string }[] = [
  { value: "bug",      emoji: "🐛" },
  { value: "feature",  emoji: "💡" },
  { value: "question", emoji: "❓" },
  { value: "praise",   emoji: "❤️" },
];

type WhatHappenedKey = "error" | "nothing" | "slow" | "wrong" | "confused" | "access" | "dislike" | "looks" | "other";
const WHAT_HAPPENED_BASE: { value: WhatHappenedKey; emoji: string }[] = [
  { value: "error",    emoji: "⚠️" },
  { value: "nothing",  emoji: "🚫" },
  { value: "slow",     emoji: "🐌" },
  { value: "wrong",    emoji: "🤷" },
  { value: "confused", emoji: "😵" },
  { value: "access",   emoji: "🔒" },
  { value: "dislike",  emoji: "👎" },
  { value: "looks",    emoji: "🎨" },
  { value: "other",    emoji: "❓" },
];

const EXPECTED_EMOJIS = ["✅", "💾", "🔄", "📩", "⚠️", "➡️", "💬", "🎨"];
const DESIRED_EMOJIS  = ["🔧", "💬", "⚡", "🗺️", "✨", "📖", "🤷", "🎨"];

// ─── Language toggle ──────────────────────────────────────────────────────────

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "de", label: "DE" },
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
  { value: "gl", label: "GL" },
];

function LangToggle({ current, onChange }: { current: Language; onChange: (l: Language) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-zinc-800 bg-zinc-900 p-0.5">
      {LANGUAGES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`rounded-full px-2 py-0.5 text-xs font-semibold transition-colors duration-150 active:scale-[0.97] focus:outline-none ${
            current === value ? "text-white" : "text-zinc-500 hover:text-zinc-300"
          }`}
          style={current === value ? { backgroundColor: C.primary } : {}}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Chip button helper ───────────────────────────────────────────────────────

function Chip({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-2 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.97] focus:outline-none ${
        active ? "" : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
      } ${className}`}
      style={active ? { borderColor: C.primary, backgroundColor: C.primaryFaint, color: C.ink } : {}}
    >
      {children}
    </button>
  );
}

// ─── Smart positioning ────────────────────────────────────────────────────────

interface Rect { x1: number; y1: number; x2: number; y2: number }

function getDialogStyle(rect: Rect): React.CSSProperties {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const DIALOG_W = 344;
  const MARGIN = 16;

  const spaceRight = (1 - rect.x2) * W;
  const spaceLeft  = rect.x1 * W;

  let hStyle: React.CSSProperties;
  if (spaceRight >= spaceLeft && spaceRight >= DIALOG_W + MARGIN) {
    const left = Math.min(Math.round(rect.x2 * W + MARGIN), W - DIALOG_W - MARGIN);
    hStyle = { left };
  } else if (spaceLeft >= DIALOG_W + MARGIN) {
    const right = Math.min(Math.round((1 - rect.x1) * W + MARGIN), W - DIALOG_W - MARGIN);
    hStyle = { right };
  } else {
    hStyle = { right: MARGIN };
  }

  // Vertical: anchor to whichever side of the selection has more room, so a selection near the
  // bottom grows UPWARD with a large max-height instead of being squeezed into a tiny box at the edge.
  const CAP = H - 2 * MARGIN;
  const selTop = Math.round(rect.y1 * H);
  const selBottom = Math.round(rect.y2 * H);
  const roomBelow = H - selTop - MARGIN;
  const roomAbove = selBottom - MARGIN;

  let vStyle: React.CSSProperties;
  if (roomBelow >= roomAbove) {
    const top = Math.max(MARGIN, selTop);
    vStyle = { top, maxHeight: Math.min(CAP, H - top - MARGIN) };
  } else {
    const bottom = Math.max(MARGIN, H - selBottom);
    vStyle = { bottom, maxHeight: Math.min(CAP, H - bottom - MARGIN) };
  }

  return { ...hStyle, ...vStyle };
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

type DialogScreen = 1 | 2 | 3 | "success";

interface FeedbackDialogProps {
  topicOptions: string[];
  loadingTopics: boolean;
  onSubmit: (form: FeedbackFormState) => Promise<void>;
  onClose: () => void;
  x: number;
  y: number;
  selectedRect: Rect;
  language: Language;
  onLanguageChange: (l: Language) => void;
}

export function FeedbackDialog({
  topicOptions,
  loadingTopics,
  onSubmit,
  onClose,
  x,
  y,
  selectedRect,
  language,
  onLanguageChange,
}: FeedbackDialogProps) {
  const [screen, setScreen] = useState<DialogScreen>(1);
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null);

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topicIsCustom, setTopicIsCustom] = useState(false);
  const [topicCustom, setTopicCustom] = useState("");

  const [whatHappened, setWhatHappened] = useState<WhatHappenedKey | null>(null);
  const [expectedIdx, setExpectedIdx] = useState<number | null>(null);
  const [desiredIdx, setDesiredIdx] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const t = translations[language];
  const emojis = EMOJI_BASE.map((e, i) => ({ ...e, label: t.emojiLabels[i] }));
  const types = TYPE_BASE.map((tp) => ({ ...tp, label: t.typeLabels[tp.value] }));
  const whatHappenedChips = WHAT_HAPPENED_BASE.map((h) => ({ ...h, label: t.wh[h.value] }));
  const expectedChips = t.expectedChipLabels.map((label, i) => ({ label, emoji: EXPECTED_EMOJIS[i] }));
  const desiredChips  = t.desiredChipLabels.map((label, i)  => ({ label, emoji: DESIRED_EMOJIS[i]  }));

  const stepNumber = typeof screen === "number" ? screen : null;
  const dialogStyle = getDialogStyle(selectedRect);

  function resolvedTopic() {
    if (topicIsCustom) return topicCustom.trim() || null;
    return selectedTopic;
  }

  function buildForm(): FeedbackFormState {
    return {
      feedback_type: feedbackType!,
      rating: rating!,
      context_topic: resolvedTopic(),
      what_happened: whatHappened,
      expected: expectedIdx !== null ? expectedChips[expectedIdx].label : null,
      desired:  desiredIdx  !== null ? desiredChips[desiredIdx].label   : null,
      comment: comment.trim() || null,
      x,
      y,
      screenshot_b64: null,
    };
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(false);
    try {
      await onSubmit(buildForm());
      setScreen("success");
      setTimeout(onClose, 1500);
    } catch {
      setSubmitError(true);
      setSubmitting(false);
    }
  }

  async function handleQuickSubmit() {
    setSubmitting(true);
    setSubmitError(false);
    try {
      await onSubmit({
        feedback_type: feedbackType ?? "bug",
        rating: rating!,
        context_topic: null,
        what_happened: null,
        expected: null,
        desired: null,
        comment: null,
        x,
        y,
        screenshot_b64: null,
      });
      setScreen("success");
      setTimeout(onClose, 1500);
    } catch {
      setSubmitError(true);
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="absolute w-80 rounded-2xl px-5 pb-6 pt-5 ring-1 ring-white/10 overflow-y-auto"
        style={{
          ...dialogStyle,
          backgroundColor: C.bg,
          boxShadow: "0 24px 80px rgba(0,0,0,0.65), 0 4px 24px rgba(0,0,0,0.4)",
        }}
      >

        {/* Header: progress track + controls */}
        <div className="mb-5 flex items-center gap-3">
          {stepNumber !== null ? (
            <div className="flex flex-1 gap-1.5">
              {([1, 2, 3] as const).map((s) => (
                <div key={s} className="h-0.5 flex-1 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: s <= stepNumber ? "100%" : "0%",
                      backgroundColor: C.primary,
                      transition: "width 350ms cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex flex-shrink-0 items-center gap-2">
            {screen !== "success" && (
              <LangToggle current={language} onChange={onLanguageChange} />
            )}
            <button
              onClick={onClose}
              className="rounded-md p-1 text-zinc-500 transition-colors duration-150 hover:text-zinc-200 active:scale-[0.93] focus:outline-none"
              aria-label="Close"
            >
              <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>

        {/* AI analysis banner */}
        {loadingTopics && screen !== 3 && screen !== "success" && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
            <span
              className="inline-block h-3 w-3 flex-shrink-0 animate-spin rounded-full border-2 border-zinc-700"
              style={{ borderTopColor: C.primary }}
            />
            {t.topicsLoading}
          </div>
        )}

        {/* ── Step 1: Emoji rating ── */}
        {screen === 1 && (
          <div>
            <p className="mb-5 text-center text-base font-medium text-zinc-200">{t.q1}</p>
            <div className="flex justify-center gap-2">
              {emojis.map(({ emoji, rating: r, label }) => {
                const isActive = rating === r;
                return (
                  <button
                    key={r}
                    type="button"
                    aria-label={label}
                    onClick={() => { setRating(r); setScreen(2); }}
                    className={`flex size-14 items-center justify-center rounded-full border-2 text-3xl transition-all duration-150 active:scale-[0.90] focus:outline-none ${
                      isActive ? "" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800"
                    }`}
                    style={isActive ? { borderColor: C.primary, backgroundColor: C.primaryFaint } : {}}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 2: Feedback type ── */}
        {screen === 2 && (
          <div>
            <button
              onClick={() => setScreen(1)}
              className="mb-4 flex items-center gap-1 text-sm text-zinc-500 transition-colors duration-150 hover:text-zinc-300 active:scale-[0.97]"
            >
              {t.back}
            </button>
            <p className="mb-5 text-center text-base font-medium text-zinc-200">{t.q2}</p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {types.map(({ value, emoji, label }) => {
                const isActive = feedbackType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setFeedbackType(value); setScreen(3); }}
                    className={`flex flex-1 min-w-[7rem] flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all duration-150 active:scale-[0.97] focus:outline-none ${
                      isActive
                        ? ""
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200"
                    }`}
                    style={isActive ? { borderColor: C.primary, backgroundColor: C.primaryFaint, color: C.ink } : {}}
                  >
                    <span className="text-2xl">{emoji}</span>
                    {label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleQuickSubmit}
              disabled={submitting}
              className="mt-5 w-full rounded-lg border border-zinc-800 py-2 text-sm text-zinc-500 transition-colors duration-150 hover:bg-zinc-900 hover:text-zinc-300 active:scale-[0.97] disabled:opacity-40"
            >
              {t.submitWithoutInfo}
            </button>
          </div>
        )}

        {/* ── Step 3: Full context ── */}
        {screen === 3 && (
          <div>
            <button
              onClick={() => setScreen(2)}
              className="mb-4 flex items-center gap-1 text-sm text-zinc-500 transition-colors duration-150 hover:text-zinc-300 active:scale-[0.97]"
            >
              {t.back}
            </button>

            {/* What were you trying to do? — AI chips */}
            <p className="mb-2 text-sm font-medium text-zinc-300">{t.q3}</p>
            {loadingTopics ? (
              <div className="mb-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 rounded-xl bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                  <span
                    className="inline-block h-3 w-3 flex-shrink-0 animate-spin rounded-full border-2 border-zinc-700"
                    style={{ borderTopColor: C.primary }}
                  />
                  {t.topicsLoading}
                </div>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-9 animate-pulse rounded-xl bg-zinc-800" />
                ))}
              </div>
            ) : (
              <div className="mb-4 flex flex-col gap-2">
                {topicOptions.length === 0 && (
                  <p className="mb-1 text-xs text-zinc-600">{t.topicsEmpty}</p>
                )}
                {topicOptions.map((option) => {
                  const isActive = !topicIsCustom && selectedTopic === option;
                  return (
                    <Chip
                      key={option}
                      active={isActive}
                      onClick={() => { setSelectedTopic(option); setTopicIsCustom(false); }}
                      className="w-full px-4 py-2.5 text-left active:scale-[0.98]"
                    >
                      {option}
                    </Chip>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setTopicIsCustom(!topicIsCustom)}
                  className={`w-full rounded-xl border-2 px-4 py-2.5 text-left text-sm font-medium transition-all duration-150 active:scale-[0.98] focus:outline-none ${
                    topicIsCustom
                      ? ""
                      : "border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
                  }`}
                  style={
                    topicIsCustom
                      ? { borderColor: C.primary, borderStyle: "solid", backgroundColor: C.primaryFaint, color: C.ink }
                      : {}
                  }
                >
                  {t.writeOwn}
                </button>
                {topicIsCustom && (
                  <input
                    autoFocus
                    value={topicCustom}
                    onChange={(e) => setTopicCustom(e.target.value)}
                    placeholder={t.writeOwnPlaceholder}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                  />
                )}
              </div>
            )}

            {/* What happened? */}
            <p className="mb-2 text-sm font-medium text-zinc-300">{t.q3Happened}</p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {whatHappenedChips.map(({ value, emoji, label }) => (
                <Chip
                  key={value}
                  active={whatHappened === value}
                  onClick={() => setWhatHappened(whatHappened === value ? null : value)}
                  className="flex items-center gap-2 px-3 py-2.5"
                >
                  <span>{emoji}</span>{label}
                </Chip>
              ))}
            </div>

            {/* What did you expect? */}
            <p className="mb-2 text-sm font-medium text-zinc-300">{t.qExpected}</p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {expectedChips.map(({ label, emoji }, i) => (
                <Chip
                  key={i}
                  active={expectedIdx === i}
                  onClick={() => setExpectedIdx(expectedIdx === i ? null : i)}
                  className="flex items-center gap-2 px-3 py-2.5"
                >
                  <span>{emoji}</span>{label}
                </Chip>
              ))}
            </div>

            {/* What would you like? */}
            <p className="mb-2 text-sm font-medium text-zinc-300">{t.qDesired}</p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {desiredChips.map(({ label, emoji }, i) => (
                <Chip
                  key={i}
                  active={desiredIdx === i}
                  onClick={() => setDesiredIdx(desiredIdx === i ? null : i)}
                  className="flex items-center gap-2 px-3 py-2.5"
                >
                  <span>{emoji}</span>{label}
                </Chip>
              ))}
            </div>

            {/* Optional comment */}
            <p className="mb-1 text-sm font-medium text-zinc-300">{t.commentLabel}</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              placeholder={t.commentPlaceholder}
              rows={2}
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
            />
            <p className="mb-4 mt-1 text-right text-xs text-zinc-600">{comment.length}/200</p>

            {/* Story preview */}
            {(() => {
              const topic = resolvedTopic();
              const whChip = whatHappenedChips.find(c => c.value === whatHappened);
              const exp = expectedIdx !== null ? expectedChips[expectedIdx] : null;
              const des = desiredIdx  !== null ? desiredChips[desiredIdx]   : null;
              return (
                <div className="mb-4 rounded-xl bg-zinc-900 px-4 py-3">
                  <p className="text-sm leading-relaxed text-zinc-400">
                    <span>{t.storyTrying} </span>
                    <span className={topic ? "font-medium text-zinc-200" : "italic text-zinc-700"}>
                      {topic ?? t.storyTopicPlaceholder}
                    </span>
                    {", "}
                    <span>{t.storyBut} </span>
                    <span className={whChip ? "font-medium text-zinc-200" : "italic text-zinc-700"}>
                      {whChip ? `${whChip.emoji} ${whChip.label}` : t.storyWhatPlaceholder}
                    </span>
                    {"."}
                    {exp && (
                      <span className="mt-0.5 block">
                        <span>{t.storyExpected}: </span>
                        <span className="font-medium text-zinc-200">{exp.emoji} {exp.label}</span>{"."}
                      </span>
                    )}
                    {des && (
                      <span className="mt-0.5 block">
                        <span>{t.storyDesired}: </span>
                        <span className="font-medium text-zinc-200">{des.emoji} {des.label}</span>{"."}
                      </span>
                    )}
                    {comment.trim() && (
                      <span className="mt-0.5 block italic text-zinc-500">"{comment.trim()}"</span>
                    )}
                  </p>
                </div>
              );
            })()}

            {submitError && <p className="mb-2 text-sm text-red-400">{t.submitError}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-lg py-3 text-sm font-semibold text-white transition-all duration-150 hover:brightness-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: C.primary }}
            >
              {submitting ? t.submitting : t.submitButton}
            </button>
          </div>
        )}

        {/* Success */}
        {screen === "success" && (
          <div className="py-10 text-center">
            <div
              className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full"
              style={{ backgroundColor: C.primaryFaint }}
            >
              <svg
                className="size-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: C.primary }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-200">{t.success}</p>
          </div>
        )}
      </div>
    </div>
  );
}
