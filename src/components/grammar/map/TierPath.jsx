import React from "react";
import { RM } from "@/components/skillhub/StagePrimitives";
import { TIER_STATE } from "@/lib/grammarMapState";

// The path between tier zones. A segment lights up in the next zone's colour
// once the learner's placement has reached that zone (current or placed
// above); segments still ahead stay dashed and dim. Derived from placement —
// not a completion track.
export default function TierPath({ tiers }) {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
      {tiers.slice(0, -1).map((t, i) => {
        const n = tiers[i + 1];
        const reached = n.state === TIER_STATE.CURRENT || n.state === TIER_STATE.PLACED_ABOVE;
        const dx = n.x - t.x, dy = n.y - t.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        const r = 13;
        return (
          <line key={t.id} className={reached && !RM ? "hub-line" : ""}
            x1={t.x + ux * r} y1={t.y + uy * r} x2={n.x - ux * r} y2={n.y - uy * r}
            stroke={reached ? n.accent : "rgba(255,255,255,0.5)"}
            strokeWidth={reached ? 1.3 : 0.8} strokeLinecap="round" vectorEffect="non-scaling-stroke"
            strokeDasharray={reached ? undefined : "1.6 2.4"}
            opacity={reached ? 0.85 : 0.3}
            style={reached ? { filter: `drop-shadow(0 0 5px ${n.accent})` } : undefined} />
        );
      })}
    </svg>
  );
}