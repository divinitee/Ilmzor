import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const ease = [0.22, 1, 0.36, 1];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Everything you need to get started.",
    features: [
      "Personalized topic selection",
      "Limited daily vocabulary",
      "Basic progress tracking",
    ],
    cta: "Start for free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "/month",
    desc: "For learners who want to go faster.",
    features: [
      "More vocabulary per day",
      "AI-generated examples",
      "Level-based recommendations",
      "Progress insights",
      "More personalized practice",
    ],
    cta: "Go Pro",
    highlight: true,
  },
];

export default function LandingPricing() {
  return (
    <section id="pricing" className="py-20">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">Pricing</span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Start free. Upgrade when you're ready.
          </h2>
        </motion.div>

        <div className="mt-12 grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {PLANS.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, ease, delay: i * 0.08 }}
              className={`relative rounded-2xl border p-7 flex flex-col ${
                p.highlight
                  ? "bg-white border-blue-600 shadow-xl ring-1 ring-blue-600"
                  : "bg-white border-slate-200 shadow-sm"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-7 inline-flex items-center gap-1 text-xs font-semibold text-white bg-blue-600 px-3 py-1 rounded-full shadow-sm">
                  <Sparkles className="w-3 h-3" /> Most popular
                </span>
              )}
              <h3 className="font-bold text-slate-900 text-lg">{p.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{p.desc}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-900">{p.price}</span>
                <span className="text-sm text-slate-400">{p.period}</span>
              </div>

              <ul className="mt-6 space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-green-600" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link to="/register" className="mt-7">
                <Button
                  className={`w-full h-11 text-base ${
                    p.highlight
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {p.cta} <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}