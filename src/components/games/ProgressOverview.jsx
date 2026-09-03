import React from "react";
import { motion } from "framer-motion";
import SkillRadar from "@/components/games/SkillRadar";
import { getOverallStats, getSkillStats, SKILLS } from "@/lib/gameSkills";
import { useAppLang } from "@/hooks/useAppLang";

export default function ProgressOverview({ xp = 0 }) {
  const { t } = useAppLang();
  const overall = getOverallStats();
  const all = getSkillStats();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-background border border-border rounded-2xl p-4 mb-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-sm font-bold text-foreground">{t("games.skills_title")}</h3>
          <p className="text-xs text-muted-foreground">{t("games.skills_sub")}</p>
        </div>
        <span className="text-2xl">🕸️</span>
      </div>

      <div className="bg-gradient-to-br from-indigo-500/5 to-violet-500/5 rounded-xl py-1">
        <SkillRadar />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2">
        <div className="bg-amber-500/10 rounded-xl py-2 text-center">
          <p className="text-base font-bold text-amber-600">⚡ {xp}</p>
          <p className="text-[10px] text-muted-foreground">{t("games.coins")}</p>
        </div>
        <div className="bg-emerald-500/10 rounded-xl py-2 text-center">
          <p className="text-base font-bold text-emerald-600">🎮 {overall.plays}</p>
          <p className="text-[10px] text-muted-foreground">{t("games.games_played")}</p>
        </div>
        <div className="bg-primary/10 rounded-xl py-2 text-center">
          <p className="text-base font-bold text-primary">⭐ {overall.avgMastery}%</p>
          <p className="text-[10px] text-muted-foreground">{t("games.avg_mastery")}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {SKILLS.map(s => {
          const v = all[s.key] || { best: 0, plays: 0 };
          return (
            <div key={s.key} className="flex items-center gap-2.5">
              <span className="w-5 text-center text-sm">{s.emoji}</span>
              <span className="text-xs text-muted-foreground w-24 truncate">{t(`games.skills.${s.key}`)}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${v.best}%` }}
                  className="h-full rounded-full"
                  style={{ background: s.color }}
                />
              </div>
              <span className="text-xs font-semibold text-foreground w-9 text-right">{v.best}%</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}