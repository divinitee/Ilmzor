import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, MousePointer2, Sparkles } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import { CURRENT_STAGE_INDEX, getRoadmapStages, getRoadmapUI, ROAD_PATH } from "@/content/roadmapJourney";

const ROAD_BREATHE = 6.5;
const ARRIVAL_SPEED = 0.34;

export default function RoadmapBeacon() {
  const reduced = useReducedMotion();
  const { lang } = useAppLang();
  const stages = useMemo(() => getRoadmapStages(lang), [lang]);
  const ui = getRoadmapUI(lang);
  const [selected, setSelected] = useState(CURRENT_STAGE_INDEX);
  const [points, setPoints] = useState([]);
  const pathRef = useRef(null);
  const selectedStage = stages[selected];
  const currentStage = stages[CURRENT_STAGE_INDEX];
  const isLast = selected === stages.length - 1;
  const selectedFraction = selectedStage?.pathFraction ?? currentStage.pathFraction;
  const futureFraction = Math.max(0, selectedFraction - currentStage.pathFraction);
  const hasFutureSelection = selected > CURRENT_STAGE_INDEX;

  useEffect(() => {
    if (!pathRef.current) return;
    const path = pathRef.current;
    const total = path.getTotalLength();
    setPoints(stages.map(stage => {
      const p = path.getPointAtLength(total * stage.pathFraction);
      return { x: p.x, y: p.y };
    }));
  }, [stages]);

  const focusNext = () => setSelected(value => value >= stages.length - 1 ? stages.length - 1 : value + 1);

  return (
    <div className="relative">
      <motion.div initial={reduced ? false : { opacity: 0, y: 18 }} whileInView={reduced ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true }}
        transition={reduced ? undefined : { duration: 0.5 }}
        className="relative overflow-hidden rounded-[2rem] border border-violet-400/20 bg-slate-950/80 backdrop-blur-xl shadow-[0_28px_90px_rgba(0,0,0,.38)] p-5 sm:p-7">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_15%,rgba(139,92,246,.16),transparent_42%),radial-gradient(circle_at_90%_80%,rgba(99,102,241,.10),transparent_45%)]" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-violet-300 font-black"><Sparkles className="w-3 h-3" /> {ui.journey}</div>
              <motion.h3 key={selectedStage.id} initial={reduced ? false : { opacity: 0, y: 5 }} animate={reduced ? undefined : { opacity: 1, y: 0 }} transition={reduced ? undefined : { duration: .25 }} aria-live="polite" className="mt-2 text-xl sm:text-2xl font-bold text-slate-50">{selectedStage.title}</motion.h3>
              <motion.p key={selectedStage.short} initial={reduced ? false : { opacity: 0 }} animate={reduced ? undefined : { opacity: 1 }} transition={reduced ? undefined : { duration: .3 }} className="mt-2 text-xs sm:text-sm leading-6 text-slate-400 max-w-sm">{selectedStage.short}</motion.p>
            </div>
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">{ui.chapter} {selected + 1} / {stages.length}</span>
          </div>

          <button type="button" onClick={focusNext} aria-label={`${ui.chapter} ${selected + 1} of ${stages.length}. ${selectedStage.kicker}. ${ui.ariaExplore}`} 
            className="relative mt-5 block w-full aspect-[2/1] overflow-hidden rounded-[1.5rem] border border-white/5 bg-[#070812] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70">
            <div className="absolute inset-0 opacity-35" style={{ backgroundImage: "linear-gradient(rgba(139,92,246,.065) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,.065) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
            <svg viewBox="0 0 618 300" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              <defs>
                <filter id="roadSoftGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="20" /></filter>
                <filter id="roadGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" /></filter>
                <linearGradient id="roadActive" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6d28d9"/><stop offset="52%" stopColor="#8b5cf6"/><stop offset="100%" stopColor="#c4b5fd"/></linearGradient>
                <linearGradient id="roadEnergy" x1="0" x2="1"><stop offset="0%" stopColor="#ffffff" stopOpacity="0"/><stop offset="45%" stopColor="#ddd6fe" stopOpacity=".95"/><stop offset="55%" stopColor="#ffffff" stopOpacity="1"/><stop offset="100%" stopColor="#c4b5fd" stopOpacity="0"/></linearGradient>
                <linearGradient id="roadFuture" x1="0" x2="1"><stop offset="0%" stopColor="#3b0764"/><stop offset="50%" stopColor="#4c1d95"/><stop offset="100%" stopColor="#5b21b6"/></linearGradient>
                <linearGradient id="roadDirectional" x1="0" x2="1"><stop offset="0%" stopColor="#ddd6fe" stopOpacity="0"/><stop offset="50%" stopColor="#c4b5fd" stopOpacity=".8"/><stop offset="100%" stopColor="#ffffff" stopOpacity="0"/></linearGradient>
              </defs>

              <path ref={pathRef} d={ROAD_PATH} fill="none" stroke="rgba(30,41,59,.96)" strokeWidth="72" strokeLinecap="round" />
              <path d={ROAD_PATH} fill="none" stroke="rgba(71,85,105,.58)" strokeWidth="61" strokeLinecap="round" />
              <path d={ROAD_PATH} fill="none" stroke="rgba(226,232,240,.42)" strokeWidth="2" strokeDasharray="9 11" strokeLinecap="round" />

              {!reduced ? (
                <>
                  <motion.path d={ROAD_PATH} fill="none" stroke="rgba(139,92,246,.32)" strokeWidth="90" strokeLinecap="round" filter="url(#roadSoftGlow)"
                    initial={{ pathLength: 0 }} animate={{ pathLength: currentStage.pathFraction, opacity: [0.34, 0.5, 0.34] }}
                    transition={{ pathLength: { duration: .7, ease: [0.22,1,0.36,1] }, opacity: { duration: ROAD_BREATHE, repeat: Infinity, ease: "easeInOut" } }} />
                  <motion.path d={ROAD_PATH} fill="none" stroke="url(#roadActive)" strokeWidth="57" strokeLinecap="round" filter="url(#roadGlow)"
                    initial={{ pathLength: 0 }} animate={{ pathLength: currentStage.pathFraction, opacity: [0.86, 1, 0.86] }}
                    transition={{ pathLength: { duration: .7, ease: [0.22,1,0.36,1] }, opacity: { duration: ROAD_BREATHE, repeat: Infinity, ease: "easeInOut" } }} />

                  {hasFutureSelection && (
                    <>
                      <motion.path d={ROAD_PATH} fill="none" stroke="rgba(76,29,149,.28)" strokeWidth="74" strokeLinecap="round" filter="url(#roadSoftGlow)"
                        pathLength="1" initial={{ opacity: 0 }} animate={{ opacity: [0.18, 0.3, 0.18] }}
                        transition={{ duration: ROAD_BREATHE, repeat: Infinity, ease: "easeInOut" }}
                        strokeDasharray={`${futureFraction} ${1 - futureFraction}`} strokeDashoffset={-currentStage.pathFraction} />
                      <motion.path d={ROAD_PATH} fill="none" stroke="url(#roadFuture)" strokeWidth="55" strokeLinecap="round"
                        pathLength="1" initial={{ opacity: 0 }} animate={{ opacity: [0.72, 0.88, 0.72] }}
                        transition={{ duration: ROAD_BREATHE, repeat: Infinity, ease: "easeInOut" }}
                        strokeDasharray={`${futureFraction} ${1 - futureFraction}`} strokeDashoffset={-currentStage.pathFraction} />
                    </>
                  )}

                  <motion.circle r="7" fill="#f5f3ff" stroke="#8b5cf6" strokeWidth="3" filter="url(#roadGlow)"
                    initial={{ opacity: 0 }} animate={{ opacity: [0.55, 0.9, 0.55] }}
                    transition={{ duration: ROAD_BREATHE, repeat: Infinity, ease: "easeInOut" }}>
                    <animateMotion path={ROAD_PATH} dur="5.8s" repeatCount="indefinite" rotate="auto"
                      keyPoints={`0;${selectedFraction}`} keyTimes="0;1" calcMode="linear" />
                  </motion.circle>
                  <motion.path d={ROAD_PATH} fill="none" stroke="url(#roadDirectional)" strokeWidth="3.5" strokeLinecap="round"
                    pathLength="1" strokeDasharray="0.035 0.965" strokeDashoffset="0"
                    initial={{ opacity: 0 }} animate={{ opacity: [0, 0.72, 0] }}
                    transition={{ duration: 5.8, repeat: Infinity, ease: "linear" }}
                    style={{ pathLength: 1 }} />
                </>
              ) : (
                <>
                  <path d={ROAD_PATH} fill="none" stroke="url(#roadActive)" strokeWidth="57" strokeLinecap="round" strokeDasharray={`${currentStage.pathFraction} ${1 - currentStage.pathFraction}`} pathLength={1} style={{ opacity: .9 }} />
                  {hasFutureSelection && <path d={ROAD_PATH} fill="none" stroke="url(#roadFuture)" strokeWidth="55" strokeLinecap="round" strokeDasharray={`${futureFraction} ${1 - futureFraction}`} strokeDashoffset={-currentStage.pathFraction} pathLength={1} style={{ opacity: .82 }} />}
                </>
              )}

              {points.map((point, index) => {
                const isCurrent = index === CURRENT_STAGE_INDEX;
                const isPast = index < CURRENT_STAGE_INDEX;
                const isSelected = index === selected;
                return (
                  <g key={stages[index].id} transform={`translate(${point.x} ${point.y})`} opacity={isPast || isCurrent ? 1 : .34}
                    role="img" aria-label={`${stages[index].name} — ${stages[index].kicker}`}>
                    {!reduced && isCurrent && <circle r="24" fill="none" stroke="rgba(167,139,250,.42)" strokeWidth="2"><animate attributeName="r" values="17;28;17" dur="6.5s" repeatCount="indefinite" /><animate attributeName="opacity" values=".7;0;.7" dur="6.5s" repeatCount="indefinite" /></circle>}
                    {isSelected && <circle r="18" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2" strokeDasharray="3 3" />}
                    <circle r="9" fill="#0b0b1b" stroke={isCurrent ? "#ddd6fe" : isPast ? "#a78bfa" : "#475569"} strokeWidth="3" />
                    <circle r="3.5" fill={isCurrent ? "#ffffff" : isPast ? "#c4b5fd" : "#64748b"} />
                    <text y="-24" textAnchor={index === 3 ? "end" : index === 0 ? "start" : "middle"} x={index === 3 ? -10 : index === 0 ? 10 : 0}
                      fill={isSelected ? "#ede9fe" : "#94a3b8"} fontSize="10" fontWeight="800" letterSpacing="1.2">{stages[index].kicker}</text>
                    <text y="40" textAnchor={index === 3 ? "end" : index === 0 ? "start" : "middle"} x={index === 3 ? -10 : index === 0 ? 10 : 0}
                      fill={isSelected ? "#f8fafc" : "#64748b"} fontSize="11" fontWeight="700">{stages[index].name}</text>
                  </g>
                );
              })}
              {points.length > CURRENT_STAGE_INDEX && !reduced && (
                <motion.circle r="6.5" fill="#f5f3ff" stroke="#8b5cf6" strokeWidth="3" filter="url(#roadGlow)"
                  cx={points[CURRENT_STAGE_INDEX].x} cy={points[CURRENT_STAGE_INDEX].y}
                  animate={{ opacity: [.7, 1, .7] }} transition={{ duration: ROAD_BREATHE, repeat: Infinity, ease: "easeInOut" }} />
              )}
            </svg>

            {selected === CURRENT_STAGE_INDEX && <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_35%_55%,rgba(139,92,246,.09),transparent_30%)]" />}
          </button>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" onClick={isLast ? undefined : focusNext}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200/25 bg-violet-500/10 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-violet-100 hover:bg-violet-500/20 transition-colors">
              <motion.span animate={reduced ? undefined : { scale: [1,.84,1] }} transition={reduced ? undefined : { duration: .9, repeat: isLast ? 0 : Infinity, repeatDelay: 2 }} className="inline-flex"><MousePointer2 className="w-3.5 h-3.5" /></motion.span>
              {isLast ? ui.full : selected === CURRENT_STAGE_INDEX ? ui.explore : ui.continue}
            </button>
            {isLast ? <Link to="/roadmap" className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-300 hover:text-violet-200">{ui.roadmap} <ArrowUpRight className="w-3.5 h-3.5" /></Link> : <span className="text-[10px] text-slate-600">{currentStage.kicker} · {ui.chapter} {CURRENT_STAGE_INDEX + 1} / {stages.length}</span>}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
