import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import SupportSubtitle from "@/components/lesson/SupportSubtitle";

// One open-ended item (B1 / B2 / C1 gates, and every lesson check/practice
// that reuses this component) — the student writes an answer, it's
// LLM-graded, then they see the score and tip before moving on.
//
// onSubmit receives (pasteAttempted: boolean) — whether a paste was ever
// attempted into this specific item's textarea, so the caller can log it
// alongside the graded result. Paste is blocked outright (never actually
// inserted); this is a pure observed-behavior flag, not a scoring input.
//
// Support-language subtitle only covers the auto-generated fallback prompt
// ("Explain what X means...") — a single reusable template, safe to
// translate once. The hundreds of custom item.instruction strings across
// the grammar/vocab pools are NOT translated here; that's real content
// authoring, not a quick code addition, and isn't silently faked.
export default function OpenGateItem({
  item, answer, onAnswerChange, grading, feedback, onSubmit, onNext,
}) {
  const [pasteBlocked, setPasteBlocked] = useState(false);
  const [pasteAttempted, setPasteAttempted] = useState(false);

  // No key prop at either call site, so this component stays mounted across
  // questions — reset per-item state explicitly when the item changes,
  // or a paste on question 1 would incorrectly still be flagged on question 2.
  useEffect(() => {
    setPasteBlocked(false);
    setPasteAttempted(false);
  }, [item]);

  const isGeneratedPrompt = !item.instruction && item.type === "vocab";
  const prompt = item.instruction
    || (item.type === "vocab" ? `Explain what "${item.english}" means, in your own words.` : "");
  const promptSupport = isGeneratedPrompt ? {
    uz: `"${item.english}" so'zi yoki iborasi nimani anglatishini o'z so'zlaringiz bilan tushuntiring.`,
    ru: `Объясните своими словами, что означает "${item.english}".`,
  } : null;

  const handlePaste = (e) => {
    e.preventDefault();
    setPasteBlocked(true);
    setPasteAttempted(true);
    setTimeout(() => setPasteBlocked(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
      <div className="bg-card border border-border rounded-2xl p-5 mb-5">
        <p className="text-base text-foreground leading-relaxed">{prompt}</p>
        <SupportSubtitle support={promptSupport} className="mt-2" />
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
            onClick={() => onSubmit(pasteAttempted)}
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