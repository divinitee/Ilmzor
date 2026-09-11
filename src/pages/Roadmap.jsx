import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Check, Sparkles } from "lucide-react";

const stages = [
  {
    name: "Concept",
    title: "Ideas taking shape",
    description: "Exploring what VIRORA should solve next.",
    status: "complete",
  },
  {
    name: "Building",
    title: "Being built",
    description: "Design, systems, and learning experiences in active development.",
    status: "complete",
  },
  {
    name: "Beta",
    title: "Being tested",
    description: "Real users help shape features before they become stable.",
    status: "active",
  },
  {
    name: "Released",
    title: "Ready for everyone",
    description: "Stable features become part of the VIRORA learning experience.",
    status: "upcoming",
  },
];

export default function Roadmap() {
  return (
    <div className="min-h-screen bg-slate-50 landing-dark:bg-slate-950 text-slate-900 landing-dark:text-slate-50 overflow-hidden">
      <div className="fixed inset-0 -z-10 premium-mesh opacity-60" />
      <div className="fixed inset-0 -z-10 premium-grain opacity-50" />

      <header className="max-w-6xl mx-auto px-5 py-6 flex items-center justify-between">
        <Link to="/landing" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 landing-dark:text-slate-400 hover:text-violet-600 landing-dark:hover:text-violet-300 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to VIRORA
        </Link>
        <div className="inline-flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-400/20 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-violet-600 landing-dark:text-violet-300" />
          </div>
          <span className="font-bold tracking-[0.18em] text-sm">VIRORA</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 pt-12 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/[0.07] px-3 py-1.5 text-xs font-semibold tracking-wide text-violet-700 landing-dark:text-violet-300">
            <Sparkles className="w-3.5 h-3.5" />
            ACTIVE DEVELOPMENT
          </div>
          <h1 className="mt-6 text-4xl sm:text-6xl font-bold tracking-tight">Where VIRORA is going</h1>
          <p className="mt-5 text-base sm:text-lg text-slate-500 landing-dark:text-slate-400">
            A transparent view of how new parts of VIRORA move from an idea to the product you use.
          </p>
        </motion.div>

        <section className="mt-16">
          <div className="hidden lg:block relative mb-8 px-16">
            <div className="absolute left-[12.5%] right-[12.5%] top-5 h-px bg-slate-200 landing-dark:bg-slate-800" />
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.1, delay: 0.25 }}
              className="absolute origin-left left-[12.5%] top-5 w-[50%] h-px bg-gradient-to-r from-violet-500 to-violet-300"
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {stages.map((stage, index) => (
              <motion.article
                key={stage.name}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.15 + index * 0.1 }}
                className={`relative rounded-3xl border p-6 sm:p-7 min-h-[260px] flex flex-col ${
                  stage.status === "active"
                    ? "border-violet-400/40 bg-violet-500/[0.07] shadow-[0_0_50px_rgba(139,92,246,0.12)]"
                    : "border-slate-200 landing-dark:border-slate-800 bg-white/70 landing-dark:bg-slate-900/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                    stage.status === "complete"
                      ? "bg-violet-500 border-violet-400 text-white"
                      : stage.status === "active"
                      ? "border-violet-400 bg-violet-500/15 text-violet-600 landing-dark:text-violet-300"
                      : "border-slate-300 landing-dark:border-slate-700 text-slate-400"
                  }`}>
                    {stage.status === "complete" ? <Check className="w-5 h-5" /> : <span className="text-sm font-bold">{index + 1}</span>}
                  </div>
                  {stage.status === "active" && (
                    <motion.span
                      animate={{ opacity: [0.55, 1, 0.55] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                      className="text-[10px] uppercase tracking-[0.18em] text-violet-600 landing-dark:text-violet-300 font-bold"
                    >
                      Current
                    </motion.span>
                  )}
                </div>

                <div className="mt-auto pt-10">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400 landing-dark:text-slate-500">{stage.name}</div>
                  <h2 className="mt-3 text-xl font-semibold">{stage.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-500 landing-dark:text-slate-400">{stage.description}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
          className="mt-16 rounded-3xl border border-slate-200 landing-dark:border-slate-800 bg-white/60 landing-dark:bg-slate-900/50 p-7 sm:p-10 text-center"
        >
          <div className="mx-auto max-w-2xl">
            <div className="text-xs uppercase tracking-[0.22em] text-slate-400">The next chapter</div>
            <h2 className="mt-4 text-2xl sm:text-3xl font-bold">This page will become VIRORA's live development roster.</h2>
            <p className="mt-4 text-slate-500 landing-dark:text-slate-400">
              Features will move through these four stages as development progresses. Major updates and previews will live here.
            </p>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
