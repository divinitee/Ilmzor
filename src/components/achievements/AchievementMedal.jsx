import React from "react";
import { Star, Lock } from "lucide-react";

// Metallic emblem. A conic "brushed metal" ring around a deep violet core,
// with a slow shine sweep. Locked medals go monochrome and lose the glow.
const TIERS = {
  founder: {
    ring: "conic-gradient(from 210deg, #6b4a1f, #e6c27a 18%, #fff3cf 26%, #b08d57 40%, #7a5a2a 55%, #e6c27a 72%, #fbe9b8 80%, #b08d57 92%, #6b4a1f)",
    glow: "0 0 60px 6px rgba(230,194,122,0.28), 0 0 120px 20px rgba(154,99,224,0.22)",
    core: "radial-gradient(circle at 50% 35%, #3a2160, #150e22 70%)",
    icon: "text-[#f3dea3]",
  },
};

export default function AchievementMedal({ tier = "founder", unlocked = true, size = "lg", className = "" }) {
  const t = TIERS[tier] || TIERS.founder;
  const dim = size === "lg" ? "w-36 h-36" : size === "md" ? "w-20 h-20" : "w-11 h-11";
  const iconDim = size === "lg" ? "w-14 h-14" : size === "md" ? "w-8 h-8" : "w-4 h-4";
  const ringPad = size === "lg" ? "p-[7px]" : size === "md" ? "p-[4px]" : "p-[2px]";
  return (
    <div
      className={`relative rounded-full ${dim} ${ringPad} medal-shine ${unlocked ? "" : "grayscale opacity-60"} ${className}`}
      style={{ background: t.ring, boxShadow: unlocked ? t.glow : "none" }}
    >
      <div className="absolute inset-[3px] rounded-full pointer-events-none" style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 6px rgba(0,0,0,0.55)" }} />
      <div className="relative w-full h-full rounded-full flex items-center justify-center" style={{ background: t.core, boxShadow: "inset 0 6px 18px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.08)" }}>
        {unlocked
          ? <Star className={`${iconDim} ${t.icon} drop-shadow-[0_0_14px_rgba(243,222,163,0.65)]`} fill="currentColor" strokeWidth={1.2} />
          : <Lock className={`${iconDim} text-muted-foreground`} strokeWidth={1.5} />}
      </div>
    </div>
  );
}