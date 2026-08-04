import React from "react";
import { motion } from "framer-motion";
import { Flame, Trophy, BookOpen, Sparkles } from "lucide-react";

const ICONS = { Flame, Trophy, BookOpen };

export default function RecentAchievement({ achievement }) {
  if (!achievement) {
    return (
      <section className="premium-card p-5 md:p-6 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-3">
          <Trophy className="w-6 h-6 text-muted-foreground/50" />
        </div>
        <h3 className="text-sm font-bold text-foreground mb-1">No achievements yet</h3>
        <p className="text-xs text-muted-foreground">
          Complete your first challenge to unlock an achievement.
        </p>
      </section>
    );
  }
  const Icon = ICONS[achievement.icon] || Trophy;
  return (
    <section className="premium-card mission-sweep p-5 md:p-6 overflow-hidden relative">
      <div className="relative flex items-center gap-3">
        <motion.div
          initial={{ scale: 0.6, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: achievement.tint, boxShadow: `0 12px 30px -10px ${achievement.tint}` }}
        >
          <Icon className="w-7 h-7 text-white" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Latest Achievement</p>
          <h3 className="text-base font-bold text-foreground leading-tight">{achievement.title}</h3>
          <p className="text-xs text-muted-foreground">{achievement.desc}</p>
        </div>
        <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: achievement.tint }} />
      </div>
    </section>
  );
}