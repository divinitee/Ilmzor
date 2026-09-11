import React from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import { IS_BETA } from "@/lib/appMeta";
import BetaBadge from "@/components/BetaBadge";

export default function LandingFooter() {
  const { t } = useAppLang();
  return (
    <footer className="bg-white landing-dark:bg-slate-900 border-t border-slate-200 landing-dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 select-none">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2A1A4D] via-[#5B2E91] to-[#9A63E0] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 landing-dark:text-slate-50 tracking-[0.14em]">VIRORA</span>
          <BetaBadge />
        </div>
        <nav className="flex items-center gap-6 text-sm text-slate-500 landing-dark:text-slate-400">
          <a href="#how-it-works" className="hover:text-blue-600 landing-dark:hover:text-blue-400 transition-colors">{t("landing.nav.how_it_works")}</a>
          <a href="#interests" className="hover:text-blue-600 landing-dark:hover:text-blue-400 transition-colors">{t("landing.nav.topics")}</a>
          <a href="#pricing" className="hover:text-blue-600 landing-dark:hover:text-blue-400 transition-colors">{t("landing.nav.pricing")}</a>
          <Link to="/login" className="hover:text-blue-600 landing-dark:hover:text-blue-400 transition-colors">{t("landing.nav.login")}</Link>
        </nav>
        <p className="text-xs text-slate-400 landing-dark:text-slate-500">© {new Date().getFullYear()} VIRORA</p>
      </div>
      {IS_BETA && (
        <div className="max-w-6xl mx-auto px-5 pb-8 -mt-2">
          <p className="text-xs text-slate-500 landing-dark:text-slate-400 text-center sm:text-left">
            {t("pricing.beta_notice")}
          </p>
        </div>
      )}
    </footer>
  );
}