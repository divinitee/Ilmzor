import React from "react";
import VocabMcqShell from "./VocabMcqShell";
import { buildMeaningMcq } from "@/lib/vocabGameUtils";

// "Definition Match" — show a word, pick its correct meaning (MCQ).
export default function DefinitionMatchGame(props) {
  return (
    <VocabMcqShell
      {...props}
      headerLabel="Definition Match"
      buildQuestion={(pool, t) => {
        const m = buildMeaningMcq(pool, t);
        return {
          word: t.english,
          pronunciation: t.pronunciation,
          options: m.options,
          correct: m.correct,
        };
      }}
      renderPrompt={(q) => (
        <div className="text-center">
          <p className="text-[11px] text-muted-foreground mb-2 font-medium uppercase tracking-wider">
            What does this word mean?
          </p>
          <p className="text-2xl font-bold text-foreground">{q.word}</p>
          {q.pronunciation && (
            <p className="text-sm text-muted-foreground mt-1 font-mono">{q.pronunciation}</p>
          )}
        </div>
      )}
    />
  );
}