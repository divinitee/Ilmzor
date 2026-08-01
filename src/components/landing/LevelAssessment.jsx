import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, ClipboardCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppLang } from "@/hooks/useAppLang";

const ease = [0.22, 1, 0.36, 1];

export default function LevelAssessment() {
  const { t } = useAppLang();
  const options = [
    { l: "A", key: "opt_a", correct: true },
    { l: "B", key: "opt_b" },
    { l: "C", key: "opt_c" },
    { l: "D", key: "opt_d" },
  ];

  return (
    <section className="py-20 bg-white landing-dark:bg-slate-900 border-y border-slate-200 landing-dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-5">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 landing-dark:border-slate-800 p-8 sm:p-12 grid lg:grid-cols-2 gap-10 items-center bg-gradient-to-br from-sky-50 to-slate-50 landing-dark:from-slate-900 landing-dark:to-slate-900">
          <div className="absolute inset-0 premium-mesh opacity-60 pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, ease }}
            className="relative"
          >
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-600 landing-dark:text-teal-400 bg-teal-50 landing-dark:bg-teal-950/40 px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5" /> {t("landing.level.badge")}
            </div>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-slate-900 landing-dark:text-slate-50 tracking-tight leading-tight">{t("landing.level.title")}</h2>
            <p className="mt-4 text-lg text-slate-500 landing-dark:text-slate-400">{t("landing.level.text")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register">
                <Button className="h-12 px-6 text-base">
                  <ClipboardCheck className="w-4 h-4 mr-1" /> {t("landing.level.cta_test")}
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="outline" className="h-12 px-6 text-base bg-white landing-dark:bg-slate-900 border-slate-200 landing-dark:border-slate-700 text-slate-700 landing-dark:text-slate-200 hover:bg-slate-50 landing-dark:hover:bg-slate-800">
                  <Check className="w-4 h-4 mr-1" /> {t("landing.level.cta_known")}
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, ease }}
            whileHover={{ scale: 1.01 }}
            className="relative premium-card bg-white landing-dark:bg-slate-900 rounded-2xl border border-slate-200 landing-dark:border-slate-800 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 landing-dark:text-slate-500">{t("landing.level.q_label")}</span>
              <span className="text-xs font-medium text-blue-600 landing-dark:text-blue-400">{t("landing.level.q_tag")}</span>
            </div>
            <p className="text-sm text-slate-700 landing-dark:text-slate-300 leading-relaxed">{t("landing.level.question")}</p>
            <div className="mt-4 space-y-2">
              {options.map((o) => (
                <div
                  key={o.l}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                    o.correct
                      ? "border-green-500 bg-green-50 landing-dark:bg-green-900/30 text-slate-900 landing-dark:text-slate-50"
                      : "border-slate-200 landing-dark:border-slate-800 text-slate-600 landing-dark:text-slate-300"
                  }`}
                >
                  <span className="w-6 h-6 rounded-md bg-slate-100 landing-dark:bg-slate-800 text-slate-500 landing-dark:text-slate-400 flex items-center justify-center text-xs font-semibold">{o.l}</span>
                  {t(`landing.level.${o.key}`)}
                  {o.correct && <Check className="w-4 h-4 ml-auto text-green-500 landing-dark:text-green-400" />}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}