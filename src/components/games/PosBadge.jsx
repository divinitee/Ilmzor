import React from "react";

// Small, subtle part-of-speech tag beside a word — e.g. "paint [n.]" — for
// any surface that has resolved a sense-level `pos` via posForWord()
// (src/lib/vocab/enrichment.js). Added 2026-09-19 for the Definition Match
// POS enhancement; kept as its own tiny component (mirroring
// DefinitionMatchBadge.jsx's pattern) so other vocabulary surfaces can reuse
// the same rendering once they resolve sense-level content too.
//
// Renders nothing when `pos` is empty — the normal case today, since no
// WordSense rows carry `pos` yet, and a word/sense that doesn't resolve
// correctly has no badge rather than a guessed one (posForWord() never
// returns a label it isn't sure of).
export default function PosBadge({ pos, className = "" }) {
  if (!pos) return null;
  return (
    <span className={`text-[10px] font-semibold text-muted-foreground/60 shrink-0 select-none ${className}`}>
      [{pos}]
    </span>
  );
}
