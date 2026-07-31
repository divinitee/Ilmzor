import React from "react";
import { motion } from "framer-motion";
import { ListChecks, Gauge, Brain } from "lucide-react";

const ease = [0.22, 1, 0.36, 1];

const PROBLEMS = [
  {
    icon: ListChecks,
    title: "Generic word lists feel boring",
    text: "Everyone gets the same random words. They don't match what you actually need or care about.",
  },
  {
    icon: Gauge,
    title: "It's hard to know your real level",
    text: "Without a clear starting point, you waste time on words that are too easy or too hard.",
  },
  {
    icon: Brain,
    title: "You forget words without practice",
    text: "No personalization means no real repetition — words slip away before they stick.",
  },
];

export default function Problem() {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Most vocabulary apps treat everyone the same
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            But your English learning should match your goals, interests, and level.
          </p>
        </motion.div>

        <div className="mt-12 grid sm:grid-cols-3 gap-6">
          {PROBLEMS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, ease, delay: i * 0.08 }}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-sky-100 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900">{p.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{p.text}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}