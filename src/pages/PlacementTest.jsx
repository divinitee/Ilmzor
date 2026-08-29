import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Loader2, Trophy, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { evaluateVocabArticulation, evaluateGrammarConstruction } from "@/lib/assessor";
import { TIER1_MCQ, TIER3_ITEMS } from "@/lib/placementContent";
import {
  recordAssessmentResult, pickTier2Set, scoreTier1, tier1Passed,
  tier2Outcome, tier3Outcome, summarizeWeakAreas,
} from "@/lib/placementTest";

// Standalone route \u2014 not wired into registration yet. Visit
// /placement-test directly while logged in to try the real flow end to end
// before it goes anywhere near the signup path.

function ProgressBar({ pct }) {
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Header({ tierLabel, idx, total }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-blue-600">{tierLabel}</span>
        <span className="text-xs text-muted-foreground">{idx + 1} / {total}</span>
      </div>
      <ProgressBar pct={((idx) / total) * 100} />
    </div>
  );
}

export default function PlacementTest() {
  const [userEmail, setUserEmail] = useState("");
  const [phase, setPhase] = useState("tier1"); // tier1 | tier2 | tier3 | results

  // Tier 1
  const [t1Idx, setT1Idx] = useState(0);
  const [t1Answers, setT1Answers] = useState([]);

  // Tier 2 / 3 (share the same shape)
  const [tierSet, setTierSet] = useState([]);
  const [tIdx, setTIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [t2Results, setT2Results] = useState([]);
  const [t3Results, setT3Results] = useState([]);

  const [finalLevel, setFinalLevel] = useState("");

  useEffect(() => {
    base44.auth.me().then((me) => setUserEmail(me?.email || "")).catch(() => {});
  }, []);

  // ---------- Tier 1 ----------
  const handleTier1Select = (optIdx) => {
    const next = [...t1Answers, optIdx];
    setT1Answers(next);
    if (next.length < TIER1_MCQ.length) {
      setT1Idx(t1Idx + 1);
      return;
    }
    // Tier 1 complete
    const { correct, total, pct } = scoreTier1(next, TIER1_MCQ);
    TIER1_MCQ.forEach((item, i) => {
      const right = next[i] === item.answer;
      recordAssessmentResult({
        userEmail,
        skill: item.type,
        subskill: item.concept,
        itemLabel: item.question,
        studentAnswer: item.options[next[i]],
        score: right ? 5 : 1,
        axisScores: { correct: right ? 100 : 0 },
        diagnosis: right ? "correct" : "incorrect",
        tip: right ? "" : `Correct answer: ${item.options[item.answer]}`,
      });
    });
    if (!tier1Passed(pct)) {
      setFinalLevel("A1");
      setPhase("results");
    } else {
      setTierSet(pickTier2Set());
      setTIdx(0);
      setPhase("tier2");
    }
  };

  // ---------- Tier 2 / 3 shared submit ----------
  const currentItem = tierSet[tIdx];

  const handleSubmit = async () => {
    if (!answer.trim() || !currentItem) return;
    setGrading(true);
    let result;
    if (currentItem.type === "vocab") {
      result = await evaluateVocabArticulation(
        { english: currentItem.english, definition: currentItem.definition },
        answer
      );
    } else {
      result = await evaluateGrammarConstruction(
        { instruction: currentItem.instruction, requiredElement: currentItem.requiredElement, topic: currentItem.topic },
        answer
      );
    }
    const skill = currentItem.type === "vocab" ? "vocabulary" : "grammar";
    const subskill = currentItem.type === "vocab" ? "Word Meaning" : currentItem.topic;
    const itemLabel = currentItem.type === "vocab" ? currentItem.english : currentItem.topic;

    recordAssessmentResult({
      userEmail,
      source: "placement_test",
      skill, subskill, itemLabel,
      studentAnswer: answer,
      score: result.score,
      axisScores: currentItem.type === "vocab"
        ? { accuracy: result.accuracy, completeness: result.completeness, own_words: result.own_words }
        : { structureUsed: result.structureUsed, correctness: result.correctness, naturalness: result.naturalness },
      diagnosis: result.diagnosis,
      tip: result.tip,
    });

    const entry = { skill, subskill, itemLabel, score: result.score, diagnosis: result.diagnosis, tip: result.tip };
    if (phase === "tier2") setT2Results((r) => [...r, entry]);
    else setT3Results((r) => [...r, entry]);

    setFeedback({ score: result.score, tip: result.tip });
    setGrading(false);
  };

  const handleNext = () => {
    setFeedback(null);
    setAnswer("");
    if (tIdx + 1 < tierSet.length) {
      setTIdx(tIdx + 1);
      return;
    }
    if (phase === "tier2") {
      const avg = t2Results.reduce((s, r) => s + r.score, 0) / t2Results.length;
      const { level, advance } = tier2Outcome(avg);
      if (advance) {
        setTierSet(TIER3_ITEMS);
        setTIdx(0);
        setPhase("tier3");
      } else {
        setFinalLevel(level);
        setPhase("results");
      }
    } else {
      const avg = t3Results.reduce((s, r) => s + r.score, 0) / t3Results.length;
      setFinalLevel(tier3Outcome(avg));
      setPhase("results");
    }
  };

  const allResults = useMemo(() => [...t2Results, ...t3Results], [t2Results, t3Results]);
  const weakAreas = useMemo(() => summarizeWeakAreas(allResults), [allResults]);

  // ---------- Render ----------

  if (phase === "results") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-blue-500/15 flex items-center justify-center mb-5">
            <Trophy className="w-10 h-10 text-blue-500" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-1">Your placement</p>
          <h2 className="text-3xl font-bold text-foreground mb-6">{finalLevel}</h2>

          {weakAreas.length > 0 && (
            <div className="text-left bg-card border border-border rounded-2xl p-4 mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Areas to focus on</p>
              <div className="space-y-2.5">
                {weakAreas.map((w, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-semibold text-foreground">{w.label}</span>
                    <span className="text-muted-foreground"> — {w.tip || w.diagnosis}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link to="/" className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg select-none">
            <Sparkles className="w-4 h-4" /> Continue to Skill Hub
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "tier1") {
    const item = TIER1_MCQ[t1Idx];
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header tierLabel="Tier 1 \u00b7 A1-A2" idx={t1Idx} total={TIER1_MCQ.length} />
        <div className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
          <div className="bg-card border border-border rounded-2xl p-5 mb-5">
            <p className="text-base text-foreground leading-relaxed">{item.question}</p>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {item.options.map((opt, i) => (
              <button
                key={opt}
                onClick={() => handleTier1Select(i)}
                className="px-4 py-3.5 rounded-xl border-2 border-border bg-card text-foreground text-sm font-medium text-left hover:border-blue-400 hover:bg-blue-500/5 transition-all select-none"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // tier2 / tier3
  const tierLabel = phase === "tier2" ? "Tier 2 \u00b7 B1-B2" : "Tier 3 \u00b7 C1+";
  const prompt = currentItem?.instruction
    || (currentItem?.type === "vocab" ? `Explain what "${currentItem.english}" means, in your own words.` : "");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header tierLabel={tierLabel} idx={tIdx} total={tierSet.length} />
      <div className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
        <div className="bg-card border border-border rounded-2xl p-5 mb-5">
          <p className="text-base text-foreground leading-relaxed">{prompt}</p>
        </div>

        {!feedback ? (
          <>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer..."
              className="w-full h-28 px-3 py-2 border border-input rounded-lg text-sm bg-card text-foreground focus:border-primary focus:outline-none resize-none mb-4"
              disabled={grading}
            />
            <button
              onClick={handleSubmit}
              disabled={grading || !answer.trim()}
              className="h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 select-none"
            >
              {grading ? <><Loader2 className="w-4 h-4 animate-spin" /> Grading...</> : "Submit"}
            </button>
          </>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-sm font-semibold text-foreground mb-1">Score: {feedback.score}/5</p>
            {feedback.tip && <p className="text-sm text-muted-foreground mb-4">{feedback.tip}</p>}
            <button
              onClick={handleNext}
              className="w-full h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg select-none"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
