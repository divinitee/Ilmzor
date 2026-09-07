import React from "react";
import { Bookmark, Swords, Trophy } from "lucide-react";
import { useContextCopy } from "@/components/games/contextGuessCopy";

// Provenance badge — why this word is in your round. Same three states as the
// other Meaning games, with Context Guess's own copy module.
export default function ContextGuessBadge({ provenance, solved, compact = false }) {
  const { c } = useContextCopy();
  const base = "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold max-w-full truncate";

  if (provenance === "saved") {
    return (
      <span className={`${base} bg-sky-500/15 text-sky-300`}>
        <Bookmark className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />{!compact && c("badge_saved")}
      </span>
    );
  }
  if (provenance === "wrong") {
    return solved ? (
      <span className={`${base} bg-emerald-500/15 text-emerald-300`}>
        <Trophy className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />{!compact && c("badge_wrong_after")}
      </span>
    ) : (
      <span className={`${base} bg-amber-500/15 text-amber-300`}>
        <Swords className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />{!compact && c("badge_wrong_before")}
      </span>
    );
  }
  return null;
}