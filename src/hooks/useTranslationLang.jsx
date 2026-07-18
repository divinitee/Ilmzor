import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "vocab_translation_lang";
export const LANG_OPTIONS = ["both", "uz", "ru"];

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "both";
  } catch {
    return "both";
  }
}

export function useTranslationLang() {
  const [lang, setLangState] = useState(readStored);

  useEffect(() => {
    const handler = () => setLangState(readStored());
    window.addEventListener("vocab-lang-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("vocab-lang-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setLang = useCallback((val) => {
    try { localStorage.setItem(STORAGE_KEY, val); } catch {}
    setLangState(val);
    window.dispatchEvent(new Event("vocab-lang-change"));
  }, []);

  const showUz = lang === "both" || lang === "uz";
  const showRu = lang === "both" || lang === "ru";

  return { lang, setLang, showUz, showRu, options: LANG_OPTIONS };
}