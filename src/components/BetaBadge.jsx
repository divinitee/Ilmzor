import React from "react";
// Kept under the existing component name so all existing wordmarks update
// together without touching every page that imports the old beta badge.
export default function BetaBadge({ className = "" }) {
  return (
    <span
      title="First public release · September 14, 2026"
      className={`inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-primary leading-none select-none flex-shrink-0 ${className}`}
    >
      LIVE
    </span>
  );
}