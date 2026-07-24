import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import { APP_LANGS } from "@/i18n/translations";

export default function LanguageSelector() {
  const { lang, setLang } = useAppLang();

  return (
    <div className="grid grid-cols-3 gap-2">
      {APP_LANGS.map((l, i) => {
        const active = lang === l.id;
        return (
          <motion.button
            key={l.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            onClick={() => setLang(l.id)}
            className={`relative flex flex-col items-center gap-1 py-3 rounded-xl border-2 select-none transition-all ${
              active ? "border-primary bg-primary/10 shadow-sm" : "border-border hover:border-primary/40"
            }`}
          >
            <span className="text-2xl leading-none">{l.flag}</span>
            <span className={`text-xs font-semibold ${active ? "text-primary" : "text-foreground"}`}>{l.label}</span>
            <span className="text-[10px] text-muted-foreground">{l.short}</span>
            {active && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-primary-foreground" />
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}