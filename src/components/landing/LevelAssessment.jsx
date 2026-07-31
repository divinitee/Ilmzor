import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, ClipboardCheck, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const ease = [0.22, 1, 0.36, 1];

export default function LevelAssessment() {
  return (
    <section className="py-20 bg-white border-y border-slate-200">
      <div className="max-w-6xl mx-auto px-5">
        <div className="bg-gradient-to-br from-sky-50 to-slate-50 rounded-3xl border border-slate-200 p-8 sm:p-12 grid lg:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, ease }}
          >
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5" /> Optional · 3 minutes
            </div>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              Not sure about your level?
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Take a quick 3-minute test and we'll recommend vocabulary that is not too easy and not too difficult.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register">
                <Button className="h-12 px-6 text-base bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  <ClipboardCheck className="w-4 h-4 mr-1" /> Take quick level test
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="outline" className="h-12 px-6 text-base bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
                  <Check className="w-4 h-4 mr-1" /> I already know my level
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, ease }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400">Question 1 of 10</span>
              <span className="text-xs font-medium text-blue-600">Vocabulary</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              She has an important meeting tomorrow, so she needs to ____ her presentation.
            </p>
            <div className="mt-4 space-y-2">
              {[
                { l: "A", t: "prepare", correct: true },
                { l: "B", t: "destroy" },
                { l: "C", t: "forget" },
                { l: "D", t: "borrow" },
              ].map((o) => (
                <div
                  key={o.l}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                    o.correct
                      ? "border-green-500 bg-green-50 text-slate-900"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-semibold">
                    {o.l}
                  </span>
                  {o.t}
                  {o.correct && <Check className="w-4 h-4 ml-auto text-green-500" />}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}