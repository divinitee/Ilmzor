import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";
import DefinitionMatchBadge from "@/components/games/DefinitionMatchBadge";

const EASE = [0.16, 1, 0.3, 1];

// Semantic state → token-based classes only. No per-game hexes: the accent
// arrives as a prop from SKILLS, correct/wrong come from the CSS tokens.
const shell = (state) => {
  if (state === "solved") return "border-emerald-400/60 bg-emerald-500/10 opacity-60";
  if (state === "match") return "border-emerald-400/70 bg-emerald-500/10";
  if (state === "miss") return "border-rose-400/70 bg-rose-500/10";
  if (state === "selected") return "border-white/40 bg-white/[0.09]";
  return "border-white/10 bg-white/[0.04] hover:border-white/25";
};

// One set: words on the left, their meanings shuffled on the right. Tap a
// word, then a meaning — resolved immediately, so correctness is unambiguous
// per word (which is what lets this game log misses, unlike Memory Flip).
export default function DefinitionMatchSet({ items, defs, accent, stateOfWord, stateOfDef, showExample, onWordTap, onDefTap }) {
  const rm = useReducedMotion();

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <div className="space-y-2">
        {items.map((it, i) => {
          const st = stateOfWord(it);
          const glow = st === "selected" ? { boxShadow: `0 0 18px -6px ${accent}` } : undefined;
          return (
            <motion.button
              key={it.id}
              type="button"
              onClick={() => onWordTap(it)}
              disabled={st === "solved"}
              initial={rm ? false : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, ease: EASE, delay: rm ? 0 : i * 0.04 }}
              className={`w-full text-left rounded-2xl border p-3 backdrop-blur-md transition-colors select-none min-h-[60px] ${shell(st)}`}
              style={glow}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold text-foreground leading-tight break-words">{it.word}</span>
                {st === "solved" && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />}
                {st === "miss" && <X className="w-3.5 h-3.5 text-rose-400 shrink-0" aria-hidden="true" />}
              </span>
              {it.pronunciation && <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">{it.pronunciation}</span>}
              {showExample && it.example && (
                <span className="block text-[10px] text-muted-foreground/90 italic mt-1 leading-snug">{it.example}</span>
              )}
              <span className="block mt-1"><DefinitionMatchBadge provenance={it.provenance} solved={st === "solved"} compact /></span>
            </motion.button>
          );
        })}
      </div>

      <div className="space-y-2">
        {defs.map((it, i) => {
          const st = stateOfDef(it);
          const glow = st === "selected" ? { boxShadow: `0 0 18px -6px ${accent}` } : undefined;
          return (
            <motion.button
              key={it.id}
              type="button"
              onClick={() => onDefTap(it)}
              disabled={st === "solved"}
              initial={rm ? false : { opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, ease: EASE, delay: rm ? 0 : i * 0.04 }}
              className={`w-full text-left rounded-2xl border p-3 backdrop-blur-md transition-colors select-none min-h-[60px] flex items-center ${shell(st)}`}
              style={glow}
            >
              <span className="text-[11px] sm:text-xs text-foreground/90 leading-snug break-words">{it.definition}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}