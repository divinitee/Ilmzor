import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { progressApi } from "@/lib/serverApi";
import { SKILLSTATE_EVENT } from "@/lib/progress/progressClient";
import { AreaWeb, LeafWeb, LeafDetail, leafStatus } from "./SkillWeb";
import { useSkillMapCopy } from "@/lib/profile/skillMapCopy";

// Learner Skill Map (taxonomy + own LeafState) in the web layout.
// Level 1: six areas around "Your English". Tap an area → its leaves as a web
// (Grammar: two rings), tap a leaf → its detail below. Renders `fallback`
// (the old constellation) if the map errors or comes back empty.
export default function SkillMap({ fallback }) {
  const [map, setMap] = useState(undefined); // undefined loading, null failed
  const [open, setOpen] = useState(null);
  const [leafId, setLeafId] = useState(null);
  const reduce = useReducedMotion();
  const { s } = useSkillMapCopy();

  useEffect(() => {
    const load = () => progressApi("getSkillMap", {})
      .then((d) => setMap(d?.groups?.length ? d : null))
      .catch((e) => { console.warn("SkillMap fell back to the old constellation:", e?.code || e?.message); setMap(null); });
    load();
    window.addEventListener(SKILLSTATE_EVENT, load);
    return () => window.removeEventListener(SKILLSTATE_EVENT, load);
  }, []);

  if (map === null) return fallback;
  if (map === undefined) return <div className="mt-4 aspect-square max-w-[420px] mx-auto rounded-full border border-white/10 bg-white/[0.03] animate-pulse" />;
  const area = open && map.groups.flatMap((g) => g.areas).find((a) => a.id === open);
  const leaf = area && area.leaves.find((l) => l.id === leafId);

  const openArea = (id) => {
    const a = map.groups.flatMap((g) => g.areas).find((x) => x.id === id);
    // Pre-select the most informative leaf: checked first, then practised.
    const pick = a?.leaves.find((l) => leafStatus(l) === "verified") || a?.leaves.find((l) => leafStatus(l) === "activity");
    setLeafId(pick?.id || null);
    setOpen(id);
  };
  const fade = { initial: { opacity: 0, scale: reduce ? 1 : 0.97 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: reduce ? 1 : 1.03 }, transition: { duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] } };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {area ? (
        <motion.div key={area.id} {...fade}>
          <LeafWeb area={area} selected={leafId} onSelect={setLeafId} onBack={() => setOpen(null)} />
          <LeafDetail leaf={leaf} area={area} />
        </motion.div>
      ) : (
        <motion.div key="top" {...fade}>
          <AreaWeb map={map} onOpen={openArea} />
          <p className="text-[11px] text-muted-foreground text-center mt-2">{s("tapArea")}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
