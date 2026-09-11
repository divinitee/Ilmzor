import React, { useState, useEffect } from "react";
import { Lock, Clock } from "lucide-react";
import { IS_BETA } from "@/lib/appMeta";
import { useAppLang } from "@/hooks/useAppLang";
import {
  getCurrentStage,
  msUntilStageEnd,
  countdownParts,
} from "@/lib/founderPricing";

// The time half of the founder-pricing pressure. The price half lives on each
// plan card (FounderPriceNote) so a VIP buyer never reads a Learner number.
//
// Everything here is driven by lib/founderPricing.js. When the current stage
// has no date — it ends on a milestone like the Grammar launch — this shows
// that milestone instead of inventing a countdown it cannot honour, and when
// the deadline passes the ladder advances on its own rather than sitting on a
// dead date or counting into negatives.

const formatDeadline = (dateStr, lang) => {
  if (!dateStr) return "";
  const locale = lang === "ru" ? "ru-RU" : lang === "uz" ? "uz-UZ" : "en-GB";
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  try {
    return d.toLocaleDateString(locale, { day: "numeric", month: "long" });
  } catch {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  }
};

const TONES = {
  app: {
    wrap: "bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-primary/25",
    head: "text-foreground",
    num: "text-foreground",
    sub: "text-muted-foreground",
    accent: "text-primary",
    cell: "bg-background/60 border-border",
  },
  landing: {
    wrap: "bg-gradient-to-br from-violet-50 to-white landing-dark:from-slate-800 landing-dark:to-slate-900 border-violet-200 landing-dark:border-slate-700",
    head: "text-slate-900 landing-dark:text-slate-50",
    num: "text-slate-900 landing-dark:text-slate-50",
    sub: "text-slate-500 landing-dark:text-slate-400",
    accent: "text-violet-700 landing-dark:text-violet-300",
    cell: "bg-white/70 landing-dark:bg-slate-900/50 border-violet-100 landing-dark:border-slate-700",
  },
};

export default function FounderCountdown({ className = "", variant = "app" }) {
  const { t, lang } = useAppLang();
  const [ms, setMs] = useState(() => msUntilStageEnd());
  const tone = TONES[variant] || TONES.app;

  useEffect(() => {
    if (!IS_BETA) return undefined;
    const id = setInterval(() => setMs(msUntilStageEnd()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!IS_BETA) return null;

  const stage = getCurrentStage();
  const parts = countdownParts(ms);
  const deadline = formatDeadline(stage.endsOn, lang);

  const cells = parts && !parts.expired
    ? [
        { v: parts.days, label: t("pricing.founder_days") },
        { v: parts.hours, label: t("pricing.founder_hours") },
        { v: parts.minutes, label: t("pricing.founder_mins") },
      ]
    : null;

  return (
    <div className={`rounded-2xl border p-4 ${tone.wrap} ${className}`}>
      <div className="flex items-center gap-2">
        <Lock className={`w-4 h-4 flex-shrink-0 ${tone.accent}`} />
        <p className={`text-sm font-bold ${tone.head}`}>
          {stage.endsOn
            ? t("pricing.founder_deadline", { date: deadline })
            : t("pricing.founder_milestone")}
        </p>
      </div>

      {cells && (
        <div className="mt-3 flex items-stretch gap-2">
          {cells.map((c, i) => (
            <div
              key={i}
              className={`flex-1 rounded-xl border px-2 py-2 text-center ${tone.cell}`}
            >
              <p className={`text-xl font-bold tabular-nums leading-none ${tone.num}`}>
                {String(c.v).padStart(2, "0")}
              </p>
              <p className={`text-[10px] mt-1 ${tone.sub}`}>{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {cells && (
        <p className={`text-[11px] mt-2 flex items-center gap-1 ${tone.sub}`}>
          <Clock className="w-3 h-3 flex-shrink-0" />
          {t("pricing.founder_left")}
        </p>
      )}

      <p className={`text-[11px] mt-2 ${tone.sub}`}>{t("pricing.founder_final")}</p>
    </div>
  );
}
