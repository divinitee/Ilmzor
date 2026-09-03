import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Target, CheckCircle2, RotateCcw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { evaluateVocabArticulation, evaluateGrammarConstruction } from "@/lib/assessor";
import { checkAiGate, incrementAiUsage } from "@/lib/aiLimits";
import { FREE_LESSON_ID } from "@/lib/freeLesson";
import { recordAssessmentResult } from "@/lib/placementTest";
import { getRandomizedItems, computeCheckStatus, advanceProgress } from "@/lib/lessonEngine";
import TeachExperience from "@/components/lesson/TeachExperience";
import ExplainHelp from "@/components/lesson/ExplainHelp";
import McqGateItem from "@/components/placement/McqGateItem";
import OpenGateItem from "@/components/placement/OpenGateItem";
import { TEACH_BEATS_BY_LESSON } from "@/lib/teachContent";

// Student-facing runner for one Lesson: Orientation -> Teach -> Practice ->
// Check -> Mastery -> Pass/Retry. Standalone route, not yet wired into
// Mission Control. Visit /lesson/:lessonId directly to try it.

function itemLabelOf(item) {
  return item.type === "vocab" ? item.english : (item.topic || item.question);
}

// Subtle progress readout for the current randomized queue — reflects the
// actual sampled set size (queue.length), not the source pool's total item
// count. Mirrors GateHeader's visual language (thin gradient bar, small
// muted text) for consistency, without the placement test's gate-level
// staircase, which doesn't apply inside a single lesson.
function LessonProgress({ idx, total }) {
  return (
    <div className="px-4 pt-3 pb-1 max-w-lg mx-auto w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">Question {idx + 1} of {total}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
          style={{ width: `${((idx + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function LessonRunner() {
  const { lessonId } = useParams();
  const navigate = useNavigate();

  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState(null);
  const [unit, setUnit] = useState(null);
  const [module, setModule] = useState(null);
  const [activities, setActivities] = useState([]);

  const [phase, setPhase] = useState("orientation"); // orientation | teach | queue | check-result | complete
  const [queue, setQueue] = useState([]); // [{item, activityId, role}]
  const [qIdx, setQIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [checkOutcome, setCheckOutcome] = useState(null); // { results, pending, allPassed, mastery }
  const [checkActivityItems, setCheckActivityItems] = useState([]); // [{activity, items}] shown this check pass
  const [advanced, setAdvanced] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me().catch(() => null);
      setUserEmail(me?.email || "");
      setUserId(me?.id || "");
      setIsAdmin(me?.role === "admin");
      const l = (await base44.entities.Lesson.filter({ id: lessonId }))[0];
      if (!l) { setLoading(false); return; }
      const u = (await base44.entities.Unit.filter({ id: l.unit_id }))[0];
      const m = u ? (await base44.entities.Module.filter({ id: u.module_id }))[0] : null;
      const acts = await base44.entities.Activity.filter({ lesson_id: lessonId });
      acts.sort((a, b) => a.order_index - b.order_index);
      setLesson(l); setUnit(u); setModule(m); setActivities(acts);
      setLoading(false);
    })();
  }, [lessonId]);

  // Builds the student-facing queue from a randomized, capped sample of each
  // activity's items (getRandomizedItems) rather than the full matched pool
  // — a different subset/order each call, per attempt. Also returns the
  // exact {activity, items} grouping used, so check-phase callers can pass
  // precisely what was shown into computeCheckStatus.
  const buildQueue = (acts) => {
    const grouped = acts.map((activity) => ({ activity, items: getRandomizedItems(activity) }));
    const q = [];
    grouped.forEach(({ activity, items }) => {
      items.forEach((item) => { q.push({ item, activityId: activity.id, role: activity.role }); });
    });
    return { q, grouped };
  };

  const startPractice = () => {
    const practiceActs = activities.filter((a) => a.role === "practice");
    const { q } = buildQueue(practiceActs);
    if (q.length === 0) { startCheck(); return; }
    setQueue(q); setQIdx(0); setPhase("queue");
  };

  const startCheck = (onlyActivities = null) => {
    const checkActs = onlyActivities || activities.filter((a) => a.role === "check");
    const { q, grouped } = buildQueue(checkActs);
    setCheckActivityItems(grouped);
    setQueue(q); setQIdx(0); setPhase("queue");
  };

  const finishQueueItem = async () => {
    setAnswer(""); setFeedback(null);
    if (qIdx + 1 < queue.length) {
      setQIdx(qIdx + 1);
      return;
    }
    // Queue exhausted — practice just moves on; check triggers a fresh evaluation.
    const wasCheck = queue[0]?.role === "check";
    if (!wasCheck) {
      startCheck();
      return;
    }
    setLoading(true);
    const outcome = await computeCheckStatus(userEmail, checkActivityItems);
    setCheckOutcome(outcome);
    setLoading(false);
    setPhase("check-result");
    if (outcome.allPassed) {
      const result = await advanceProgress({
        userEmail,
        learningPathId: module?.learning_path_id,
        moduleId: module?.id,
        unitId: unit?.id,
        lessonId: lesson.id,
      });
      setAdvanced(result);
    }
  };

  const current = queue[qIdx];

  const handleMcqSelect = async (optIdx) => {
    const q = current.item;
    const right = optIdx === q.answer;
    await recordAssessmentResult({
      userEmail, lessonId: lesson.id, activityId: current.activityId,
      source: "practice", skill: q.type, subskill: q.concept, itemLabel: itemLabelOf(q),
      studentAnswer: q.options[optIdx], score: right ? 5 : 1,
      axisScores: { correct: right ? 100 : 0 },
      diagnosis: right ? "correct" : "incorrect",
      tip: right ? "" : `Correct answer: ${q.options[q.answer]}`,
    });
    finishQueueItem();
  };

  const handleOpenSubmit = async (pasteAttempted) => {
    if (!answer.trim() || !current) return;
    setGrading(true);
    const item = current.item;

    // Lesson 1 is the free, no-subscription-required demo hook (see
    // FreeLessonCard.jsx / freeLesson.js) — a first-time visitor hitting a
    // "come back tomorrow" wall mid-demo defeats the entire point of giving
    // it away, and its exposure is bounded (one lesson, a handful of check
    // activities) so the AI-cost risk the fair-use gate exists for doesn't
    // apply here the way it does to unlimited daily practice. Everything
    // else about grading stays identical — still a real AI-graded score,
    // still recorded normally — this only skips the allowance check/spend.
    const isFreeDemoLesson = lessonId === FREE_LESSON_ID;

    if (!isFreeDemoLesson) {
      const gate = await checkAiGate(userEmail, userId, isAdmin);
      if (!gate.allowed) {
        // Daily AI-graded practice allowance used up: don't fabricate a score
        // (it would wrongly count against the locked mastery rollup) and don't
        // record an attempt at all — the item just stays ungraded until the
        // allowance resets, same as never having answered it. See aiLimits.js.
        setFeedback({ score: null, tip: "You've reached today's AI-graded practice. It refreshes tomorrow, or upgrade your plan for more." });
        setGrading(false);
        return;
      }
    }

    const result = item.type === "vocab"
      ? await evaluateVocabArticulation({ english: item.english, definition: item.definition }, answer)
      : await evaluateGrammarConstruction(
          { instruction: item.instruction, requiredElement: item.requiredElement, topic: item.topic }, answer
        );
    if (!isFreeDemoLesson) await incrementAiUsage(userEmail, userId, "");
    await recordAssessmentResult({
      userEmail, lessonId: lesson.id, activityId: current.activityId,
      source: "practice", skill: item.skill || (item.type === "vocab" ? "vocabulary" : "grammar"),
      subskill: item.topic || (item.type === "vocab" ? "Word Meaning" : ""), itemLabel: itemLabelOf(item),
      studentAnswer: answer, score: result.score,
      axisScores: item.type === "vocab"
        ? { accuracy: result.accuracy, completeness: result.completeness, own_words: result.own_words }
        : { structureUsed: result.structureUsed, correctness: result.correctness, naturalness: result.naturalness },
      diagnosis: result.diagnosis, tip: result.tip, pasteAttempted,
    });
    setFeedback({ score: result.score, tip: result.tip });
    setGrading(false);
  };

  const handleRetry = () => {
    const failingActs = checkOutcome.pending.map((r) => r.activity);
    startCheck(failingActs);
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!lesson) {
    return <div className="min-h-screen bg-background flex items-center justify-center px-4"><p className="text-sm text-muted-foreground">Lesson not found.</p></div>;
  }

  if (phase === "orientation") {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center px-6 max-w-sm mx-auto">
        <ExplainHelp contentKey="orientation" />
        <Target className="w-9 h-9 text-blue-500 mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-4">{lesson.title}</h1>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">By the end of this lesson, you'll be able to:</p>
        <ul className="space-y-1.5 mb-8">
          {(lesson.learning_objectives || []).map((obj) => (
            <li key={obj} className="text-sm text-foreground flex gap-2"><span className="text-blue-500">&bull;</span>{obj}</li>
          ))}
        </ul>
        <button onClick={() => setPhase("teach")} className="h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg select-none">
          Start
        </button>
      </div>
    );
  }

  if (phase === "teach") {
    const beats = TEACH_BEATS_BY_LESSON[lesson.id];
    if (beats) {
      return <TeachExperience beats={beats} onComplete={startPractice} />;
    }
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center px-6 max-w-sm mx-auto">
        <p className="text-base text-foreground leading-relaxed mb-8">{lesson.content_body}</p>
        <button onClick={startPractice} className="h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg select-none">
          Continue to practice
        </button>
      </div>
    );
  }

  if (phase === "queue" && current) {
    const explainKey = current.item.format === "mcq" ? "practice_mcq" : "practice_open";
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <LessonProgress idx={qIdx} total={queue.length} />
        {current.item.format === "mcq" ? (
          <McqGateItem item={current.item} onSelect={handleMcqSelect} explainKey={explainKey} />
        ) : (
          <OpenGateItem
            item={current.item} answer={answer} onAnswerChange={setAnswer}
            grading={grading} feedback={feedback} onSubmit={handleOpenSubmit} onNext={finishQueueItem}
            explainKey={explainKey}
            enableVault userEmail={userEmail} lessonId={lesson.id}
          />
        )}
      </div>
    );
  }

  if (phase === "check-result") {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center px-6 max-w-sm mx-auto text-center">
        <ExplainHelp contentKey="check_result" />
        {checkOutcome.allPassed ? (
          <>
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Lesson complete</h2>
            <p className="text-sm text-muted-foreground mb-8">Mastery score: {checkOutcome.mastery.toFixed(1)}/5</p>
            <button onClick={() => navigate("/")} className="h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg select-none">
              {advanced?.hasNext ? "Continue" : "Done"}
            </button>
          </>
        ) : (
          <>
            <RotateCcw className="w-10 h-10 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Almost there</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You need another pass on: {checkOutcome.pending.map((r) => r.activity.content_filter?.topic || "vocabulary").join(", ")}
            </p>
            <button onClick={handleRetry} className="h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg select-none">
              Retry
            </button>
          </>
        )}
      </div>
    );
  }

  return null;
}
