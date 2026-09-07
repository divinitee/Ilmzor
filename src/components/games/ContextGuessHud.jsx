import React from "react";
import { ArrowLeft, Star, Flame, Target } from "lucide-react";
import { useContextCopy } from "@/components/games/contextGuessCopy";

// Header chrome: back / title / tries left / XP / streak — the same shape the
// other three Meaning games use, replacing the old hardcoded blue header.
export default function ContextGuessHud({ accent, onBack, xp, streak, triesLeft, showTries, lowTries }) {
  const { c, t } = useContextCopy();
  return (
    <header className="bg-background/70 backdrop-blur-xl border-b border-white/10 px-3 py-2 flex items-center justify-between safe-header gap-2">
      <button onClick={onBack} className="min-h-[44px] min-w-[44px] flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground select-none px-1">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {t("gameui.back")}
      </button>
      <span className="text-xs font-bold truncate" style={{ color: accent }}>{c("title")}</span>
      <div className="flex items-center gap-1.5 text-xs font-bold select-none">
        {showTries && (
          <span className={`neo-pill px-2.5 h-8 ${lowTries ? "text-destructive" : "text-muted-foreground"}`} aria-label={c("attempts")}>
            <Target className="w-3.5 h-3.5" aria-hidden="true" /> {triesLeft}
          </span>
        )}
        <span className="neo-pill px-2.5 h-8 text-amber-300" aria-label={c("xp")}>
          <Star className="w-3.5 h-3.5" aria-hidden="true" /> {xp}
        </span>
        <span className={`neo-pill px-2.5 h-8 ${streak > 0 ? "text-orange-300" : "text-muted-foreground"}`} aria-label={c("streak")}>
          <Flame className="w-3.5 h-3.5" aria-hidden="true" /> {streak}
        </span>
      </div>
    </header>
  );
}