import React from "react";
import { motion } from "framer-motion";
import { useSkillMapCopy } from "@/lib/profile/skillMapCopy";

const DAY = 86400000;

// One leaf, following the locked display rules. Never shows a % without
// verified evidence; Coming Soon is outlined and dim, never "0%".
export default function SkillMapLeaf({ leaf, color, index }) {
  const { s, label } = useSkillMapCopy();
  const ev = leaf.evidence;
  const soon = leaf.state === "COMING_SOON";
  let body;
  if (soon) body = <span className="text-muted-foreground">{s("soon")}</span>;
  else if (ev && ev.correctness != null) {
    const days = Math.max(0, Math.floor((Date.now() - new Date(ev.last_evidence_at).getTime()) / DAY));
    body = (
      <span className="text-foreground/80">
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{s("accuracy")}</span>{" "}
        <b style={{ color }}>{ev.correctness}%</b> · {s(`conf_${ev.confidence || "low"}`)} · {days === 0 ? s("today") : s("daysAgo", { n: days })}
      </span>
    );
  } else if (ev && ev.attested_rounds > 0) body = <span className="text-foreground/70">{s("unverified", { n: ev.attested_rounds })}</span>;
  else body = <span className="text-muted-foreground">{s("notExplored")}</span>;
  const lit = !soon && ev && (ev.correctness != null || ev.attested_rounds > 0);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-start gap-3 rounded-2xl px-3 py-2.5 border ${soon ? "border-dashed border-white/10 opacity-60" : "border-white/10 bg-white/[0.03]"}`}>
      <span className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"
        style={soon ? { border: "1px solid rgba(239,230,213,0.3)" } : { background: color, opacity: lit ? 1 : 0.3, boxShadow: lit ? `0 0 10px ${color}` : "none" }} />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{label(leaf)}</div>
        <div className="text-xs mt-0.5">{body}</div>
      </div>
    </motion.div>
  );
}