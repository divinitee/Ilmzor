import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, ChevronRight, Sparkles, Crosshair, TrendingUp, ClipboardList, Layers } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { DOMAINS } from "@/lib/adaptiveGrammar";
import { GRAMMAR_NAV } from "@/lib/grammarTiers";
import { fromStoredProfile } from "@/lib/grammarPlacementResult";
import { useGrammarCopy } from "@/lib/grammarCopy";

// Route: /grammar — the student's Grammar home.
//
// Structure: Tier -> Cluster -> Domain -> Branch, a mind-map-style dive
// (Tee's 2026-09-09 decision) rather than one flat list of 13 domains.
// Tier and Cluster are full-screen dive transitions; Domain -> Branch stays
// the in-place accordion this already shipped with, unchanged, since that
// interaction was never part of the feedback that prompted this rework.
//
// The nav TREE itself (src/lib/grammarTiers.js) is pre-computed from the
// dataset's public contract — nothing here decides which domain belongs to
// which tier or cluster. This page only walks that tree and overlays the
// per-domain placement result (level, focus/strong/unassessed) wherever a
// domain card renders, exactly as before.
//
// Practice content per branch still doesn't exist yet — tapping a branch
// opens the same "In development" modal as before. This pass is navigation
// only; mastery-gated "Elevate" unlocking is a separate, later decision.

const ACCENT = "#3E9E92";

export default function Grammar() {
  const navigate = useNavigate();
  const c = useGrammarCopy();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [tierId, setTierId] = useState(null);
  const [clusterId, setClusterId] = useState(null);
  const [openDomain, setOpenDomain] = useState(null);
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

  const byId = useMemo(
    () => Object.fromEntries((result?.domains ?? []).map((d) => [d.domain, d])),
    [result]
  );

  const tier = useMemo(() => GRAMMAR_NAV.find((t) => t.id === tierId) || null, [tierId]);
  const cluster = useMemo(() => tier?.clusters.find((cl) => cl.id === clusterId) || null, [tier, clusterId]);

  const orderedDomains = useMemo(() => {
    if (!cluster) return [];
    // Focus areas first — the whole point of the diagnostic is that the student
    // does not have to guess where to start.
    const rank = (d) => {
      const r = byId[d.id];
      if (!r?.assessed) return 2;
      return r.needsAttention ? 0 : 1;
    };
    return [...cluster.domains].sort((a, b) => rank(a) - rank(b));
  }, [cluster, byId]);

  const goBack = () => {
    if (clusterId) setClusterId(null);
    else if (tierId) setTierId(null);
    else navigate("/");
  };

  const screenKey = clusterId ? `domain:${tierId}:${clusterId}` : tierId ? `cluster:${tierId}` : "tier";

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
    <div className="premium-mesh min-h-screen">
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-6 pb-28">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={goBack}
            className="neo-pill px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors select-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {tierId ? (clusterId ? tier.name : c("home_levels_back")) : c("home_back")}
          </button>
          {result?.level && (
            <span
              className="neo-pill px-3 py-1.5 text-xs font-bold"
              style={{ color: ACCENT, borderColor: `${ACCENT}55` }}
            >
              {c("home_level", { level: result.level })}
            </span>
          )}
        </div>

        <div className="text-center mb-6">
          <div className="relative inline-flex mb-3">
            <span className="neo-bloom" aria-hidden="true" />
            <div
              className="relative neo-pill px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: ACCENT }}
            >
              <Sparkles className="w-3.5 h-3.5" /> {c("home_eyebrow")}
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            {cluster ? cluster.name : tier ? tier.name : c("home_title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {cluster
              ? c("home_areas", { n: cluster.domains.length })
              : tier
                ? c("home_groups", { n: tier.clusters.length })
                : c("home_pick_level")}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={screenKey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {/* ---- level 1: tiers ---- */}
            {!tier && (
              <div className="space-y-2.5">
                {GRAMMAR_NAV.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTierId(t.id)}
                    className="premium-card w-full flex items-center gap-3 px-4 py-4 text-left select-none hover:bg-white/5 transition-colors rounded-[24px]"
                  >
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${ACCENT}22`, border: `1px solid ${ACCENT}40` }}
                    >
                      <Layers className="w-4.5 h-4.5" style={{ color: ACCENT }} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-base font-bold text-foreground truncate">{t.name}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {t.levels.join("–")} · {c("home_groups", { n: t.clusters.length })}
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* ---- level 2: clusters within a tier ---- */}
            {tier && !cluster && (
              <div className="space-y-2.5">
                {tier.clusters.map((cl) => (
                  <button
                    key={cl.id}
                    type="button"
                    onClick={() => setClusterId(cl.id)}
                    className="premium-card w-full flex items-center gap-3 px-4 py-4 text-left select-none hover:bg-white/5 transition-colors rounded-[24px]"
                  >
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <Layers className="w-4 h-4 text-foreground/70" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-base font-bold text-foreground truncate">{cl.name}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {c("home_areas", { n: cl.domains.length })}
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* ---- level 3: domains within a cluster, each expanding to its branches ---- */}
            {cluster && (
              <div className="space-y-2.5">
                {orderedDomains.map((d) => {
                  const r = byId[d.id];
                  const open = openDomain === d.id;
                  const state = !r?.assessed ? "unknown" : r.needsAttention ? "focus" : "strong";
                  const tone = state === "focus" ? "#E08E60" : state === "strong" ? ACCENT : "#8b95a3";
                  const StateIcon = state === "focus" ? Crosshair : state === "strong" ? TrendingUp : ClipboardList;

                  return (
                    <motion.div key={d.id} layout className="premium-card rounded-[24px] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenDomain(open ? null : d.id)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left select-none hover:bg-white/5 transition-colors"
                      >
                        <span
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${tone}22`, border: `1px solid ${tone}40` }}
                        >
                          <StateIcon className="w-4 h-4" style={{ color: tone }} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-bold text-foreground truncate">{d.name}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {r?.assessed ? c("home_branches", { n: d.branches.length }) : c("home_not_assessed")}
                          </span>
                        </span>
                        {r?.level && (
                          <span className="text-xs font-bold shrink-0" style={{ color: tone }}>{r.level}</span>
                        )}
                        <ChevronRight
                          className="w-4 h-4 text-muted-foreground shrink-0 transition-transform"
                          style={{ transform: open ? "rotate(90deg)" : "none" }}
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="px-4 pb-4 pt-1 flex flex-wrap gap-1.5">
                              {d.branches.map((b) => (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => setSoon(d.name)}
                                  className="neo-pill px-3 py-1.5 text-xs font-medium text-foreground/85 hover:bg-white/10 transition-colors select-none"
                                >
                                  {b.replace(/-/g, " ")}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {soon && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSoon(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="premium-card relative w-full max-w-sm rounded-[28px] p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(62,158,146,0.15)", border: `1px solid ${ACCENT}40` }}
              >
                <Sparkles className="w-7 h-7" style={{ color: ACCENT }} />
              </div>
              <h3 className="text-lg font-bold text-foreground">{c("home_soon_title")}</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-5">{c("home_soon")}</p>
              <button
                onClick={() => setSoon(null)}
                className="neo-pill px-5 py-2 text-sm font-semibold text-foreground hover:bg-white/10 transition-colors select-none"
              >
                {c("home_gotit")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
