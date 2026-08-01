import React, { useState, useEffect, useRef } from "react";
import { Globe, Check } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import { APP_LANGS } from "@/i18n/translations";

export default function LanguageMenu() {
  const { lang, setLang, t } = useAppLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const current = APP_LANGS.find((l) => l.id === lang) || APP_LANGS[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Change language"
        className="h-9 px-2.5 rounded-xl border border-slate-200 landing-dark:border-slate-700 bg-white landing-dark:bg-slate-900 text-slate-600 landing-dark:text-slate-300 flex items-center gap-1.5 hover:border-blue-300 landing-dark:hover:border-blue-500 transition-colors select-none text-xs font-semibold"
      >
        <Globe className="w-4 h-4" /> {current.short}
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-52 rounded-2xl border border-slate-200 landing-dark:border-slate-700 bg-white landing-dark:bg-slate-900 shadow-xl p-1.5 z-50">
          {APP_LANGS.map((l) => (
            <button
              key={l.id}
              onClick={() => { setLang(l.id); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors select-none ${
                lang === l.id
                  ? "bg-blue-50 landing-dark:bg-blue-950/50 text-blue-600 landing-dark:text-blue-300"
                  : "text-slate-600 landing-dark:text-slate-300 hover:bg-slate-50 landing-dark:hover:bg-slate-800"
              }`}
            >
              <span className="text-base">{l.flag}</span>
              <span className="flex-1 text-left">{l.label}</span>
              {lang === l.id && <Check className="w-4 h-4" />}
            </button>
          ))}
          <div className="my-1.5 premium-divider" />
          <div className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-400 landing-dark:text-slate-500 select-none">
            <span className="tracking-[0.2em]">•••</span>
            <span>{t("landing.lang.more_coming")}</span>
          </div>
        </div>
      )}
    </div>
  );
}