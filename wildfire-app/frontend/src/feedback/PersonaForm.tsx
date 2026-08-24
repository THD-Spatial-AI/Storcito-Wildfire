import { useState } from "react";
import type { Language, PersonaData } from "./types";
import type { Translations } from "./i18n";
import { C } from "./theme";

interface Props {
  onComplete: (data: PersonaData) => void;
  onClose: () => void;
  lang: Language;
  t: Translations;
}

const FAMILIARITY_KEYS: PersonaData["app_familiarity"][] = [
  "first_time",
  "used_before",
  "regular",
];
const COMFORT_KEYS: Array<"basic" | "comfortable" | "advanced"> = [
  "basic",
  "comfortable",
  "advanced",
];

interface ChipGroupProps<T extends string> {
  options: { label: string; value: T }[];
  selected: T | "";
  onSelect: (v: T) => void;
}

function ChipGroup<T extends string>({ options, selected, onSelect }: ChipGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ label, value }) => {
        const active = selected === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={`rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-all duration-150 focus:outline-none active:scale-[0.97] ${
              active
                ? "text-white"
                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
            }`}
            style={active ? { backgroundColor: C.primary, borderColor: C.primary } : {}}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function PersonaForm({ onComplete, onClose, t }: Props) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [organization, setOrganization] = useState("");
  const [appFamiliarity, setAppFamiliarity] = useState<PersonaData["app_familiarity"] | "">("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [digitalComfort, setDigitalComfort] = useState<"basic" | "comfortable" | "advanced" | "">("");

  const canSubmit =
    name.trim().length > 0 &&
    role.trim().length > 0 &&
    organization.trim().length > 0 &&
    appFamiliarity !== "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onComplete({
      name: name.trim(),
      role: role.trim(),
      organization: organization.trim(),
      app_familiarity: appFamiliarity as PersonaData["app_familiarity"],
      years_experience: yearsExperience.trim(),
      digital_comfort: digitalComfort,
    });
  }

  const inputClass =
    "w-full rounded-lg border-2 border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors duration-150";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl ring-1 ring-white/10"
        style={{
          backgroundColor: C.bg,
          boxShadow: "0 24px 80px rgba(0,0,0,0.65), 0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between rounded-t-2xl border-b border-zinc-800 bg-zinc-900 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">{t.personaTitle}</h2>
            <p className="mt-1 text-sm text-zinc-400">{t.personaSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 mt-0.5 flex-shrink-0 rounded-full p-1.5 text-zinc-500 transition-colors duration-150 hover:bg-zinc-800 hover:text-zinc-200 active:scale-[0.93] focus:outline-none"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-zinc-300">
              {t.personaName} <span className="font-normal text-zinc-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.personaNamePlaceholder}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-zinc-300">
              {t.personaRole} <span className="font-normal text-zinc-600">*</span>
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={t.personaRolePlaceholder}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-zinc-300">
              {t.personaOrg} <span className="font-normal text-zinc-600">*</span>
            </label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder={t.personaOrgPlaceholder}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-300">
              {t.personaFamiliarity} <span className="font-normal text-zinc-600">*</span>
            </label>
            <ChipGroup
              options={t.personaFamOpts.map((label, i) => ({
                label,
                value: FAMILIARITY_KEYS[i],
              }))}
              selected={appFamiliarity}
              onSelect={setAppFamiliarity}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-zinc-300">
              {t.personaExperience}
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              placeholder={t.personaExperiencePlaceholder}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-300">
              {t.personaComfort}
            </label>
            <ChipGroup
              options={t.personaComfortOpts.map((label, i) => ({
                label,
                value: COMFORT_KEYS[i],
              }))}
              selected={digitalComfort}
              onSelect={setDigitalComfort}
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full rounded-xl py-3 text-base font-bold transition-all duration-150 focus:outline-none active:scale-[0.97] ${
              canSubmit
                ? "text-white hover:brightness-90"
                : "cursor-not-allowed bg-zinc-800 text-zinc-500"
            }`}
            style={canSubmit ? { backgroundColor: C.primary } : {}}
          >
            {t.personaSubmit}
          </button>
        </form>
      </div>
    </div>
  );
}
