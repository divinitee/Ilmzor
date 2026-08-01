import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppLang } from "@/hooks/useAppLang";

const ease = [0.22, 1, 0.36, 1];

function HeroPreview({ t }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.7, ease }}
      className="relative"
    >
      <div className="absolute -inset-4 bg-blue-100/70 landing-dark:bg-blue-900/40 rounded-3xl blur-2xl -z-10" />
      <div className="premium-card premium-grain bg-white landing-dark:bg-slate-900 border border-slate-200 landing-dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-teal-600 landing-dark:text-teal-300 bg-teal-50 landing-dark:bg-teal-950/40 px-2.5 py-1 rounded-full">{t("landing.hero.preview_topic")}</span>
          <span className="text-xs font-medium text-slate-400 landing-dark:text-slate-500">{t("landing.hero.preview_level")}</span>
        </div>

        <div className="flex items-baseline gap-3">
          <h3 className="text-2xl font-bold text-slate-900 landing-dark:text-slate-50">{t("landing.hero.preview_word")}</h3>
          <span className="text-sm text-slate-400 landing-dark:text-slate-500">{t("landing.hero.preview_phonetic")}</span>
        </div>

        <p className="mt-3 text-sm text-slate-600 landing-dark:text-slate-300">{t("landing.hero.preview_def")}</p>

        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 landing-dark:bg-slate-800/50 border border-slate-100 landing-dark:border-slate-800">
          <p className="text-[11px] uppercase tracking-wide text-slate-400 landing-dark:text-slate-500 mb-1 font-semibold">{t("landing.hero.preview_example_label")}</p>
          <p className="text-sm text-slate-700 landing-dark:text-slate-300">{t("landing.hero.preview_example")}</p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 landing-dark:text-blue-400 select-none">
            <Volume2 className="w-3.5 h-3.5" /> {t("landing.hero.preview_listen")}
          </button>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-slate-400 landing-dark:text-slate-500">{t("landing.hero.preview_status")}</span>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.5, ease }}
        className="absolute -top-4 -right-3 premium-card bg-white landing-dark:bg-slate-900 rounded-xl border border-slate-200 landing-dark:border-slate-800 shadow-lg px-3 py-2 flex items-center gap-2"
      >
        <span className="text-base">🎯</span>
        <span className="text-xs font-semibold text-slate-700 landing-dark:text-slate-200">{t("landing.hero.word_of_day")}</span>
      </motion.div>
    </motion.div>
  );
}

export default function Hero() {
  const { t } = useAppLang();
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sky-50 via-slate-50 to-slate-50 landing-dark:from-slate-900 landing-dark:via-slate-950 landing-dark:to-slate-950" />
      <div className="absolute inset-0 -z-10 premium-mesh opacity-70" />
      <div className="absolute inset-0 -z-10 premium-grain" />
      <div className="max-w-6xl mx-auto px-5 pt-14 pb-20 lg:pt-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 landing-dark:text-blue-300 bg-sky-100 landing-dark:bg-blue-950/50 px-3 py-1.5 rounded-full"
          >
            <Sparkles className="w-3.5 h-3.5" /> {t("landing.hero.badge")}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.6, ease, delay: 0.05 }}
            className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 landing-dark:text-slate-50 leading-[1.1]"
          >
            {t("landing.hero.title")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.6, ease, delay: 0.12 }}
            className="mt-5 text-lg text-slate-500 landing-dark:text-slate-400 max-w-md"
          >
            {t("landing.hero.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.6, ease, delay: 0.2 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link to="/register">
              <Button className="h-12 px-6 text-base">
                {t("landing.hero.cta_primary")} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" className="h-12 px-6 text-base bg-white landing-dark:bg-slate-900 border-slate-200 landing-dark:border-slate-700 text-slate-700 landing-dark:text-slate-200 hover:bg-slate-50 landing-dark:hover:bg-slate-800">
                <Play className="w-4 h-4 mr-1" /> {t("landing.hero.cta_secondary")}
              </Button>
            </a>
          </motion.div>

          <p className="mt-4 text-xs text-slate-400 landing-dark:text-slate-500">{t("landing.hero.caption")}</p>
        </div>

        <HeroPreview t={t} />
      </div>
    </section>
  );
}