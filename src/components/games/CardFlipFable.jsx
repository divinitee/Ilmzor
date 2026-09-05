import React from "react";

// Placeholder for the Fable bake-off entry ("CardFlip Fable" / version B of
// the Memory Flip bake-off — see claude/ilmzor-game-template.md). Fable's
// job is to replace everything in this file with their independent
// implementation, keeping the same default export and the same props
// contract listed below — this file is already registered in the dev
// toggle (src/lib/cardFlipVariants.js) and the bake-off harness
// (src/pages/DevCardFlipBakeoff.jsx), so nothing else needs to change for
// it to become playable.
//
// Props contract (identical to every Skill Hub game):
//   words            — this student's band-filtered word pool (array)
//   unitName          — string, for header/result copy
//   level             — CEFR level string (Starter|A1|A2|B1|B2|C1)
//   cognitiveDemand   — one of recognition|controlled|application|nuance|precision
//   difficulty        — one of beginner|intermediate|advanced|proficient
//   user              — the current User record
//   onBack()          — exit to the hub/picker
//   onXpEarned(amount, correctCount) — call once per completed round
//   onGameComplete({ scorePct, correct, total }) — call once per completed round
export default function CardFlipFable(props) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <p className="text-sm text-muted-foreground text-center">
        CardFlip Fable — not yet implemented.
      </p>
    </div>
  );
}
