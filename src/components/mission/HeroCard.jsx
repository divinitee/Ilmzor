import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Play, ArrowRight } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import SkillWeb from "./SkillWeb";

export default function HeroCard({ accent, accentGlow, onContinue, skillHub }) {
  const { t } = useAppLang();
  // skillHub: { rows, overall } — rows from getRemoteSkillProgress (always
  // all 5 SKILLS, zero-filled), overall from summarizeSkillProgress. Both
  // null while loading. This is real, cross-device Skill Hub mastery, not a
  // static/generic label — the hero used to show the old unit-vocab-quiz
  // system's current path/unit here; that system still exists but is no
  // longer the dashboard's headline feature (nor linked from the dashboard
  // at all anymore — the old Vocab Journey entry point was removed).
  const rows = skillHub?.rows;
  const hasPlays = (skillHub?.overall?.plays || 0) > 0;
  return (
    <div className="relative">
      <span className="neo-bloom neo-bloom-blue" aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative premium-card mission-sweep p-5 md:p-6 overflow-hidden"
      >
        <div className="relative flex items-center gap-2 mb-3">
          <span className="neo-pill px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-200">
            <Sparkles className="w-3 h-3" /> {t("dashboard.missionControl")}
          </span>
        </div>
        <h2 className="relative text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          {t("dashboard.skillHubHeroTitle")}
        </h2>

        {rows ? (
          <div className="relative mt-2">
            {!hasPlays && (
              <p className="text-xs text-muted-foreground text-center mb-1">{t("dashboard.skillHubHeroEmpty")}</p>
            )}
            <SkillWeb rows={rows} />
            {hasPlays && (
              <p className="text-[11px] text-muted-foreground text-center -mt-1">
                {t("dashboard.skillHubStat", { pct: skillHub.overall.avgMastery, n: skillHub.overall.plays })}
              </p>
            )}
          </div>
        ) : (
          <div className="relative mt-4 h-56 rounded-2xl border border-white/10 bg-white/[0.03] animate-pulse" />
        )}
        <button
          onClick={onContinue}
          className="hero-continue relative mt-5 w-full h-14 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 select-none overflow-hidden"
          style={{ background: `linear-gradient(180deg, ${accent}, #1d4ed8)`, "--accent-glow": accentGlow }}
        >
          <Play className="w-5 h-5" /> {t("dashboard.continue")} <ArrowRight className="w-4 h-4 opacity-80" />
        </button>
      </motion.div>
    </div>
  );
}