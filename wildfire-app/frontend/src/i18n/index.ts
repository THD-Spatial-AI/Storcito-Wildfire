import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Wildfire-owned locales. These already include the app-specific overrides
// (branding, tour copy) merged into the base strings — see src/i18n/locales.
import en from "./locales/en.json";
import de from "./locales/de.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import it from "./locales/it.json";
import nl from "./locales/nl.json";
import pl from "./locales/pl.json";
import cs from "./locales/cs.json";
import el from "./locales/el.json";

// Language configuration
export const languages = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱" },
  { code: "cs", name: "Czech", nativeName: "Čeština", flag: "🇨🇿" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", flag: "🇬🇷" },
] as const;

export type LanguageCode = (typeof languages)[number]["code"];

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

// All translation resources
const resources = {
  en: { translation: en },
  de: { translation: de },
  es: { translation: es },
  fr: { translation: fr },
  it: { translation: it },
  nl: { translation: nl },
  pl: { translation: pl },
  cs: { translation: cs },
  el: { translation: el },
};

export interface I18nConfig {
  /** Storage key for persisting language selection */
  storageKey?: string;
  /** Fallback language if detection fails */
  fallbackLng?: LanguageCode;
  /** Enable debug mode */
  debug?: boolean;
}

/**
 * Initialize i18n with configuration
 */
export const initI18n = (config: I18nConfig = {}) => {
  const { storageKey = "app_language", fallbackLng = "en", debug = false } = config;

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng,
      defaultNS: "translation",

      // Language detection options
      detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        caches: ["localStorage"],
        lookupLocalStorage: storageKey,
      },

      interpolation: {
        escapeValue: false, // React already escapes values
      },

      // React specific options
      react: {
        useSuspense: false,
        bindI18n: "languageChanged loaded",
        bindI18nStore: "added removed",
      },

      debug,
    });

  return i18n;
};

/**
 * Get current language info
 */
export const getCurrentLanguage = (): Language => {
  const code = i18n.language?.split("-")[0] || "en";
  return languages.find((l) => l.code === code) || languages[0];
};

/**
 * Change the current language
 */
export const changeLanguage = async (
  code: LanguageCode,
  storageKey = "app_language"
): Promise<void> => {
  await i18n.changeLanguage(code);
  localStorage.setItem(storageKey, code);
};

/**
 * Get all available languages
 */
export const getLanguages = (): readonly Language[] => languages;

// Re-export useful items from react-i18next
export { useTranslation } from "react-i18next";
export { Trans } from "react-i18next";
export { i18n };

// Export locale JSON files for apps that want to extend/override
export { en, de, es, fr, it, nl, pl, cs, el };
