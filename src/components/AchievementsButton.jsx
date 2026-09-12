import React from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";

// Quiet star in the student header. Turns gold when at least one achievement
// is unlocked; otherwise stays a muted outline so it never competes with the
// wordmark beside it.
export default function AchievementsButton({ unlocked = false }) {
  const { t } = useAppLang();
  return (
    <Link
      to="/achievements"
      aria-label={t("achievements.title")}
      className={`relative flex h-8 w-8 items-center justify-center rounded-full border transition-colors select-none ${
        unlocked
          ? "border-[#e6c27a]/35 bg-[#e6c27a]/10 text-[#f3dea3] hover:bg-[#e6c27a]/20 shadow-[0_0_18px_-4px_rgba(230,194,122,0.55)]"
          : "border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground hover:bg-white/[0.08]"
      }`}
    >
      <Star className="w-3.5 h-3.5" fill={unlocked ? "currentColor" : "none"} strokeWidth={unlocked ? 1.2 : 1.8} />
    </Link>
  );
}