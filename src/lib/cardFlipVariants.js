import MemoryFlipGame from "@/components/games/MemoryFlipGame";
import CardFlipOpus from "@/components/games/CardFlipOpus";
import CardFlipFable from "@/components/games/CardFlipFable";

// Temporary registry for the Memory Flip bake-off (see "Bake-off setup" in
// claude/ilmzor-game-template.md). Dev-only — reached through
// /dev-cardflip-bakeoff, an admin-gated route not linked in any nav.
// Delete this file, that route, and the Fable/Opus components once a
// winner is picked and its patterns are folded into the real
// MemoryFlipGame.jsx.
//
// To add CardFlip Opus once it exists: import it above and add one entry
// below. Do not reorder or remove existing entries.
export const CARD_FLIP_VARIANTS = [
  { id: "original", label: "Original", Component: MemoryFlipGame },
  { id: "opus", label: "CardFlip Opus", Component: CardFlipOpus },
  { id: "fable", label: "CardFlip Fable", Component: CardFlipFable },
];
