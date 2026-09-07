import React from "react";

// The target word, alone. No context sentence — Synonym Sprint's whole shape is
// "here is the word, pick its synonym", which is also what keeps the round
// fast. The uz/ru translation sits behind the optional reveal.
export default function SynonymSprintPrompt({ q, accent, showTranslation }) {
  return (
    <div className="premium-card px-4 py-6 text-center">
      <h2 className="text-3xl font-bold text-foreground tracking-tight break-words">{q.word}</h2>
      {q.pronunciation && (
        <p className="text-xs text-muted-foreground mt-1 font-mono">{q.pronunciation}</p>
      )}
      {showTranslation && q.translation && (
        <p className="text-sm mt-3 font-semibold" style={{ color: accent }}>{q.translation}</p>
      )}
    </div>
  );
}