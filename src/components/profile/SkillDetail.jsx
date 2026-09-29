import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, TrendingUp, ShieldCheck, Clock, Layers } from "lucide-react";
import SkillOrb from "./SkillOrb";
import { useProfileCopy } from "@/lib/profile/profileCopy";

const EASE = [0.16, 1, 0.3, 1];

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

export default function SkillDetail({ node, onBack }) {
  const reduce = useReducedMotion();
  const { c, skillName } = useProfileCopy();
  const d = (s) => (reduce ? 0 : s);
  return (
    <div className="py-2">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 select-none">
        <ArrowLeft className="w-3.5 h-3.5" /> {c("back")}
      </button>
      <div className="flex items-center gap-4">
        <SkillOrb node={node} size={88} layoutId={`orb-${node.key}`} />
        <motion.div initial={{ opacity: 0, x: reduce ? 0 : -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: d(0.2), duration: d(0.7), ease: EASE }}>
          <h3 className="text-2xl font-bold text-foreground tracking-tight">{skillName(node.key)}</h3>
          <p className="text-sm font-semibold" style={{ color: node.mapped ? node.color : undefined }}>
            {node.mapped ? `${c("developed", { n: node.mastery })} · ${c(node.stage)}` : <span className="text-muted-foreground">{c("discover")}</span>}
          </p>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: reduce ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: d(0.35), duration: d(0.8), ease: EASE }}>
        {node.mapped ? (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Fact icon={TrendingUp} label={c("trajectory")} value={node.atPeak ? c("atPeak") : c("peak", { n: node.peak })} />
            <Fact icon={ShieldCheck} label={c("confidence")} value={c(`conf_${node.confidence}`)} />
            <Fact icon={Clock} label={c("freshness")} value={c(node.freshness)} />
            <Fact icon={Layers} label={c("evidence")} value={c("roundsShort", { n: node.rounds })} />
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">{c("noEvidence")}</p>
        )}

        {node.areas.length > 0 && (
          <div className="mt-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{c("areas")}</p>
            <div className="relative pl-4 border-l border-white/10 space-y-2">
              {node.areas.map((a, i) => (
                <motion.div key={a} initial={{ opacity: 0, x: reduce ? 0 : -6 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: d(0.5 + i * 0.06), duration: d(0.6), ease: EASE }}
                  className="relative text-sm text-foreground/85">
                  <span className="absolute -left-[19px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: node.color, opacity: node.mapped ? 0.9 : 0.35 }} />
                  {a}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}