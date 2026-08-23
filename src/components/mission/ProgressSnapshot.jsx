import React from "react";
import { motion } from "framer-motion";
import { BookOpen, Flame, Star, Clock, RotateCw } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";

function Tile({ label, value, sub, icon: Icon }) {
  const empty = value === "—";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md"
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${empty ? "text-muted-foreground/50" : "text-foreground"}`}>{value}</span>
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </div>
    </motion.div>
  );
}

export default function ProgressSnapshot({ totalCorrect, streak, xp }) {
  const { t } = useAppLang();
  return (
    <section className="premium-card p-5 md:p-6">
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">{t("dashboard.progressSnapshot")}</h3>
      <div className="grid grid-cols-2 gap-2.5">
        <Tile label={t("dashboard.wordsLearned")} value={totalCorrect} icon={BookOpen} />
        <Tile label={t("dashboard.streak")} value={streak} sub={t("dashboard.days")} icon={Flame} />
        <Tile label={t("dashboard.currentXp")} value={xp} icon={Star} />
        <Tile label={t("dashboard.wordsDue")} value="—" sub={t("dashboard.noSrs")} icon={RotateCw} />
        <Tile label={t("dashboard.studyToday")} value="—" sub={t("dashboard.min")} icon={Clock} />
      </div>
      <p className="text-[10px] text-muted-foreground/70 mt-3 leading-relaxed">
        {t("dashboard.progressNote")}
      </p>
    </section>
  );
}