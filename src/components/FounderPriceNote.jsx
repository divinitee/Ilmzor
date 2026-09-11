import React from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IS_BETA } from "@/lib/appMeta";
import { useAppLang } from "@/hooks/useAppLang";

// Sits directly under a rendered price and labels it, whatever the currency or
// amount is. The (i) is tap-to-open (Popover, not hover) because this app is
// mobile-first.
//
// variant="landing" exists because the landing page is a LIGHT surface with its
// own slate/landing-dark palette, while the rest of the app is dark-only. The
// default tokens (text-muted-foreground especially) are tuned for the dark app
// background and wash out to near-invisible on the landing's white cards.
const TONES = {
  app: {
    label: "text-primary",
    icon: "text-muted-foreground hover:text-foreground",
  },
  landing: {
    label: "text-violet-700 landing-dark:text-violet-300",
    icon: "text-slate-400 hover:text-slate-600 landing-dark:text-slate-500 landing-dark:hover:text-slate-300",
  },
};

export default function FounderPriceNote({ className = "", variant = "app" }) {
  const { t } = useAppLang();
  const tone = TONES[variant] || TONES.app;
  if (!IS_BETA) return null;
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className={`text-[11px] font-semibold ${tone.label}`}>{t("pricing.founder_label")}</span>
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
  );
}