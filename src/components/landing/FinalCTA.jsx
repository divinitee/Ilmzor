import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const ease = [0.22, 1, 0.36, 1];

export default function FinalCTA() {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease }}
          className="relative overflow-hidden rounded-3xl bg-blue-600 px-6 py-16 sm:px-12 text-center"
        >
          <div className="absolute inset-0 -z-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_60%,white,transparent_40%)]" />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              Start building your personal English vocabulary today.
            </h2>
            <p className="mt-4 text-lg text-blue-100 max-w-xl mx-auto">
              Choose your interests, find your level, and start learning words that matter to you.
            </p>
            <Link to="/register" className="inline-block mt-8">
              <Button className="h-12 px-7 text-base bg-white text-blue-700 hover:bg-blue-50 shadow-sm">
                Start for free <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}