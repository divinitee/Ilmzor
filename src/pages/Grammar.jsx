import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { DOMAINS } from "@/lib/adaptiveGrammar";
import { GRAMMAR_NAV } from "@/lib/grammarTiers";
import { DOMAIN_STATE, domainState } from "@/lib/grammarMapState";
import { loadTopic, topicKey } from "@/lib/grammarPractice";
import { PRACTICE_STAGES } from "@/lib/grammarPractice/stages";
import { fromStoredProfile } from "@/lib/grammarPlacementResult";
import { useGrammarCopy } from "@/lib/grammarCopy";
import GrammarStage from "@/components/grammar/map/GrammarStage";
import PracticeRunner from "@/components/grammar/PracticeRunner";
import { GRAMMAR_ACCENT as ACCENT } from "@/components/grammar/map/tierMeta";

// Route: /grammar — the student's Grammar world.
//
// One node map, six layers, same gesture the whole way down:
//   Tier -> Cluster -> Domain -> Branch -> Topic -> Stage -> the round, in place.
// Branches were pills in a panel and practice lived on its own /grammar/practice
// screen with flat lists; both are gone. Nothing on the path between the map and
// a question is a different kind of control.
//
// The nav TREE (src/lib/grammarTiers.js) is pre-computed from the dataset and
// the practice layers come from the auto-generated manifest — nothing here
// decides what belongs where, and empty nodes are locked upstream, not hidden.
//
// Placement entry rule is unchanged: no GrammarProfile row -> the assessment.

const pretty = (s) => String(s || "").replace(/-/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());

export default function Grammar() {
  const navigate = useNavigate();
  const c = useGrammarCopy();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [tierId, setTierId] = useState(null);
  const [clusterId, setClusterId] = useState(null);
  const [domainId, setDomainId] = useState(null);
  const [branchId, setBranchId] = useState(null);
  const [topicId, setTopicId] = useState(null);
  const [stageId, setStageId] = useState(null);
  const [items, setItems] = useState(null);
  const [runKey, setRunKey] = useState(0);

  const backRef = useRef(null); // stage's animated back, see GrammarStage

  const names = useMemo(() => Object.fromEntries(DOMAINS.map((d) => [d.id, d.name])), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await base44.auth.me();
        const rows = await base44.entities.GrammarProfile.filter({ user_email: me?.email });
        if (cancelled) return;
        if (!rows?.length) {
          // No diagnostic yet — the assessment is the way in.
          navigate("/grammar/assessment", { replace: true });
          return;
        }
        setResult(fromStoredProfile(rows[0], names));
      } catch (e) {
        console.error("grammar home load failed", e);
        if (!cancelled) navigate("/grammar/assessment", { replace: true });
        return;
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [navigate, names]);

  // A topic's bank is code-split; fetch it as soon as the topic is chosen so
  // the items are ready by the time a stage node is tapped.
  useEffect(() => {
    if (!domainId || !branchId || !topicId) { setItems(null); return; }
    let cancelled = false;
    loadTopic(domainId, branchId, topicId).then((rows) => { if (!cancelled) setItems(rows); });
    return () => { cancelled = true; };
  }, [domainId, branchId, topicId]);

  const byId = useMemo(() => Object.fromEntries((result?.domains ?? []).map((d) => [d.domain, d])), [result]);

  const tier = useMemo(() => GRAMMAR_NAV.find((t) => t.id === tierId) || null, [tierId]);
  const cluster = useMemo(() => tier?.clusters.find((cl) => cl.id === clusterId) || null, [tier, clusterId]);
  const domain = useMemo(() => cluster?.domains.find((d) => d.id === domainId) || null, [cluster, domainId]);

  const goBack = () => {
    if (stageId) setStageId(null);
    else if (topicId) { setTopicId(null); setStageId(null); }
    else if (branchId) setBranchId(null);
    else if (domainId) setDomainId(null);
    else if (clusterId) setClusterId(null);
    else if (tierId) setTierId(null);
    else navigate("/");
  };

  const level = topicId ? 5 : branchId ? 4 : domainId ? 3 : clusterId ? 2 : tierId ? 1 : 0;
  const running = Boolean(stageId);
  const stageMeta = PRACTICE_STAGES.find((s) => s.id === stageId) || null;

  // The domain's placement verdict, shown as the subtitle once you're inside it
  // — it used to be the header line of the branch panel.
  const verdict = useMemo(() => {
    if (!domain) return null;
    const r = byId[domain.id];
    const state = domainState(r);
    return state === DOMAIN_STATE.FOCUS ? c("home_dom_focus", { level: r.level })
      : state === DOMAIN_STATE.STRONG ? c("home_dom_strong", { level: r.level })
        : c("home_not_assessed");
  }, [domain, byId, c]);

  // The back pill names its DESTINATION, so it reads as "where this returns to".
  const backLabel = running ? pretty(topicId)
    : level === 5 ? pretty(branchId)
      : level === 4 ? domain?.name
        : level === 3 ? cluster?.name
          : level === 2 ? tier?.name
            : level === 1 ? c("home_levels_back")
              : c("home_back");

  const title = running ? stageMeta?.name
    : level === 5 ? pretty(topicId)
      : level === 4 ? pretty(branchId)
        : level === 3 ? domain?.name
          : cluster ? cluster.name : tier ? tier.name : c("home_title");

  const subtitle = running ? null
    : level === 5 ? c("practice_pick_stage")
      : level === 4 ? c("practice_pick_topic")
        : level === 3 ? verdict
          : level === 2 ? c("home_hint_domain")
            : level === 1 ? c("home_hint_cluster") : c("home_pick_level");

  const eyebrow = level >= 3 ? cluster?.name : c("home_eyebrow");

  if (loading) {
    return (
      <div className="premium-mesh min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: ACCENT }} />
          <p className="text-sm text-muted-foreground">{c("home_loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-mesh min-h-screen overflow-hidden">
      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-6 pb-28">
        <div className="flex items-center justify-between mb-4 min-h-[32px]">
          <button onClick={() => (level > 0 && !running && backRef.current ? backRef.current() : goBack())}
            className="neo-pill px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors select-none">
            <ArrowLeft className="w-3.5 h-3.5" /> {backLabel}
          </button>
          {result?.level && (
            <span className="neo-pill px-3 py-1.5 text-xs font-bold" style={{ color: ACCENT, borderColor: `${ACCENT}55` }}>
              {c("home_level", { level: result.level })}
            </span>
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-2">
          <div className="relative inline-flex mb-3">
            <span className="neo-bloom" aria-hidden="true" style={{ background: `radial-gradient(closest-side, ${ACCENT}8c, rgba(107,158,196,0.3) 55%, transparent 76%)` }} />
            <div className="relative neo-pill px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
              <Sparkles className="w-3.5 h-3.5" /> {eyebrow}
            </div>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={`${tierId}:${clusterId}:${domainId}:${branchId}:${topicId}:${stageId}`}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* The round takes the map's place; the shell, header and back stay put. */}
        {running ? (
          <div className="max-w-[560px] mx-auto mt-5">
            {items === null ? (
              <div className="premium-card rounded-[28px] p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: ACCENT }} />
              </div>
            ) : (
              <PracticeRunner
                key={runKey}
                items={items}
                stage={stageId}
                topicKey={topicKey(domainId, branchId, topicId)}
                onExit={() => setStageId(null)}
                onAgain={() => setRunKey((k) => k + 1)}
              />
            )}
          </div>
        ) : (
          <div className="relative w-full aspect-square max-w-[560px] mx-auto min-h-[360px]">
            <GrammarStage
              result={result} byId={byId}
              tierId={tierId} clusterId={clusterId} domainId={domainId}
              branchId={branchId} topicId={topicId}
              onSelectTier={setTierId}
              onSelectCluster={setClusterId}
              onSelectDomain={setDomainId}
              onSelectBranch={setBranchId}
              onSelectTopic={setTopicId}
              onSelectStage={setStageId}
              onBack={goBack}
              backRef={backRef}
              c={c}
            />
          </div>
        )}
      </div>
    </div>
  );
}