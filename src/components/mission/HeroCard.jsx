import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Play, ArrowRight } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import LearnerProfile from "@/components/profile/LearnerProfile";
import SkillMap from "@/components/profile/skillmap/SkillMap";

// skillStates: the RAW server SkillState rows from MissionControl's
// useSkillState (null while loading). Passed through untouched.
export default function HeroCard({ accent, accentGlow, onContinue, skillStates, skillStateError }) {
  const { t } = useAppLang();
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

        <div className="relative mt-3">
          <SkillMap fallback={<LearnerProfile skillStates={skillStates} error={skillStateError} />} />
        </div>
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