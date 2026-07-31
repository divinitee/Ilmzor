import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ease = [0.22, 1, 0.36, 1];

function HeroPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.7, ease }}
      className="relative"
    >
      <div className="absolute -inset-4 bg-blue-100/70 rounded-3xl blur-2xl -z-10" />
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">Business English</span>
          <span className="text-xs font-medium text-slate-400">Intermediate</span>
        </div>

        <div className="flex items-baseline gap-3">
          <h3 className="text-2xl font-bold text-slate-900">negotiate</h3>
          <span className="text-sm text-slate-400">/nɪˈɡoʊʃieɪt/</span>
        </div>

        <p className="mt-3 text-sm text-slate-600">to discuss and reach an agreement</p>

        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1 font-semibold">Example</p>
          <p className="text-sm text-slate-700">We need to negotiate the contract before Friday.</p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 select-none">
            <Volume2 className="w-3.5 h-3.5" /> Listen
          </button>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-slate-400">Personalized for your level</span>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.5, ease }}
        className="absolute -top-4 -right-3 bg-white rounded-xl border border-slate-200 shadow-lg px-3 py-2 flex items-center gap-2"
      >
        <span className="text-base">🎯</span>
        <span className="text-xs font-semibold text-slate-700">Word of the day</span>
      </motion.div>
    </motion.div>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sky-50 via-slate-50 to-slate-50" />
      <div className="max-w-6xl mx-auto px-5 pt-14 pb-20 lg:pt-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 bg-sky-100 px-3 py-1.5 rounded-full"
          >
            <Sparkles className="w-3.5 h-3.5" /> AI-powered vocabulary, personalized for you
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.6, ease, delay: 0.05 }}
            className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.1]"
          >
            Stop memorizing random words. Learn the English you actually need.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.6, ease, delay: 0.12 }}
            className="mt-5 text-lg text-slate-500 max-w-md"
          >
            VocabApp creates personalized vocabulary practice based on your goals, interests, and English level.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.6, ease, delay: 0.2 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link to="/register">
              <Button className="h-12 px-6 text-base bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                Start for free <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" className="h-12 px-6 text-base bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
                <Play className="w-4 h-4 mr-1" /> See how it works
              </Button>
            </a>
          </motion.div>

          <p className="mt-4 text-xs text-slate-400">Free to start · No credit card required</p>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}