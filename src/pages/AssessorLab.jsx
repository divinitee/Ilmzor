import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Play, Loader2 } from "lucide-react";
import { evaluateVocabArticulation, evaluateGrammarConstruction } from "@/lib/assessor";

// Internal lab page — not linked in nav. Visit /assessor-lab directly.
// Runs the real LLM-graded assessor against a battery of pre-written edge
// cases (good / mediocre / wrong / blank / gaming answers) so we can eyeball
// whether the rubric behaves before wiring it into any real student flow.

const VOCAB_WORD = { english: "assess", definition: "evaluate or estimate the nature, ability, or quality of something" };

const VOCAB_CASES = [
  { label: "Good paraphrase (from Ilkhom's own example)", answer: "to grade or rate smth based on certain criteria" },
  { label: "Near-verbatim copy of the definition", answer: "to evaluate or estimate the nature, ability, or quality of something" },
  { label: "Wrong meaning entirely", answer: "to help someone do a difficult task" },
  { label: "Vague / doesn't commit to a meaning", answer: "it's like when you think about something" },
  { label: "Blank answer", answer: "" },
  { label: "Gaming attempt / gibberish", answer: "asdf assess is a good word i like it" },
];

const GRAMMAR_TASK = {
  instruction: "Write one sentence containing two clauses joined by a subordinating conjunction.",
  requiredElement: "a subordinating conjunction (e.g. because, although, when, if, since)",
  topic: "Complex sentences — subordination",
};

const GRAMMAR_CASES = [
  { label: "Correct complex sentence", answer: "I stayed home because it was raining heavily outside." },
  { label: "Used a coordinating conjunction instead", answer: "I stayed home and it was raining heavily outside." },
  { label: "Run-on / comma splice", answer: "It was raining, I stayed home, it was cold too." },
  { label: "Sentence fragment", answer: "Because it was raining outside." },
  { label: "Correct structure, verb tense error", answer: "I stay home yesterday because it was raining." },
  { label: "Blank answer", answer: "" },
  { label: "Off-topic / gaming attempt", answer: "I like sentences and grammar is fun to learn." },
];

function ScoreBar({ label, val }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{label}</span><span className="font-semibold text-foreground">{val}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${val}%` }} />
      </div>
    </div>
  );
}

function ResultCard({ label, answer, result, axes }) {
  if (!result) return null;
  const badgeColor =
    result.score >= 4 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
    result.score >= 3 ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
    "bg-rose-500/10 text-rose-400 border-rose-500/30";
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-sm text-foreground mt-0.5">{answer || <em className="text-muted-foreground">(blank)</em>}</p>
        </div>
        <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full border ${badgeColor}`}>
          {result.score}/5
        </span>
      </div>
      <div className="space-y-1.5 my-3">
        {axes.map(([key, axisLabel]) => (
          <ScoreBar key={key} label={axisLabel} val={result[key]} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">{result.diagnosis}</span>
        {result.tip && <span className="text-muted-foreground">💬 {result.tip}</span>}
      </div>
    </div>
  );
}

function Section({ title, task, cases, evaluator, axes, buildInput }) {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [customAnswer, setCustomAnswer] = useState("");
  const [customResult, setCustomResult] = useState(null);
  const [customRunning, setCustomRunning] = useState(false);

  const runBattery = async () => {
    setRunning(true);
    const entries = await Promise.all(
      cases.map(async (c) => [c.label, await evaluator(...buildInput(c.answer))])
    );
    setResults(Object.fromEntries(entries));
    setRunning(false);
  };

  const runCustom = async () => {
    setCustomRunning(true);
    const res = await evaluator(...buildInput(customAnswer));
    setCustomResult(res);
    setCustomRunning(false);
  };

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <button
          onClick={runBattery}
          disabled={running}
          className="flex items-center gap-1.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 select-none"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Run all {cases.length} cases
        </button>
      </div>
      {task && <p className="text-xs text-muted-foreground mb-4 italic">Task: {task}</p>}

      <div className="space-y-3">
        {cases.map((c) => (
          <ResultCard key={c.label} label={c.label} answer={c.answer} result={results[c.label]} axes={axes} />
        ))}
      </div>

      <div className="mt-4 bg-card border border-dashed border-border rounded-xl p-4">
        <p className="text-xs text-muted-foreground font-medium mb-2">Try your own answer</p>
        <textarea
          value={customAnswer}
          onChange={(e) => setCustomAnswer(e.target.value)}
          placeholder="Type an answer to grade..."
          className="w-full h-20 px-3 py-2 border border-input rounded-lg text-sm bg-background text-foreground focus:border-primary focus:outline-none resize-none mb-2"
        />
        <button
          onClick={runCustom}
          disabled={customRunning || !customAnswer.trim()}
          className="text-sm font-semibold bg-muted hover:bg-muted/70 text-foreground px-3 py-1.5 rounded-lg disabled:opacity-50 select-none"
        >
          {customRunning ? "Grading..." : "Grade this"}
        </button>
        {customResult && (
          <div className="mt-3">
            <ResultCard label="Your answer" answer={customAnswer} result={customResult} axes={axes} />
          </div>
        )}
      </div>
    </section>
  );
}

export default function AssessorLab() {
  return (
    <div className="min-h-screen bg-background px-4 py-6 max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 select-none">
        <ArrowLeft className="w-4 h-4" /> Back to app
      </Link>
      <h1 className="text-xl font-bold text-foreground mb-1">Assessor Lab</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Internal test harness — runs the real LLM-graded assessor against known edge cases so we can
        judge whether the rubric behaves before it touches any real student flow.
      </p>

      <Section
        title="Vocabulary articulation"
        task={`Explain what "${VOCAB_WORD.english}" means, in your own words.`}
        cases={VOCAB_CASES}
        evaluator={evaluateVocabArticulation}
        axes={[["accuracy", "Accuracy"], ["completeness", "Completeness"], ["own_words", "Own words"]]}
        buildInput={(answer) => [VOCAB_WORD, answer]}
      />

      <Section
        title="Grammar construction"
        task={GRAMMAR_TASK.instruction}
        cases={GRAMMAR_CASES}
        evaluator={evaluateGrammarConstruction}
        axes={[["structureUsed", "Structure used"], ["correctness", "Correctness"], ["naturalness", "Naturalness"]]}
        buildInput={(answer) => [GRAMMAR_TASK, answer]}
      />
    </div>
  );
}
