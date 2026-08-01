import React from "react";
import { motion } from "framer-motion";
import { Target, Compass, ClipboardCheck, Sparkles } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";

const ease = [0.22, 1, 0.36, 1];

export default function HowItWorks() {
  const { t } = useAppLang();
  const steps = [
    { icon: Target, title: t("landing.how.s1_title"), text: t("landing.how.s1_text") },
    { icon: Compass, title: t("landing.how.s2_title"), text: t("landing.how.s2_text") },
    { icon: ClipboardCheck, title: t("landing.how.s3_title"), text: t("landing.how.s3_text") },
    { icon: Sparkles, title: t("landing.how.s4_title"), text: t("landing.how.s4_text") },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white landing-dark:bg-slate-900 border-y border-slate-200 landing-dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 landing-dark:text-blue-400">{t("landing.how.label")}</span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-slate-900 landing-dark:text-slate-50 tracking-tight">{t("landing.how.title")}</h2>
        </motion.div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, ease, delay: i * 0.08 }}
                whileHover={{ y: -6 }}
                className="relative"
              >
                <div className="premium-card bg-slate-50 landing-dark:bg-slate-800/50 rounded-2xl border border-slate-200 landing-dark:border-slate-800 p-6 h-full">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_-8px_rgba(37,99,235,0.6)]">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="absolute top-6 right-6 text-xs font-bold text-slate-300 landing-dark:text-slate-600">0{i + 1}</span>
                  <h3 className="mt-4 font-semibold text-slate-900 landing-dark:text-slate-50">{s.title}</h3>
                  <p className="mt-2 text-sm text-slate-500 landing-dark:text-slate-400 leading-relaxed">{s.text}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}