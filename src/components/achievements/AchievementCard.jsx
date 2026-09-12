import React from "react";
import { motion } from "framer-motion";
import { useAppLang } from "@/hooks/useAppLang";
import AchievementMedal from "@/components/achievements/AchievementMedal";

// Compact row for the achievements list — unlocked rows keep a faint gold
// edge; locked rows explain how to earn the badge.
export default function AchievementCard({ achievement, index = 0 }) {
  const { t } = useAppLang();
  const a = achievement;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 + index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className={`premium-card flex items-center gap-4 p-4 ${a.unlocked ? "" : "opacity-80"}`}
      style={a.unlocked ? { borderColor: "rgba(230,194,122,0.22)" } : undefined}
    >
      <AchievementMedal tier={a.tier} unlocked={a.unlocked} size="md" />
      <div className="min-w-0 flex-1">
        <p className={`text-[10px] font-bold uppercase tracking-[0.22em] ${a.unlocked ? "text-[#d9b56d]" : "text-muted-foreground"}`}>
          {t(a.subtitleKey)}
        </p>
        <h3 className="mt-0.5 font-display text-base font-semibold text-foreground truncate">{t(a.titleKey)}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {a.unlocked ? t(a.criteriaKey) : t(a.lockedHintKey)}
        </p>
      </div>
      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] ${a.unlocked ? "border border-[#e6c27a]/30 bg-[#e6c27a]/10 text-[#f3dea3]" : "border border-white/10 bg-white/[0.03] text-muted-foreground"}`}>
        {a.unlocked ? t("achievements.unlocked") : t("achievements.locked")}
      </span>
    </motion.div>
  );
}