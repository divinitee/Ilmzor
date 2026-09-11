import React from "react";
import { Info, Lock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IS_BETA } from "@/lib/appMeta";
import { useAppLang } from "@/hooks/useAppLang";
import { getNextStage, usdFor, yearlyUsd, formatUsd } from "@/lib/founderPricing";

// Sits directly under a rendered price. Two jobs: say the price is locked if
// you take it now, and name what it becomes if you don't.
//
// The next price is shown plainly ("then $5.55"), never struck through. A
// strikethrough means "was", and this price has never been charged — showing
// it that way would be invented reference pricing, which is both dishonest and
// illegal in a lot of markets. Naming the real upcoming price is stronger
// anyway, because it is true and dated.
//
// variant="landing" exists because the landing page is a LIGHT surface with its
// own slate/landing-dark palette, while the rest of the app is dark-only. The
// default tokens (text-muted-foreground especially) are tuned for the dark app
// background and wash out to near-invisible on the landing's white cards.
const TONES = {
  app: {
    label: "text-primary",
    lock: "text-primary",
    next: "text-muted-foreground",
    icon: "text-muted-foreground hover:text-foreground",
  },
  landing: {
    label: "text-violet-700 landing-dark:text-violet-300",
    lock: "text-violet-700 landing-dark:text-violet-300",
    next: "text-slate-500 landing-dark:text-slate-400",
    icon: "text-slate-400 hover:text-slate-600 landing-dark:text-slate-500 landing-dark:hover:text-slate-300",
  },
};

export default function FounderPriceNote({
  className = "",
  variant = "app",
  planId = null,
  cycle = "monthly",
}) {
  const { t } = useAppLang();
  const tone = TONES[variant] || TONES.app;
  if (!IS_BETA) return null;

  // Only name a next price when we actually know this plan's next rung.
  const next = getNextStage();
  let nextPrice = null;
  if (next && planId) {
    const monthly = next.usd?.[planId];
    if (monthly) nextPrice = formatUsd(cycle === "yearly" ? yearlyUsd(monthly) : monthly);
  }

  return (
    <div className={`space-y-0.5 ${className}`}>
      <div className="flex items-center gap-1">
        <Lock className={`w-3 h-3 flex-shrink-0 ${tone.lock}`} />
        <span className={`text-[11px] font-semibold ${tone.label}`}>
          {t("pricing.founder_label")}
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t("pricing.founder_label")}
              onClick={(e) => e.stopPropagation()}
              className={`p-0.5 rounded-full transition-colors select-none ${tone.icon}`}
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="top"
            className="w-64 p-3 text-xs leading-relaxed text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {t("pricing.founder_info")}
          </PopoverContent>
        </Popover>
      </div>

      <p className={`text-[10px] font-semibold ${tone.lock}`}>{t("pricing.founder_lock")}</p>

      {nextPrice && (
        <p className={`text-[10px] ${tone.next}`}>
          {t("pricing.founder_then", { price: nextPrice })}
        </p>
      )}
    </div>
  );
}
