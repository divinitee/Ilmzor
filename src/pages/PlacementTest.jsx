import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { evaluateVocabArticulation, evaluateGrammarConstruction } from "@/lib/assessor";
import { GATES } from "@/lib/placementContent";
import {
  recordAssessmentResult, pickGateSet, scoreMcqGate, scoreOpenGate,
  gateOutcome, gateFormat, summarizeWeakAreas,
} from "@/lib/placementTest";
import GateHeader from "@/components/placement/GateHeader";
import McqGateItem from "@/components/placement/McqGateItem";
import OpenGateItem from "@/components/placement/OpenGateItem";
import PlacementResults from "@/components/placement/PlacementResults";

// Standalone route — not wired into registration yet. Visit
// /placement-test directly while logged in to try the real flow end to end
// before it goes anywhere near the signup path.
//
// Five sequential CEFR gates: A1 -> A2 -> B1 -> B2 -> C1, 10 items each.
// Clear a gate and you climb; fail one and you settle at the last gate you
// actually cleared. No fixed default level to fall into.

const FIRST_GATE = GATES[0];

export default function PlacementTest() {
  const [userEmail, setUserEmail] = useState("");
  const [done, setDone] = useState(false);
  const [finalLevel, setFinalLevel] = useState("");

  const [gate, setGate] = useState(FIRST_GATE);
  const [gateSet, setGateSet] = useState(() => pickGateSet(FIRST_GATE));
  const [idx, setIdx] = useState(0);

  // Per-gate scratch state, reset on every gate change.
  const [mcqAnswers, setMcqAnswers] = useState([]);
  const [gateResults, setGateResults] = useState([]);
  const [answer, setAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Everything graded across all gates, for the weak-areas summary.
  const [allResults, setAllResults] = useState([]);

  useEffect(() => {
    base44.auth.me().then((me) => setUserEmail(me?.email || "")).catch(() => {});
  }, []);

  const format = gateFormat(gate);
  const item = gateSet[idx];

  const finishGate = (score) => {
    const outcome = gateOutcome(gate, score);
    if (outcome.advance) {
      setGate(outcome.next);
      setGateSet(pickGateSet(outcome.next));
      setIdx(0);
      setMcqAnswers([]);
      setGateResults([]);
      setAnswer("");
      setFeedback(null);
      return;
    }
    setFinalLevel(outcome.settleAt);
    setDone(true);
  };

  // ---------- MCQ gates (A1 / A2) ----------
  const handleSelect = (optIdx) => {
    const next = [...mcqAnswers, optIdx];
    setMcqAnswers(next);
    if (next.length < gateSet.length) {
      setIdx(idx + 1);
      return;
    }
    gateSet.forEach((q, i) => {
      const right = next[i] === q.answer;
      recordAssessmentResult({
        userEmail,
        source: "placement_test",
        skill: q.type,
        subskill: q.concept,
        itemLabel: q.question,
        studentAnswer: q.options[next[i]],
        score: right ? 5 : 1,
        axisScores: { correct: right ? 100 : 0 },
        diagnosis: right ? "correct" : "incorrect",
        tip: right ? "" : `Correct answer: ${q.options[q.answer]}`,
      });
    });
    finishGate(scoreMcqGate(next, gateSet).ratio);
  };

  // ---------- Open-ended gates (B1 / B2 / C1) ----------
  const handleSubmit = async () => {
    if (!answer.trim() || !item) return;
    setGrading(true);
    const result = item.type === "vocab"
      ? await evaluateVocabArticulation({ english: item.english, definition: item.definition }, answer)
      : await evaluateGrammarConstruction(
          { instruction: item.instruction, requiredElement: item.requiredElement, topic: item.topic },
          answer
        );

    const skill = item.type === "vocab" ? "vocabulary" : "grammar";
    const subskill = item.type === "vocab" ? "Word Meaning" : item.topic;
    const itemLabel = item.type === "vocab" ? item.english : item.topic;

    recordAssessmentResult({
      userEmail,
      source: "placement_test",
      skill, subskill, itemLabel,
      studentAnswer: answer,
      score: result.score,
      axisScores: item.type === "vocab"
        ? { accuracy: result.accuracy, completeness: result.completeness, own_words: result.own_words }
        : { structureUsed: result.structureUsed, correctness: result.correctness, naturalness: result.naturalness },
      diagnosis: result.diagnosis,
      tip: result.tip,
    });

    const entry = { skill, subskill, itemLabel, score: result.score, diagnosis: result.diagnosis, tip: result.tip };
    setGateResults((r) => [...r, entry]);
    setAllResults((r) => [...r, entry]);
    setFeedback({ score: result.score, tip: result.tip });
    setGrading(false);
  };

  const handleNext = () => {
    setFeedback(null);
    setAnswer("");
    if (idx + 1 < gateSet.length) {
      setIdx(idx + 1);
      return;
    }
    finishGate(scoreOpenGate(gateResults).avg);
  };

  const weakAreas = useMemo(() => summarizeWeakAreas(allResults), [allResults]);

  if (done) return <PlacementResults level={finalLevel} weakAreas={weakAreas} />;
  if (!item) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GateHeader level={gate} idx={idx} total={gateSet.length} />
      {format === "mcq" ? (
        <McqGateItem item={item} onSelect={handleSelect} />
      ) : (
        <OpenGateItem
          item={item}
          answer={answer}
          onAnswerChange={setAnswer}
          grading={grading}
          feedback={feedback}
          onSubmit={handleSubmit}
          onNext={handleNext}
        />
      )}
    </div>
  );
}