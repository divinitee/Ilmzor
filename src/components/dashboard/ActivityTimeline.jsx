import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Award } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import { DASH_STR } from "@/lib/dashboardData";

const ease = [0.22, 1, 0.36, 1];

export default function ActivityTimeline({ results }) {
  const { lang } = useAppLang();
  const s = DASH_STR[lang] || DASH_STR.en;

  const items = [];
  results.slice(0, 4).forEach((r) => {
    items.push({
      icon: CheckCircle2,
      color: "text-emerald-500",
      title: `${s.completedQuiz}: ${r.unit_name || "—"}`,
      sub: r.date || "",
      value: `${r.score || 0}/${r.total_questions || 30}`,
    });
  });
  // Pad with a demo achievement so the timeline never looks empty on first use
  if (items.length < 3) {
    items.push({
      icon: Award,
      color: "text-amber-500",
      title: s.achievement,
      sub: "7-day streak",
      value: "🔥",
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.05 }}
      className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-5 shadow-sm"
    >
      <h3 className="font-bold text-foreground mb-4">{s.recentActivity}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">{s.noActivity}</p>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
          <div className="space-y-4">
            {items.map((it, i) => {
              const Icon = it.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease, delay: 0.1 * i }}
                  className="relative flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center flex-shrink-0 z-10">
                    <Icon className={`w-4 h-4 ${it.color}`} />
                  </div>
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{it.title}</p>
                      <p className="text-xs text-muted-foreground">{it.sub}</p>
                    </div>
                    <span className="text-xs font-bold text-foreground bg-muted/60 px-2 py-1 rounded-lg flex-shrink-0 ml-2">{it.value}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}