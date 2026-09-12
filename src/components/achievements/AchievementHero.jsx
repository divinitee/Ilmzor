import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import AchievementMedal from "@/components/achievements/AchievementMedal";

const EASE = [0.16, 1, 0.3, 1];

// The featured, unlocked achievement — the whole top of the page.
export default function AchievementHero({ achievement }) {
  const { t } = useAppLang();
  const a = achievement;
  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, ease: EASE }}
      className="relative premium-card premium-grain overflow-hidden px-6 pt-10 pb-8 text-center"
      style={{ borderColor: "rgba(230,194,122,0.28)" }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(60% 45% at 50% 0%, rgba(230,194,122,0.16), transparent 70%), radial-gradient(50% 40% at 50% 100%, rgba(154,99,224,0.18), transparent 70%)" }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(243,222,163,0.7), transparent)" }} />

      <div className="relative flex flex-col items-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6c27a]/30 bg-[#e6c27a]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#f3dea3] select-none">
          <Sparkles className="w-3 h-3" /> {t("achievements.unlocked")}
        </span>

        <motion.div
          initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.15 }}
          className="mt-7 mb-6 neo-float"
        >
          <AchievementMedal tier={a.tier} unlocked size="lg" />
        </motion.div>

        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#d9b56d] select-none">{t(a.subtitleKey)}</p>
        <h1 className="mt-2 font-display text-3xl md:text-4xl font-semibold tracking-tight text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(180deg, #fff6dc 0%, #e6c27a 55%, #b08d57 100%)" }}>
          {t(a.titleKey)}
        </h1>
        <p className="mt-2 text-sm text-foreground/80">{t(a.criteriaKey)}</p>
        <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{t(a.descKey)}</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
          {a.permanent && <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-foreground/70">{t("achievements.permanent")}</span>}
          {a.exclusive && <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-foreground/70">{t("achievements.exclusive")}</span>}
          {a.unlockedAt && (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-foreground/70">
              {t("achievements.earned_on", { date: new Date(a.unlockedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) })}
            </span>
          )}
        </div>
      </div>
    </motion.section>
  );
}