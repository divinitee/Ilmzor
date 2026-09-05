import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, X, Bookmark, Swords, Trophy } from "lucide-react";
import { useFableCopy } from "@/components/games/cardFlipFableCopy";

const EASE = [0.16, 1, 0.3, 1];

// Provenance badge — only on the WORD face, never on a face-down card.
export function ProvenanceBadge({ provenance, matched, compact = false }) {
  const { c } = useFableCopy();
  if (provenance === "saved") {
    return <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 text-[8px] font-semibold max-w-full truncate"><Bookmark className="w-2.5 h-2.5 shrink-0" />{!compact && c("badge_saved")}</span>;
  }
  if (provenance === "wrong") {
    return matched
      ? <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[8px] font-semibold max-w-full truncate"><Trophy className="w-2.5 h-2.5 shrink-0" />{!compact && c("badge_wrong_after")}</span>
      : <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[8px] font-semibold max-w-full truncate"><Swords className="w-2.5 h-2.5 shrink-0" />{!compact && c("badge_wrong_before")}</span>;
  }
  return null;
}

// One flippable card. `state`: down | up | match | miss | matched.
export default function CardFlipFableCard({ card, state, accent, onClick, index }) {
  const rm = useReducedMotion();
  const up = state !== "down";
  const isMatch = state === "match" || state === "matched";
  const isMiss = state === "miss";
  const border = isMatch ? "border-emerald-400/70 bg-emerald-500/10" : isMiss ? "border-rose-400/70 bg-rose-500/10" : up ? "border-white/30 bg-white/[0.08]" : "border-white/10 bg-white/[0.04]";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={up}
      aria-pressed={up}
      initial={rm ? false : { opacity: 0, scale: 0.85, y: 10 }}
      animate={{ opacity: state === "matched" ? 0.55 : 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: rm ? 0 : Math.min(index * 0.03, 0.6) }}
      whileTap={up ? undefined : { scale: 0.96 }}
      className="relative min-h-[64px] sm:min-h-[76px] w-full select-none"
      style={{ perspective: 800 }}
    >
      <motion.span
        className={`absolute inset-0 rounded-2xl border backdrop-blur-md flex flex-col items-center justify-center px-1.5 py-1.5 text-center transition-colors ${border}`}
        animate={{ rotateY: up ? 0 : 180 }}
        transition={rm ? { duration: 0 } : { duration: 0.45, ease: EASE }}
        style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden", boxShadow: up && !isMiss && !isMatch ? `0 0 18px -6px ${accent}` : undefined }}
      >
        {card.type === "word" ? (
          <span className="text-[13px] sm:text-sm font-bold text-foreground leading-tight break-words">{card.content}</span>
        ) : (
          <span className="text-[10px] sm:text-[11px] text-foreground/85 leading-tight break-words">{card.content}</span>
        )}
        {card.type === "word" && <span className="mt-1"><ProvenanceBadge provenance={card.provenance} matched={isMatch} compact /></span>}
        {isMatch && <Check className="absolute top-1 right-1 w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />}
        {isMiss && <X className="absolute top-1 right-1 w-3.5 h-3.5 text-rose-400" aria-hidden="true" />}
      </motion.span>
      <motion.span
        className="absolute inset-0 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md flex items-center justify-center"
        animate={{ rotateY: up ? -180 : 0 }}
        transition={rm ? { duration: 0 } : { duration: 0.45, ease: EASE }}
        style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
      >
        <span className="w-6 h-6 rounded-full" style={{ background: `radial-gradient(closest-side, ${accent}55, transparent)` }} />
      </motion.span>
    </motion.button>
  );
}