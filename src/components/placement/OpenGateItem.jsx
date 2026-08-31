import React, { useState } from "react";
import { Loader2 } from "lucide-react";

// One open-ended item (B1 / B2 / C1 gates, and every lesson check/practice
// that reuses this component) — the student writes an answer, it's
// LLM-graded, then they see the score and tip before moving on.
export default function OpenGateItem({
  item, answer, onAnswerChange, grading, feedback, onSubmit, onNext,
}) {
  const [pasteBlocked, setPasteBlocked] = useState(false);
  const prompt = item.instruction
    || (item.type === "vocab" ? `Explain what "${item.english}" means, in your own words.` : "");

  const handlePaste = (e) => {
    e.preventDefault();
    setPasteBlocked(true);
    setTimeout(() => setPasteBlocked(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
      <div className="bg-card border border-border rounded-2xl p-5 mb-5">
        <p className="text-base text-foreground leading-relaxed">{prompt}</p>
      </div>

      {!feedback ? (
        <>
          <textarea
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            onPaste={handlePaste}
            placeholder="Type your answer..."
            className="w-full h-28 px-3 py-2 border border-input rounded-lg text-sm bg-card text-foreground focus:border-primary focus:outline-none resize-none mb-2"
            disabled={grading}
          />
          {pasteBlocked && (
            <p className="text-xs text-amber-500 mb-2">Please type your own answer — pasting isn't allowed here.</p>
          )}
          <button
            onClick={onSubmit}
            disabled={grading || !answer.trim()}
            className="h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 select-none mt-2"
          >
            {grading ? <><Loader2 className="w-4 h-4 animate-spin" /> Grading...</> : "Submit"}
          </button>
        </>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-1">Score: {feedback.score}/5</p>
          {feedback.tip && <p className="text-sm text-muted-foreground mb-4">{feedback.tip}</p>}
          <button
            onClick={onNext}
            className="w-full h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg select-none"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}