import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Cpu, Plane, GraduationCap, BookOpen, MessageCircle,
  Clapperboard, Users, Stethoscope, DollarSign,
} from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";

const ease = [0.22, 1, 0.36, 1];

const TOPICS = [
  { key: "business", icon: Briefcase, words: [
    { w: "deadline", d: "the latest time to finish something" },
    { w: "meeting", d: "a planned discussion" },
    { w: "negotiate", d: "to reach an agreement" },
  ]},
  { key: "technology", icon: Cpu, words: [
    { w: "software", d: "programs for a computer" },
    { w: "update", d: "to make something current" },
    { w: "device", d: "a piece of equipment" },
  ]},
  { key: "travel", icon: Plane, words: [
    { w: "reservation", d: "an arrangement to hold something" },
    { w: "luggage", d: "bags you travel with" },
    { w: "destination", d: "the place you're going to" },
  ]},
  { key: "ielts", icon: GraduationCap, words: [
    { w: "essay", d: "a short piece of writing" },
    { w: "assess", d: "to evaluate or judge" },
    { w: "criterion", d: "a standard to judge by" },
  ]},
  { key: "school", icon: BookOpen, words: [
    { w: "assignment", d: "a task given to students" },
    { w: "semester", d: "a school term" },
    { w: "tuition", d: "the cost of teaching" },
  ]},
  { key: "daily", icon: MessageCircle, words: [
    { w: "actually", d: "in fact; really" },
    { w: "guess", d: "to estimate without knowing" },
    { w: "catch up", d: "to reach the same point" },
  ]},
  { key: "movies", icon: Clapperboard, words: [
    { w: "scene", d: "a part of a film" },
    { w: "sequel", d: "a follow-up film" },
    { w: "blockbuster", d: "a very successful film" },
  ]},
  { key: "interviews", icon: Users, words: [
    { w: "resume", d: "a summary of your work history" },
    { w: "candidate", d: "a person applying for a role" },
    { w: "experience", d: "skills gained over time" },
  ]},
  { key: "medicine", icon: Stethoscope, words: [
    { w: "symptom", d: "a sign of illness" },
    { w: "prescription", d: "a written order for medicine" },
    { w: "diagnose", d: "to identify an illness" },
  ]},
  { key: "finance", icon: DollarSign, words: [
    { w: "budget", d: "a plan for spending money" },
    { w: "invest", d: "to put money into something" },
    { w: "profit", d: "money gained after costs" },
  ]},
];

export default function InterestLearning() {
  const { t } = useAppLang();
  const [active, setActive] = useState("business");
  const current = TOPICS.find((x) => x.key === active);
  const label = (k) => t(`landing.interests.topics.${k}`);

  return (
    <section id="interests" className="py-20">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-teal-600 landing-dark:text-teal-400">{t("landing.interests.label")}</span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-slate-900 landing-dark:text-slate-50 tracking-tight">{t("landing.interests.title")}</h2>
          <p className="mt-4 text-lg text-slate-500 landing-dark:text-slate-400">{t("landing.interests.subtitle")}</p>
        </motion.div>

        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {TOPICS.map((tp, i) => {
            const Icon = tp.icon;
            const isActive = tp.key === active;
            return (
              <motion.button
                key={tp.key}
                onClick={() => setActive(tp.key)}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, ease, delay: i * 0.03 }}
                whileHover={{ y: -2 }}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-colors select-none ${
                  isActive
                    ? "bg-gradient-to-b from-blue-500 to-blue-700 border-blue-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_24px_-10px_rgba(37,99,235,0.6)]"
                    : "premium-card bg-white landing-dark:bg-slate-900 border-slate-200 landing-dark:border-slate-800 text-slate-600 landing-dark:text-slate-300 hover:border-blue-300 landing-dark:hover:border-blue-500"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-blue-600 landing-dark:text-blue-400"}`} />
                <span className="text-xs font-medium text-center leading-tight">{label(tp.key)}</span>
              </motion.button>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease }}
          className="mt-10 premium-card bg-white landing-dark:bg-slate-900 rounded-2xl border border-slate-200 landing-dark:border-slate-800 p-6 sm:p-8"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-900 landing-dark:text-slate-50">{t("landing.interests.sample_label", { topic: label(active) })}</h3>
            <span className="text-xs font-medium text-slate-400 landing-dark:text-slate-500">{t("landing.interests.sample_count")}</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease }}
              className="grid sm:grid-cols-3 gap-4"
            >
              {current.words.map((w) => (
                <div key={w.w} className="rounded-xl bg-slate-50 landing-dark:bg-slate-800/50 border border-slate-100 landing-dark:border-slate-800 p-4">
                  <p className="font-semibold text-slate-900 landing-dark:text-slate-50">{w.w}</p>
                  <p className="mt-1 text-xs text-slate-500 landing-dark:text-slate-400 leading-relaxed">{w.d}</p>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}