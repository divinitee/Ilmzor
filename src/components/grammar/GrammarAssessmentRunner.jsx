import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, LogOut, AlertTriangle, Sparkles } from "lucide-react";
import {
  startGrammarPlacement, nextQuestion, submitAnswer, completeRun, domainNames,
} from "@/lib/grammarPlacement/session";
import { requiresAiEvaluation } from "@/lib/grammarPlacement/scoring";
import GrammarItemPrompt, { hasAnswer, emptyAnswer } from "@/components/grammar/GrammarItemPrompt";
import { useGrammarCopy } from "@/lib/grammarCopy";

// The live assessment. This component owns presentation and the async
// lifecycle; every decision about WHAT to ask and WHEN TO STOP belongs to the
// engine, which is reached only through its session layer.
//
// AI cost: session.submitAnswer only calls the grader for items whose answer
// type is "rubric". Deterministic formats are scored by the pure core and never
// touch the network — `aiPending` below exists purely to tell the student which
// kind of wait they are in.

const ACCENT = "#3E9E92";

export default function GrammarAssessmentRunner({ user, onComplete, onExit }) {
  const c = useGrammarCopy();
  const [runner, setRunner] = useState(null);
  const [item, setItem] = useState(null);
  const [value, setValue] = useState(null);
  const [busy, setBusy] = useState(false);
  const [aiPending, setAiPending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState(null);
  const [served, setServed] = useState(0);
  const startedRef = useRef(false);

  // Advance: ask the engine for the next item, or finish when it says stop.
  const advance = useCallback(async (r) => {
    const step = nextQuestion(r);
    if (step.action === "complete") {
      setFinishing(true);
      try {
        const { run } = await completeRun(step.runner, { persist: true });
        onComplete(run);
      } catch (e) {
        console.error("grammar placement completion failed", e);
        setError("complete");
        setFinishing(false);
      }
      return null;
    }
    setItem(step.item);
    setValue(emptyAnswer(step.item));
    // Read the count off engine state rather than a local tally, so a resumed
    // run continues numbering from where the student left off instead of
    // restarting at 1.
    setServed((step.runner.state?.itemsServed ?? 0) + 1);
    return step.runner;
  }, [onComplete]);

  // Start (or resume) exactly once.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const r = await startGrammarPlacement({
          userEmail: user?.email || "",
          userId: user?.id || "",
          isAdmin: user?.role === "admin",
          resume: true,
        });
        const next = await advance(r);
        if (next) setRunner(next);
      } catch (e) {
        console.error("grammar placement start failed", e);
        setError("start");
      }
    })();
  }, [user, advance]);

  const submit = async () => {
    if (!runner || !item || busy || !hasAnswer(item, value)) return;
    setBusy(true);
    setAiPending(requiresAiEvaluation(item));
    try {
      const { runner: r2 } = await submitAnswer(runner, { itemId: item.id, response: value });
      setAiPending(false);
      const next = await advance(r2);
      if (next) setRunner(next);
    } catch (e) {
      console.error("grammar placement submit failed", e);
      setAiPending(false);
      setError("submit");
    } finally {
      setBusy(false);
    }
  };

  // ---- error ----
  if (error) {
    return (
      <Shell>
        <div className="premium-card rounded-[28px] p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/25 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-foreground">{c("run_error_title")}</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-5">{c("run_error_body")}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => { setError(null); startedRef.current = false; window.location.reload(); }}
              className="neo-pill px-5 py-2 text-sm font-semibold text-foreground hover:bg-white/10 transition-colors select-none"
            >
              {c("run_error_retry")}
            </button>
            <button onClick={onExit} className="px-5 py-2 text-sm text-muted-foreground hover:text-foreground select-none">
              {c("intro_skip")}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ---- finishing ----
  if (finishing) {
    return (
      <Shell>
        <div className="premium-card rounded-[28px] p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: ACCENT }} />
          <p className="text-sm text-muted-foreground">{c("run_saving")}</p>
        </div>
      </Shell>
    );
  }

  // ---- loading ----
  if (!item) {
    return (
      <Shell>
        <div className="premium-card rounded-[28px] p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: ACCENT }} />
          <p className="text-sm text-muted-foreground">{c("run_loading")}</p>
        </div>
      </Shell>
    );
  }

  const ready = hasAnswer(item, value);

  return (
    <Shell>
      {/* Progress is deliberately a count, not a bar: the run length is not
          known in advance and a filling bar would promise a finish line the
          adaptive engine has not committed to. */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{c("run_progress", { n: served })}</p>
          <p className="text-[11px] text-muted-foreground">{c("run_adaptive_note")}</p>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="neo-pill px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors select-none"
        >
          <LogOut className="w-3.5 h-3.5" /> {c("run_exit")}
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="premium-card rounded-[28px] p-5 md:p-6"
        >
          <GrammarItemPrompt item={item} value={value} onChange={setValue} disabled={busy} />
        </motion.div>
      </AnimatePresence>

      <button
        type="button"
        disabled={!ready || busy}
        onClick={submit}
        className="mt-5 w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold text-[#04201d] select-none transition-all active:scale-[0.99] disabled:opacity-40"
        style={{ background: `linear-gradient(180deg, #4fb9ab, ${ACCENT})` }}
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {aiPending ? c("run_ai_checking") : c("run_checking")}
          </>
        ) : (
          c("run_submit")
        )}
      </button>
    </Shell>
  );
}

function Shell({ children }) {
  const c = useGrammarCopy();
  return (
    <div className="premium-mesh min-h-screen">
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-8 pb-28">
        <div className="text-center mb-5">
          <div className="relative inline-flex">
            <span className="neo-bloom" aria-hidden="true" />
            <div
              className="relative neo-pill px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: ACCENT }}
            >
              <Sparkles className="w-3.5 h-3.5" /> {c("intro_eyebrow")}
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export { domainNames };
