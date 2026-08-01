import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppLang } from "@/hooks/useAppLang";

const ease = [0.22, 1, 0.36, 1];

export default function FinalCTA() {
  const { t } = useAppLang();
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-blue-500 to-blue-700 premium-grain px-6 py-16 sm:px-12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_30px_80px_-30px_rgba(37,99,235,0.6)]"
        >
          <div className="absolute inset-0 premium-mesh opacity-50 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">{t("landing.finalcta.title")}</h2>
            <p className="mt-4 text-lg text-blue-100 max-w-xl mx-auto">{t("landing.finalcta.subtitle")}</p>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block mt-8">
              <Link to="/register">
                <Button className="h-12 px-7 text-base bg-white text-blue-700 hover:bg-blue-50 border border-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_10px_30px_-12px_rgba(0,0,0,0.3)]">
                  {t("landing.finalcta.cta")} <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}