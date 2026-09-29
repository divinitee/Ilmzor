import React, { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import SkillConstellation from "./SkillConstellation";
import SkillDetail from "./SkillDetail";
import { buildSkillProfile } from "@/lib/profile/skillProfile";
import { useProfileCopy } from "@/lib/profile/profileCopy";

// Level 1 (constellation) ↔ Level 2/3 (skill detail + its practice areas).
// Takes raw SkillState; the adapter is the only thing that reads it.
export default function LearnerProfile({ skillState }) {
  const profile = useMemo(() => buildSkillProfile(skillState), [skillState]);
  const [selected, setSelected] = useState(null);
  const reduce = useReducedMotion();
  const { c } = useProfileCopy();
  if (!profile) return <div className="mt-4 aspect-square max-w-[420px] mx-auto rounded-full border border-white/10 bg-white/[0.03] animate-pulse" />;
  const node = profile.nodes.find((n) => n.key === selected);
  const { summary } = profile;
  const fade = { initial: { opacity: 0, scale: reduce ? 1 : 0.97 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: reduce ? 1 : 1.03 }, transition: { duration: reduce ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] } };
  return (
    <LayoutGroup>
      <AnimatePresence mode="popLayout" initial={false}>
        {node ? (
          <motion.div key="detail" {...fade}><SkillDetail node={node} onBack={() => setSelected(null)} /></motion.div>
        ) : (
          <motion.div key="map" {...fade}>
            <SkillConstellation profile={profile} onSelect={setSelected} />
            <p className="text-[11px] text-muted-foreground text-center mt-1">
              {summary.mapped === 0 ? c("empty") : `${c("mapped", { n: summary.mapped, total: summary.total })} · ${c("rounds", { n: summary.rounds })}`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}