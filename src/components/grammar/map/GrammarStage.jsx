import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers } from "lucide-react";
import { pos } from "@/lib/skillTreeData";
import { EASE, RM, Lines, NodeGroup, ForwardDive, BackDive } from "@/components/skillhub/StagePrimitives";
import { GRAMMAR_NAV } from "@/lib/grammarTiers";
import { TIER_STATE, tierState, clusterSummary, recommendedClusterId, domainState, domainRelative } from "@/lib/grammarMapState";
import { PRACTICE_MANIFEST, topicsInBranch } from "@/lib/grammarPractice/manifest";
import { PRACTICE_STAGES } from "@/lib/grammarPractice/stages";
import { TIER_META, TIER_POS, GRAMMAR_GLOW } from "./tierMeta";
import TierPath from "./TierPath";
import GrammarTierNode from "./GrammarTierNode";
import GrammarClusterNode from "./GrammarClusterNode";
import GrammarDomainNode from "./GrammarDomainNode";
import GrammarBranchNode from "./GrammarBranchNode";
import GrammarTopicNode from "./GrammarTopicNode";
import GrammarStageNode from "./GrammarStageNode";

// The Grammar node map — same stage mechanics as Vocabulary's SkillStage
// (layer bloom/recede, hub card-turn, forward/back dive), walking the
// pre-computed GRAMMAR_NAV tree instead of SKILL_CHILDREN:
//   layer 0  tiers as zones on an ascending path
//   layer 1  a tier's clusters
//   layer 2  a cluster's domains
//   layer 3  a domain's branches
//   layer 4  a branch's practice topics
//   layer 5  a topic's five practice stages (leaf; selecting one starts a round)
//
// Every step is the same gesture: tap a node, dive, the next ring blooms.
// Branches were a pill list in a panel under the map until 2026-09-10 — the one
// step of the path that wasn't a node, which is exactly how it read. Layers 4-5
// come from the auto-generated practice manifest, so a branch with nothing
// authored can never produce an empty ring; it renders locked instead.
//
// The parent owns tierId / clusterId / domainId / branchId / topicId; this
// component owns only the transient hover + dive animation state.
// backRef: the page's header Back pill calls through this so it gets the same
// reverse-dive as the hub, and the stage needs no pill of its own (which
// collided with the top node on narrow screens).

const pretty = (s) => String(s || "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function GrammarStage({
  result, byId, tierId, clusterId, domainId, branchId, topicId,
  onSelectTier, onSelectCluster, onSelectDomain, onSelectBranch, onSelectTopic, onSelectStage,
  onBack, backRef, c,
}) {
  const [hovered, setHovered] = useState(null);
  const [dive, setDive] = useState(null);
  const [divingId, setDivingId] = useState(null);
  const [backDive, setBackDive] = useState(null);

  const tiers = useMemo(() => GRAMMAR_NAV.map((t, i) => ({
    ...t, ...TIER_POS[i], ...TIER_META[t.id], state: tierState(t, result?.level),
  })), [result]);
  const tier = tiers.find((t) => t.id === tierId) || null;

  const recId = tier && tier.state === TIER_STATE.CURRENT ? recommendedClusterId(tier, byId) : null;
  const clusters = useMemo(() => !tier ? [] : tier.clusters.map((cl, i, arr) => ({
    ...cl, ...pos(i, arr.length, 38, 36), summary: clusterSummary(cl, byId), recommended: cl.id === recId,
  })), [tier, byId, recId]);
  const cluster = clusters.find((cl) => cl.id === clusterId) || null;

  const domains = useMemo(() => !cluster ? [] : cluster.domains.map((d, i, arr) => {
    const r = byId[d.id];
    return { ...d, ...pos(i, arr.length, 36, 34), _i: i, state: domainState(r), relative: domainRelative(r, tier), level: r?.level || null };
  }), [cluster, byId, tier]);
  const domain = domains.find((d) => d.id === domainId) || null;

  // Layer 3 — the domain's branches. Locked when nothing is authored yet.
  const branches = useMemo(() => {
    if (!domain) return [];
    return domain.branches.map((b, i, arr) => {
      const n = topicsInBranch(domain.id, b).length;
      return {
        id: b, name: pretty(b), locked: !n,
        sub: n ? c("home_branches", { n }) : c("practice_stage_empty"),
        ...pos(i, arr.length, 36, 34), _i: i,
      };
    });
  }, [domain, c]);
  const branch = branches.find((b) => b.id === branchId) || null;

  // Layer 4 — the topics a branch has practice content for.
  const topics = useMemo(() => {
    if (!domainId || !branchId) return [];
    const rows = topicsInBranch(domainId, branchId);
    return rows.map((m, i, arr) => ({
      id: m.topic, name: pretty(m.topic), questions: m.authored, level: m.level,
      ...pos(i, arr.length, 36, 34), _i: i,
    }));
  }, [domainId, branchId]);
  const topic = topics.find((t) => t.id === topicId) || null;

  // Layer 5 — the five-stage ladder for one topic. Sizes come from the
  // manifest, so no bank has to be loaded to draw the nodes.
  const stages = useMemo(() => {
    if (!topicId) return [];
    const m = PRACTICE_MANIFEST[`${domainId}.${branchId}.${topicId}`];
    return PRACTICE_STAGES.map((s, i, arr) => {
      const n = m?.stages?.[s.id] || 0;
      return {
        ...s, ...pos(i, arr.length, 38, 36), _i: i,
        locked: Boolean(s.ai) || !n,
        sub: s.ai ? c("practice_stage_ai") : n ? c("practice_stage_count", { n }) : c("practice_stage_empty"),
      };
    });
  }, [topicId, domainId, branchId, c]);

  const level = topicId ? 5 : branchId ? 4 : domainId ? 3 : clusterId ? 2 : tierId ? 1 : 0;
  const glow = tier?.glow || GRAMMAR_GLOW;
  const accent = tier?.accent || "#3E9E92";
  const diveDelay = dive ? 0.55 : 0;

  const triggerDive = (node, g, next) => {
    setDivingId(node.id);
    setDive({ x: node.x, y: node.y, glow: g, Icon: node.icon || Layers, label: node.name, k: Date.now() });
    next();
    setTimeout(() => { setDive(null); setDivingId(null); }, 1180);
  };
  const triggerBackDive = (node, g, next) => {
    setBackDive({ x: node.x, y: node.y, glow: g, Icon: node.icon || Layers, label: node.name, k: Date.now() });
    next();
    setTimeout(() => setBackDive(null), 950);
  };

  const handleBack = () => {
    if (dive || backDive) return;
    if (level === 5 && topic) triggerBackDive(topic, glow, onBack);
    else if (level === 4 && branch) triggerBackDive(branch, glow, onBack);
    else if (level === 3 && domain) triggerBackDive(domain, glow, onBack);
    else if (level === 2 && cluster) triggerBackDive(cluster, glow, onBack);
    else if (level === 1 && tier) triggerBackDive(tier, tier.glow, onBack);
    else onBack();
  };
  useEffect(() => { if (backRef) backRef.current = handleBack; });

  const HubIcon = level === 1 ? tier?.icon || Layers : Layers;
  const hubLabel = level === 5 ? topic?.name
    : level === 4 ? branch?.name
      : level === 3 ? domain?.name
        : level === 2 ? cluster?.name : tier?.name;
  const hubHidden = level === 0 || !!(dive || backDive);

  return (
    <div className="relative w-full h-full" style={{ perspective: "1400px" }}>
      <div className="absolute inset-0 hub-ambient pointer-events-none"
        style={{ background: "radial-gradient(40% 40% at 18% 78%, rgba(91,155,126,0.12), transparent 70%), radial-gradient(36% 36% at 50% 46%, rgba(62,158,146,0.10), transparent 70%), radial-gradient(42% 42% at 80% 18%, rgba(107,158,196,0.12), transparent 70%)", filter: "blur(40px)" }} />

      {/* ---------- Hub: back button + current zone/group face ---------- */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20" style={{ opacity: hubHidden ? 0 : 1, pointerEvents: hubHidden ? "none" : "auto", transition: "opacity 0.45s ease" }}>
        <div className="relative w-24 h-24 md:w-28 md:h-28">
          <div className={RM ? "absolute inset-0" : "absolute inset-0 hub-drift"}>
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none hub-glow-pulse"
              style={{ width: "210%", height: "210%", background: `radial-gradient(closest-side, ${glow}, transparent 72%)`, filter: "blur(26px)" }} />
            <button onClick={handleBack}
              className="relative w-full h-full rounded-full border border-white/25 bg-white/[0.1] backdrop-blur-2xl flex flex-col items-center justify-center text-white"
              style={{ boxShadow: `0 0 55px ${glow}, inset 0 1px 0 rgba(255,255,255,0.22)` }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={level}
                  initial={{ rotateY: -42, opacity: 0, scale: 0.8 }} animate={{ rotateY: 0, opacity: 1, scale: 1 }} exit={{ rotateY: 42, opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.34, ease: EASE }}
                  style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
                  className="flex flex-col items-center justify-center">
                  <HubIcon className="w-7 h-7 mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]" />
                  <span className="text-[10px] font-bold tracking-wide leading-none text-center px-2">{hubLabel}</span>
                </motion.div>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Layer 0: tier zones on an ascending path ---------- */}
      <NodeGroup active={level === 0}>
        <TierPath tiers={tiers} />
        {tiers.map((t, i) => (
          <GrammarTierNode key={t.id} node={t} index={i} active={level === 0} hidden={divingId === t.id} c={c}
            onClick={() => triggerDive(t, t.glow, () => onSelectTier(t.id))}
            hot={hovered?.group === "tier" && hovered.key === t.id}
            dim={hovered?.group === "tier" && hovered.key !== t.id}
            onHoverStart={() => setHovered({ group: "tier", key: t.id })} onHoverEnd={() => setHovered(null)} />
        ))}
      </NodeGroup>

      {/* ---------- Layer 1: clusters ---------- */}
      <NodeGroup active={level === 1} delay={diveDelay}>
        <Lines nodes={clusters} color={accent} hovered={hovered?.group === "cluster" ? hovered.key : null} filterId="grClPulse" />
        {clusters.map((cl, i) => (
          <GrammarClusterNode key={cl.id} node={cl} index={i} active={level === 1} hidden={divingId === cl.id} glow={glow} accent={accent} delay={diveDelay} c={c}
            onClick={() => triggerDive(cl, glow, () => onSelectCluster(cl.id))}
            hot={hovered?.group === "cluster" && hovered.key === cl.id}
            dim={hovered?.group === "cluster" && hovered.key !== cl.id}
            onHoverStart={() => setHovered({ group: "cluster", key: cl.id })} onHoverEnd={() => setHovered(null)} />
        ))}
      </NodeGroup>

      {/* ---------- Layer 2: domains ---------- */}
      <NodeGroup active={level === 2} delay={diveDelay}>
        <Lines nodes={domains} color={accent} hovered={hovered?.group === "domain" ? hovered.key : null} filterId="grDmPulse" />
        {domains.map((d) => (
          <GrammarDomainNode key={d.id} node={d} active={level === 2} hidden={divingId === d.id} glow={glow} delay={diveDelay} c={c}
            onClick={() => triggerDive(d, glow, () => onSelectDomain(d.id))}
            hot={hovered?.group === "domain" && hovered.key === d.id}
            dim={hovered?.group === "domain" && hovered.key !== d.id}
            onHoverStart={() => setHovered({ group: "domain", key: d.id })} onHoverEnd={() => setHovered(null)} />
        ))}
      </NodeGroup>

      {/* ---------- Layer 3: branches ---------- */}
      <NodeGroup active={level === 3} delay={diveDelay}>
        <Lines nodes={branches} color={accent} hovered={hovered?.group === "branch" ? hovered.key : null} filterId="grBrPulse" />
        {branches.map((b) => (
          <GrammarBranchNode key={b.id} node={b} active={level === 3} hidden={divingId === b.id} glow={glow} accent={accent} delay={diveDelay}
            onClick={() => triggerDive(b, glow, () => onSelectBranch(b.id))}
            hot={hovered?.group === "branch" && hovered.key === b.id}
            dim={hovered?.group === "branch" && hovered.key !== b.id}
            onHoverStart={() => setHovered({ group: "branch", key: b.id })} onHoverEnd={() => setHovered(null)} />
        ))}
      </NodeGroup>

      {/* ---------- Layer 4: practice topics in the chosen branch ---------- */}
      <NodeGroup active={level === 4} delay={diveDelay}>
        <Lines nodes={topics} color={accent} hovered={hovered?.group === "topic" ? hovered.key : null} filterId="grTpPulse" />
        {topics.map((t) => (
          <GrammarTopicNode key={t.id} node={t} active={level === 4} hidden={divingId === t.id} glow={glow} accent={accent} delay={diveDelay} c={c}
            onClick={() => triggerDive(t, glow, () => onSelectTopic(t.id))}
            hot={hovered?.group === "topic" && hovered.key === t.id}
            dim={hovered?.group === "topic" && hovered.key !== t.id}
            onHoverStart={() => setHovered({ group: "topic", key: t.id })} onHoverEnd={() => setHovered(null)} />
        ))}
      </NodeGroup>

      {/* ---------- Layer 5: the five-stage ladder (leaf — starts a round) ---------- */}
      <NodeGroup active={level === 5} delay={diveDelay}>
        <Lines nodes={stages} color={accent} hovered={hovered?.group === "stage" ? hovered.key : null} filterId="grStPulse" />
        {stages.map((s) => (
          <GrammarStageNode key={s.id} node={s} active={level === 5} hidden={divingId === s.id} glow={glow} accent={accent} delay={diveDelay}
            onClick={() => triggerDive(s, glow, () => onSelectStage(s.id))}
            hot={hovered?.group === "stage" && hovered.key === s.id}
            dim={hovered?.group === "stage" && hovered.key !== s.id}
            onHoverStart={() => setHovered({ group: "stage", key: s.id })} onHoverEnd={() => setHovered(null)} />
        ))}
      </NodeGroup>

      <ForwardDive dive={dive} label={dive?.label || ""} />
      <BackDive dive={backDive} label={backDive?.label || ""} />
    </div>
  );
}