import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ArrowLeft, Sparkles, Zap, Clock, Lock } from "lucide-react";
import { getGameStats } from "@/lib/gameSkills";
import { useSkillLoc } from "@/lib/skillHubI18n";
import { useAppLang } from "@/hooks/useAppLang";
import { TOP_SKILLS, SKILL_CHILDREN, DIFF_STYLE, pos } from "@/lib/skillTreeData";
import { isGameUnlocked, minLevelFor } from "@/lib/levels";
// Node-map primitives (spokes, pulses, layer bloom, dives) live in
// StagePrimitives.jsx since 2026-09-09 so the Grammar map shares them.
import { EASE, RM, Lines, NodeGroup, ForwardDive, BackDive } from "@/components/skillhub/StagePrimitives";

/* ---------- Stage ---------- */

// onEnterSkill: lets the parent intercept a top-level skill before the stage
// dives into it. Returning true means the parent took over (e.g. a skill with a
// diagnostic that has not been taken yet). Anything else keeps the existing
// dive-into-subskills behaviour untouched.
export default function SkillStage({ onPlayGame, onComingSoon, studentLevel, onLocked, onEnterSkill }) {
  const loc = useSkillLoc();
  const [selected, setSelected] = useState(null);
  const [activeChild, setActiveChild] = useState(null);
  const [hovered, setHovered] = useState(null); // { group, key }
  const [dive, setDive] = useState(null);
  const [divingId, setDivingId] = useState(null);
  const [backDive, setBackDive] = useState(null);

  // Forward dive: the clicked node brightens in place, then flies to center
  // and blooms into the hub while its siblings recede.
  const triggerDive = (node, glow, next) => {
    setDivingId(node.id || node.label);
    setDive({ x: node.x, y: node.y, glow: glow || "rgba(99,102,241,0.5)", Icon: node.icon || null, label: node.label, k: Date.now() });
    next?.();
    setTimeout(() => { setDive(null); setDivingId(null); }, 1180);
  };

  // Reverse dive (Back): the center node pulls back toward its original
  // position, shrinking, while the previous layer blooms back into view.
  const triggerBackDive = (node, glow, next) => {
    setBackDive({ x: node.x, y: node.y, glow: glow || "rgba(99,102,241,0.5)", Icon: node.icon || null, label: node.label, k: Date.now() });
    next?.();
    setTimeout(() => setBackDive(null), 950);
  };

  const level = activeChild ? 2 : selected ? 1 : 0;
  const diveDelay = dive ? 0.55 : 0;
  const skill = TOP_SKILLS.find((s) => s.id === selected);

  const onBack = () => {
    if (level === 2) {
      const target = childNodes.find((c) => c.label === activeChild.label);
      triggerBackDive(target, skill?.glow || skill?.color, () => setActiveChild(null));
    } else if (level === 1) {
      const target = skillNodes.find((s) => s.id === selected);
      triggerBackDive(target, target?.glow, () => setSelected(null));
    }
  };

  /* node datasets */
  const skillNodes = TOP_SKILLS.map((s, i) => ({ ...s, ...pos(i, 6, 38, 36) }));

  const children = selected ? (SKILL_CHILDREN[selected] || []) : [];
  const cn = children.length;
  // Categories are never blocked — a student can always look inside and see
  // what's coming, which reads as a ladder rather than a wall. They just carry
  // a count of how many challenges are open to them right now, so nobody taps
  // into a category to find every single node locked with no warning.
  const childNodes = children.map((c, i) => {
    const list = c.challenges || [];
    const open = list.filter((ch) => isGameUnlocked(ch.game, ch.bank, studentLevel)).length;
    return { ...c, ...pos(i, cn, cn > 6 ? 42 : 38, cn > 6 ? 40 : 36), _i: i, openCount: open, totalCount: list.length };
  });

  const challenges = activeChild ? (activeChild.challenges || []) : [];
  const gn = challenges.length;
  // The student's level is the only thing that decides this.
  //
  // There used to be an "unless they've already played it" escape hatch here,
  // meant to stop the B1 backfill yanking games away from existing students.
  // It was wrong twice over: getGameStats() is keyed by SKILL, not by game, and
  // it reads localStorage, which belongs to the BROWSER rather than the
  // account. One finished vocabulary round therefore unlocked all seven
  // vocabulary games, permanently, for every account that browser ever signed
  // in with — which is how a brand-new Starter account came up fully unlocked.
  // The case it defended barely exists (legacy accounts land on B1, where
  // almost nothing locks), so it's gone rather than patched.
  const gameNodes = challenges.map((c, i) => {
    const minLevel = minLevelFor(c.game, c.bank);
    const locked = !isGameUnlocked(c.game, c.bank, studentLevel);
    return { ...c, ...pos(i, gn, gn > 6 ? 42 : 38, gn > 6 ? 40 : 36), _i: i, minLevel, locked };
  });

  /* hub face */
  const hubFace =
    level === 0
      ? { Icon: Brain, label: loc("ui.center"), glow: "rgba(37,99,235,0.7)" }
      : level === 1
      ? { Icon: skill?.icon, label: loc(skill?.label), glow: skill?.glow || "rgba(99,102,241,0.6)" }
      : { Icon: Sparkles, label: loc(activeChild?.label), glow: skill?.glow || "rgba(99,102,241,0.6)" };

  const hubHidden = !!(dive || backDive);

  return (
    <div className="relative w-full h-full" style={{ perspective: "1400px" }}>
      {/* Ambient drifting glow — very slow background light movement */}
      <div
        className="absolute inset-0 hub-ambient pointer-events-none"
        style={{
          background:
            "radial-gradient(40% 40% at 18% 18%, rgba(37,99,235,0.10), transparent 70%), radial-gradient(36% 36% at 84% 28%, rgba(220,38,38,0.08), transparent 70%), radial-gradient(42% 42% at 72% 82%, rgba(124,58,237,0.10), transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* ---------- Hub: persistent circle, content does a 3D card-turn ---------- */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20" style={{ opacity: hubHidden ? 0 : 1, transition: "opacity 0.45s ease" }}>
        <div className="relative w-24 h-24 md:w-28 md:h-28">
          <div className={RM ? "absolute inset-0" : "absolute inset-0 hub-drift"}>
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none hub-glow-pulse"
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
        {level > 0 && !dive && !backDive && (
          <motion.button
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.3, ease: EASE }}
            onClick={onBack}
            className="absolute top-2 left-2 z-30 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground bg-card/70 backdrop-blur border border-border rounded-full px-3 py-1.5 select-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {level === 2 ? loc(skill?.label) : loc("ui.allSkills")}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ---------- Overview layer (6 skills) ---------- */}
      <NodeGroup active={level === 0}>
        <Lines nodes={skillNodes} color="#a78bfa" hovered={hovered?.group === "skill" ? hovered.key : null} filterId="ovPulse" />
        {skillNodes.map((n, i) => (
          <SkillNode key={n.id} node={n} index={i} active={level === 0} hidden={divingId === n.id}
            onClick={() => {
              if (onEnterSkill?.(n.id)) return;
              triggerDive(n, n.glow, () => setSelected(n.id));
            }} onComingSoon={() => onComingSoon(n.label)}
            hot={hovered?.group === "skill" && hovered.key === n.id}
            dim={hovered?.group === "skill" && hovered.key !== n.id}
            onHoverStart={() => setHovered({ group: "skill", key: n.id })} onHoverEnd={() => setHovered(null)} />
        ))}
      </NodeGroup>

      {/* ---------- Detail layer (subskills) ---------- */}
      <NodeGroup active={level === 1} delay={diveDelay}>
        <Lines nodes={childNodes} color={skill?.color || "#a78bfa"} hovered={hovered?.group === "child" ? hovered.key : null} filterId="dtPulse" />
        {childNodes.map((c, i) => (
          <ChildNode key={c.label} node={c} index={i} active={level === 1} glow={skill?.glow || skill?.color} delay={diveDelay} hidden={divingId === c.label}
            onClick={() => triggerDive(c, skill?.glow || skill?.color, () => setActiveChild(c))} onComingSoon={() => onComingSoon(c.label)}
            hot={hovered?.group === "child" && hovered.key === c.label}
            dim={hovered?.group === "child" && hovered.key !== c.label}
            onHoverStart={() => setHovered({ group: "child", key: c.label })} onHoverEnd={() => setHovered(null)} />
        ))}
      </NodeGroup>

      {/* ---------- Games layer (challenges) ---------- */}
      <NodeGroup active={level === 2} delay={diveDelay}>
        <Lines nodes={gameNodes} color={skill?.color || "#a78bfa"} hovered={hovered?.group === "game" ? hovered.key : null} filterId="gmPulse" />
        {gameNodes.map((c) => (
          <GameNode key={c.name + c._i} node={c} active={level === 2} glow={skill?.glow || skill?.color} delay={diveDelay}
            onClick={() =>
              c.locked
                ? onLocked?.({ label: c.name, minLevel: c.minLevel })
                : onPlayGame({ game: c.game, difficulty: c.difficulty, bank: c.bank, skillLabel: activeChild.label })
            }
            hot={hovered?.group === "game" && hovered.key === c._i}
            dim={hovered?.group === "game" && hovered.key !== c._i}
            onHoverStart={() => setHovered({ group: "game", key: c._i })} onHoverEnd={() => setHovered(null)} />
        ))}
      </NodeGroup>

      {/* ---------- Forward dive: clicked node brightens, flies to center,
           morphs square→circle into the hub, then sub-skills stem out ---------- */}
      <ForwardDive dive={dive} label={dive ? loc(dive.label) : ""} />

      {/* ---------- Reverse dive (Back): center node pulls back to its
           original position, shrinking + fading, as the previous layer blooms ---------- */}
      <BackDive dive={backDive} label={backDive ? loc(backDive.label) : ""} />
    </div>
  );
}

/* ---------- Node components ---------- */

function SkillNode({ node, index, active, hidden, onClick, onComingSoon, hot, dim, onHoverStart, onHoverEnd }) {
  const loc = useSkillLoc();
  const soon = node.comingSoon;
  return (
    <div className={`absolute z-10 hub-node ${dim ? "dim" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}>
      <div className={RM ? "" : "hub-drift"} style={{ animationDelay: `${index * 0.8}s` }}>
        <motion.button
          onClick={() => (soon ? onComingSoon?.() : onClick?.())}
          onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd}
          initial={{ scale: 0, opacity: 0, z: -220 }}
          animate={hidden ? { scale: 0.85, opacity: 0, z: 0 } : active ? { scale: 1, opacity: 1, z: 0 } : { scale: 0.35, opacity: 0, z: -240 }}
          transition={hidden ? { duration: 0 } : { delay: active ? 0.12 + index * 0.07 : 0, duration: 0.7, ease: EASE }}
          whileHover={{ scale: 1.04, transition: { duration: 0.4, ease: EASE } }} whileTap={{ scale: 0.97 }}
          className="group relative"
          style={{ filter: soon ? undefined : `drop-shadow(0 14px 26px ${node.glow})`, transformPerspective: 700 }}
        >
          {!soon && (
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 rounded-full pointer-events-none hub-glow-pulse"
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

function ChildNode({ node, index, active, hidden, onClick, onComingSoon, hot, dim, glow, delay = 0, onHoverStart, onHoverEnd }) {
  const loc = useSkillLoc();
  const { t } = useAppLang();
  const soon = node.comingSoon;
  const g = glow || "rgba(99,102,241,0.5)";
  return (
    <div className={`absolute z-10 hub-node ${dim ? "dim" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}>
      <div className={RM ? "" : "hub-drift"} style={{ animationDelay: `${index * 0.7}s` }}>
        <motion.button
          onClick={() => (soon ? onComingSoon?.() : onClick?.())}
          onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd}
          initial={{ scale: 0, opacity: 0, z: -220 }}
          animate={hidden ? { scale: 0.85, opacity: 0, z: 0 } : active ? { scale: 1, opacity: 1, z: 0 } : { scale: 0.35, opacity: 0, z: -240 }}
          transition={hidden ? { duration: 0 } : { delay: active ? delay + 0.1 + index * 0.06 : 0, duration: 0.7, ease: EASE }}
          whileHover={{ scale: 1.04, transition: { duration: 0.4, ease: EASE } }} whileTap={{ scale: 0.95 }}
          className="group relative min-w-[92px] max-w-[124px]"
          style={{ transformPerspective: 700 }}
        >
          {!soon && (
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 rounded-2xl pointer-events-none hub-glow-pulse"
              style={{ width: "150%", height: "155%", background: `radial-gradient(closest-side, ${g}, transparent 72%)`, filter: "blur(16px)", opacity: 0.5 }} />
          )}
          <span className={`relative block text-center rounded-2xl px-3 py-2.5 border backdrop-blur-xl transition-colors ${soon ? "border-white/10 bg-white/[0.03] opacity-50 group-hover:opacity-75" : "border-white/15 bg-white/[0.06] group-hover:border-white/30 group-hover:bg-white/[0.11]"} ${hot ? "skill-border-glow" : ""}`}
            style={hot ? { "--arrival-color": g } : undefined}>
            <span className={soon ? "block text-[11px] font-bold text-muted-foreground leading-tight" : "block text-[11px] font-bold text-foreground leading-tight"}>{loc(node.label)}</span>
            {soon ? (
              <span className="block text-[8px] text-muted-foreground/70 mt-0.5 leading-tight">{loc("ui.soon")}</span>
            ) : node.subs.length > 0 ? (
              <span className="block text-[8px] text-muted-foreground mt-0.5 leading-tight">{node.subs.slice(0, 3).map(loc).join(" · ")}</span>
            ) : null}
            {!soon && node.totalCount > 0 && (
              <span className={`block text-[8px] mt-1 font-semibold leading-tight ${node.openCount === 0 ? "text-muted-foreground/60" : "text-primary/80"}`}>
                {t("gameui.unlocked_count", { open: node.openCount, total: node.totalCount })}
              </span>
            )}
          </span>
        </motion.button>
      </div>
    </div>
  );
}

function GameNode({ node, active, onClick, hot, dim, glow, delay = 0, onHoverStart, onHoverEnd }) {
  const loc = useSkillLoc();
  const { t } = useAppLang();
  const soon = node.comingSoon;
  const locked = !soon && node.locked;
  const completion = getGameStats(node.game).best || 0;
  return (
    <div className={`absolute z-10 hub-node ${dim ? "dim" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}>
      <div className={RM ? "" : "hub-drift"} style={{ animationDelay: `${node._i * 0.6}s` }}>
        <motion.button
          onClick={() => (soon ? null : onClick?.())}
          onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd}
          initial={{ scale: 0, opacity: 0, z: -220 }}
          animate={active ? { scale: 1, opacity: 1, z: 0 } : { scale: 0.35, opacity: 0, z: -240 }}
          transition={{ delay: active ? delay + 0.1 + node._i * 0.06 : 0, duration: 0.7, ease: EASE }}
          whileHover={{ scale: 1.04, transition: { duration: 0.4, ease: EASE } }} whileTap={{ scale: 0.95 }}
          className="group relative min-w-[96px] max-w-[128px]"
          style={{ transformPerspective: 700 }}
        >
          {!soon && !locked && (
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 rounded-2xl pointer-events-none hub-glow-pulse"
              style={{ width: "150%", height: "155%", background: `radial-gradient(closest-side, ${glow || "rgba(99,102,241,0.5)"}, transparent 72%)`, filter: "blur(16px)", opacity: 0.5 }} />
          )}
          <span className={`relative block text-center rounded-2xl px-3 py-2.5 border backdrop-blur-xl transition-colors ${soon || locked ? "border-white/10 bg-white/[0.03] opacity-50 group-hover:opacity-75" : "border-white/15 bg-white/[0.06] group-hover:border-white/30 group-hover:bg-white/[0.11]"} ${hot ? "skill-border-glow" : ""}`}
            style={hot ? { "--arrival-color": glow || "rgba(99,102,241,0.5)" } : undefined}>
            {locked && (
              <Lock className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
            )}
            <span className="block text-[11px] font-bold text-foreground leading-tight">{loc(node.name)}</span>
            {locked ? (
              <span className="mt-1 inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-full border text-muted-foreground bg-white/5 border-white/15">
                {t("gameui.locked_badge", { level: node.minLevel })}
              </span>
            ) : (
              <span className={`mt-1 inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${DIFF_STYLE[node.difficulty]}`}>{loc(node.difficulty)}</span>
            )}
            {!locked && (
              <span className="mt-1 flex items-center justify-center gap-2 text-[8px] text-muted-foreground leading-tight">
                <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{loc(node.time)}</span>
                <span className="flex items-center gap-0.5"><Zap className="w-2.5 h-2.5 text-amber-400" />{node.xp}</span>
              </span>
            )}
            {!soon && !locked && completion > 0 && (
              <span className="block text-[8px] text-muted-foreground/70 mt-0.5">{completion}%</span>
            )}
          </span>
        </motion.button>
      </div>
    </div>
  );
}