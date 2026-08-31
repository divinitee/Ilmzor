import React from "react";
import { motion } from "framer-motion";
import { useAppLang } from "@/hooks/useAppLang";

// Shared support-language subtitle, used by TeachExperience, McqGateItem,
// and OpenGateItem — one implementation, not three. Reuses useAppLang as
// the single source of truth (no second localization mechanism). English
// always renders first and stays visually dominant; this renders beneath
// it, smaller and unbolded, only when the selected language isn't English
// and a translation exists for it.
//
// `support` is an object keyed by the same language codes as the rest of
// the app (uz/ru), e.g. { uz: "...", ru: "..." }. Applied selectively, by
// design — most English content has no `support` value and this renders
// nothing for it, which is correct: only difficult explanations,
// ambiguity-prone instructions, and important terminology should carry a
// translation, not every sentence.
export default function SupportSubtitle({ support, className = "" }) {
  const { lang } = useAppLang();
  if (lang === "en" || !support || !support[lang]) return null;
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className={`text-sm font-normal text-muted-foreground/80 ${className}`}
    >
      {support[lang]}
    </motion.p>
  );
}
