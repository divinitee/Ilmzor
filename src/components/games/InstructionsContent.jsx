import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Target, Lightbulb } from "lucide-react";
import { GAME_SKILL_MAP, SKILLS } from "@/lib/gameSkills";
import { useAppLang } from "@/hooks/useAppLang";

export default function InstructionsContent({ gameId, defaultOpen }) {
  const { t, translations, lang } = useAppLang();
  const [open, setOpen] = useState(false);

  const seenKey = `vm_seen_intro_${gameId}`;
  const firstTime = typeof window !== "undefined" && !localStorage.getItem(seenKey);

  useEffect(() => {
    if (gameId && firstTime) {
      try { localStorage.setItem(seenKey, "1"); } catch { /* ignore */ }
    }
    setOpen(defaultOpen !== undefined ? defaultOpen : firstTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const card = translations[lang]?.games?.cards?.[gameId];
  const skillKey = GAME_SKILL_MAP[gameId];
  const skill = SKILLS.find(s => s.key === skillKey);
  const instructions = card?.instructions || [];

  return (
    <div className="bg-gradient-to-br from-indigo-500/5 to-violet-500/5 border border-indigo-200 dark:border-indigo-800 rounded-2xl mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 select-none"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          {t("games.how_to_play")}
          {firstTime && <span className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {skill && (
                <div className="flex items-center gap-2 mb-3 bg-primary/10 rounded-lg px-3 py-2">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground">{t("games.target_skill")}</span>
                  <span className="text-xs font-bold text-primary">{skill.emoji} {t(`games.skills.${skill.key}`)}</span>
                </div>
              )}
              <ol className="space-y-2">
                {instructions.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-xs text-foreground/90">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              {card?.tip && (
                <p className="text-xs text-muted-foreground bg-amber-500/10 rounded-lg px-3 py-2 mt-3">💡 {card.tip}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}