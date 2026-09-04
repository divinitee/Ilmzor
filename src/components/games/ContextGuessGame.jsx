import React from "react";
import VocabMcqShell from "./VocabMcqShell";
import { buildMeaningMcq } from "@/lib/vocabGameUtils";
import { useAppLang } from "@/hooks/useAppLang";

function renderContext(description, word) {
  if (!description) {
    return (
      <p className="text-base text-foreground leading-relaxed">
        What does <b className="text-blue-600">{word}</b> mean?
      </p>
    );
  }
  const idx = description.toLowerCase().indexOf(word.toLowerCase());
  if (idx === -1) {
    return (
      <div>
        <p className="text-base text-foreground leading-relaxed italic">"{description}"</p>
        <p className="text-xs text-muted-foreground mt-3 font-medium">
          What does <b className="text-blue-600">{word}</b> mean here?
        </p>
      </div>
    );
  }
  const before = description.slice(0, idx);
  const match = description.slice(idx, idx + word.length);
  const after = description.slice(idx + word.length);
  return (
    <p className="text-base text-foreground leading-relaxed">
      "{before}
      <b className="text-blue-600">{match}</b>
      {after}"
    </p>
  );
}

// "Context Guess" — read the word used in a sentence, then choose its meaning.
export default function ContextGuessGame(props) {
  const { lang } = useAppLang();
  return (
    <VocabMcqShell
      {...props}
      headerLabel="Context Guess"
      poolFilter={(w) => !!w.description && w.description.trim().length >= 5}
      buildQuestion={(pool, t, demand) => {
        const m = buildMeaningMcq(pool, t, lang, demand);
        return {
          context: t.description,
          word: t.english,
          options: m.options,
          correct: m.correct,
        };
      }}
      renderPrompt={(q) => (
        <div>
          <p className="text-[11px] text-muted-foreground mb-3 font-medium uppercase tracking-wider">
            Read the context, then choose the meaning
          </p>
          {renderContext(q.context, q.word)}
        </div>
      )}
    />
  );
}