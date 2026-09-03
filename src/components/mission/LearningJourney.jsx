import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";

// The original unit-based vocabulary quiz system (VocabularyWord units,
// /quiz/:unitKey) — this project's original focus before Skill Hub/the
// Learning Path took over as the main product. Still a real, working
// feature, just a secondary one now: this card is its home on the
// dashboard, no longer the hero (see HeroCard, now Skill Hub mastery).
export default function LearningJourney({ path, unit, selectedUnit, moduleNum, accent, onOpenUnitDrawer }) {
  const { t } = useAppLang();
  const navigate = useNavigate();
  const nodes = [
    { label: t("dashboard.journeyVocab"), icon: "📚" },
    { label: path, icon: "🧭" },
    { label: t("dashboard.journeyModule", { n: moduleNum }), icon: "📦" },
    { label: unit || t("dashboard.journeyPickUnit"), icon: "📖" },
    { label: t("dashboard.journeyToday"), icon: "✨" },
  ];
  const handleClick = () => {
    if (selectedUnit) navigate(`/quiz/${selectedUnit}`);
    else onOpenUnitDrawer?.();
  };
  return (
    <section
      role={onOpenUnitDrawer || selectedUnit ? "button" : undefined}
      tabIndex={onOpenUnitDrawer || selectedUnit ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClick(); }}
      className="premium-card p-5 md:p-6 cursor-pointer select-none hover:bg-white/[0.03] transition-colors"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">{t("dashboard.learningJourney")}</h3>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="space-y-0">
        {nodes.map((n, i) => {
          const isLast = i === nodes.length - 1;
          return (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="w-9 h-9 rounded-xl border border-white/15 bg-white/[0.05] backdrop-blur-md flex items-center justify-center text-base flex-shrink-0"
                  style={isLast ? { borderColor: accent, boxShadow: `0 0 18px -4px ${accent}` } : undefined}
                >
                  {n.icon}
                </motion.div>
                {!isLast && <span className="w-px flex-1 my-1 bg-gradient-to-b from-white/20 to-transparent" style={{ minHeight: 16 }} />}
              </div>
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 + 0.05 }}
                className={`text-sm pt-2 ${isLast ? "font-bold text-foreground" : "text-foreground/80"}`}
              >
                {n.label}
              </motion.span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
