import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import PictureMatchBadge from "@/components/games/PictureMatchBadge";

const EASE = [0.16, 1, 0.3, 1];

const tileClass = (state) => {
  if (state === "solved") return "border-emerald-400/60 bg-emerald-500/10 opacity-60";
  if (state === "match") return "border-emerald-400/80 bg-emerald-500/15";
  if (state === "miss") return "border-rose-400/80 bg-rose-500/10";
  if (state === "selected") return "border-white/40 bg-white/[0.10]";
  return "border-white/10 bg-white/[0.04]";
};

// One set: words on the left, pictures (shuffled) on the right. Same tap-word,
// tap-picture mechanic as before — only the shell and the state model changed.
export default function PictureMatchSet({ items, pictures, accent, stateOfWord, stateOfPic, onWordTap, onPicTap }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-2.5">
        {items.map((it, i) => {
          const s = stateOfWord(it);
          return (
            <motion.button key={it.id} type="button" onClick={() => onWordTap(it)} disabled={s === "solved"} aria-pressed={s === "selected"}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, x: s === "miss" ? [0, -6, 6, -4, 0] : 0 }} transition={{ duration: 0.4, ease: EASE, delay: i * 0.03 }}
              whileTap={s === "solved" ? undefined : { scale: 0.96 }}
              className={`relative rounded-2xl border backdrop-blur-md px-3 py-3 text-sm font-semibold select-none min-h-[60px] flex flex-col items-center justify-center gap-1 text-foreground transition-colors ${tileClass(s)}`}
              style={{ boxShadow: s === "selected" ? `0 0 18px -6px ${accent}` : undefined }}>
              {it.word}
              <PictureMatchBadge provenance={it.provenance} solved={s === "solved"} compact />
              {s === "solved" && <Check className="w-3.5 h-3.5 absolute top-1.5 right-1.5 text-emerald-400" aria-hidden="true" />}
            </motion.button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2.5">
        {pictures.map((it, i) => {
          const s = stateOfPic(it);
          return (
            <motion.button key={it.id} type="button" onClick={() => onPicTap(it)} disabled={s === "solved"} aria-pressed={s === "selected"} aria-label={it.emoji}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, x: s === "miss" ? [0, 6, -6, 4, 0] : 0 }} transition={{ duration: 0.4, ease: EASE, delay: i * 0.03 }}
              whileTap={s === "solved" ? undefined : { scale: 0.96 }}
              className={`relative rounded-2xl border backdrop-blur-md px-3 py-2 text-4xl leading-none select-none min-h-[60px] flex items-center justify-center transition-colors ${tileClass(s)}`}
              style={{ boxShadow: s === "selected" ? `0 0 18px -6px ${accent}` : undefined }}>
              <span>{it.emoji}</span>
              {s === "solved" && <Check className="w-3.5 h-3.5 absolute top-1.5 right-1.5 text-emerald-400" aria-hidden="true" />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}