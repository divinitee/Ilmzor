import React from "react";
import { useTranslationLang } from "@/hooks/useTranslationLang";
import { Languages } from "lucide-react";

export default function TranslationLangToggle({ compact = false }) {
  const { lang, setLang } = useTranslationLang();

  const options = [
    { value: "both", label: "Uz+Ru", short: "Uz+Ru" },
    { value: "uz", label: "O'zbek", short: "Uz" },
    { value: "ru", label: "Русский", short: "Ru" },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-1 bg-muted/60 rounded-full p-1 select-none">
        {options.map(o => (
          <button
            key={o.value}
            onClick={() => setLang(o.value)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
              lang === o.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.short}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-background rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Languages className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Tarjima tili</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {options.map(o => (
          <button
            key={o.value}
            onClick={() => setLang(o.value)}
            className={`py-2.5 rounded-xl text-xs font-semibold transition-all select-none ${
              lang === o.value ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">So'zlar ro'yxatida qaysi tarjimani ko'rishni tanlang</p>
    </div>
  );
}