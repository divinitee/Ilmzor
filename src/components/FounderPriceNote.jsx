import React from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IS_BETA } from "@/lib/appMeta";
import { useAppLang } from "@/hooks/useAppLang";

// Sits directly under a rendered price and labels it, whatever the currency or
// amount is. The (i) is tap-to-open (Popover, not hover) because this app is
// mobile-first.
export default function FounderPriceNote({ className = "" }) {
  const { t } = useAppLang();
  if (!IS_BETA) return null;
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-[11px] font-semibold text-primary">{t("pricing.founder_label")}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("pricing.founder_label")}
            onClick={(e) => e.stopPropagation()}
            className="p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors select-none"
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