import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { progressApi } from "@/lib/serverApi";
import { SKILLSTATE_EVENT } from "@/lib/progress/progressClient";
import SkillMapAreaNode from "./SkillMapAreaNode";
import SkillMapLeaf from "./SkillMapLeaf";
import { AREA_COLOR, useSkillMapCopy } from "@/lib/profile/skillMapCopy";

const fade = { initial: { opacity: 0, scale: 0.98 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.02 }, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } };

// Learner Skill Map (taxonomy + own LeafState). Renders `fallback` (the old
// constellation) if the map errors or comes back empty.
export default function SkillMap({ fallback }) {
  const [map, setMap] = useState(undefined); // undefined loading, null failed
  const [why, setWhy] = useState(""); // TEMP DEBUG (Claude, 2026-09-30): reason the map fell back
  const [open, setOpen] = useState(null);
  const { s, label } = useSkillMapCopy();

  useEffect(() => {
    const load = () => progressApi("getSkillMap", {})
      .then((d) => { if (d?.groups?.length) setMap(d); else { setWhy("empty: " + JSON.stringify(d).slice(0, 300)); setMap(null); } })
      .catch((e) => { setWhy("error: " + (e?.code || "") + " " + (e?.message || String(e)).slice(0, 300)); setMap(null); });
    load();
    window.addEventListener(SKILLSTATE_EVENT, load);
    return () => window.removeEventListener(SKILLSTATE_EVENT, load);
  }, []);

  if (map === null) return <>{fallback}<p data-skillmap-debug className="mt-2 text-[10px] text-rose-300/80 break-all">[skill map debug] {why}</p></>;
  if (map === undefined) return <div className="mt-4 h-56 rounded-3xl border border-white/10 bg-white/[0.03] animate-pulse" />;
  const area = open && map.groups.flatMap((g) => g.areas).find((a) => a.id === open);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {area ? (
        <motion.div key={area.id} {...fade} className="py-1">
          <button onClick={() => setOpen(null)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> {s("back")}
          </button>
          <h3 className="text-lg font-bold text-foreground mb-3" style={{ color: AREA_COLOR[area.id] }}>{label(area)}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {area.leaves.map((l, i) => <SkillMapLeaf key={l.id} leaf={l} color={AREA_COLOR[area.id]} index={i} />)}
          </div>
        </motion.div>
      ) : (
        <motion.div key="top" {...fade} className="space-y-4 py-1">
          {map.groups.map((g) => (
            <div key={g.id}>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1 text-center">{label(g)}</p>
              <div className={`grid gap-1 ${g.areas.length > 2 ? "grid-cols-4" : "grid-cols-2 max-w-[220px] mx-auto"}`}>
                {g.areas.map((a) => <SkillMapAreaNode key={a.id} area={a} onOpen={setOpen} />)}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}