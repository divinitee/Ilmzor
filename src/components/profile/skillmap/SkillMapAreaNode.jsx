import React from "react";
import { AREA_COLOR, useSkillMapCopy } from "@/lib/profile/skillMapCopy";

export const exploredOf = (area) => {
  const live = area.leaves.filter((l) => l.state === "LIVE");
  const n = live.filter((l) => l.evidence && (l.evidence.correctness != null || l.evidence.attested_rounds > 0)).length;
  return { n, total: live.length };
};

// Area orb: coverage only — no percentage, no average.
export default function SkillMapAreaNode({ area, onOpen }) {
  const { s, label } = useSkillMapCopy();
  const color = AREA_COLOR[area.id] || "#9A63E0";
  const soon = area.state === "COMING_SOON";
  const { n, total } = exploredOf(area);
  const earlier = (area.evidence?.legacy_rounds || 0) + (area.evidence?.unattributed_rounds || 0);
  return (
    <button type="button" onClick={() => onOpen(area.id)}
      className={`flex flex-col items-center text-center gap-1.5 p-2 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group ${soon ? "opacity-55" : ""}`}>
      <span className="w-12 h-12 rounded-full transition-transform duration-500 group-hover:scale-110"
        style={soon ? { border: "1px dashed rgba(239,230,213,0.35)" } : {
          background: `radial-gradient(circle at 35% 30%, ${color}, ${color}55 60%, transparent 75%)`,
          boxShadow: n ? `0 0 22px ${color}88` : "none", opacity: n ? 1 : 0.55,
        }} />
      <span className="text-[12px] font-semibold text-foreground/90 leading-tight">{label(area)}</span>
      <span className="text-[10px] leading-tight text-muted-foreground">{soon ? s("soon") : s("explored", { n, total })}</span>
      {!soon && earlier > 0 && <span className="text-[10px] leading-tight text-muted-foreground/80">{s("earlier", { n: earlier })}</span>}
    </button>
  );
}