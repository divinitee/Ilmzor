import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ArrowLeft, Sparkles, Zap, Clock } from "lucide-react";
import { getGameStats } from "@/lib/gameSkills";
import { useSkillLoc } from "@/lib/skillHubI18n";
import { TOP_SKILLS, SKILL_CHILDREN, DIFF_STYLE, pos, PULSE_PHASES } from "@/lib/skillTreeData";

const EASE = [0.2, 0.8, 0.2, 1];

/* ---------- helpers ---------- */

function StreamPulses({ color, x, y, filterId }) {
  return PULSE_PHASES.map((p, i) => (
    <circle key={i} r={p.r} fill={color} fillOpacity={p.fo} opacity={0} filter={`url(#${filterId})`}>
      <animateMotion dur="2.2s" begin={`${p.begin}s`} repeatCount="indefinite" path={`M 50 50 L ${x} ${y}`} calcMode="linear" />
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.22;0.7;1" dur="2.2s" begin={`${p.begin}s`} repeatCount="indefinite" />
    </circle>
  ));
}

const nodeKey = (n) => n.id || n.label || n._i;

function Lines({ nodes, color, hovered, filterId }) {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none" style={{ filter: `drop-shadow(0 0 5px ${color})` }}>
      <defs>
        <filter id={filterId} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      {nodes.map((n) => {
        const hot = hovered === nodeKey(n);
        return (
          <line key={nodeKey(n)} x1={50} y1={50} x2={n.x} y2={n.y}
            stroke={color} strokeLinecap="round" vectorEffect="non-scaling-stroke"
            strokeWidth={hot ? 1.4 : 0.7}
            style={{ opacity: hot ? 0.9 : 0.3, transition: "opacity .3s ease, stroke-width .3s ease" }} />
        );
      })}
      {nodes.map((n) => hovered === nodeKey(n) && (
        <g key={nodeKey(n) + "-p"}>
          <StreamPulses color={color} x={n.x} y={n.y} filterId={filterId} />
        </g>
      ))}
    </svg>
  );
}

/* A layer of nodes that blooms open from the hub when active, collapses inward when not. */
function NodeGroup({ active, children }) {
  return (
    <motion.div
      className="absolute inset-0"
      style={{ transformStyle: "preserve-3d", pointerEvents: active ? "auto" : "none" }}
      initial={{ scale: 0.72, opacity: 0, z: -180 }}
      animate={{ scale: active ? 1 : 0.72, opacity: active ? 1 : 0, z: active ? 0 : -180 }}
      transition={{ duration: 0.62, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Stage ---------- */

export default function SkillStage({ onPlayGame, onComingSoon }) {
  const loc = useSkillLoc();
  const [selected, setSelected] = useState(null);
  const [activeChild, setActiveChild] = useState(null);
  const [hovered, setHovered] = useState(null); // { group, key }

  const level = activeChild ? 2 : selected ? 1 : 0;
  const skill = TOP_SKILLS.find((s) => s.id === selected);

  const onBack = () => {
    if (level === 2) setActiveChild(null);
    else if (level === 1) setSelected(null);
  };

  /* node datasets */
  const skillNodes = TOP_SKILLS.map((s, i) => ({ ...s, ...pos(i, 6, 38, 36) }));

  const children = selected ? (SKILL_CHILDREN[selected] || []) : [];
  const cn = children.length;
  const childNodes = children.map((c, i) => ({ ...c, ...pos(i, cn, cn > 6 ? 42 : 38, cn > 6 ? 40 : 36), _i: i }));

  const challenges = activeChild ? (activeChild.challenges || []) : [];
  const gn = challenges.length;
  const gameNodes = challenges.map((c, i) => ({ ...c, ...pos(i, gn, gn > 6 ? 42 : 38, gn > 6 ? 40 : 36), _i: i }));

  /* hub face */
  const hubFace =
    level === 0
      ? { Icon: Brain, label: loc("ui.center"), glow: "rgba(37,99,235,0.7)" }
      : level === 1
      ? { Icon: skill?.icon, label: loc(skill?.label), glow: skill?.glow || "rgba(99,102,241,0.6)" }
      : { Icon: Sparkles, label: loc(activeChild?.label), glow: skill?.glow || "rgba(99,102,241,0.6)" };

  return (
    <div className="relative w-full h-full" style={{ perspective: "1400px" }}>
      {/* ---------- Hub: persistent circle, content does a 3D card-turn ---------- */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="relative w-24 h-24 md:w-28 md:h-28">
          <div className="absolute inset-0 animate-neo-float">
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none animate-neo-breathe"
              style={{ width: "210%", height: "210%", background: `radial-gradient(closest-side, ${hubFace.glow}, transparent 72%)`, filter: "blur(26px)" }} />
            <button
              onClick={level > 0 ? onBack : undefined}
              className="relative w-full h-full rounded-full border border-white/25 bg-white/[0.1] backdrop-blur-2xl flex flex-col items-center justify-center text-white"
              style={{ boxShadow: `0 0 55px ${hubFace.glow}, inset 0 1px 0 rgba(255,255,255,0.22)` }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={level}
                  initial={{ rotateY: -42, opacity: 0, scale: 0.8 }}
                  animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                  exit={{ rotateY: 42, opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.34, ease: EASE }}
                  style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
                  className="flex flex-col items-center justify-center"
                >
                  {hubFace.Icon && <hubFace.Icon className="w-7 h-7 mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]" />}
                  <span className="text-[10px] font-bold tracking-wide leading-none text-center px-2">{hubFace.label}</span>
                </motion.div>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Back pill ---------- */}
      <AnimatePresence>
        {level > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3, ease: EASE }}
            onClick={onBack}
            className="absolute left-1/2 -translate-x-1/2 bottom-1 z-30 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground bg-card/70 backdrop-blur border border-border rounded-full px-3 py-1.5 select-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {level === 2 ? loc(skill?.label) : loc("ui.allSkills")}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ---------- Overview layer (6 skills) ---------- */}
      <NodeGroup active={level === 0}>
        <Lines nodes={skillNodes} color="#a78bfa" hovered={hovered?.group === "skill" ? hovered.key : null} filterId="ovPulse" />
        {skillNodes.map((n, i) => (
          <SkillNode key={n.id} node={n} index={i} active={level === 0}
            onClick={() => setSelected(n.id)} onComingSoon={() => onComingSoon(n.label)}
            hot={hovered?.group === "skill" && hovered.key === n.id}
            onHoverStart={() => setHovered({ group: "skill", key: n.id })} onHoverEnd={() => setHovered(null)} />
        ))}
      </NodeGroup>

      {/* ---------- Detail layer (subskills) ---------- */}
      <NodeGroup active={level === 1}>
        <Lines nodes={childNodes} color={skill?.color || "#a78bfa"} hovered={hovered?.group === "child" ? hovered.key : null} filterId="dtPulse" />
        {childNodes.map((c, i) => (
          <ChildNode key={c.label} node={c} index={i} active={level === 1}
            onClick={() => setActiveChild(c)} onComingSoon={() => onComingSoon(c.label)}
            hot={hovered?.group === "child" && hovered.key === c.label}
            onHoverStart={() => setHovered({ group: "child", key: c.label })} onHoverEnd={() => setHovered(null)} />
        ))}
      </NodeGroup>

      {/* ---------- Games layer (challenges) ---------- */}
      <NodeGroup active={level === 2}>
        <Lines nodes={gameNodes} color={skill?.color || "#a78bfa"} hovered={hovered?.group === "game" ? hovered.key : null} filterId="gmPulse" />
        {gameNodes.map((c) => (
          <GameNode key={c.name + c._i} node={c} active={level === 2}
            onClick={() => onPlayGame({ game: c.game, difficulty: c.difficulty, bank: c.bank, skillLabel: activeChild.label })}
            hot={hovered?.group === "game" && hovered.key === c._i}
            onHoverStart={() => setHovered({ group: "game", key: c._i })} onHoverEnd={() => setHovered(null)} />
        ))}
      </NodeGroup>
    </div>
  );
}

/* ---------- Node components ---------- */

function SkillNode({ node, index, active, onClick, onComingSoon, hot, onHoverStart, onHoverEnd }) {
  const loc = useSkillLoc();
  const soon = node.comingSoon;
  return (
    <div className="absolute z-10" style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}>
      <div className="animate-neo-float">
        <motion.button
          onClick={() => (soon ? onComingSoon?.() : onClick?.())}
          onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd}
          initial={{ scale: 0, opacity: 0, z: -220 }}
          animate={active ? { scale: 1, opacity: 1, z: 0 } : { scale: 0.35, opacity: 0, z: -240 }}
          transition={{ delay: active ? 0.1 + index * 0.06 : 0, type: "spring", stiffness: 200, damping: 22 }}
          whileHover={{ scale: 1.08, y: -4 }} whileTap={{ scale: 0.95 }}
          className="group relative"
          style={{ filter: soon ? undefined : `drop-shadow(0 14px 26px ${node.glow})`, transformPerspective: 700 }}
        >
          {!soon && (
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 rounded-full pointer-events-none animate-neo-breathe"
              style={{ width: "140%", height: "140%", background: `radial-gradient(closest-side, ${node.glow}, transparent 72%)`, filter: "blur(16px)", opacity: 0.6 }} />
          )}
          <span className={`relative flex flex-col items-center justify-center text-white rounded-[28px] w-20 h-20 md:w-24 md:h-24 border backdrop-blur-xl transition-colors ${soon ? "border-white/10 bg-white/[0.03] opacity-55 group-hover:opacity-80" : "border-white/15 bg-white/[0.07] group-hover:border-white/30 group-hover:bg-white/[0.12]"} ${hot ? "skill-border-glow" : ""}`}
            style={hot ? { "--arrival-color": node.glow } : undefined}>
            <node.icon className={soon ? "w-6 h-6 mb-1 opacity-60" : "w-6 h-6 mb-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.55)]"} />
            <span className="text-[10px] font-bold tracking-wide leading-none text-center px-1.5">{loc(node.label)}</span>
            {soon && <span className="text-[7px] font-medium leading-none mt-0.5 opacity-60">{loc("ui.soon")}</span>}
          </span>
        </motion.button>
      </div>
    </div>
  );
}

function ChildNode({ node, index, active, onClick, onComingSoon, hot, onHoverStart, onHoverEnd }) {
  const loc = useSkillLoc();
  const soon = node.comingSoon;
  return (
    <div className="absolute z-10" style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}>
      <div className="animate-neo-float">
        <motion.button
          onClick={() => (soon ? onComingSoon?.() : onClick?.())}
          onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd}
          initial={{ scale: 0, opacity: 0, z: -220 }}
          animate={active ? { scale: 1, opacity: 1, z: 0 } : { scale: 0.35, opacity: 0, z: -240 }}
          transition={{ delay: active ? 0.08 + index * 0.05 : 0, type: "spring", stiffness: 220, damping: 22 }}
          whileHover={{ scale: 1.1, y: -3 }} whileTap={{ scale: 0.92 }}
          className="group relative min-w-[92px] max-w-[124px]"
          style={{ transformPerspective: 700 }}
        >
          {!soon && (
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 rounded-2xl pointer-events-none animate-neo-breathe"
              style={{ width: "150%", height: "155%", background: "radial-gradient(closest-side, rgba(37,99,235,0.5), transparent 72%)", filter: "blur(16px)", opacity: 0.5 }} />
          )}
          <span className={`relative block text-center rounded-2xl px-3 py-2.5 border backdrop-blur-xl transition-colors ${soon ? "border-white/10 bg-white/[0.03] opacity-50 group-hover:opacity-75" : "border-white/15 bg-white/[0.06] group-hover:border-white/30 group-hover:bg-white/[0.11]"} ${hot ? "skill-border-glow" : ""}`}
            style={hot ? { "--arrival-color": "rgba(99,102,241,0.5)" } : undefined}>
            <span className={soon ? "block text-[11px] font-bold text-muted-foreground leading-tight" : "block text-[11px] font-bold text-foreground leading-tight"}>{loc(node.label)}</span>
            {soon ? (
              <span className="block text-[8px] text-muted-foreground/70 mt-0.5 leading-tight">{loc("ui.soon")}</span>
            ) : node.subs.length > 0 ? (
              <span className="block text-[8px] text-muted-foreground mt-0.5 leading-tight">{node.subs.slice(0, 3).map(loc).join(" · ")}</span>
            ) : null}
          </span>
        </motion.button>
      </div>
    </div>
  );
}

function GameNode({ node, active, onClick, hot, glow, onHoverStart, onHoverEnd }) {
  const loc = useSkillLoc();
  const soon = node.comingSoon;
  const completion = getGameStats(node.game).best || 0;
  return (
    <div className="absolute z-10" style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}>
      <div className="animate-neo-float">
        <motion.button
          onClick={() => (soon ? null : onClick?.())}
          onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd}
          initial={{ scale: 0, opacity: 0, z: -220 }}
          animate={active ? { scale: 1, opacity: 1, z: 0 } : { scale: 0.35, opacity: 0, z: -240 }}
          transition={{ delay: active ? 0.08 + node._i * 0.06 : 0, type: "spring", stiffness: 220, damping: 22 }}
          whileHover={{ scale: 1.08, y: -3 }} whileTap={{ scale: 0.95 }}
          className="group relative min-w-[96px] max-w-[128px]"
          style={{ transformPerspective: 700 }}
        >
          {!soon && (
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 rounded-2xl pointer-events-none animate-neo-breathe"
              style={{ width: "150%", height: "155%", background: `radial-gradient(closest-side, ${glow || "rgba(99,102,241,0.5)"}, transparent 72%)`, filter: "blur(16px)", opacity: 0.5 }} />
          )}
          <span className={`relative block text-center rounded-2xl px-3 py-2.5 border backdrop-blur-xl transition-colors ${soon ? "border-white/10 bg-white/[0.03] opacity-50" : "border-white/15 bg-white/[0.06] group-hover:border-white/30 group-hover:bg-white/[0.11]"} ${hot ? "skill-border-glow" : ""}`}
            style={hot ? { "--arrival-color": glow || "rgba(99,102,241,0.5)" } : undefined}>
            <span className="block text-[11px] font-bold text-foreground leading-tight">{loc(node.name)}</span>
            <span className={`mt-1 inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${DIFF_STYLE[node.difficulty]}`}>{loc(node.difficulty)}</span>
            <span className="mt-1 flex items-center justify-center gap-2 text-[8px] text-muted-foreground leading-tight">
              <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{loc(node.time)}</span>
              <span className="flex items-center gap-0.5"><Zap className="w-2.5 h-2.5 text-amber-400" />{node.xp}</span>
            </span>
            {!soon && completion > 0 && (
              <span className="block text-[8px] text-muted-foreground/70 mt-0.5">{completion}%</span>
            )}
          </span>
        </motion.button>
      </div>
    </div>
  );
}