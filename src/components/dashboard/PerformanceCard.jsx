import React from "react";
import { motion } from "framer-motion";
import { Gauge, RefreshCw, ArrowUp, ArrowDown, Layers } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import { DASH_STR, DEMO, computeStats } from "@/lib/dashboardData";

const ease = [0.22, 1, 0.36, 1];

export default function PerformanceCard({ results }) {
  const { lang } = useAppLang();
  const s = DASH_STR[lang] || DASH_STR.en;
  const { accuracy } = computeStats(results);
  const avgAcc = results.length > 0 ? accuracy : 78;

  const rows = [
    { icon: Gauge, label: s.avgAccuracy, value: `${avgAcc}%`, color: "text-blue-500" },
    { icon: RefreshCw, label: s.reviewRetention, value: `${DEMO.reviewRetention}%`, color: "text-emerald-500" },
    { icon: ArrowUp, label: s.strongestCategory, value: DEMO.strongest, color: "text-emerald-500" },
    { icon: ArrowDown, label: s.weakestCategory, value: DEMO.weakest, color: "text-rose-500" },
    { icon: Layers, label: s.vocabLevel, value: DEMO.vocabLevel, color: "text-violet-500" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.15 }}
      className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-5 shadow-sm"
    >
      <h3 className="font-bold text-foreground mb-4">{s.performance}</h3>
      <div className="space-y-3">
        {rows.map((r, i) => {
          const Icon = r.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, ease, delay: 0.05 * i }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                <Icon className={`w-4 h-4 ${r.color}`} />
              </div>
              <span className="text-sm text-muted-foreground flex-1">{r.label}</span>
              <span className="text-sm font-bold text-foreground">{r.value}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}