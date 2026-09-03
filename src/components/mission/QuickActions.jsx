import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { RotateCw, Layers, Shuffle, BarChart3, Clock } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";

// Ask AI Teacher and Vocabulary Library were removed for now (unclear value
// / not wired to anything yet). Review Due Words and Deep Mode both depend
// on systems that don't exist yet (SRS, Deep Mode itself) so they show as
// Coming Soon instead of silently doing nothing. Random Challenge is the
// only fully live action — it launches a real random Skill Hub game.
export default function QuickActions({ onNavigate, accent }) {
  const { t } = useAppLang();
  const actions = [
    { id: "review", label: t("dashboard.qaReview"), icon: RotateCw, comingSoon: true },
    { id: "deep", label: t("dashboard.qaDeep"), icon: Layers, comingSoon: true },
    { id: "random", label: t("dashboard.qaRandom"), icon: Shuffle, comingSoon: false, onClick: () => onNavigate("skillhub-random") },
  ];
  return (
    <section>
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3 px-1">{t("dashboard.quickActions")}</h3>
      <div className="grid grid-cols-2 gap-2.5">
        {actions.map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.button
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={a.comingSoon ? undefined : a.onClick}
              disabled={a.comingSoon}
              whileHover={a.comingSoon ? undefined : { y: -2 }}
              whileTap={a.comingSoon ? undefined : { scale: 0.97 }}
              className={`relative group rounded-2xl border p-3.5 flex flex-col items-start gap-2 transition-colors select-none ${
                a.comingSoon
                  ? "border-white/5 bg-white/[0.02] opacity-60 cursor-default"
                  : "border-white/10 bg-white/[0.04] backdrop-blur-md hover:border-white/25 hover:bg-white/[0.07]"
              }`}
            >
              {a.comingSoon && (
                <span className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/80 bg-white/5 rounded-full px-1.5 py-0.5">
                  <Clock className="w-2.5 h-2.5" /> {t("dashboard.comingSoon")}
                </span>
              )}
              <span className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center transition-colors group-hover:bg-white/10">
                <Icon className="w-4 h-4 text-foreground/80 group-hover:text-foreground" />
              </span>
              <span className="text-xs font-semibold text-foreground leading-tight">{a.label}</span>
            </motion.button>
          );
        })}
        <Link to="/analytics" className="col-span-2 group">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -2 }}
            className="rounded-2xl border p-4 flex items-center gap-3 select-none"
            style={{ borderColor: "rgba(167,139,250,0.4)", background: "linear-gradient(180deg, rgba(167,139,250,0.14), rgba(167,139,250,0.04))" }}
          >
            <span className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-purple-300" />
            </span>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-bold text-foreground">{t("dashboard.premiumAnalytics")}</p>
              <p className="text-[11px] text-muted-foreground">{t("dashboard.premiumAnalyticsDesc")}</p>
            </div>
          </motion.div>
        </Link>
      </div>
    </section>
  );
}
