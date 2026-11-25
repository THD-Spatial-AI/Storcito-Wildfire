import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// wildfire-owned locales
import en from "./locales/en.json";
import de from "./locales/de.json";
import es from "./locales/es.json";
import gl from "./locales/gl.json";
import pt from "./locales/pt.json";
import el from "./locales/el.json";

// language configuration
export const languages = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "gl", name: "Galician", nativeName: "Galego", flag: "🇪🇸" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", flag: "🇬🇷" },
] as const;

export type LanguageCode = (typeof languages)[number]["code"];

interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

// all translation resources
const resources = {
  en: { translation: en },
  de: { translation: de },
  es: { translation: es },
  gl: { translation: gl },
  pt: { translation: pt },
  el: { translation: el },
};

interface I18nConfig {
  /** storage key persisting */
  storageKey?: string;
  /** fallback language detection */
  fallbackLng?: LanguageCode;
  /** enable debug mode */
  debug?: boolean;
}

/** initialize i18n configuration */
export const initI18n = (config: I18nConfig = {}) => {
  const { storageKey = "app_language", fallbackLng = "en", debug = false } = config;

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      // removed codes fallback
      supportedLngs: languages.map((l) => l.code),
      fallbackLng,
      defaultNS: "translation",

      // language detection options
      detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        caches: ["localStorage"],
        lookupLocalStorage: storageKey,
      },

      interpolation: {
        escapeValue: false, // react escapes values
      },

      // react specific options
      react: {
        useSuspense: false,
        bindI18n: "languageChanged loaded",
        bindI18nStore: "added removed",
      },

      debug,
    });

  return i18n;
};

/** get current language */
export const getCurrentLanguage = (): Language => {
  const code = i18n.language?.split("-")[0] || "en";
  return languages.find((l) => l.code === code) || languages[0];
};

/** change current language */
export const changeLanguage = async (
  code: LanguageCode,
  storageKey = "app_language"
): Promise<void> => {
  await i18n.changeLanguage(code);
  localStorage.setItem(storageKey, code);
};

// re-export useful items
export { useTranslation } from "react-i18next";
