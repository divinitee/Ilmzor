import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import GrammarAssessmentIntro from "@/components/grammar/GrammarAssessmentIntro";
import GrammarAssessmentRunner, { domainNames } from "@/components/grammar/GrammarAssessmentRunner";
import GrammarPlacementResult from "@/components/grammar/GrammarPlacementResult";
import { toStudentResult } from "@/lib/grammarPlacementResult";
import { loadDraft } from "@/lib/grammarPlacement/session";
import { DIAGNOSTIC_STATE, SKILL_DIAGNOSTICS } from "@/lib/skillDiagnostics";
import { useGrammarCopy } from "@/lib/grammarCopy";

// Route: /grammar/assessment
//
// Three phases in one route rather than three routes — a half-finished
// assessment must not be reachable by URL, and the browser back button should
// leave the assessment rather than step backwards through it.

const PHASE = { CHECKING: "checking", INTRO: "intro", RUNNING: "running", RESULT: "result" };

export default function GrammarAssessment() {
  const navigate = useNavigate();
  const c = useGrammarCopy();
  const [user, setUser] = useState(null);
  const [phase, setPhase] = useState(PHASE.CHECKING);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let me = null;
      try { me = await base44.auth.me(); } catch { /* handled below */ }
      if (cancelled) return;
      setUser(me);

      // Already placed? Never re-run the assessment by accident — send them to
      // the Grammar home instead. Retaking is out of scope for now.
      const state = await SKILL_DIAGNOSTICS.grammar.loadState(me?.email);
      if (cancelled) return;
      if (state === DIAGNOSTIC_STATE.COMPLETED) {
        navigate("/grammar", { replace: true });
        return;
      }
      // A draft means they left mid-assessment: resume straight into the
      // runner, which picks the draft up, rather than replaying the intro.
      setPhase(loadDraft()?.state?.runId ? PHASE.RUNNING : PHASE.INTRO);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const handleComplete = (run) => {
    setResult(toStudentResult(run, domainNames()));
    setPhase(PHASE.RESULT);
  };

  if (phase === PHASE.CHECKING) {
    return (
      <div className="premium-mesh min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "#3E9E92" }} />
          <p className="text-sm text-muted-foreground">{c("run_loading")}</p>
        </div>
      </div>
    );
  }

  if (phase === PHASE.INTRO) {
    return (
      <GrammarAssessmentIntro
        onStart={() => setPhase(PHASE.RUNNING)}
        onExit={() => navigate("/", { replace: true })}
      />
    );
  }

  if (phase === PHASE.RUNNING) {
    return (
      <GrammarAssessmentRunner
        user={user}
        onComplete={handleComplete}
        // Exiting mid-run keeps the draft, so returning to Grammar resumes.
        onExit={() => navigate("/", { replace: true })}
      />
    );
  }

  return (
    <GrammarPlacementResult
      result={result}
      onEnter={() => navigate("/grammar", { replace: true })}
    />
  );
}
