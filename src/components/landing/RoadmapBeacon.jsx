import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight } from "lucide-react";

const stages = [
  { label: "Concept", state: "complete" },
  { label: "Building", state: "complete" },
  { label: "Beta", state: "active" },
  { label: "Released", state: "upcoming" },
];

export default function RoadmapBeacon() {
  return (
    <Link to="/roadmap" aria-label="Open VIRORA development roadmap" className="block group">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.985 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 landing-dark:border-violet-400/20 bg-white/80 landing-dark:bg-slate-900/70 backdrop-blur-xl shadow-xl shadow-slate-950/10 landing-dark:shadow-black/30 p-5 sm:p-6"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.06] via-transparent to-transparent landing-dark:from-violet-500/[0.10] pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="shrink-0 w-16 h-16 rounded-2xl border border-violet-200 landing-dark:border-violet-400/20 bg-violet-50 landing-dark:bg-violet-500/[0.09] flex items-center justify-center shadow-[0_0_28px_rgba(139,92,246,0.16)]">
            <BookOpen className="w-8 h-8 text-violet-600 landing-dark:text-violet-300" strokeWidth={1.8} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[10px] sm:text-xs uppercase tracking-[0.28em] text-slate-400 landing-dark:text-slate-500 font-semibold">VIRORA</div>
            <div className="mt-1 text-base sm:text-lg font-semibold tracking-wide text-slate-800 landing-dark:text-slate-100">Development roadmap</div>
          </div>

          <ChevronRight className="w-6 h-6 shrink-0 text-slate-400 landing-dark:text-slate-500 group-hover:text-violet-500 landing-dark:group-hover:text-violet-300 group-hover:translate-x-0.5 transition-all" />
        </div>

        <div className="relative mt-6">
          <div className="absolute left-3 right-3 top-[11px] h-px bg-slate-200 landing-dark:bg-slate-700" />
          <div className="absolute left-3 top-[11px] h-px w-[66.666%] bg-violet-400/80" />

          <div className="relative grid grid-cols-4 gap-1">
            {stages.map((stage) => (
              <div key={stage.label} className="flex flex-col items-center gap-2 min-w-0">
                {stage.state === "active" ? (
                  <motion.span
                    animate={{ boxShadow: ["0 0 0 0 rgba(139,92,246,0.16)", "0 0 0 8px rgba(139,92,246,0)", "0 0 0 0 rgba(139,92,246,0.16)"] }}
                    transition={{ duration: 2.2, repeat: Infinity }}
                    className="relative z-10 w-6 h-6 rounded-full bg-slate-950 landing-dark:bg-slate-950 border-2 border-violet-400 flex items-center justify-center"
                  >
                    <span className="w-2 h-2 rounded-full bg-violet-300" />
                  </motion.span>
                ) : (
                  <span className={`relative z-10 w-6 h-6 rounded-full border-2 ${
                    stage.state === "complete"
                      ? "border-violet-400 bg-violet-400"
                      : "border-slate-300 landing-dark:border-slate-600 bg-white landing-dark:bg-slate-900"
                  }`} />
                )}
                <span className={`text-[8px] sm:text-[10px] uppercase tracking-[0.12em] text-center whitespace-nowrap ${
                  stage.state === "active"
                    ? "text-violet-600 landing-dark:text-violet-300 font-semibold"
                    : "text-slate-400 landing-dark:text-slate-500"
                }`}>{stage.label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
