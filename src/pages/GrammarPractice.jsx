import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Sparkles, ChevronRight, Lock } from "lucide-react";
import { DOMAINS } from "@/lib/adaptiveGrammar";
import { availableTopics, loadTopic, topicKey } from "@/lib/grammarPractice";
import { poolSizes } from "@/lib/grammarPractice/composition";
import PracticeRunner from "@/components/grammar/PracticeRunner";

// Route: /grammar/practice?domain=&branch=
//
// Branch -> topic -> stage -> round. Only the deterministic stages are wired:
// create and express are rubric-judged, which means the AI path behind
// checkAiGate, and that is a separate piece of work.

const ACCENT = "#3E9E92";

const STAGE_META = [
  { id: "choose",    name: "Choose",    blurb: "Recognise the correct form" },
  { id: "build",     name: "Build",     blurb: "Construct it yourself" },
  { id: "transform", name: "Transform", blurb: "Change the sentence" },
  { id: "create",    name: "Create",    blurb: "Write your own sentence", ai: true },
  { id: "express",   name: "Express",   blurb: "Use it freely",           ai: true },
];

const pretty = (s) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function GrammarPractice() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const domain = params.get("domain") || "";
  const branch = params.get("branch") || "";

  const [topic, setTopic] = useState(null);
  const [stage, setStage] = useState(null);
  const [items, setItems] = useState(null);
  const [runKey, setRunKey] = useState(0);

  const domainName = useMemo(
    () => DOMAINS.find((d) => d.id === domain)?.name || pretty(domain || "Grammar"),
    [domain]
  );

  // Topics in this branch that actually have authored content.
  const topics = useMemo(
    () => availableTopics()
      .filter((k) => k.startsWith(`${domain}.${branch}.`))
      .map((k) => k.split(".").slice(2).join(".")),
    [domain, branch]
  );

  useEffect(() => {
    if (!topic) { setItems(null); return; }
    let cancelled = false;
    loadTopic(domain, branch, topic).then((rows) => { if (!cancelled) setItems(rows); });
    return () => { cancelled = true; };
  }, [domain, branch, topic]);

  const pools = useMemo(() => (items ? poolSizes(items) : {}), [items]);

  const back = () => {
    if (stage) setStage(null);
    else if (topic) setTopic(null);
    else navigate("/grammar");
  };

  return (
    <div className="premium-mesh min-h-screen">
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-6 pb-28">
        <div className="flex items-center justify-between mb-5">
          <button onClick={back} className="neo-pill px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors select-none">
            <ArrowLeft className="w-3.5 h-3.5" /> {stage ? pretty(topic) : topic ? pretty(branch) : domainName}
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="relative inline-flex mb-3">
            <span className="neo-bloom" aria-hidden="true" />
            <div className="relative neo-pill px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
              <Sparkles className="w-3.5 h-3.5" /> {domainName}
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            {stage ? STAGE_META.find((s) => s.id === stage)?.name : topic ? pretty(topic) : pretty(branch)}
          </h1>
          {!stage && (
            <p className="text-sm text-muted-foreground mt-1">
              {topic ? "Choose a stage" : topics.length ? "Choose a topic" : "No practice content here yet"}
            </p>
          )}
        </div>

        {/* topic list */}
        {!topic && (
          <div className="space-y-2.5">
            {topics.map((t) => (
              <button key={t} onClick={() => setTopic(t)}
                      className="premium-card w-full flex items-center gap-3 px-4 py-4 text-left select-none hover:bg-white/5 transition-colors rounded-[24px]">
                <span className="flex-1 min-w-0">
                  <span className="block text-base font-bold text-foreground truncate">{pretty(t)}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
            {!topics.length && (
              <div className="premium-card rounded-[24px] p-6 text-center">
                <p className="text-sm text-muted-foreground">Practice for this area is coming soon.</p>
              </div>
            )}
          </div>
        )}

        {/* stage list */}
        {topic && !stage && (
          items === null ? (
            <div className="premium-card rounded-[28px] p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: ACCENT }} />
            </div>
          ) : (
            <div className="space-y-2.5">
              {STAGE_META.map((s) => {
                const n = pools[s.id] || 0;
                const locked = s.ai || !n;
                return (
                  <button key={s.id} disabled={locked} onClick={() => setStage(s.id)}
                          className={`premium-card w-full flex items-center gap-3 px-4 py-4 text-left rounded-[24px] transition-colors select-none ${locked ? "opacity-50" : "hover:bg-white/5"}`}>
                    <span className="flex-1 min-w-0">
                      <span className="block text-base font-bold text-foreground">{s.name}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {s.ai ? "Needs AI marking — coming soon" : n ? `${s.blurb} · ${n} questions` : "Nothing authored yet"}
                      </span>
                    </span>
                    {locked ? <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                            : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>
                );
              })}
            </div>
          )
        )}

        {/* the round */}
        {topic && stage && items && (
          <PracticeRunner
            key={runKey}
            items={items}
            stage={stage}
            topicKey={topicKey(domain, branch, topic)}
            onExit={() => setStage(null)}
            onAgain={() => setRunKey((k) => k + 1)}
          />
        )}
      </div>
    </div>
  );
}
