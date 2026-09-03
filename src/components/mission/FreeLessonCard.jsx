import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Gift, ArrowRight } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";

// Lesson.id for "Talking About Your Day" — Lesson 1 of the new Learning Path,
// deliberately given away free (no subscription check in LessonRunner) as a
// conversion hook. This card is the only in-app discovery path to it today;
// see LessonRunner.jsx's header comment.
const FREE_LESSON_ID = "6a9562a427021c1279709e25";

export default function FreeLessonCard() {
  const { t } = useAppLang();
  return (
    <Link to={`/lesson/${FREE_LESSON_ID}`} className="block group">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="relative rounded-2xl border p-4 flex items-center gap-3 select-none overflow-hidden"
        style={{
          borderColor: "rgba(245,158,11,0.4)",
          background: "linear-gradient(180deg, rgba(245,158,11,0.16), rgba(245,158,11,0.04))",
        }}
      >
        <span className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Gift className="w-5 h-5 text-amber-400" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">
              {t("dashboard.freeLessonBadge")}
            </span>
          </div>
          <p className="text-sm font-bold text-foreground leading-tight truncate">{t("dashboard.freeLessonTitle")}</p>
          <p className="text-[11px] text-muted-foreground truncate">{t("dashboard.freeLessonDesc")}</p>
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 flex-shrink-0 pr-1">
          {t("dashboard.freeLessonCta")}
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </motion.div>
    </Link>
  );
}
