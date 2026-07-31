import React from "react";
import { motion } from "framer-motion";
import { Target, Compass, ClipboardCheck, Sparkles } from "lucide-react";

const ease = [0.22, 1, 0.36, 1];

const STEPS = [
  { icon: Target, title: "Tell us your goal", text: "Why are you learning English? Work, travel, exams, or daily life." },
  { icon: Compass, title: "Choose your interests", text: "Pick the topics you care about — from business to movies." },
  { icon: ClipboardCheck, title: "Quick level test", text: "Optional 3-minute check so we match words to your level." },
  { icon: Sparkles, title: "Get personalized words", text: "Receive vocabulary tailored to you and practice daily." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-white border-y border-slate-200">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">How it works</span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Personalized vocabulary in 4 simple steps
          </h2>
        </motion.div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, ease, delay: i * 0.08 }}
                className="relative"
              >
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 h-full">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="absolute top-6 right-6 text-xs font-bold text-slate-300">0{i + 1}</span>
                  <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">{s.text}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}