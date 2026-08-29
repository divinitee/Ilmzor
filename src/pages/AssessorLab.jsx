import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Play, Loader2 } from "lucide-react";
import { evaluateVocabArticulation, evaluateGrammarConstruction } from "@/lib/assessor";
import { TIER2_VOCAB, TIER2_GRAMMAR } from "@/lib/placementContent";

// Internal lab page — not linked in nav. Visit /assessor-lab directly.
// Round 2: breadth test. Round 1 proved the mechanism works (near-copy,
// wrong-conjunction-type, blank, gaming all behaved correctly) on ONE word
// and ONE grammar structure. This round swaps in 10 different words and 10
// different grammar trouble-spots to check the rubric generalizes, rather
// than re-proving the same edge-case categories we already confirmed work.
// Each item gets a clean answer + one realistic, subtly-wrong answer.

// Test-only good/flawed sample answers, paired by index with the shared
// canonical word/task definitions in placementContent.js (the real source
// of truth, also used by the actual PlacementTest flow).
const VOCAB_FLAWS = [
  { flawLabel: "Confuses with 'cancel'", good: "to move something to happen at a later date instead of now", flaw: "to cancel something completely" },
  { flawLabel: "Confuses with 'afraid'", good: "not really wanting to do something and hesitating before doing it", flaw: "feeling nervous or scared about something" },
  { flawLabel: "Misses the mutual-agreement part", good: "to talk with someone to reach a deal both sides accept", flaw: "to argue with someone until they agree with you" },
  { flawLabel: "Too vague — loses the mechanism", good: "something that can keep going long-term without using up resources or harming the environment", flaw: "something that is good for the environment" },
  { flawLabel: "Confuses with 'intelligent'", good: "working hard and carefully, putting in steady effort", flaw: "very smart and quick at learning things" },
  { flawLabel: "Confuses with 'complain'", good: "to pay someone back or make up for a problem you caused them", flaw: "to complain to someone about a mistake they made" },
  { flawLabel: "Confuses unclear-by-complexity with unclear-by-multiple-meanings", good: "when something can be understood in more than one way, so it's unclear which meaning is right", flaw: "when something is very difficult to understand" },
  { flawLabel: "Confuses with 'force'", good: "to convince someone to agree with you or do something by giving good reasons", flaw: "to force someone to do something" },
  { flawLabel: "Near-verbatim copy (spot-check on a short definition)", good: "something that breaks easily if you're not careful with it", flaw: "easily broken or damaged; delicate" },
  { flawLabel: "Confuses authentic with high-quality", good: "something that is real and true, not fake or pretending to be something else", flaw: "something that is very good quality" },
];
const VOCAB_ITEMS = TIER2_VOCAB.map((word, i) => ({ word, ...VOCAB_FLAWS[i] }));

const GRAMMAR_HEADINGS = [
  "Articles (a/an/the)", "Present Perfect vs Past Simple", "Second Conditional", "Passive Voice",
  "Comparatives", "Prepositions of Time", "Modal Verbs of Obligation", "Reported Speech",
  "Countable/Uncountable Nouns", "Third Conditional",
];
const GRAMMAR_FLAWS = [
  { flawLabel: "Missing article entirely", good: "I bought a book yesterday, and the book was really interesting.", flaw: "I bought a book yesterday, and book was really interesting." },
  { flawLabel: "Present perfect + specific past time marker", good: "I have visited Paris three times.", flaw: "I have visited Paris in 2019." },
  { flawLabel: "'will' used in the if-clause", good: "If I had more money, I would travel around the world.", flaw: "If I will have more money, I would travel around the world." },
  { flawLabel: "Adjective used instead of past participle", good: "The report was completed by the team yesterday.", flaw: "The report was complete by the team yesterday." },
  { flawLabel: "Double comparative", good: "This laptop is more expensive than that one.", flaw: "This laptop is more cheaper than that one." },
  { flawLabel: "Wrong preposition", good: "The meeting starts at 9 o'clock.", flaw: "The meeting starts in 9 o'clock." },
  { flawLabel: "'to' added after a modal verb", good: "You must submit the form before Friday.", flaw: "You must to submit the form before Friday." },
  { flawLabel: "No tense backshift", good: "She said that she was tired.", flaw: "She said that she is tired." },
  { flawLabel: "'much' paired with a countable noun", good: "I don't have much time today.", flaw: "I don't have much friends today." },
  { flawLabel: "Past simple used instead of past perfect", good: "If I had studied harder, I would have passed the exam.", flaw: "If I studied harder, I would have passed the exam." },
];
const GRAMMAR_ITEMS = TIER2_GRAMMAR.map((task, i) => ({ topic: GRAMMAR_HEADINGS[i], task, ...GRAMMAR_FLAWS[i] }));

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

function ResultCard({ heading, subLabel, answer, result, axes }) {
  const badgeColor = !result ? "bg-muted text-muted-foreground border-border" :
    result.score >= 4 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
    result.score >= 3 ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
    "bg-rose-500/10 text-rose-400 border-rose-500/30";
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{heading}</p>
          {subLabel && <p className="text-[11px] text-muted-foreground/70 italic">{subLabel}</p>}
          <p className="text-sm text-foreground mt-0.5">{answer || <em className="text-muted-foreground">(blank)</em>}</p>
        </div>
        <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full border ${badgeColor}`}>
          {result ? `${result.score}/5` : "—"}
        </span>
      </div>
      {result && (
        <>
          <div className="space-y-1.5 my-3">
            {axes.map(([key, axisLabel]) => (
              <ScoreBar key={key} label={axisLabel} val={result[key]} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">{result.diagnosis}</span>
            {result.tip && <span className="text-muted-foreground">💬 {result.tip}</span>}
          </div>
        </>
      )}
    </div>
  );
}

function VocabSection() {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);

  const runAll = async () => {
    setRunning(true);
    const jobs = [];
    VOCAB_ITEMS.forEach((item, i) => {
      jobs.push(["good-" + i, evaluateVocabArticulation(item.word, item.good)]);
      jobs.push(["flaw-" + i, evaluateVocabArticulation(item.word, item.flaw)]);
    });
    const entries = await Promise.all(jobs.map(async ([key, p]) => [key, await p]));
    setResults(Object.fromEntries(entries));
    setRunning(false);
  };

  const axes = [["accuracy", "Accuracy"], ["completeness", "Completeness"], ["own_words", "Own words"]];

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Vocabulary articulation — 10 words</h2>
          <p className="text-xs text-muted-foreground">Each word: 1 clean answer + 1 realistic subtle-flaw answer (20 gradings total).</p>
        </div>
        <button
          onClick={runAll}
          disabled={running}
          className="flex items-center gap-1.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 select-none shrink-0"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Run all 20
        </button>
      </div>

      <div className="space-y-3">
        {VOCAB_ITEMS.map((item, i) => (
          <div key={item.word.english} className="grid sm:grid-cols-2 gap-3">
            <ResultCard heading={`"${item.word.english}" — good answer`} answer={item.good} result={results["good-" + i]} axes={axes} />
            <ResultCard heading={`"${item.word.english}" — ${item.flawLabel}`} answer={item.flaw} result={results["flaw-" + i]} axes={axes} />
          </div>
        ))}
      </div>
    </section>
  );
}

function GrammarSection() {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);

  const runAll = async () => {
    setRunning(true);
    const jobs = [];
    GRAMMAR_ITEMS.forEach((item, i) => {
      jobs.push(["good-" + i, evaluateGrammarConstruction(item.task, item.good)]);
      jobs.push(["flaw-" + i, evaluateGrammarConstruction(item.task, item.flaw)]);
    });
    const entries = await Promise.all(jobs.map(async ([key, p]) => [key, await p]));
    setResults(Object.fromEntries(entries));
    setRunning(false);
  };

  const axes = [["structureUsed", "Structure used"], ["correctness", "Correctness"], ["naturalness", "Naturalness"]];

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Grammar construction — 10 structures</h2>
          <p className="text-xs text-muted-foreground">Each structure: 1 correct sentence + 1 sentence with that structure's classic real-world error (20 gradings total).</p>
        </div>
        <button
          onClick={runAll}
          disabled={running}
          className="flex items-center gap-1.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 select-none shrink-0"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Run all 20
        </button>
      </div>

      <div className="space-y-3">
        {GRAMMAR_ITEMS.map((item, i) => (
          <div key={item.topic} className="grid sm:grid-cols-2 gap-3">
            <ResultCard heading={item.topic} subLabel="Correct" answer={item.good} result={results["good-" + i]} axes={axes} />
            <ResultCard heading={item.topic} subLabel={item.flawLabel} answer={item.flaw} result={results["flaw-" + i]} axes={axes} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AssessorLab() {
  return (
    <div className="min-h-screen bg-background px-4 py-6 max-w-4xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 select-none">
        <ArrowLeft className="w-4 h-4" /> Back to app
      </Link>
      <h1 className="text-xl font-bold text-foreground mb-1">Assessor Lab</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Round 2 — breadth test. 10 different words and 10 different grammar trouble-spots, each with a
        clean answer and a realistic subtly-wrong one, to check the rubric generalizes past the first two
        items we already proved work.
      </p>

      <VocabSection />
      <GrammarSection />
    </div>
  );
}
