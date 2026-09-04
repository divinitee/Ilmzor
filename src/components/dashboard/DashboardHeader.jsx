import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, ArrowRight, Target, ChevronDown } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import { DASH_STR, getLearningGoal, getGreetingKey } from "@/lib/dashboardData";
import { resolveUserName } from "@/lib/profileName";

const ease = [0.22, 1, 0.36, 1];

export default function DashboardHeader({ user, selectedUnit, selectedUnitName, onOpenUnitDrawer }) {
  const { lang } = useAppLang();
  const s = DASH_STR[lang] || DASH_STR.en;
  const greeting = s[getGreetingKey()];
  // Never falls back to the email: an email-derived name is a placeholder, not
  // something the student chose (see profileName.js).
  const name = (resolveUserName(user).split(" ")[0]) || "Learner";
  const goal = getLearningGoal(lang);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <p className="text-sm text-muted-foreground">{greeting},</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          {name} <span className="inline-block">👋</span>
        </h1>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur-sm px-3 py-1.5">
          <Target className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-foreground">{goal}</span>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.1 }} className="mt-5">
        <Link to={`/quiz/${selectedUnit}`} className="block">
          <motion.div
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 sm:p-5 shadow-[0_10px_40px_-12px_rgba(37,99,235,0.55)]"
          >
            <div className="absolute inset-0 premium-mesh opacity-40 pointer-events-none" />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-white font-bold text-base sm:text-lg leading-tight">{s.continueLearning}</p>
                <p className="text-blue-100 text-xs sm:text-sm truncate">{s.resume}: {selectedUnitName || "—"}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-white flex-shrink-0" />
            </div>
          </motion.div>
        </Link>
        <button
          onClick={onOpenUnitDrawer}
          className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors select-none"
        >
          <ChevronDown className="w-3.5 h-3.5" />{s.changeUnit}
        </button>
      </motion.div>
    </div>
  );
}