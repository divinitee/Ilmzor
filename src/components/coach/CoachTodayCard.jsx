import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { coachApi } from "@/lib/serverApi";
import { useAppLang } from "@/hooks/useAppLang";
import { coachT, COACH_NAMES, COACH_COLORS } from "@/lib/coach/coachCopy";

// Home entry point for the Coach (VT-40 Stage 3). Cheap: only `whoami`
// (who your coach is). The plan itself is built when the student opens /coach.
export default function CoachTodayCard() {
  const navigate = useNavigate();
  const { lang } = useAppLang();
  const [who, setWho] = useState(null);
  useEffect(() => { coachApi("whoami", {}).then(setWho).catch(() => setWho({ persona: "vira" })); }, []);
  const persona = who?.persona || "vira";
  const color = COACH_COLORS[persona];
  const t = coachT(lang, persona);
  const minutes = persona === "vi" ? 15 : 10;
  return (
    <motion.button data-tour="coach" onClick={() => navigate("/coach")}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.99 }}
      className="w-full text-left rounded-[24px] border border-white/10 p-5 flex items-center gap-4 select-none"
      style={{ background: `linear-gradient(135deg, ${color}26, transparent 70%)` }}>
      <motion.span aria-hidden="true" className="w-12 h-12 rounded-full shrink-0"
        style={{ background: `radial-gradient(circle at 30% 30%, #fff8, ${color} 45%, #0006)`, boxShadow: `0 0 24px ${color}55` }}
        animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 3, repeat: Infinity }} />
      <span className="flex-1 min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>{COACH_NAMES[persona]}</span>
        <span className="block text-base font-bold text-foreground">{t("today_title")}</span>
        <span className="block text-xs text-muted-foreground">{t("today_sub", { n: minutes })}</span>
      </span>
      <ArrowRight className="w-5 h-5 text-foreground/70" />
    </motion.button>
  );
}
