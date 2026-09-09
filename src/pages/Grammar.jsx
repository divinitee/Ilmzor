import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { DOMAINS } from "@/lib/adaptiveGrammar";
import { GRAMMAR_NAV } from "@/lib/grammarTiers";
import { fromStoredProfile } from "@/lib/grammarPlacementResult";
import { useGrammarCopy } from "@/lib/grammarCopy";
import GrammarStage from "@/components/grammar/map/GrammarStage";
import GrammarDomainPanel from "@/components/grammar/map/GrammarDomainPanel";
import { GRAMMAR_ACCENT as ACCENT } from "@/components/grammar/map/tierMeta";

// Route: /grammar — the student's Grammar world.
//
// Node map (2026-09-09), same product language as the Vocabulary Skill Hub:
//   Tier (zone) -> Cluster -> Domain on the stage, Branch as a panel under it.
// The nav TREE (src/lib/grammarTiers.js) is pre-computed from the dataset —
// nothing here decides what belongs where, and empty tiers/clusters/domains
// are already filtered out of it, so no empty node can render.
//
// Placement entry rule is unchanged: no GrammarProfile row -> the assessment.
// Node states come from that profile only (src/lib/grammarMapState.js); there
// is no practice completion to show yet, and the branch panel says so.

export default function Grammar() {
  const navigate = useNavigate();
  const c = useGrammarCopy();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [tierId, setTierId] = useState(null);
  const [clusterId, setClusterId] = useState(null);
  const [domainId, setDomainId] = useState(null);
  const [soon, setSoon] = useState(null);

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

  const byId = useMemo(() => Object.fromEntries((result?.domains ?? []).map((d) => [d.domain, d])), [result]);

  const tier = useMemo(() => GRAMMAR_NAV.find((t) => t.id === tierId) || null, [tierId]);
  const cluster = useMemo(() => tier?.clusters.find((cl) => cl.id === clusterId) || null, [tier, clusterId]);
  const domain = useMemo(() => cluster?.domains.find((d) => d.id === domainId) || null, [cluster, domainId]);

  const goBack = () => {
    if (clusterId) { setClusterId(null); setDomainId(null); }
    else if (tierId) setTierId(null);
    else navigate("/");
  };

  const level = clusterId ? 2 : tierId ? 1 : 0;
  const subtitle = level === 2 ? c("home_hint_domain") : level === 1 ? c("home_hint_cluster") : c("home_pick_level");

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
          {level === 0 ? (
            <button onClick={goBack}
              className="neo-pill px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors select-none">
              <ArrowLeft className="w-3.5 h-3.5" /> {c("home_back")}
            </button>
          ) : <span />}
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
              <Sparkles className="w-3.5 h-3.5" /> {c("home_eyebrow")}
            </div>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={`${tierId}:${clusterId}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                {cluster ? cluster.name : tier ? tier.name : c("home_title")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div className="relative w-full aspect-square max-w-[560px] mx-auto min-h-[360px]">
          <GrammarStage
            result={result} byId={byId}
            tierId={tierId} clusterId={clusterId} selectedDomainId={domainId}
            onSelectTier={setTierId}
            onSelectCluster={setClusterId}
            onSelectDomain={(id) => setDomainId((prev) => (prev === id ? null : id))}
            onBack={goBack}
            c={c}
          />
        </div>

        <div className="max-w-[560px] mx-auto">
          <AnimatePresence mode="wait">
            {domain && (
              <GrammarDomainPanel key={domain.id} domain={domain} r={byId[domain.id]} c={c}
                onBranch={(d) => setSoon(d.name)} onClose={() => setDomainId(null)} />
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {soon && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSoon(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ y: 20, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="premium-card relative w-full max-w-sm rounded-[28px] p-6 text-center" onClick={(e) => e.stopPropagation()}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(62,158,146,0.15)", border: `1px solid ${ACCENT}40` }}>
                <Sparkles className="w-7 h-7" style={{ color: ACCENT }} />
              </div>
              <h3 className="text-lg font-bold text-foreground">{c("home_soon_title")}</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-5">{c("home_soon")}</p>
              <button onClick={() => setSoon(null)} className="neo-pill px-5 py-2 text-sm font-semibold text-foreground hover:bg-white/10 transition-colors select-none">
                {c("home_gotit")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}