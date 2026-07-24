import { useState, useEffect, useCallback } from "react";
import { translations, DEFAULT_LANG, VALID_LANGS, resolveKey } from "@/i18n/translations";

const STORAGE_KEY = "app_lang";
const EVENT_NAME = "applangchange";

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && VALID_LANGS.includes(v)) return v;
  } catch { /* ignore */ }
  return DEFAULT_LANG;
}

function persist(lang) {
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function useAppLang() {
  const [lang, setLangState] = useState(readStored);

  useEffect(() => {
    const handler = () => setLangState(readStored());
    window.addEventListener(EVENT_NAME, handler);
    // sync across tabs
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setLang = useCallback((next) => {
    if (!VALID_LANGS.includes(next)) return;
    persist(next);
    setLangState(next);
  }, []);

  const t = useCallback((key, vars) => {
    const dict = translations[lang] || translations[DEFAULT_LANG];
    let str = resolveKey(dict, key) ?? resolveKey(translations[DEFAULT_LANG], key) ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return str;
  }, [lang]);

  return { lang, setLang, t, translations };
}

// module-level accessor for non-hook contexts
export function getAppLang() {
  return readStored();
}