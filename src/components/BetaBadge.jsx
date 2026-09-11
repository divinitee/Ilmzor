import React from "react";
import { IS_BETA } from "@/lib/appMeta";
import { useAppLang } from "@/hooks/useAppLang";

// Quiet pill that sits beside a wordmark or page title. Tokens only — it must
// read the same on the app's Midnight Purple surfaces and on the landing page.
export default function BetaBadge({ className = "" }) {
  const { t } = useAppLang();
  if (!IS_BETA) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-primary leading-none select-none flex-shrink-0 ${className}`}
    >
      {t("pricing.beta_badge")}
    </span>
  );
}