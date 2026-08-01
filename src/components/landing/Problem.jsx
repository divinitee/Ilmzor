import React from "react";
import { motion } from "framer-motion";
import { ListChecks, Gauge, Brain } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";

const ease = [0.22, 1, 0.36, 1];

export default function Problem() {
  const { t } = useAppLang();
  const items = [
    { icon: ListChecks, title: t("landing.problem.p1_title"), text: t("landing.problem.p1_text") },
    { icon: Gauge, title: t("landing.problem.p2_title"), text: t("landing.problem.p2_text") },
    { icon: Brain, title: t("landing.problem.p3_title"), text: t("landing.problem.p3_text") },
  ];

  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 landing-dark:text-slate-50 tracking-tight">
            {t("landing.problem.title")}
          </h2>
          <p className="mt-4 text-lg text-slate-500 landing-dark:text-slate-400">{t("landing.problem.subtitle")}</p>
        </motion.div>

        <div className="mt-12 grid sm:grid-cols-3 gap-6">
          {items.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, ease, delay: i * 0.08 }}
                className="premium-card bg-white landing-dark:bg-slate-900 rounded-2xl border border-slate-200 landing-dark:border-slate-800 p-6"
              >
                <div className="w-11 h-11 rounded-xl bg-sky-100 landing-dark:bg-blue-950/50 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-600 landing-dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-slate-900 landing-dark:text-slate-50">{p.title}</h3>
                <p className="mt-2 text-sm text-slate-500 landing-dark:text-slate-400 leading-relaxed">{p.text}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}