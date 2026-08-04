import React from "react";
import { motion } from "framer-motion";

export default function LearningJourney({ path, unit, moduleNum, accent }) {
  const nodes = [
    { label: "Vocabulary", icon: "📚" },
    { label: path, icon: "🧭" },
    { label: `Module ${moduleNum}`, icon: "📦" },
    { label: unit || "Pick a unit", icon: "📖" },
    { label: "Today's Lesson", icon: "✨" },
  ];
  return (
    <section className="premium-card p-5 md:p-6">
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Learning Journey</h3>
      <div className="space-y-0">
        {nodes.map((n, i) => {
          const isLast = i === nodes.length - 1;
          return (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="w-9 h-9 rounded-xl border border-white/15 bg-white/[0.05] backdrop-blur-md flex items-center justify-center text-base flex-shrink-0"
                  style={isLast ? { borderColor: accent, boxShadow: `0 0 18px -4px ${accent}` } : undefined}
                >
                  {n.icon}
                </motion.div>
                {!isLast && <span className="w-px flex-1 my-1 bg-gradient-to-b from-white/20 to-transparent" style={{ minHeight: 16 }} />}
              </div>
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 + 0.05 }}
                className={`text-sm pt-2 ${isLast ? "font-bold text-foreground" : "text-foreground/80"}`}
              >
                {n.label}
              </motion.span>
            </div>
          );
        })}
      </div>
    </section>
  );
}