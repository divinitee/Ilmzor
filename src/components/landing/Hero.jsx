import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppLang } from "@/hooks/useAppLang";
import WordOfTheDay from "@/components/landing/WordOfTheDay";

const ease = [0.22, 1, 0.36, 1];

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
            whileHover={{ scale: 1.03 }}
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 landing-dark:text-blue-300 bg-sky-100 landing-dark:bg-blue-950/50 px-3 py-1.5 rounded-full cursor-default"
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
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link to="/register">
                <Button className="h-12 px-6 text-base">
                  {t("landing.hero.cta_primary")} <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <a href="#how-it-works">
                <Button variant="outline" className="h-12 px-6 text-base bg-white landing-dark:bg-slate-900 border-slate-200 landing-dark:border-slate-700 text-slate-700 landing-dark:text-slate-200 hover:bg-slate-50 landing-dark:hover:bg-slate-800">
                  <Play className="w-4 h-4 mr-1" /> {t("landing.hero.cta_secondary")}
                </Button>
              </a>
            </motion.div>
          </motion.div>

          <p className="mt-4 text-xs text-slate-400 landing-dark:text-slate-500">{t("landing.hero.caption")}</p>
        </div>

        <WordOfTheDay />
      </div>
    </section>
  );
}